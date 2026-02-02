export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

/** =========================
 *  CONFIG (copie Apps Script)
 *  ========================= */
const APP_VERSION = '4.6';

const CURRENCY = {
  symbol: '$',
  code: 'USD',
};

const CONFIG = {
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 20,
    CACHE_DURATION: 60_000,
  },
  VALIDATION: {
    MIN_INVOICE_LENGTH: 3,
    MAX_INVOICE_LENGTH: 20,
    MAX_ITEMS_PER_REQUEST: 50,
    MIN_QUANTITY: 1,
    MAX_QUANTITY: 9999,
  },
};

// ⚠️ La source de vérité: comme ton Apps Script
const ENTERPRISES: Record<string, { discount: number }> = {
  HenHouse: { discount: 30 },
  'Auto Exotic': { discount: 30 },
  LifeInvader: { discount: 30 },
  Delight: { discount: 30 },
  'Employé Confirmé': { discount: 30 },
  'LTD Sandy Shores': { discount: 30 },
};

// Partners (pour l’UI), basé sur ton HTML
const PARTNERS = [
  { name: 'HenHouse', discount: 30, img: 'https://i.goopics.net/xvvwd2.png', phone: '555-0192' },
  { name: 'Auto Exotic', discount: 30, img: 'https://i.goopics.net/jqrtnn.png', phone: '555-1029' },
  { name: 'LifeInvader', discount: 30, img: 'https://i.goopics.net/k7g19i.png', phone: '555-3920' },
  { name: 'Delight', discount: 30, img: 'https://i.goopics.net/1yiiit.png', phone: '555-8821' },
  { name: 'LTD Sandy Shores', discount: 30, img: 'https://i.goopics.net/4x8au4.png', phone: '555-6672' },
];

const EMPLOYEES = [
  'Alvarez Julio',
  'Bloom Soren',
  'Price Sun',
  'Hernandez Andres',
  'Jimenez Taziñio',
  'Rosales Kali',
  'Mason Bloom',
  'Daikii Isuke',
  'Moon Veda',
  'Makara Chariya Chan',
  'Price Moon',
  'Jayden Lockett',
  'Jayden Coleman',
  'Inaya Kinslow',
  'Elijah Gonzalez',
  'Kilyan Smith',
  'Obito Valeria',
  'Lily Summer',
].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

const DIRECTORY = [
  { name: 'Julio Alvarez', role: 'Patron', avatar: 'https://i.goopics.net/pjtgz1.png', phone: '682-6030' },
  { name: 'Soren Bloom', role: 'Co-Patron', avatar: 'https://i.goopics.net/o6gnq3.png', phone: '575-5535' },
  { name: 'Sun Price', role: 'DRH', avatar: 'https://i.goopics.net/t7adhn.png', phone: '740-3572' },
  { name: 'Andres Hernandez', role: 'Responsable Coiffeur', avatar: 'https://i.goopics.net/yxrjrs.png', phone: '212-0212' },
  { name: 'Mason Bloom', role: 'Responsable Tatoueur', avatar: 'https://i.goopics.net/lsjb6c.png', phone: '646-5195' },
];

const EMPLOYEE_DISCOUNTS: Record<string, { role: string; discount: number }> = {
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

const PRODUCTS: Record<string, string[]> = {
  Tête: ['Petit Tatouage (tête)', 'Moyen Tatouage (tête)', 'Grand Tatouage (tête)'],
  'Torse/Dos': ['Petit Tatouage (Torse/Dos)', 'Moyen Tatouage (Torse/Dos)', 'Grand Tatouage (Torse/Dos)'],
  Jambes: ['Petit Tatouage (Jambes)', 'Moyen Tatouage (Jambes)', 'Grand Tatouage (Jambes)'],
  Bras: ['Petit Tatouage (Bras)', 'Moyen Tatouage (Bras)', 'Grand Tatouage (Bras)'],
  Custom: ['Tatouage Custom'],
  Laser: ['Petit Laser', 'Moyen Laser', 'Grand Laser'],
  Coiffeur: ['Coupe', 'Couleur', 'Barbe', 'Dégradé', 'Palette', 'Épilation'],
  Services: ['Livraison NORD', 'Livraison SUD'],
};

const PRICE_LIST: Record<string, number> = {
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

  Coupe: 200.0,
  Couleur: 100.0,
  Barbe: 100.0,
  Dégradé: 100.0,
  Palette: 150.0,
  Épilation: 50.0,

  'Livraison NORD': 50.0,
  'Livraison SUD': 50.0,
};

const PRODUCTS_FLAT = Object.values(PRODUCTS).flat();

/** =========================
 *  ENV
 *  ========================= */
function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`ENV manquante: ${name}`);
  return v;
}

