export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Configuration des prix (Identique à ton GS)
const PRICE_LIST = {
  'Petit Tatouage (tête)': 350, 'Moyen Tatouage (tête)': 450, 'Grand Tatouage (tête)': 600,
  'Petit Tatouage (Bras)': 450, 'Moyen Tatouage (Bras)': 600, 'Grand Tatouage (Bras)': 800,
  'Petit Tatouage (Jambes)': 450, 'Moyen Tatouage (Jambes)': 600, 'Grand Tatouage (Jambes)': 800,
  'Petit Tatouage (Torse/Dos)': 600, 'Moyen Tatouage (Torse/Dos)': 800, 'Grand Tatouage (Torse/Dos)': 1100,
  'Tatouage Custom': 3000, 'Petit Laser': 250, 'Moyen Laser': 500, 'Grand Laser': 750,
  'Coupe': 200, 'Couleur': 100, 'Barbe': 100, 'Dégradé': 100, 'Palette': 150, 'Épilation': 50,
  'Livraison NORD': 50, 'Livraison SUD': 50
};

// Accès Google
async function getAuthSheets() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

export async function POST(request) {
  try {
    const { action, data } = await request.json();
    const sheets = await getAuthSheets();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // ACTION : Récupérer les employés depuis le Sheet
    if (action === 'getMeta') {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Factures'!B2:B", // On prend la colonne des employés dans l'onglet Factures
      });
      const employees = [...new Set(res.data.values?.flat() || [])].filter(Boolean).sort();
      return NextResponse.json({ success: true, employees });
    }

    // ACTION : Envoyer Facture
    if (action === 'sendFactures') {
      // 1. Sauvegarde Sheets
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Factures'!A:O",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[
          new Date().toLocaleDateString('fr-FR'), data.employee, "", data.invoiceNumber, 
          data.enterprise || "", data.customerName || "", "Non", "Remise", data.discountPct, 
          data.subtotal, data.discountAmount, data.total, data.items.length, 
          data.items.map(i => `${i.n} (x${i.q})`).join('; '), new Date().toISOString()
        ]] }
      });

      // 2. Discord
      await fetch(process.env.WEBHOOK_FACTURES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `🧾 Facture N°${data.invoiceNumber}`,
            color: 0x0000ff,
            fields: [
              { name: 'Employé', value: data.employee, inline: true },
              { name: 'Total', value: `**${data.total}$**`, inline: true },
              { name: 'Détails', value: data.items.map(i => `• ${i.n} x${i.q}`).join('\n') }
            ],
            footer: { text: "Vespucci Titanium" },
            timestamp: new Date().toISOString()
          }]
        })
      });
    }

    // ACTION : Dépense (Onglet Calculation)
    if (action === 'sendHR' && data.type === 'depense') {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Calculation'!A:H",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[
          new Date(data.date).toLocaleDateString('fr-FR'), data.initiatedBy, "Staff", 
          `DEP-${Date.now()}`, data.details, data.reason, 1, data.amount
        ]] }
      });
      
      await fetch(process.env.WEBHOOK_DEPENSE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: "💸 Déclaration de Dépense",
            color: 0x1abc9c,
            fields: [
              { name: 'Initié par', value: data.initiatedBy, inline: true },
              { name: 'Montant', value: `${data.amount}$`, inline: true },
              { name: 'Motif', value: data.reason }
            ],
            timestamp: new Date().toISOString()
          }]
        })
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
