export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

/**
 * =========================================================
 *  CONFIG (COPIE LOGIQUE Apps Script)
 * =========================================================
 */
const APP_VERSION = '4.6';
const CURRENCY = { symbol: '$', code: 'USD' };

const CONFIG = {
  RATE_LIMIT: { MAX_REQUESTS_PER_MINUTE: 20, CACHE_DURATION: 60_000 },
  VALIDATION: {
    MIN_INVOICE_LENGTH: 3,
    MAX_INVOICE_LENGTH: 20,
    MAX_ITEMS_PER_REQUEST: 50,
    MIN_QUANTITY: 1,
    MAX_QUANTITY: 9999,
  },
};

// --- Produits & Prix (identiques à ton Apps Script) ---
const PRODUCTS = {
  tete: ['Petit Tatouage (tête)', 'Moyen Tatouage (tête)', 'Grand Tatouage (tête)'],
  torse: ['Petit Tatouage (Torse/Dos)', 'Moyen Tatouage (Torse/Dos)', 'Grand Tatouage (Torse/Dos)'],
  jambes: ['Petit Tatouage (Jambes)', 'Moyen Tatouage (Jambes)', 'Grand Tatouage (Jambes)'],
  bras: ['Petit Tatouage (Bras)', 'Moyen Tatouage (Bras)', 'Grand Tatouage (Bras)'],
  custom: ['Tatouage Custom'],
  lazer: ['Petit Laser', 'Moyen Laser', 'Grand Laser'],
  coiffeur: ['Coupe', 'Couleur', 'Barbe', 'Dégradé', 'Palette', 'Épilation'],
  services: ['Livraison NORD', 'Livraison SUD'],
};

const PRICE_LIST = {
  'Petit Tatouage (tête)': 350.0,
  'Moyen Tatouage (tête)': 450.0,
  'Grand Tatouage (tête)': 600.0,

  'Petit Tatouage (Bras)': 450.0,
  'Moyen Tatouage (Bras)': 600.0,
  'Grand Tatouage (Bras)': 800.0,

  'Petit Tatouage (Jambes)': 450.0,
  'Moyen Tatouage (Jambes)': 600.0,
  'Grand Tatouage (Jambes)': 800.0,

  'Petit Tatouage (Torse/Dos)': 600.0,
  'Moyen Tatouage (Torse/Dos)': 800.0,
  'Grand Tatouage (Torse/Dos)': 1100.0,

  'Tatouage Custom': 3000.0,

  'Petit Laser': 250.0,
  'Moyen Laser': 500.0,
  'Grand Laser': 750.0,

  'Coupe': 200.0,
  'Couleur': 100.0,
  'Barbe': 100.0,
  'Dégradé': 100.0,
  'Palette': 150.0,
  'Épilation': 50.0,

  'Livraison NORD': 50.0,
  'Livraison SUD': 50.0,
};

const ENTERPRISES_FALLBACK = {
  HenHouse: { discount: 30 },
  'Auto Exotic': { discount: 30 },
  LifeInvader: { discount: 30 },
  Delight: { discount: 30 },
  'Employé Confirmé': { discount: 30 },
  'LTD Sandy Shores': { discount: 30 },
};

// Annuaire fallback (si tu ne crées pas d’onglet Employés)
const DIRECTORY_FALLBACK = [
  { name: 'Julio Alvarez', role: 'Patron', avatar: 'https://i.goopics.net/pjtgz1.png', phone: '682-6030' },
  { name: 'Soren Bloom', role: 'Co-Patron', avatar: 'https://i.goopics.net/o6gnq3.png', phone: '575-5535' },
  { name: 'Sun Price', role: 'DRH', avatar: 'https://i.goopics.net/t7adhn.png', phone: '740-3572' },
  { name: 'Andres Hernandez', role: 'Responsable Coiffeur', avatar: 'https://i.goopics.net/yxrjrs.png', phone: '212-0212' },
  { name: 'Mason Bloom', role: 'Responsable Tatoueur', avatar: 'https://i.goopics.net/lsjb6c.png', phone: '646-5195' },
];

