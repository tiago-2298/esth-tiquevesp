// app/api/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { google } from "googleapis";
import { NextResponse } from "next/server";

// =====================
// ENV (SECRETS)
// =====================
const SHEET_ID = cleanEnv(process.env.GOOGLE_SHEET_ID);
const CLIENT_EMAIL = cleanEnv(process.env.GOOGLE_CLIENT_EMAIL);
const PRIVATE_KEY = (cleanEnv(process.env.GOOGLE_PRIVATE_KEY) || "").replace(/\\n/g, "\n");

// Discord Webhooks (NE PAS METTRE EN DUR)
const WEBHOOKS = {
  FACTURATION: cleanEnv(process.env.WEBHOOK_FACTURATION),
  CONVOCATION: cleanEnv(process.env.WEBHOOK_CONVOCATION),
  AVERTISSEMENT: cleanEnv(process.env.WEBHOOK_AVERTISSEMENT),
  LICENCIEMENT: cleanEnv(process.env.WEBHOOK_LICENCIEMENT),
  DEMISSION: cleanEnv(process.env.WEBHOOK_DEMISSION),
  RECRUTEMENT: cleanEnv(process.env.WEBHOOK_RECRUTEMENT),
  DEPENSE: cleanEnv(process.env.WEBHOOK_DEPENSE),
};

// =====================
// HELPERS
// =====================
function cleanEnv(v) {
  return (v || "").trim().replace(/^['"]|['"]$/g, "");
}

function normHeader(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toNumber(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace("$", "").replace(",", ".").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function toBool(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "oui" || s === "yes";
}

async function getAuthSheets() {
  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new Error("ENV manquantes: GOOGLE_SHEET_ID / GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY");
  }

  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);

  return google.sheets({ version: "v4", auth });
}

async function tryGetValues(sheets, ranges) {
  let lastErr = null;
  for (const r of ranges) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: r,
        valueRenderOption: "UNFORMATTED_VALUE",
      });
      return { range: r, values: res.data.values || [] };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Aucune plage trouvée");
}

function tableFrom(values) {
  const rows = values || [];
  if (rows.length < 2) return { headers: [], items: [] };

  const headersRaw = rows[0].map((h) => normHeader(h));
  const items = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const obj = {};
    headersRaw.forEach((h, idx) => {
      obj[h] = row[idx];
    });

    const hasAny = Object.values(obj).some((x) => String(x ?? "").trim() !== "");
    if (hasAny) items.push(obj);
  }

  return { headers: headersRaw, items };
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
    console.error("Discord webhook error:", e);
  }
}

function todayFR() {
  return new Date().toLocaleDateString("fr-FR");
}

function isoNow() {
  return new Date().toISOString();
}

function makeDepenseId() {
  const ts = Math.floor(Date.now() / 1000);
  return `DEP-${String(ts).slice(-6)}`;
}

// =====================
// SHEET LOADERS (DATA FROM SHEET)
// =====================
async function loadConfig(sheets) {
  // Onglet conseillé: Config (A=key, B=value)
  const { values } = await tryGetValues(sheets, [
    `'Config'!A1:B200`,
    `'CONFIG'!A1:B200`,
    `'Parametres'!A1:B200`,
    `'Paramètres'!A1:B200`,
  ]);

  const map = {};

  // Mode robuste: parse lignes A/B, avec ou sans header
  for (let i = 0; i < values.length; i++) {
    const a = String(values[i]?.[0] ?? "").trim();
    const b = String(values[i]?.[1] ?? "").trim();

    // ignore ligne vide
    if (!a && !b) continue;

    // ignore header si présent
    if (i === 0 && normHeader(a) === "key" && normHeader(b) === "value") continue;

    if (a) map[a] = b;
  }

  return {
    appVersion: map.APP_VERSION || "",
    currencySymbol: map.CURRENCY_SYMBOL || "$",
    currencyCode: map.CURRENCY_CODE || "USD",
    adminPin: map.ADMIN_PIN || "",
    usernameDiscord: map.DISCORD_USERNAME || "Secretaire Vespucci",
    avatarDiscord: map.DISCORD_AVATAR_URL || "",
  };
}

