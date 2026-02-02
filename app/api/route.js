// app/api/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { google } from "googleapis";

/* ----------------------------- ENV / CONFIG ----------------------------- */
const env = (k) => String(process.env[k] || "").trim().replace(/^['"]|['"]$/g, "");

const SHEET_ID = env("GOOGLE_SHEET_ID");
const CLIENT_EMAIL = env("GOOGLE_CLIENT_EMAIL");

const PRIVATE_KEY_RAW = env("GOOGLE_PRIVATE_KEY");
const PRIVATE_KEY = PRIVATE_KEY_RAW ? PRIVATE_KEY_RAW.replace(/\\n/g, "\n") : "";

const WEBHOOKS = {
  FACTURATION: env("WEBHOOK_FACTURATION"),
  CONVOCATION: env("WEBHOOK_CONVOCATION"),
  AVERTISSEMENT: env("WEBHOOK_AVERTISSEMENT"),
  LICENCIEMENT: env("WEBHOOK_LICENCIEMENT"),
  DEMISSION: env("WEBHOOK_DEMISSION"),
  RECRUTEMENT: env("WEBHOOK_RECRUTEMENT"),
  DEPENSE: env("WEBHOOK_DEPENSE"),
};

/* ------------------------------ HARD DATA ------------------------------ */
/** ✅ Catalogue en dur (exemple) */
const CATALOGUE = [
  { category: "Cheveux", product: "Coupe", price: 50 },
  { category: "Cheveux", product: "Coupe + Barbe", price: 80 },
  { category: "Tattoo", product: "Petit tatouage", price: 120 },
];

/** ✅ Entreprises en dur (exemple) */
const ENTERPRISES = {
  "LSPD": { discount: 15, phone: "", image: "" },
  "EMS": { discount: 10, phone: "", image: "" },
};

/* ----------------------------- SMALL HELPERS ---------------------------- */
const norm = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/\$/g, "").replace("%", "").replace(",", ".").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const toBool = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "oui" || s === "yes";
};

const todayFR = () => new Date().toLocaleDateString("fr-FR");
const isoNow = () => new Date().toISOString();
const makeDepenseId = () => `DEP-${String(Math.floor(Date.now() / 1000)).slice(-6)}`;

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function ok(data) {
  return NextResponse.json({ success: true, ...data });
}
function bad(message, status = 400, extra = undefined) {
  return NextResponse.json({ success: false, error: message, ...(extra ? { extra } : {}) }, { status });
}

function formatGoogleError(err) {
  const status = err?.code || err?.response?.status;
  const apiMsg = err?.response?.data?.error?.message;
  const apiDetails = err?.response?.data?.error;
  return {
    status,
    message: err?.message || String(err),
    apiMessage: apiMsg,
    api: apiDetails,
  };
}

async function sendDiscordWebhook(url, payload) {
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Discord webhook error:", e?.message || e);
  }
}

/* ------------------------------ SHEETS AUTH ----------------------------- */
async function getSheets() {
  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new Error("ENV manquantes: GOOGLE_SHEET_ID / GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY");
  }

  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);

  return google.sheets({ version: "v4", auth });
}

async function getSheetTitles(sheets) {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const titles =
    res.data.sheets?.map((s) => s.properties?.title).filter(Boolean) || [];
  return titles;
}

async function resolveTab(sheets, candidates) {
  const titles = await getSheetTitles(sheets);
  const map = new Map(titles.map((t) => [norm(t), t]));
  for (const c of candidates) {
    const hit = map.get(norm(c));
    if (hit) return hit;
  }
  throw new Error(`Onglet introuvable. Cherchés: ${candidates.join(", ")} | Dispo: ${titles.join(", ")}`);
}

async function getValues(sheets, range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return res.data.values || [];
}

function findHeaderRow(values, requiredHeaders = []) {
  const req = requiredHeaders.map(norm);
  for (let r = 0; r < Math.min(values.length, 25); r++) {
    const row = values[r] || [];
    const headers = row.map(norm);
    const ok = req.every((h) => headers.includes(h));
    if (ok) return { headerRowIndex: r, headers };
  }
  // fallback: première ligne
  return { headerRowIndex: 0, headers: (values[0] || []).map(norm) };
}

function tableFromAuto(values, requiredHeaders = []) {
  if (!values || values.length === 0) return [];
  const { headerRowIndex, headers } = findHeaderRow(values, requiredHeaders);

  const out = [];
  for (let i = headerRowIndex + 1; i < values.length; i++) {
    const row = values[i] || [];
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = row[idx]));
    const hasAny = Object.values(obj).some((x) => String(x ?? "").trim() !== "");
    if (hasAny) out.push(obj);
  }
  return out;
}

async function ensureHeadersIfEmpty(sheets, sheetName, headers) {
  const check = await getValues(sheets, `'${sheetName}'!A1:Z1`);
  const firstRow = check?.[0] || [];
  const hasAny = firstRow.some((x) => String(x ?? "").trim() !== "");
  if (hasAny) return;

  const endCol = String.fromCharCode(64 + Math.min(headers.length, 26)); // A..Z
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${sheetName}'!A1:${endCol}1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
}