// Remises employés fallback (identique Apps Script)
const EMPLOYEE_DISCOUNTS_FALLBACK = {
  'Alvarez Julio': { role: 'PDG', discount: 0 },
  'Bloom Soren': { role: 'Co-PDG', discount: 0 },
  'Price Sun': { role: 'DRH', discount: 74 },
  'Hernandez Andres': { role: 'RE', discount: 59 },
  'Mason Bloom': { role: 'RE', discount: 59 },
  'Jimenez Taziñio': { role: 'Spécialiste', discount: 55 },
  'Rosales Kali': { role: 'Spécialiste', discount: 55 },
  'Daikii Isuke': { role: 'Tatoueur Expérimenté', discount: 44 },
  'Makara Chariya Chan': { role: 'Spécialiste', discount: 55 },
  'Price Moon': { role: 'Spécialiste', discount: 55 },
  'Jayden Lockett': { role: 'Spécialiste', discount: 55 },
  'Jayden Coleman': { role: 'Tatoueur Expérimenté', discount: 44 },
  'Moon Veda': { role: 'Coiffeur Novice', discount: 40 },
  'Inaya Kinslow': { role: 'Coiffeur Novice', discount: 40 },
  'Elijah Gonzalez': { role: 'Tatoueur Novice', discount: 37 },
  'Obito Valeria': { role: 'Coiffeur Novice', discount: 40 },
  'Kilyan Smith': { role: 'Tatoueur Novice', discount: 37 },
  'Lily Summer': { role: 'Coiffeur Novice', discount: 40 },
};

const EMPLOYEES_FALLBACK = Object.keys(EMPLOYEE_DISCOUNTS_FALLBACK)
  .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

/**
 * =========================================================
 *  ENV + GOOGLE AUTH
 * =========================================================
 */
function cleanEnv(v) {
  return (v || '').trim().replace(/^['"]|['"]$/g, '');
}

async function getAuthSheets() {
  const privateKeyInput = cleanEnv(process.env.GOOGLE_PRIVATE_KEY);
  const clientEmail = cleanEnv(process.env.GOOGLE_CLIENT_EMAIL);
  const sheetId = cleanEnv(process.env.GOOGLE_SHEET_ID);

  if (!privateKeyInput || !clientEmail || !sheetId) {
    throw new Error('ENV manquantes: GOOGLE_PRIVATE_KEY / GOOGLE_CLIENT_EMAIL / GOOGLE_SHEET_ID');
  }

  const privateKey = privateKeyInput.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT(clientEmail, null, privateKey, [
    'https://www.googleapis.com/auth/spreadsheets',
  ]);

  return google.sheets({ version: 'v4', auth });
}

/**
 * =========================================================
 *  DISCORD WEBHOOKS (SERVER ONLY)
 *  Mets tout en ENV, ne JAMAIS mettre un webhook côté client.
 * =========================================================
 */
const WEBHOOKS = {
  FACTURATION: cleanEnv(process.env.WEBHOOK_FACTURATION),
  CONVOCATION: cleanEnv(process.env.WEBHOOK_CONVOCATION),
  AVERTISSEMENT: cleanEnv(process.env.WEBHOOK_AVERTISSEMENT),
  LICENCIEMENT: cleanEnv(process.env.WEBHOOK_LICENCIEMENT),
  DEMISSION: cleanEnv(process.env.WEBHOOK_DEMISSION),
  RECRUTEMENT: cleanEnv(process.env.WEBHOOK_RECRUTEMENT),
  DEPENSE: cleanEnv(process.env.WEBHOOK_DEPENSE),
};

async function postToDiscordWebhook(url, payload) {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // Discord renvoie souvent 204
    if (!(res.status === 200 || res.status === 204)) {
      const text = await res.text().catch(() => '');
      console.error('Discord error:', res.status, text);
      return null;
    }
    return true;
  } catch (e) {
    console.error('Discord fetch error:', e?.message || e);
    return null;
  }
}

/**
 * =========================================================
 *  RATE LIMIT (best effort: serverless = pas garanti)
 * =========================================================
 */
const requestCache = new Map();
function checkRateLimit(key) {
  const now = Date.now();
  const requests = requestCache.get(key) || [];
  const recent = requests.filter((t) => now - t < CONFIG.RATE_LIMIT.CACHE_DURATION);
  if (recent.length >= CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    throw new Error('Trop de requêtes.');
  }
  recent.push(now);
  requestCache.set(key, recent);
}

/**
 * =========================================================
 *  SHEET HELPERS
 * =========================================================
 */
const SHEET_NAMES = {
  FACTURES: 'Factures',
  RH: 'RH',
  CALCULATION: 'Calculation',
  EMPLOYES: 'Employés', // optionnel (si tu veux tout piloter depuis le Sheet)
};

async function safeGetSheetTitles(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });
  return (meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);
}