async function loadEmployees(sheets) {
  // Onglet conseillé: Employés
  const { values } = await tryGetValues(sheets, [
    `'Employés'!A1:Z2000`,
    `'Employes'!A1:Z2000`,
    `'Employees'!A1:Z2000`,
  ]);

  const { items } = tableFrom(values);

  const out = items
    .map((r) => ({
      name: String(r.name ?? r.nom ?? r.prenom_nom ?? "").trim(),
      role: String(r.role ?? r.poste ?? "").trim(),
      discount: toNumber(r.discount ?? r.remise ?? r.reduction ?? 0),
      phone: String(r.phone ?? r.tel ?? r.telephone ?? "").trim(),
      avatar: String(r.avatar ?? r.photo ?? r.image ?? "").trim(),
    }))
    .filter((e) => e.name);

  out.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  return out;
}

async function loadCatalogue(sheets) {
  // Onglet conseillé: Catalogue
  const { values } = await tryGetValues(sheets, [
    `'Catalogue'!A1:Z5000`,
    `'CATALOGUE'!A1:Z5000`,
    `'Produits'!A1:Z5000`,
  ]);

  const { items } = tableFrom(values);

  const rows = items
    .map((r) => ({
      category: String(r.category ?? r.categorie ?? r.cat ?? "").trim(),
      product: String(r.product ?? r.produit ?? r.name ?? "").trim(),
      price: toNumber(r.price ?? r.prix ?? r.pu ?? 0),
    }))
    .filter((x) => x.category && x.product);

  return rows;
}

async function loadEnterprises(sheets) {
  // Onglet conseillé: Entreprises
  const { values } = await tryGetValues(sheets, [
    `'Entreprises'!A1:Z2000`,
    `'Enterprises'!A1:Z2000`,
    `'Partenaires'!A1:Z2000`,
  ]);

  const { items } = tableFrom(values);

  const rows = items
    .map((r) => ({
      name: String(r.name ?? r.entreprise ?? r.partner ?? "").trim(),
      discount: toNumber(r.discount ?? r.remise ?? r.reduction ?? 0),
      phone: String(r.phone ?? r.tel ?? r.telephone ?? "").trim(),
      image: String(r.image ?? r.avatar ?? r.photo ?? "").trim(),
    }))
    .filter((x) => x.name);

  rows.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  return rows;
}

async function ensureHeadersIfEmpty(sheets, sheetName, headers) {
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${sheetName}'!A1:Z1`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const firstRow = check.data.values?.[0] || [];
  const hasAny = firstRow.some((x) => String(x ?? "").trim() !== "");
  if (hasAny) return;

  const endCol = String.fromCharCode(64 + headers.length); // A..Z (si >26 colonnes, adapte)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${sheetName}'!A1:${endCol}1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
}