function discordWebhookFor(type: string) {
  // Comme Apps Script: mapping par type RH
  const map: Record<string, string | undefined> = {
    facturation: process.env.WEBHOOK_FACTURATION,
    recrutement: process.env.WEBHOOK_RECRUTEMENT,
    convocation: process.env.WEBHOOK_CONVOCATION,
    avertissement: process.env.WEBHOOK_AVERTISSEMENT,
    licenciement: process.env.WEBHOOK_LICENCIEMENT,
    demission: process.env.WEBHOOK_DEMISSION,
    depense: process.env.WEBHOOK_DEPENSE,
  };
  return map[type];
}

/** =========================
 *  RATE LIMIT (in-memory)
 *  ========================= */
const requestCache = new Map<string, number[]>();

function checkRateLimit(key: string) {
  const now = Date.now();
  const arr = requestCache.get(key) || [];
  const recent = arr.filter((t) => now - t < CONFIG.RATE_LIMIT.CACHE_DURATION);
  if (recent.length >= CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) throw new Error('Trop de requêtes.');
  recent.push(now);
  requestCache.set(key, recent);
}

/** =========================
 *  VALIDATIONS
 *  ========================= */
function validateEmployee(emp: string) {
  if (!emp || !EMPLOYEES.includes(emp)) throw new Error('Employé invalide');
}

function validateInvoiceNumber(num: string) {
  if (!num || num.length < CONFIG.VALIDATION.MIN_INVOICE_LENGTH || num.length > CONFIG.VALIDATION.MAX_INVOICE_LENGTH) {
    throw new Error('Numéro facture invalide');
  }
  return num;
}

function validateProducts(items: Array<{ desc: string; qty: number }>) {
  if (!items || !items.length) throw new Error('Aucun article');
  if (items.length > CONFIG.VALIDATION.MAX_ITEMS_PER_REQUEST) throw new Error('Trop d’articles');

  for (const it of items) {
    if (!it?.desc || !(it.desc in PRICE_LIST)) throw new Error(`Produit invalide: ${it?.desc}`);
    const q = Math.floor(Number(it.qty));
    if (q < CONFIG.VALIDATION.MIN_QUANTITY || q > CONFIG.VALIDATION.MAX_QUANTITY) throw new Error(`Quantité invalide: ${it.desc}`);
  }
}

function getEmployeeDiscount(name: string) {
  return EMPLOYEE_DISCOUNTS[name]?.discount || 0;
}
function getEmployeeRole(name: string) {
  return EMPLOYEE_DISCOUNTS[name]?.role || '';
}
function getFixedEnterpriseDiscount(ent: string) {
  return ENTERPRISES[ent]?.discount || 0;
}

function formatAmount(n: any) {
  const v = Number(n) || 0;
  return `${CURRENCY.symbol}${v.toFixed(2)}`;
}

/** =========================
 *  DISCORD
 *  ========================= */
async function postToDiscordWebhook(webhookUrl: string, payload: any) {
  if (!webhookUrl) throw new Error('Webhook non configuré');
  const r = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!(r.status === 200 || r.status === 204)) {
    const txt = await r.text();
    throw new Error(`Discord error: ${txt}`);
  }
  return true;
}

/** =========================
 *  GOOGLE SHEETS (API)
 *  ========================= */
async function getSheets() {
  const auth = new google.auth.JWT(
    mustEnv('GOOGLE_CLIENT_EMAIL'),
    undefined,
    mustEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

async function ensureSheetExists(sheets: any, spreadsheetId: string, title: string) {
  const info = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = (info.data.sheets || []).some((s: any) => s.properties?.title === title);
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  });
}

