export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// --- CONFIGURATION VESPUCCI ---
const PRICE_LIST = {
  'Petit Tatouage (tête)': 350, 'Moyen Tatouage (tête)': 450, 'Grand Tatouage (tête)': 600,
  'Petit Tatouage (Bras)': 450, 'Moyen Tatouage (Bras)': 600, 'Grand Tatouage (Bras)': 800,
  'Petit Tatouage (Jambes)': 450, 'Moyen Tatouage (Jambes)': 600, 'Grand Tatouage (Jambes)': 800,
  'Petit Tatouage (Torse/Dos)': 600, 'Moyen Tatouage (Torse/Dos)': 800, 'Grand Tatouage (Torse/Dos)': 1100,
  'Tatouage Custom': 3000, 'Petit Laser': 250, 'Moyen Laser': 500, 'Grand Laser': 750,
  'Coupe': 200, 'Couleur': 100, 'Barbe': 100, 'Dégradé': 100, 'Palette': 150, 'Épilation': 50,
  'Livraison NORD': 50, 'Livraison SUD': 50
};

const ENTERPRISES = {
  'HenHouse': 30, 'Auto Exotic': 30, 'LifeInvader': 30, 'Delight': 30, 'LTD Sandy Shores': 30
};

const WEBHOOKS = {
  factures: 'TON_WEBHOOK_DISCORD_FACTURES',
  depense: 'https://discord.com/api/webhooks/1458467290151653563/SGEnsRQJ2KDDnhUoCRmGp0IRM96o65gP-HVhWrxTzrDef02aS3SwtQKM2WG6iVKE43fs',
  rh: 'TON_WEBHOOK_RH'
};

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

    // --- RÉCUPÉRATION DES DONNÉES (META) ---
    if (action === 'getMeta') {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Factures'!A2:O", // Ajuste selon ton onglet Factures
      });
      
      // Récupération des employés (Onglet RH ou Factures colonne B)
      const empRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Factures'!B2:B", 
      });
      const employees = [...new Set(empRes.data.values?.flat() || [])].filter(Boolean).sort();

      return NextResponse.json({ success: true, employees, prices: PRICE_LIST, enterprises: ENTERPRISES });
    }

    // --- ENVOI FACTURE ---
    if (action === 'sendFactures') {
      const subtotal = data.items.reduce((acc, i) => acc + (PRICE_LIST[i.desc] * i.qty), 0);
      const discount = data.discount || 0;
      const total = subtotal * (1 - discount / 100);

      // Sauvegarde Sheets
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Factures'!A:O",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[new Date().toLocaleDateString('fr-FR'), data.employee, "", data.invoiceNumber, data.enterprise || "", data.customerName || "", "Non", "Remise", discount, subtotal, subtotal-total, total, data.items.length, data.items.map(i=>`${i.desc} (x${i.qty})`).join(', '), new Date().toISOString()]] }
      });

      // Discord
      await fetch(WEBHOOKS.factures, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `🧾 Facture Vespucci - ${data.invoiceNumber}`,
            color: 0x06b6d4,
            fields: [
              { name: "Employé", value: data.employee, inline: true },
              { name: "Client", value: data.customerName || "Inconnu", inline: true },
              { name: "Total", value: `**${total.toFixed(2)}$**`, inline: true },
              { name: "Détails", value: data.items.map(i => `• ${i.desc} x${i.qty}`).join('\n') }
            ]
          }]
        })
      });
    }

    // --- ENVOI DÉPENSE ---
    if (action === 'sendExpense') {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Calculation'!A:H",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[new Date().toLocaleDateString('fr-FR'), data.employee, "Staff", `DEP-${Date.now()}`, data.details, data.reason, 1, data.amount]] }
      });

      await fetch(WEBHOOKS.depense, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: "💸 Nouvelle Dépense",
            color: 0x1abc9c,
            fields: [
              { name: "Montant", value: `${data.amount}$`, inline: true },
              { name: "Initié par", value: data.employee, inline: true },
              { name: "Motif", value: data.reason }
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
