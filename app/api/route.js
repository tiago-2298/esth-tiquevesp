export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// ================= CONFIGURATION VESPUCCI =================
const APP_VERSION = 'Titanium 5.0';
const CURRENCY = { symbol: '$', code: 'USD' };

// Configuration des produits (Catalogue)
const PRODUCTS_CAT = {
  'Tête': ['Petit Tatouage (tête)', 'Moyen Tatouage (tête)', 'Grand Tatouage (tête)'],
  'Torse/Dos': ['Petit Tatouage (Torse/Dos)', 'Moyen Tatouage (Torse/Dos)', 'Grand Tatouage (Torse/Dos)'],
  'Bras': ['Petit Tatouage (Bras)', 'Moyen Tatouage (Bras)', 'Grand Tatouage (Bras)'],
  'Jambes': ['Petit Tatouage (Jambes)', 'Moyen Tatouage (Jambes)', 'Grand Tatouage (Jambes)'],
  'Custom': ['Tatouage Custom'],
  'Laser': ['Petit Laser', 'Moyen Laser', 'Grand Laser'],
  'Coiffure': ['Coupe', 'Couleur', 'Barbe', 'Dégradé', 'Palette', 'Épilation'],
  'Logistique': ['Livraison NORD', 'Livraison SUD']
};

const PRICE_LIST = {
  'Petit Tatouage (tête)': 350.0, 'Moyen Tatouage (tête)': 450.0, 'Grand Tatouage (tête)': 600.0,
  'Petit Tatouage (Bras)': 450.0, 'Moyen Tatouage (Bras)': 600.0, 'Grand Tatouage (Bras)': 800.0,
  'Petit Tatouage (Jambes)': 450.0, 'Moyen Tatouage (Jambes)': 600.0, 'Grand Tatouage (Jambes)': 800.0,
  'Petit Tatouage (Torse/Dos)': 600.0, 'Moyen Tatouage (Torse/Dos)': 800.0, 'Grand Tatouage (Torse/Dos)': 1100.0,
  'Tatouage Custom': 3000.0,
  'Petit Laser': 250.0, 'Moyen Laser': 500.0, 'Grand Laser': 750.0,
  'Coupe': 200.0, 'Couleur': 100.0, 'Barbe': 100.0, 'Dégradé': 100.0, 'Palette': 150.0, 'Épilation': 50.0,
  'Livraison NORD': 50.0, 'Livraison SUD': 50.0
};

// Vos Webhooks (Remplacez les placeholders par vos liens réels si nécessaire)
const WEBHOOKS = {
  facturation: 'COLLER_TON_WEBHOOK_ICI', // Remplacez par votre lien Facturation
  recrutement: 'COLLER_TON_WEBHOOK_ICI',
  convocation: 'COLLER_TON_WEBHOOK_ICI',
  avertissement: 'COLLER_TON_WEBHOOK_ICI',
  licenciement: 'COLLER_TON_WEBHOOK_ICI',
  demission: 'COLLER_TON_WEBHOOK_ICI',
  depense: 'COLLER_TON_WEBHOOK_ICI'      // Celui de la direction
};

// Liste des partenaires pour le frontend
const PARTNERS = [
  { name: 'HenHouse', discount: 30 },
  { name: 'Auto Exotic', discount: 30 },
  { name: 'LifeInvader', discount: 30 },
  { name: 'Delight', discount: 30 },
  { name: 'LTD Sandy Shores', discount: 30 }
];

// ================= UTILS GOOGLE =================
function cleanEnv(v) { return (v || '').trim().replace(/^['"]|['"]$/g, ''); }

async function getAuthSheets() {
  const privateKeyInput = cleanEnv(process.env.GOOGLE_PRIVATE_KEY);
  const clientEmail = cleanEnv(process.env.GOOGLE_CLIENT_EMAIL);
  const sheetId = cleanEnv(process.env.GOOGLE_SHEET_ID);

  if (!privateKeyInput || !clientEmail || !sheetId) throw new Error("Credentials manquants");

  const privateKey = privateKeyInput.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT(clientEmail, null, privateKey, ['https://www.googleapis.com/auth/spreadsheets']);
  return google.sheets({ version: 'v4', auth });
}

async function sendDiscordWebhook(url, payload, fileBase64 = null) {
  if (!url || url.includes('COLLER')) return;
  try {
    if (fileBase64) {
      const formData = new FormData();
      const base64Data = String(fileBase64).split(',')[1] || '';
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: 'image/jpeg' });
      formData.append('file', blob, 'preuve.jpg');
      formData.append('payload_json', JSON.stringify(payload));
      await fetch(url, { method: 'POST', body: formData });
    } else {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  } catch (e) { console.error("Webhook error:", e); }
}

async function appendToSheet(range, values) {
    try {
        const sheets = await getAuthSheets();
        const sheetId = cleanEnv(process.env.GOOGLE_SHEET_ID);
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [values] }
        });
    } catch (e) { console.error("Sheet Error:", e); }
}