// =====================
// META (equiv Apps Script getAppMeta)
// =====================
async function buildMeta(sheets) {
  const config = await loadConfig(sheets);
  const employeesFull = await loadEmployees(sheets);
  const catalogue = await loadCatalogue(sheets);
  const enterprisesRows = await loadEnterprises(sheets);

  const employeeDiscounts = {};
  for (const e of employeesFull) {
    employeeDiscounts[e.name] = { role: e.role, discount: e.discount };
  }

  const directory = employeesFull.map((e) => ({
    name: e.name,
    role: e.role,
    avatar: e.avatar,
    phone: e.phone,
  }));

  const productsByCategory = {};
  const prices = {};
  for (const p of catalogue) {
    if (!productsByCategory[p.category]) productsByCategory[p.category] = [];
    productsByCategory[p.category].push(p.product);
    prices[p.product] = p.price;
  }

  const products = Object.values(productsByCategory).flat();

  const enterprises = {};
  for (const ent of enterprisesRows) {
    enterprises[ent.name] = { discount: ent.discount, phone: ent.phone, image: ent.image };
  }

  return {
    version: config.appVersion || "unknown",
    serverTime: new Date().toISOString(),
    employees: employeesFull.map((e) => e.name),
    directory,
    employeeDiscounts,
    products,
    productsByCategory,
    prices,
    enterprises,
    currencySymbol: config.currencySymbol,
    currencyCode: config.currencyCode,
    totals: {
      employees: employeesFull.length,
      products: products.length,
    },
    ui: {
      // ⚠️ Si tu ne veux PAS envoyer le PIN au client, supprime adminPin ici
      adminPin: config.adminPin,
      discordUsername: config.usernameDiscord,
      discordAvatarUrl: config.avatarDiscord,
    },
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

// =====================
// API
// =====================
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action || "getMeta";
    const data = body?.data || {};

    const sheets = await getAuthSheets();

    if (action === "getMeta") {
      const meta = await buildMeta(sheets);
      return NextResponse.json({ success: true, ...meta });
    }

    // charge meta (prix, entreprises, etc.)
    const meta = await buildMeta(sheets);

    // =====================
    // sendFactures
    // =====================
    if (action === "sendFactures") {
      const employee = String(data.employee || "").trim();
      const invoiceNumber = String(data.invoiceNumber || "").trim();
      const enterprise = String(data.enterprise || "").trim();
      const customerName = String(data.customerName || "").trim();
      const employeeCard = toBool(data.employeeCard);
      const discountActivated = toBool(data.discountActivated);

      if (!employee || !meta.employees.includes(employee)) {
        return NextResponse.json({ success: false, error: "Employé invalide" }, { status: 400 });
      }
      if (!invoiceNumber || invoiceNumber.length < 3 || invoiceNumber.length > 40) {
        return NextResponse.json({ success: false, error: "Numéro facture invalide" }, { status: 400 });
      }

      const rawItems = Array.isArray(data.items) ? data.items : [];
      const items = rawItems
        .map((i) => ({ desc: String(i.desc ?? i.name ?? "").trim(), qty: Math.floor(Number(i.qty ?? i.q ?? 0)) }))
        .filter((i) => i.desc && i.qty > 0);

      if (items.length === 0) {
        return NextResponse.json({ success: false, error: "Aucun article" }, { status: 400 });
      }

      for (const it of items) {
        if (!(it.desc in meta.prices)) {
          return NextResponse.json({ success: false, error: `Produit invalide: ${it.desc}` }, { status: 400 });
        }
      }

      const employeeDiscountPct = meta.employeeDiscounts?.[employee]?.discount ?? 0;

      const totals = calcInvoiceTotals({
        items,
        prices: meta.prices,
        discountActivated,
        enterpriseName: enterprise,
        enterprises: meta.enterprises,
        employeeDiscountPct,
      });

      const role = meta.employeeDiscounts?.[employee]?.role || "";
      const itemsDetails = items.map((i) => `${i.desc} (×${i.qty})`).join("; ");

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
          values: [
            [
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
              itemsDetails,
              isoNow(),
            ],
          ],
        },
      });

      await sendDiscordWebhook(WEBHOOKS.FACTURATION, {
        username: meta.ui?.discordUsername || "Secretaire Vespucci",
        avatar_url: meta.ui?.discordAvatarUrl || undefined,
        embeds: [
          {
            title: `🧾 Facture N°${invoiceNumber}`,
            description: `**Nouvelle facture générée - Esthétique Vespucci**`,
            color: 0x0000ff,
            fields: [
              {
                name: "📋 Informations Générales",
                value: [
                  `**Employé:** ${employee}`,
                  `**Rôle:** ${role || "—"}`,
                  `**Entreprise:** ${enterprise || "—"}`,
                  `**Client:** ${customerName || "—"}`,
                  `**Carte employé:** ${employeeCard ? "Oui" : "Non"}`,
                ].join("\n"),
                inline: false,
              },
              {
                name: "💰 Détails Financiers",
                value: [
                  `**Sous-total:** ${meta.currencySymbol}${totals.subtotal.toFixed(2)}`,
                  `**Réduction:** ${totals.discountPct}% (${meta.currencySymbol}${totals.discountAmount.toFixed(2)})`,
                  `**Type réduction:** ${totals.discountType}`,
                  `**Total final:** ${meta.currencySymbol}${totals.total.toFixed(2)}`,
                ].join("\n"),
                inline: false,
              },
              {
                name: "📜 Service effectué",
                value: items
                  .map(
                    (i) =>
                      `• ${i.desc} ×${i.qty} - ${meta.currencySymbol}${(meta.prices[i.desc] || 0).toFixed(2)}`
                  )
                  .join("\n"),
                inline: false,
              },
            ],
            footer: { text: `Esthétique Vespucci - Facturation • ${todayFR()}` },
            timestamp: isoNow(),
          },
        ],
      });

      return NextResponse.json({
        success: true,
        subtotal: totals.subtotal,
        discountPct: totals.discountPct,
        discountType: totals.discountType,
        discountAmount: totals.discountAmount,
        total: totals.total,
      });
    }

    // =====================
    // sendHR (RH + depense)
    // =====================
    if (action === "sendHR") {
      const type = String(data.type || "").trim().toLowerCase();
      const initiatedBy = String(data.initiatedBy || data.employee || "").trim();
      const reason = String(data.reason || "").trim();
      const date = String(data.date || "").trim();
      const details = String(data.details || "").trim();

      if (!type || !initiatedBy || !reason || !date) {
        return NextResponse.json({ success: false, error: "Données incomplètes" }, { status: 400 });
      }

      if (!meta.employees.includes(initiatedBy)) {
        return NextResponse.json({ success: false, error: "Auteur invalide" }, { status: 400 });
      }

      // DEPENSE
      if (type === "depense") {
        const amount = toNumber(data.amount ?? data.employee ?? 0);
        if (amount <= 0) {
          return NextResponse.json({ success: false, error: "Montant invalide" }, { status: 400 });
        }

        const role = meta.employeeDiscounts?.[initiatedBy]?.role || "Employé";
        const idFacture = makeDepenseId();

        await ensureHeadersIfEmpty(sheets, "Calculation", [
          "Date",
          "Nom & Prénom",
          "Poste",
          "ID Facture",
          "Entreprise",
          "Motifs",
          "Quantités",
          "Montant",
        ]);

        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: `'Calculation'!A:H`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [
              [
                new Date(date).toLocaleDateString("fr-FR"),
                initiatedBy,
                role,
                idFacture,
                details || "",
                reason,
                1,
                amount,
              ],
            ],
          },
        });

        await sendDiscordWebhook(WEBHOOKS.DEPENSE, {
          username: "Vespucci Direction",
          avatar_url: meta.ui?.discordAvatarUrl || undefined,
          embeds: [
            {
              title: "💸 Déclaration de Dépense",
              description: "Nouvelle dépense entreprise",
              color: 0x1abc9c,
              fields: [
                { name: "💰 Montant", value: `**${meta.currencySymbol}${amount.toFixed(2)}**`, inline: true },
                { name: "📅 Date effective", value: new Date(date).toLocaleDateString("fr-FR"), inline: true },
                { name: "🔄 Initié par", value: initiatedBy, inline: true },
                { name: "📝 Motif / Description", value: reason, inline: false },
                ...(details ? [{ name: "🏢 Entreprise / Fournisseur", value: details, inline: false }] : []),
              ],
              footer: { text: "Esthétique Vespucci - Direction" },
              timestamp: isoNow(),
            },
          ],
        });

        return NextResponse.json({ success: true });
      }

      // RH CLASSIQUE
      const employeeTarget = String(data.employeeTarget || data.employee || "").trim();
      if (!employeeTarget) {
        return NextResponse.json({ success: false, error: "Employé concerné manquant" }, { status: 400 });
      }

      await ensureHeadersIfEmpty(sheets, "RH", [
        "Date",
        "Type Action",
        "Employé",
        "Motif",
        "Date Effective",
        "Détails",
        "Initié par",
        "Horodatage",
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `'RH'!A:H`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              todayFR(),
              type,
              employeeTarget,
              reason,
              new Date(date).toLocaleDateString("fr-FR"),
              details || "",
              initiatedBy,
              isoNow(),
            ],
          ],
        },
      });

      const webhookMap = {
        recrutement: WEBHOOKS.RECRUTEMENT,
        convocation: WEBHOOKS.CONVOCATION,
        avertissement: WEBHOOKS.AVERTISSEMENT,
        licenciement: WEBHOOKS.LICENCIEMENT,
        demission: WEBHOOKS.DEMISSION,
      };

      const titles = {
        recrutement: { title: "➕ Recrutement", color: 0x2ecc71, desc: "Nouvelle embauche" },
        convocation: { title: "📋 Convocation", color: 0x3498db, desc: "Nouvelle convocation émise" },
        avertissement: { title: "⚠️ Avertissement", color: 0xf39c12, desc: "Nouvel avertissement émis" },
        licenciement: { title: "🔴 Licenciement", color: 0xe74c3c, desc: "Procédure de licenciement" },
        demission: { title: "📝 Démission", color: 0x9b59b6, desc: "Démission enregistrée" },
      };

      const t = titles[type] || { title: "Action RH", color: 0x777777, desc: "Action RH" };
      const wh = webhookMap[type];

      await sendDiscordWebhook(wh, {
        username: "Vespucci Direction",
        avatar_url: meta.ui?.discordAvatarUrl || undefined,
        embeds: [
          {
            title: t.title,
            description: t.desc,
            color: t.color,
            fields: [
              { name: "👤 Employé concerné", value: `**${employeeTarget}**`, inline: true },
              { name: "📅 Date effective", value: new Date(date).toLocaleDateString("fr-FR"), inline: true },
              { name: "🔄 Initié par", value: initiatedBy, inline: true },
              { name: "📝 Motif / Description", value: reason, inline: false },
              ...(details ? [{ name: "📋 Détails supplémentaires", value: details, inline: false }] : []),
            ],
            footer: { text: "Esthétique Vespucci - Direction" },
            timestamp: isoNow(),
          },
        ],
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    console.error("API error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