async function ensureSheetWithHeaders(sheets, spreadsheetId, sheetName, headers) {
  const titles = await safeGetSheetTitles(sheets, spreadsheetId);
  if (!titles.includes(sheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    });
  }

  // Écrit les headers en ligne 1
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] },
  });
}

/**
 * =========================================================
 *  META CACHE (pour éviter 50 lectures Sheet)
 * =========================================================
 */
let metaCache = { at: 0, value: null };
const META_TTL_MS = 60_000;

function productsFlat() {
  return Object.values(PRODUCTS).flat();
}

/**
 * Si tu crées un onglet "Employés", on récupère:
 *  A: Name (ex: "Alvarez Julio")
 *  B: Role
 *  C: Phone
 *  D: Avatar URL
 *  E: Discount (number)
 *
 * Sinon on fallback sur les constantes.
 */
async function readEmployeesFromSheet(sheets, spreadsheetId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.EMPLOYES}'!A2:E200`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = res.data.values || [];
    const clean = rows
      .filter((r) => r && r[0])
      .map((r) => ({
        name: String(r[0] ?? '').trim(),
        role: String(r[1] ?? '').trim(),
        phone: String(r[2] ?? '').trim(),
        avatar: String(r[3] ?? '').trim(),
        discount: Number(r[4] ?? 0) || 0,
      }))
      .filter((x) => x.name);

    if (!clean.length) return null;

    const employees = clean.map((x) => x.name).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

    const directory = clean.map((x) => ({
      name: x.name.includes(' ') ? x.name.split(' ').reverse().join(' ') : x.name, // option "prenom nom"
      role: x.role || '',
      avatar: x.avatar || '',
      phone: x.phone || '',
    }));

    const employeeDiscounts = {};
    for (const e of clean) {
      employeeDiscounts[e.name] = { role: e.role || '', discount: e.discount || 0 };
    }

    return { employees, directory, employeeDiscounts };
  } catch {
    return null;
  }
}

async function getMetaInternal() {
  const now = Date.now();
  if (metaCache.value && now - metaCache.at < META_TTL_MS) return metaCache.value;

  const spreadsheetId = cleanEnv(process.env.GOOGLE_SHEET_ID);

  // Si pas d’ENV google, on renvoie fallback (pratique en dev UI)
  if (!spreadsheetId || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    const fallback = {
      version: APP_VERSION,
      serverTime: new Date().toISOString(),
      currencySymbol: CURRENCY.symbol,
      currencyCode: CURRENCY.code,
      employees: EMPLOYEES_FALLBACK,
      directory: DIRECTORY_FALLBACK,
      employeeDiscounts: EMPLOYEE_DISCOUNTS_FALLBACK,
      products: productsFlat(),
      productsByCategory: PRODUCTS,
      prices: PRICE_LIST,
      enterprises: ENTERPRISES_FALLBACK,
      discordConfigured: Boolean(WEBHOOKS.FACTURATION),
      sheetsConfigured: false,
      totals: { employees: EMPLOYEES_FALLBACK.length, products: productsFlat().length },
    };
    metaCache = { at: now, value: fallback };
    return fallback;
  }

  const sheets = await getAuthSheets();

  const fromSheet = await readEmployeesFromSheet(sheets, spreadsheetId);

  const meta = {
    version: APP_VERSION,
    serverTime: new Date().toISOString(),
    currencySymbol: CURRENCY.symbol,
    currencyCode: CURRENCY.code,
    employees: fromSheet?.employees || EMPLOYEES_FALLBACK,
    directory: fromSheet?.directory || DIRECTORY_FALLBACK,
    employeeDiscounts: fromSheet?.employeeDiscounts || EMPLOYEE_DISCOUNTS_FALLBACK,
    products: productsFlat(),
    productsByCategory: PRODUCTS,
    prices: PRICE_LIST,
    enterprises: ENTERPRISES_FALLBACK,
    discordConfigured: Boolean(WEBHOOKS.FACTURATION),
    sheetsConfigured: Boolean(spreadsheetId),
    totals: {
      employees: (fromSheet?.employees || EMPLOYEES_FALLBACK).length,
      products: productsFlat().length,
    },
  };

  metaCache = { at: now, value: meta };
  return meta;
}