/* ---------------------------- DATA LOADERS ----------------------------- */
// Tes remises viennent de l’onglet Config (Poste/Remise)
async function loadRoleDiscounts(sheets) {
  const tab = await resolveTab(sheets, ["Config", "CONFIG"]);
  const values = await getValues(sheets, `'${tab}'!A1:Z500`);

  const rows = tableFromAuto(values, ["poste", "remise"]);
  const byRole = {};

  for (const r of rows) {
    const role = String(r.poste ?? "").trim();
    if (!role) continue;
    const discount = toNumber(r.remise ?? 0);
    byRole[role] = discount;
  }
  return byRole;
}

// Les employés viennent de l’onglet Comptabilité (Nom & Prénom / Poste)
async function loadEmployees(sheets) {
  const tab = await resolveTab(sheets, ["Comptabilité", "Comptabilite", "Employees", "Employés"]);
  const values = await getValues(sheets, `'${tab}'!A1:Z5000`);

  const rows = tableFromAuto(values, ["nom_prenom", "poste"]);
  const employees = rows
    .map((r) => ({
      name: String(r.nom_prenom ?? "").trim(),
      role: String(r.poste ?? "").trim(),
      phone: String(r.telephone ?? r.tel ?? r.phone ?? "").trim(),
    }))
    .filter((e) => e.name);

  employees.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  return employees;
}

/* ------------------------------ META BUILD ------------------------------ */
async function buildMeta(sheets) {
  const roleDiscounts = await loadRoleDiscounts(sheets);
  const employeesFull = await loadEmployees(sheets);

  const employeeDiscounts = {};
  const directory = employeesFull.map((e) => ({
    name: e.name,
    role: e.role,
    phone: e.phone,
  }));

  for (const e of employeesFull) {
    employeeDiscounts[e.name] = {
      role: e.role,
      discount: Number(roleDiscounts[e.role] || 0),
    };
  }

  const productsByCategory = {};
  const prices = {};
  for (const p of CATALOGUE) {
    if (!productsByCategory[p.category]) productsByCategory[p.category] = [];
    productsByCategory[p.category].push(p.product);
    prices[p.product] = Number(p.price || 0);
  }

  return {
    version: "1.0.0",
    serverTime: isoNow(),
    currencySymbol: "$",
    currencyCode: "USD",

    employees: employeesFull.map((e) => e.name),
    directory,
    employeeDiscounts,

    products: Object.values(productsByCategory).flat(),
    productsByCategory,
    prices,

    enterprises: ENTERPRISES,

    totals: { employees: employeesFull.length, products: CATALOGUE.length },
  };
}

function calcInvoiceTotals({ items, prices, discountActivated, enterpriseName, enterprises, employeeDiscountPct }) {
  const subtotal = items.reduce((s, it) => {
    const pu = Number(prices[it.desc] ?? 0);
    const qty = Math.floor(Number(it.qty) || 0);
    return s + pu * qty;
  }, 0);

  let discountPct = 0;
  let discountType = "Aucune";

  if (discountActivated) {
    if (enterpriseName && enterprises[enterpriseName]) {
      discountPct = Number(enterprises[enterpriseName].discount || 0);
      discountType = "Entreprise";
    } else {
      discountPct = Number(employeeDiscountPct || 0);
      discountType = "Employé";
    }
  }

  const discountAmount = +(subtotal * (discountPct / 100)).toFixed(2);
  const total = +(subtotal - discountAmount).toFixed(2);
  return { subtotal, discountPct, discountAmount, total, discountType };
}