// ================= API HANDLER =================
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, data } = body;

    // --- 1. GET METADATA (Chargement initial) ---
    if (action === 'getMeta') {
      const sheets = await getAuthSheets();
      const sheetId = cleanEnv(process.env.GOOGLE_SHEET_ID);
      
      // On suppose que votre onglet s'appelle 'Employés' ou on utilise la liste statique si le sheet n'est pas prêt
      // Pour cet exemple, on renvoie les données statiques basées sur votre ancien code
      // Idéalement, mettez vos employés dans un onglet "Config" sur le Sheet
      
      const employeesSorted = [
        'Alvarez Julio', 'Bloom Soren', 'Price Sun', 'Hernandez Andres', 'Jimenez Taziñio',
        'Rosales Kali', 'Mason Bloom', 'Daikii Isuke', 'Moon Veda', "Makara Chariya Chan", 
        'Price Moon', 'Jayden Lockett', 'Jayden Coleman', 'Inaya Kinslow', 'Elijah Gonzalez',
        'Kilyan Smith', 'Obito Valeria', 'Lily Summer'
      ].sort();

      return NextResponse.json({
        success: true,
        version: APP_VERSION,
        employees: employeesSorted,
        productsByCategory: PRODUCTS_CAT,
        allProducts: Object.values(PRODUCTS_CAT).flat(),
        prices: PRICE_LIST,
        partners: PARTNERS
      });
    }

    let embed = {
      timestamp: new Date().toISOString(),
      footer: { text: `Esthétique Vespucci • ${APP_VERSION}` },
      color: 0x06b6d4 // Couleur Cyan Vespucci
    };

    // --- 2. TRAITEMENT DES ACTIONS ---
    switch (action) {
      
      case 'sendFacture': {
        const { employee, items, total, discountPct, discountAmount, finalTotal, client, invoiceNumber } = data;
        
        // Webhook Discord
        embed.title = `🧾 Facture N°${invoiceNumber}`;
        embed.fields = [
            { name: '👤 Employé', value: employee, inline: true },
            { name: 'clients', value: client || 'Anonyme', inline: true },
            { name: '💰 Total', value: `**${finalTotal} $**`, inline: true },
            { name: '📉 Réduction', value: `${discountPct}% (-${discountAmount}$)`, inline: true },
            { name: '📜 Détails', value: items.map(i => `• ${i.name} (x${i.qty})`).join('\n') }
        ];
        
        await sendDiscordWebhook(WEBHOOKS.facturation, { embeds: [embed] });

        // Sauvegarde Google Sheets (Onglet 'Factures')
        const itemsString = items.map(i => `${i.name} (x${i.qty})`).join('; ');
        const row = [
            new Date().toLocaleDateString('fr-FR'),
            employee,
            invoiceNumber,
            client,
            discountPct + '%',
            total, // Sous-total
            discountAmount,
            finalTotal,
            itemsString,
            new Date().toISOString()
        ];
        await appendToSheet("'Factures'!A:J", row);

        break;
      }

      case 'sendHR': {
        const { type, target, reason, author } = data;
        
        const colors = {
            'recrutement': 0x2ecc71,
            'convocation': 0x3498db,
            'avertissement': 0xf39c12,
            'licenciement': 0xe74c3c,
            'demission': 0x9b59b6
        };
        
        embed.title = `Dossier RH : ${type.toUpperCase()}`;
        embed.color = colors[type] || 0x000000;
        embed.fields = [
            { name: 'Action initiée par', value: author, inline: true },
            { name: 'Concernant', value: target, inline: true },
            { name: 'Motif / Détails', value: reason }
        ];

        const hook = WEBHOOKS[type] || WEBHOOKS.convocation; // Fallback
        await sendDiscordWebhook(hook, { embeds: [embed] });
        
        // Sauvegarde Sheets RH
        await appendToSheet("'RH'!A:E", [new Date().toLocaleDateString('fr-FR'), type, target, reason, author]);
        break;
      }

      case 'sendExpense': {
        const { author, amount, reason, file } = data;
        
        embed.title = `💸 Note de Frais`;
        embed.color = 0x1abc9c;
        embed.fields = [
            { name: 'Demandeur', value: author, inline: true },
            { name: 'Montant', value: `**${amount} $**`, inline: true },
            { name: 'Justificatif', value: reason }
        ];
        
        if (file) embed.image = { url: 'attachment://preuve.jpg' };
        
        await sendDiscordWebhook(WEBHOOKS.depense, { embeds: [embed] }, file);
        
        // Sauvegarde Sheets Dépenses (Format Calculation)
        // Headers legacy: Date, Nom, Poste(vide), ID(auto), Entreprise(vide), Motifs, Qty(1), Montant
        const idFacture = `DEP-${Math.floor(Date.now() / 1000)}`;
        await appendToSheet("'Calculation'!A:H", [
            new Date().toLocaleDateString('fr-FR'),
            author,
            'Employé',
            idFacture,
            'Fournisseur',
            reason,
            1,
            amount
        ]);
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
