import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// --- CONFIGURATION ---
const CURRENCY_SYMBOL = '$';

const PRICE_LIST = {
  'Petit Tatouage (tête)': 350, 'Moyen Tatouage (tête)': 450, 'Grand Tatouage (tête)': 600,
  'Petit Tatouage (Bras)': 450, 'Moyen Tatouage (Bras)': 600, 'Grand Tatouage (Bras)': 800,
  'Petit Tatouage (Jambes)': 450, 'Moyen Tatouage (Jambes)': 600, 'Grand Tatouage (Bras)': 800,
  'Petit Tatouage (Torse/Dos)': 600, 'Moyen Tatouage (Torse/Dos)': 800, 'Grand Tatouage (Torse/Dos)': 1100,
  'Tatouage Custom': 3000, 'Petit Laser': 250, 'Moyen Laser': 500, 'Grand Laser': 750,
  'Coupe': 200, 'Couleur': 100, 'Barbe': 100, 'Dégradé': 100, 'Palette': 150, 'Épilation': 50,
  'Livraison NORD': 50, 'Livraison SUD': 50
};

async function getSheetsClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

async function sendToDiscord(webhookUrl, payload) {
  if (!webhookUrl || webhookUrl.includes('COLLER')) return;
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function POST(req) {
  try {
    const { action, data } = await req.json();
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // --- ACTION : SYNC (Récupération données) ---
    if (action === 'getMeta') {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Employés'!A2:C50" // Ajuste selon ton onglet employé
      });
      return NextResponse.json({ success: true, employees: res.data.values || [] });
    }

    // --- ACTION : FACTURE ---
    if (action === 'sendFactures') {
      const timestamp = new Date().toISOString();
      const row = [
        new Date().toLocaleDateString('fr-FR'),
        data.employee,
        '', // Role
        data.invoiceNumber,
        data.enterprise || '—',
        data.customerName || '—',
        'Non', // Carte
        data.discountType,
        data.discountPct,
        data.subtotal,
        data.discountAmount,
        data.total,
        data.items.length,
        data.items.map(i => `${i.desc} (x${i.qty})`).join('; '),
        timestamp
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Factures'!A:O",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      });

      await sendToDiscord(process.env.WEBHOOK_FACTURATION, {
        embeds: [{
          title: `🧾 Facture N°${data.invoiceNumber}`,
          color: 0x00ff00,
          fields: [
            { name: "Employé", value: data.employee, inline: true },
            { name: "Total", value: `${data.total}${CURRENCY_SYMBOL}`, inline: true },
            { name: "Détails", value: row[13] }
          ]
        }]
      });
    }

    // --- ACTION : DEPENSE (Calculation) ---
    if (action === 'sendDepense') {
      const idFacture = `DEP-${Date.now().toString().slice(-6)}`;
      const row = [
        new Date().toLocaleDateString('fr-FR'),
        data.initiatedBy,
        'Direction',
        idFacture,
        data.details || 'Frais',
        data.reason,
        1,
        parseFloat(data.amount)
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Calculation'!A:H",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      });

      await sendToDiscord(process.env.WEBHOOK_DEPENSE, {
        embeds: [{
          title: "💸 Nouvelle Dépense",
          color: 0xff0000,
          fields: [
            { name: "Auteur", value: data.initiatedBy, inline: true },
            { name: "Montant", value: `${data.amount}${CURRENCY_SYMBOL}`, inline: true },
            { name: "Raison", value: data.reason }
          ]
        }]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
