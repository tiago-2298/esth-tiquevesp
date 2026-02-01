export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const WEBHOOKS = {
    FACTURATION: 'TON_WEBHOOK_ICI',
    RH: 'TON_WEBHOOK_ICI',
    DEPENSE: 'https://discord.com/api/webhooks/1458467290151653563/SGEnsRQJ2KDDnhUoCRmGp0IRM96o65gP-HVhWrxTzrDef02aS3SwtQKM2WG6iVKE43fs'
};

const PRICE_LIST = {
    'Petit Tatouage (tête)': 350.0, 'Moyen Tatouage (tête)': 450.0, 'Grand Tatouage (tête)': 600.0,
    'Petit Tatouage (Bras)': 450.0, 'Moyen Tatouage (Bras)': 600.0, 'Grand Tatouage (Bras)': 800.0,
    'Petit Tatouage (Jambes)': 450.0, 'Moyen Tatouage (Jambes)': 600.0, 'Grand Tatouage (Jambes)': 800.0,
    'Petit Tatouage (Torse/Dos)': 600.0, 'Moyen Tatouage (Torse/Dos)': 800.0, 'Grand Tatouage (Torse/Dos)': 1100.0,
    'Tatouage Custom': 3000.0, 'Petit Laser': 250.0, 'Moyen Laser': 500.0, 'Grand Laser': 750.0,
    'Coupe': 200.0, 'Couleur': 100.0, 'Barbe': 100.0, 'Dégradé': 100.0, 'Palette': 150.0, 'Épilation': 50.0,
    'Livraison NORD': 50.0, 'Livraison SUD': 50.0
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

        if (action === 'sendFactures') {
            const now = new Date();
            const rowData = [
                now.toLocaleDateString('fr-FR'),
                data.employee,
                data.role || '',
                data.invoiceNumber,
                data.enterprise || '',
                data.customerName || '',
                data.total,
                data.items.map(i => `${i.desc} (x${i.qty})`).join('; ')
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Factures!A:H',
                valueInputOption: 'RAW',
                requestBody: { values: [rowData] }
            });

            // Envoi Discord
            await fetch(WEBHOOKS.FACTURATION, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: `🧾 Facture N°${data.invoiceNumber}`,
                        color: 0x00d4ff,
                        fields: [
                            { name: 'Employé', value: data.employee, inline: true },
                            { name: 'Total', value: `${data.total}$`, inline: true },
                            { name: 'Détails', value: rowData[7] }
                        ]
                    }]
                })
            });
        }

        if (action === 'sendDepense') {
            const timestamp = Math.floor(Date.now() / 1000);
            const idFacture = `DEP-${timestamp.toString().slice(-6)}`;
            const rowData = [
                new Date().toLocaleDateString('fr-FR'),
                data.initiatedBy,
                'Direction',
                idFacture,
                data.details || 'Frais',
                data.reason,
                1,
                data.amount
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Calculation!A:H',
                valueInputOption: 'RAW',
                requestBody: { values: [rowData] }
            });

            await fetch(WEBHOOKS.DEPENSE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: "💸 Nouvelle Dépense",
                        color: 0x1abc9c,
                        fields: [
                            { name: 'Initié par', value: data.initiatedBy, inline: true },
                            { name: 'Montant', value: `${data.amount}$`, inline: true },
                            { name: 'Motif', value: data.reason }
                        ]
                    }]
                })
            });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