async function ensureHeaders(sheets: any, spreadsheetId: string, sheetName: string, headers: string[]) {
  await ensureSheetExists(sheets, spreadsheetId, sheetName);

  // Check first row
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!1:1`,
  });

  const row1 = (res.data.values?.[0] || []) as string[];
  const isMissing = row1.length === 0 || row1.join('|') !== headers.join('|');

  if (isMissing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }
}

/** =========================
 *  BUSINESS: getAppMeta
 *  ========================= */
function getAppMeta() {
  return {
    version: APP_VERSION,
    serverTime: new Date().toISOString(),
    employees: EMPLOYEES,
    directory: DIRECTORY,
    employeeDiscounts: EMPLOYEE_DISCOUNTS,
    products: PRODUCTS_FLAT,
    productsByCategory: PRODUCTS,
    prices: PRICE_LIST,
    enterprises: ENTERPRISES,
    partners: PARTNERS,
    currencySymbol: CURRENCY.symbol,
    currencyCode: CURRENCY.code,
    discordConfigured: !!process.env.WEBHOOK_FACTURATION,
    sheetsConfigured: !!process.env.GOOGLE_SHEET_ID,
    totals: { employees: EMPLOYEES.length, products: PRODUCTS_FLAT.length },
  };
}

/** =========================
 *  BUSINESS: sendFactures
 *  ========================= */
async function sendFactures(data: any) {
  checkRateLimit('fact_' + (data?.employee || 'x'));
  validateEmployee(data.employee);
  const invoiceNumber = validateInvoiceNumber(String(data.invoiceNumber || ''));

  const items = (data.items || []).filter((i: any) => i && i.desc && Number(i.qty) > 0).map((i: any) => ({
    desc: String(i.desc),
    qty: Math.floor(Number(i.qty)),
  }));

  validateProducts(items);

  const grandTotalBefore = items.reduce((s: number, i: any) => {
    const price = Number(PRICE_LIST[i.desc] ?? 0);
    return s + i.qty * price;
  }, 0);

  const enterprise = String(data.enterprise || '').trim();
  const discountActivated = !!data.discountActivated;

  let discountPct = 0;
  let discountType = 'Aucune';

  if (discountActivated) {
    if (enterprise) {
      discountPct = getFixedEnterpriseDiscount(enterprise);
      discountType = 'Entreprise';
    } else {
      discountPct = getEmployeeDiscount(data.employee);
      discountType = 'Employé';
    }
  }

  const discountAmount = +(grandTotalBefore * (discountPct / 100)).toFixed(2);
  const grandTotalAfter = +(grandTotalBefore - discountAmount).toFixed(2);

  // Discord embed (comme Apps Script)
  const factWebhook = discordWebhookFor('facturation');
  let discordSent = false;
  if (factWebhook) {
    const embed = {
      title: `🧾 Facture N°${invoiceNumber}`,
      description: `**Nouvelle facture générée - Esthétique Vespucci**`,
      color: 0x0000ff,
      fields: [
        {
          name: '📋 Informations Générales',
          value: [
            `**Employé:** ${data.employee}`,
            `**Rôle:** ${getEmployeeRole(data.employee) || '—'}`,
            `**Entreprise:** ${enterprise || '—'}`,
            `**Client:** ${data.customerName || '—'}`,
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
              .map((it: any) => `• ${it.desc} ×${it.qty} - ${formatAmount(PRICE_LIST[it.desc] || 0)}`)
              .join('\n') || 'Aucun article',
          inline: false,
        },
      ],
      footer: { text: `Esthétique Vespucci - Facturation • ${new Date().toLocaleDateString('fr-FR')}` },
      timestamp: new Date().toISOString(),
    };

    await postToDiscordWebhook(factWebhook, {
      username: 'Secretaire Vespucci',
      avatar_url: 'https://i.goopics.net/3qa2y2.png',
      embeds: [embed],
    });

    discordSent = true;
  }

  // Sheets (Factures)
  const spreadsheetId = mustEnv('GOOGLE_SHEET_ID');
  const sheets = await getSheets();

  const headers = [
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
  ];

  await ensureHeaders(sheets, spreadsheetId, 'Factures', headers);

  const now = new Date();
  const itemsDetails = items.map((it: any) => `${it.desc} (×${it.qty})`).join('; ');

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'Factures'!A:O`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          now.toLocaleDateString('fr-FR'),
          data.employee,
          getEmployeeRole(data.employee) || '',
          invoiceNumber,
          enterprise || '',
          data.customerName || '',
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

  return {
    success: true,
    message: `Facture N°${invoiceNumber} envoyée vers l'entreprise et sauvegardée`,
    subtotal: formatAmount(grandTotalBefore),
    discountActivated,
    discountPct: `${discountPct.toFixed(2)}%`,
    discountType,
    discountAmount: formatAmount(discountAmount),
    total: formatAmount(grandTotalAfter),
    itemCount: items.length,
    discordSent,
    sheetsSaved: true,
  };
}

/** =========================
 *  BUSINESS: sendHRNotification
 *  ========================= */