/**
 * =========================================================
 *  VALIDATION + CALCULS (identiques Apps Script)
 * =========================================================
 */
function formatAmount(n) {
  const v = Number(n) || 0;
  return `${CURRENCY.symbol}${v.toFixed(2)}`;
}

function validateEmployee(meta, emp) {
  if (!emp || !meta.employees.includes(emp)) throw new Error('Employé invalide');
}

function validateInvoiceNumber(num) {
  const s = String(num || '').trim();
  if (s.length < CONFIG.VALIDATION.MIN_INVOICE_LENGTH || s.length > CONFIG.VALIDATION.MAX_INVOICE_LENGTH) {
    throw new Error('Numéro facture invalide');
  }
  return s;
}

function validateItems(items) {
  if (!Array.isArray(items) || !items.length) throw new Error('Aucun article');
  if (items.length > CONFIG.VALIDATION.MAX_ITEMS_PER_REQUEST) throw new Error('Trop d’articles');

  const clean = items
    .map((i) => ({
      desc: String(i?.desc || i?.name || '').trim(),
      qty: Math.floor(Number(i?.qty ?? i?.q ?? 0)),
    }))
    .filter((i) => i.desc && i.qty > 0);

  if (!clean.length) throw new Error('Aucun article');

  for (const it of clean) {
    if (!PRICE_LIST[it.desc]) throw new Error(`Produit invalide: ${it.desc}`);
    if (it.qty < CONFIG.VALIDATION.MIN_QUANTITY || it.qty > CONFIG.VALIDATION.MAX_QUANTITY) {
      throw new Error(`Quantité invalide: ${it.qty}`);
    }
  }
  return clean;
}

function getEmployeeRole(meta, name) {
  return meta.employeeDiscounts?.[name]?.role || '';
}
function getEmployeeDiscount(meta, name) {
  return Number(meta.employeeDiscounts?.[name]?.discount || 0) || 0;
}
function getFixedEnterpriseDiscount(ent) {
  return Number(ENTERPRISES_FALLBACK?.[ent]?.discount || 0) || 0;
}

function getWebhookForHRType(type) {
  const map = {
    recrutement: WEBHOOKS.RECRUTEMENT,
    convocation: WEBHOOKS.CONVOCATION,
    avertissement: WEBHOOKS.AVERTISSEMENT,
    licenciement: WEBHOOKS.LICENCIEMENT,
    demission: WEBHOOKS.DEMISSION,
    depense: WEBHOOKS.DEPENSE,
  };
  return map[type];
}