/* --------------------------------- API --------------------------------- */
export async function POST(request) {
  try {
    const body = await readJson(request);
    const action = String(body?.action || "getMeta");
    const data = body?.data || {};

    const sheets = await getSheets();

    // ✅ Diagnostic simple
    if (action === "health") {
      const titles = await getSheetTitles(sheets);
      const roleDiscounts = await loadRoleDiscounts(sheets);
      const employees = await loadEmployees(sheets);

      return ok({
        env: {
          SHEET_ID: !!SHEET_ID,
          CLIENT_EMAIL: !!CLIENT_EMAIL,
          PRIVATE_KEY: PRIVATE_KEY ? `ok(${PRIVATE_KEY.length})` : "missing",
        },
        tabs: titles,
        counts: {
          roles: Object.keys(roleDiscounts).length,
          employees: employees.length,
        },
        sample: {
          firstEmployee: employees[0] || null,
        },
      });
    }

    if (action === "getMeta") {
      const meta = await buildMeta(sheets);
      return ok(meta);
    }

    // Le reste a besoin de la meta
    const meta = await buildMeta(sheets);

    if (action === "sendFactures") {
      const employee = String(data.employee || "").trim();
      const invoiceNumber = String(data.invoiceNumber || "").trim();
      const enterprise = String(data.enterprise || "").trim();
      const customerName = String(data.customerName || "").trim();
      const employeeCard = toBool(data.employeeCard);
      const discountActivated = toBool(data.discountActivated);

      if (!employee || !meta.employees.includes(employee)) return bad("Employé invalide");
      if (!invoiceNumber || invoiceNumber.length < 3 || invoiceNumber.length > 40) return bad("Numéro facture invalide");

      const rawItems = Array.isArray(data.items) ? data.items : [];
      const items = rawItems
        .map((i) => ({
          desc: String(i.desc ?? i.name ?? "").trim(),
          qty: Math.floor(Number(i.qty ?? i.q ?? 0)),
        }))
        .filter((i) => i.desc && i.qty > 0);

      if (items.length === 0) return bad("Aucun article");
      for (const it of items) if (!(it.desc in meta.prices)) return bad(`Produit invalide: ${it.desc}`);

      const employeeDiscountPct = meta.employeeDiscounts?.[employee]?.discount ?? 0;
      const role = meta.employeeDiscounts?.[employee]?.role || "";

      const totals = calcInvoiceTotals({
        items,
        prices: meta.prices,
        discountActivated,
        enterpriseName: enterprise,
        enterprises: meta.enterprises,
        employeeDiscountPct,
      });

      await ensureHeadersIfEmpty(sheets, "Factures", [
        "Date",
        "Employé",
        "Rôle",
        "N° Facture",
        "Entreprise",
        "Client",
        "Carte Employé",
        "Type Remise",
        "% Remise",
        "Sous-total",
        "Montant Remise",
        "Total",
        "Nb Articles",
        "Détails Articles",
        "Horodatage",
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `'Factures'!A:O`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            todayFR(),
            employee,
            role,
            invoiceNumber,
            enterprise || "",
            customerName || "",
            employeeCard ? "Oui" : "Non",
            totals.discountType,
            totals.discountPct,
            totals.subtotal,
            totals.discountAmount,
            totals.total,
            items.length,
            items.map((i) => `${i.desc} (×${i.qty})`).join("; "),
            isoNow(),
          ]],
        },
      });

      await sendDiscordWebhook(WEBHOOKS.FACTURATION, {
        embeds: [{
          title: `🧾 Facture N°${invoiceNumber}`,
          description: `Employé: **${employee}** (${role || "—"})`,
          fields: [
            { name: "Sous-total", value: `${totals.subtotal.toFixed(2)}$`, inline: true },
            { name: "Remise", value: `${totals.discountPct}% (${totals.discountAmount.toFixed(2)}$)`, inline: true },
            { name: "Total", value: `${totals.total.toFixed(2)}$`, inline: true },
          ],
          timestamp: isoNow(),
        }],
      });

      return ok(totals);
    }

    if (action === "sendHR") {
      const type = String(data.type || "").trim().toLowerCase();
      const initiatedBy = String(data.initiatedBy || data.employee || "").trim();
      const reason = String(data.reason || "").trim();
      const date = String(data.date || "").trim();
      const details = String(data.details || "").trim();

      if (!type || !initiatedBy || !reason || !date) return bad("Données incomplètes");
      if (!meta.employees.includes(initiatedBy)) return bad("Auteur invalide");

      if (type === "depense") {
        const amount = toNumber(data.amount ?? 0);
        if (amount <= 0) return bad("Montant invalide");

        const role = meta.employeeDiscounts?.[initiatedBy]?.role || "Employé";
        const idFacture = makeDepenseId();

        await ensureHeadersIfEmpty(sheets, "Calculation", [
          "Date", "Nom & Prénom", "Poste", "ID Facture", "Entreprise", "Motifs", "Quantités", "Montant",
        ]);

        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: `'Calculation'!A:H`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[
              new Date(date).toLocaleDateString("fr-FR"),
              initiatedBy,
              role,
              idFacture,
              details || "",
              reason,
              1,
              amount,
            ]],
          },
        });

        await sendDiscordWebhook(WEBHOOKS.DEPENSE, {
          embeds: [{
            title: "💸 Dépense",
            fields: [
              { name: "Initié par", value: initiatedBy, inline: true },
              { name: "Montant", value: `${amount.toFixed(2)}$`, inline: true },
              { name: "Motif", value: reason, inline: false },
            ],
            timestamp: isoNow(),
          }],
        });

        return ok({});
      }

      const employeeTarget = String(data.employeeTarget || data.employee || "").trim();
      if (!employeeTarget) return bad("Employé concerné manquant");

      await ensureHeadersIfEmpty(sheets, "RH", [
        "Date", "Type Action", "Employé", "Motif", "Date Effective", "Détails", "Initié par", "Horodatage",
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `'RH'!A:H`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            todayFR(),
            type,
            employeeTarget,
            reason,
            new Date(date).toLocaleDateString("fr-FR"),
            details || "",
            initiatedBy,
            isoNow(),
          ]],
        },
      });

      return ok({});
    }

    return bad("Action inconnue", 400);
  } catch (err) {
    const g = formatGoogleError(err);
    console.error("API error:", g);
    return bad(g.apiMessage || g.message || "Erreur serveur", 500, g);
  }
}