async function sendHRNotification(data: any) {
  checkRateLimit('hr_' + (data?.initiatedBy || 'x'));

  if (!data.type || !data.employee || !data.reason || !data.date) throw new Error('Données incomplètes');

  const type = String(data.type);
  const webhookUrl = discordWebhookFor(type);
  if (!webhookUrl) throw new Error(`Webhook manquant pour : ${type}`);

  const hrConfig: Record<string, { color: number; title: string; desc: string }> = {
    recrutement: { color: 0x2ecc71, title: '➕ Recrutement', desc: 'Nouvelle embauche' },
    convocation: { color: 0x3498db, title: '📋 Convocation', desc: 'Nouvelle convocation émise' },
    avertissement: { color: 0xf39c12, title: '⚠️ Avertissement', desc: 'Nouvel avertissement émis' },
    licenciement: { color: 0xe74c3c, title: '🔴 Licenciement', desc: 'Procédure de licenciement' },
    demission: { color: 0x9b59b6, title: '📝 Démission', desc: 'Démission enregistrée' },
    depense: { color: 0x1abc9c, title: '💸 Déclaration de Dépense', desc: 'Nouvelle dépense entreprise' },
  };

  const config = hrConfig[type];
  if (!config) throw new Error('Type invalide');

  const isExpense = type === 'depense';

  // Apps Script: pour dépense, data.employee contient le montant
  const rawAmount = data.amount ?? data.employee ?? '0';
  const cleanedAmount =
    parseFloat(String(rawAmount).replace('$', '').replace(',', '.').trim()) || 0;

  const mainFieldLabel = isExpense ? '💰 Montant' : '👤 Employé concerné';
  const mainFieldValue = isExpense ? formatAmount(cleanedAmount) : String(data.employee);

  const embed: any = {
    title: config.title,
    description: config.desc,
    color: config.color,
    fields: [
      { name: mainFieldLabel, value: `**${mainFieldValue}**`, inline: true },
      { name: '📅 Date effective', value: new Date(data.date).toLocaleDateString('fr-FR'), inline: true },
      { name: '🔄 Initié par', value: String(data.initiatedBy || '—'), inline: true },
      { name: '📝 Motif / Description', value: String(data.reason || '—'), inline: false },
    ],
    footer: { text: `Esthétique Vespucci - Direction` },
    timestamp: new Date().toISOString(),
  };

  if (data.details && String(data.details).trim()) {
    const detailsLabel = isExpense ? '🏢 Entreprise / Fournisseur' : '📋 Détails supplémentaires';
    embed.fields.push({ name: detailsLabel, value: String(data.details), inline: false });
  }

  await postToDiscordWebhook(webhookUrl, {
    username: 'Vespucci Direction',
    avatar_url: 'https://i.goopics.net/3qa2y2.png',
    embeds: [embed],
  });

  // Sheets
  const spreadsheetId = mustEnv('GOOGLE_SHEET_ID');
  const sheets = await getSheets();

  if (isExpense) {
    const sheetName = 'Calculation';
    const headers = ['Date', 'Nom & Prénom', 'Poste', 'ID Facture', 'Entreprise', 'Motifs', 'Quantités', 'Montant'];
    await ensureHeaders(sheets, spreadsheetId, sheetName, headers);

    const date = new Date(data.date).toLocaleDateString('fr-FR');
    const nomPrenom = String(data.initiatedBy || 'Inconnu');
    const role = getEmployeeRole(nomPrenom) || 'Employé';
    const motif = String(data.reason || 'Dépense');
    const entrepriseCible = String(data.details || 'Non spécifié');
    const timestamp = Math.floor(Date.now() / 1000);
    const idFacture = `DEP-${String(timestamp).slice(-6)}`;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${sheetName}'!A:H`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, nomPrenom, role, idFacture, entrepriseCible, motif, 1, cleanedAmount]],
      },
    });

    return { success: true, discordSent: true, sheetSaved: true };
  }

  // RH normal
  const rhSheet = 'RH';
  const headers = ['Date', 'Type Action', 'Employé', 'Motif', 'Date Effective', 'Détails', 'Initié par', 'Horodatage'];
  await ensureHeaders(sheets, spreadsheetId, rhSheet, headers);

  const now = new Date();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${rhSheet}'!A:H`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          now.toLocaleDateString('fr-FR'),
          type,
          String(data.employee),
          String(data.reason),
          new Date(data.date).toLocaleDateString('fr-FR'),
          String(data.details || ''),
          String(data.initiatedBy || ''),
          now.toISOString(),
        ],
      ],
    },
  });

  return { success: true, discordSent: true, sheetSaved: true };
}

/** =========================
 *  ROUTE
 *  ========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body?.action || '');
    const data = body?.data;

    if (action === 'getAppMeta') {
      return NextResponse.json({ success: true, data: getAppMeta() });
    }

    if (action === 'sendFactures') {
      const out = await sendFactures(data);
      return NextResponse.json(out);
    }

    if (action === 'sendHRNotification') {
      const out = await sendHRNotification(data);
      return NextResponse.json(out);
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erreur serveur' }, { status: 500 });
  }
}