/**
 * =========================================================
 *  API POST
 * =========================================================
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action || 'getMeta';
    const data = body?.data || {};

    // --- META ---
    if (action === 'getMeta') {
      const meta = await getMetaInternal();
      return NextResponse.json({ success: true, ...meta });
    }

    const meta = await getMetaInternal();
    const spreadsheetId = cleanEnv(process.env.GOOGLE_SHEET_ID);

    // --- FACTURES ---
    if (action === 'sendFactures') {
      checkRateLimit('fact_' + String(data?.employee || 'x'));

      validateEmployee(meta, data.employee);
      const invoiceNumber = validateInvoiceNumber(data.invoiceNumber);

      const items = validateItems(data.items);

      const grandTotalBefore = items.reduce((s, it) => s + it.qty * Number(PRICE_LIST[it.desc] || 0), 0);

      const enterprise = String(data.enterprise || '').trim();
      const discountActivated = Boolean(data.discountActivated);

      let discountPct = 0;
      let discountType = 'Aucune';

      if (discountActivated) {
        if (enterprise) {
          discountPct = getFixedEnterpriseDiscount(enterprise);
          discountType = 'Entreprise';
        } else {
          discountPct = getEmployeeDiscount(meta, data.employee);
          discountType = 'Employé';
        }
      }

      const discountAmount = Number((grandTotalBefore * (discountPct / 100)).toFixed(2));
      const grandTotalAfter = Number((grandTotalBefore - discountAmount).toFixed(2));

      // --- Discord Facturation ---
      const embed = {
        title: `🧾 Facture N°${invoiceNumber}`,
        description: `**Nouvelle facture générée - Esthétique Vespucci**`,
        color: 0x0000ff,
        fields: [
          {
            name: '📋 Informations Générales',
            value: [
              `**Employé:** ${data.employee}`,
              `**Rôle:** ${getEmployeeRole(meta, data.employee) || '—'}`,
              `**Entreprise:** ${enterprise || '—'}`,
              `**Client:** ${String(data.customerName || '—')}`,
              `**Carte employé:** ${data.employeeCard ? 'Oui' : 'Non'}`,
            ].join('\n'),
            inline: false,
          },
          {
            name: '💰 Détails Financiers',
            value: [
              `**Sous-total:** ${formatAmount(grandTotalBefore)}`,
              `**Réduction:** ${discountPct}% (${formatAmount(discountAmount)})`,
              `**Type réduction:** ${discountType}`,
              `**Total final:** ${formatAmount(grandTotalAfter)}`,
            ].join('\n'),
            inline: false,
          },
          {
            name: '📜 Service effectué',
            value:
              items
                .map((it) => `• ${it.desc} ×${it.qty} - ${formatAmount(PRICE_LIST[it.desc] || 0)}`)
                .join('\n') || 'Aucun article',
            inline: false,
          },
        ],
        footer: { text: `Esthétique Vespucci - Facturation • ${new Date().toLocaleDateString('fr-FR')}` },
        timestamp: new Date().toISOString(),
      };

      const discordSent = await postToDiscordWebhook(WEBHOOKS.FACTURATION, {
        username: 'Secretaire Vespucci',
        avatar_url: 'https://i.goopics.net/3qa2y2.png',
        embeds: [embed],
      });

      // --- Sheets Factures ---
      let sheetsSaved = false;
      if (spreadsheetId && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
        const sheets = await getAuthSheets();

        // assure l’onglet + headers
        await ensureSheetWithHeaders(sheets, spreadsheetId, SHEET_NAMES.FACTURES, [
          'Date',
          'Employé',
          'Rôle',
          'N° Facture',
          'Entreprise',
          'Client',
          'Carte Employé',
          'Type Remise',
          '% Remise',
          'Sous-total',
          'Montant Remise',
          'Total',
          'Nb Articles',
          'Détails Articles',
          'Horodatage',
        ]);

        const now = new Date();
        const itemsDetails = items.map((it) => `${it.desc} (×${it.qty})`).join('; ');

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `'${SHEET_NAMES.FACTURES}'!A:O`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [
              [
                now.toLocaleDateString('fr-FR'),
                data.employee,
                getEmployeeRole(meta, data.employee) || '',
                invoiceNumber,
                enterprise || '',
                String(data.customerName || ''),
                data.employeeCard ? 'Oui' : 'Non',
                discountType,
                discountPct,
                grandTotalBefore,
                discountAmount,
                grandTotalAfter,
                items.length,
                itemsDetails,
                now.toISOString(),
              ],
            ],
          },
        });

        sheetsSaved = true;
      }

      return NextResponse.json({
        success: true,
        message: `Facture N°${invoiceNumber} envoyée vers l'entreprise${sheetsSaved ? ' et sauvegardée' : ''}`,
        subtotal: formatAmount(grandTotalBefore),
        discountActivated,
        discountPct: `${Number(discountPct).toFixed(2)}%`,
        discountType,
        discountAmount: formatAmount(discountAmount),
        total: formatAmount(grandTotalAfter),
        itemCount: items.length,
        discordSent: Boolean(discordSent),
        sheetsSaved: Boolean(sheetsSaved),
      });
    }

    // --- RH / DEPENSE ---
    if (action === 'sendHR') {
      checkRateLimit('hr_' + String(data?.initiatedBy || 'x'));

      const type = String(data.type || '').trim().toLowerCase();
      const employee = String(data.employee || '').trim(); // "cible" ou "montant" (depense)
      const reason = String(data.reason || '').trim();
      const date = String(data.date || '').trim();
      const initiatedBy = String(data.initiatedBy || '').trim();
      const details = String(data.details || '').trim();

      if (!type || !employee || !reason || !date || !initiatedBy) {
        throw new Error('Données incomplètes');
      }

      const webhookUrl = getWebhookForHRType(type);
      if (!webhookUrl) throw new Error(`Webhook manquant pour: ${type}`);

      const hrConfig = {
        recrutement: { color: 0x2ecc71, title: '➕ Recrutement', desc: 'Nouvelle embauche' },
        convocation: { color: 0x3498db, title: '📋 Convocation', desc: 'Nouvelle convocation émise' },
        avertissement: { color: 0xf39c12, title: '⚠️ Avertissement', desc: 'Nouvel avertissement émis' },
        licenciement: { color: 0xe74c3c, title: '🔴 Licenciement', desc: 'Procédure de licenciement' },
        demission: { color: 0x9b59b6, title: '📝 Démission', desc: 'Démission enregistrée' },
        depense: { color: 0x1abc9c, title: '💸 Déclaration de Dépense', desc: 'Nouvelle dépense entreprise' },
      };

      if (!hrConfig[type]) throw new Error('Type invalide');

      const isExpense = type === 'depense';
      const mainFieldLabel = isExpense ? '💰 Montant' : '👤 Employé concerné';

      // montant (depense) : accepte data.amount OU data.employee
      const amountRaw = String(data.amount ?? employee ?? '0');
      const amount = parseFloat(amountRaw.replace('$', '').replace(',', '.').trim()) || 0;

      const mainFieldValue = isExpense ? formatAmount(amount) : employee;

      const embed = {
        title: hrConfig[type].title,
        description: hrConfig[type].desc,
        color: hrConfig[type].color,
        fields: [
          { name: mainFieldLabel, value: `**${mainFieldValue}**`, inline: true },
          { name: '📅 Date effective', value: new Date(date).toLocaleDateString('fr-FR'), inline: true },
          { name: '🔄 Initié par', value: initiatedBy, inline: true },
          { name: '📝 Motif / Description', value: reason, inline: false },
        ],
        footer: { text: `Esthétique Vespucci - Direction` },
        timestamp: new Date().toISOString(),
      };

      if (details) {
        const detailsLabel = isExpense ? '🏢 Entreprise / Fournisseur' : '📋 Détails supplémentaires';
        embed.fields.push({ name: detailsLabel, value: details, inline: false });
      }

      const discordSent = await postToDiscordWebhook(webhookUrl, {
        username: 'Vespucci Direction',
        avatar_url: 'https://i.goopics.net/3qa2y2.png',
        embeds: [embed],
      });

      // --- Sheets RH / Calculation ---
      let sheetSaved = false;
      if (spreadsheetId && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
        const sheets = await getAuthSheets();
        const now = new Date();

        if (isExpense) {
          await ensureSheetWithHeaders(sheets, spreadsheetId, SHEET_NAMES.CALCULATION, [
            'Date',
            'Nom & Prénom',
            'Poste',
            'ID Facture',
            'Entreprise',
            'Motifs',
            'Quantités',
            'Montant',
          ]);

          const timestamp = Math.floor(Date.now() / 1000);
          const idFacture = `DEP-${String(timestamp).slice(-6)}`;

          const role = getEmployeeRole(meta, initiatedBy) || 'Employé';
          const entrepriseCible = details || 'Non spécifié';

          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `'${SHEET_NAMES.CALCULATION}'!A:H`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [
                [
                  new Date(date).toLocaleDateString('fr-FR'),
                  initiatedBy,
                  role,
                  idFacture,
                  entrepriseCible,
                  reason,
                  1,
                  amount,
                ],
              ],
            },
          });

          sheetSaved = true;
        } else {
          await ensureSheetWithHeaders(sheets, spreadsheetId, SHEET_NAMES.RH, [
            'Date',
            'Type Action',
            'Employé',
            'Motif',
            'Date Effective',
            'Détails',
            'Initié par',
            'Horodatage',
          ]);

          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `'${SHEET_NAMES.RH}'!A:H`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [
                [
                  now.toLocaleDateString('fr-FR'),
                  type,
                  employee,
                  reason,
                  new Date(date).toLocaleDateString('fr-FR'),
                  details || '',
                  initiatedBy,
                  now.toISOString(),
                ],
              ],
            },
          });

          sheetSaved = true;
        }
      }

      return NextResponse.json({ success: true, discordSent: Boolean(discordSent), sheetSaved: Boolean(sheetSaved) });
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
