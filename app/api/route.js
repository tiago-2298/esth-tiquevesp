export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// --- CONFIGURATION VESPUCCI ---
const CURRENCY = { symbol: '$', code: 'USD' };

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

// Webhooks par défaut (à configurer dans tes variables d'environnement idéalement)
const WEBHOOKS = {
  FACTURATION: 'TON_LIEN_WEBHOOK',
  DIRECTION: 'TON_LIEN_WEBHOOK',
  DEPENSE: 'https://discord.com/api/webhooks/1458467290151653563/SGEnsRQJ2KDDnhUoCRmGp0IRM96o65gP-HVhWrxTzrDef02aS3SwtQKM2WG6iVKE43fs'
};

async function getAuthSheets() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

export async function POST(request) {
  try {
    const { action, data } = await request.json();
    const sheets = await getAuthSheets();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (action === 'getMeta') {
      // Récupération des employés depuis l'onglet "Employés"
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Employés'!A2:C50",
      });
      return NextResponse.json({ success: true, employees: res.data.values || [] });
    }

    if (action === 'sendFactures') {
      // 1. Sauvegarde Google Sheets (Onglet Factures)
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Factures'!A:O",
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            new Date().toLocaleDateString('fr-FR'),
            data.employee,
            data.role || '',
            data.invoiceNumber,
            data.enterprise || '',
            data.customerName || '',
            data.items.map(i => `${i.desc} (x${i.qty})`).join('; '),
            data.total
          ]]
        }
      });

      // 2. Envoi Discord
      await fetch(WEBHOOKS.FACTURATION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `🧾 Facture N°${data.invoiceNumber}`,
            color: 0x0000ff,
            fields: [
              { name: '👤 Employé', value: data.employee, inline: true },
              { name: '💰 Total', value: `${data.total}$`, inline: true },
              { name: '📜 Services', value: data.items.map(i => `• ${i.desc} x${i.qty}`).join('\n') }
            ]
          }]
        })
      });
    }

    if (action === 'sendExpense') {
        // Enregistrement dans l'onglet "Calculation" (ton format spécifique)
        const timestamp = Math.floor(Date.now() / 1000);
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "'Calculation'!A:H",
            valueInputOption: 'RAW',
            requestBody: {
              values: [[
                new Date().toLocaleDateString('fr-FR'),
                data.employee,
                'Direction',
                `DEP-${timestamp.toString().slice(-6)}`,
                data.details || 'Frais',
                data.reason,
                1,
                data.amount
              ]]
            }
          });

          // Discord Dépense
          await fetch(WEBHOOKS.DEPENSE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title: "💸 Déclaration de Dépense",
                color: 0x1abc9c,
                fields: [
                  { name: 'Initié par', value: data.employee, inline: true },
                  { name: 'Montant', value: `${data.amount}$`, inline: true },
                  { name: 'Motif', value: data.reason }
                ]
              }]
            })
          });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
