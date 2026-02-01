import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// --- CONFIGURATION ---
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const WEBHOOKS = {
    FACTURATION: 'TON_WEBHOOK_DISCORD',
    DEPENSE: 'TON_WEBHOOK_DEPENSES',
    RH: 'TON_WEBHOOK_RH'
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

        // 1. RECUPERATION DES EMPLOYES DEPUIS LE SHEET (Pour ne rien perdre)
        if (action === 'getMeta') {
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: "'Factures'!B2:C", // Ajuste selon ton onglet employé si différent
            });
            return NextResponse.json({ success: true, employees: res.data.values || [] });
        }

        // 2. ENREGISTREMENT FACTURE
        if (action === 'sendFactures') {
            const values = [[
                new Date().toLocaleDateString('fr-FR'),
                data.employee,
                data.role,
                data.invoiceNumber,
                data.enterprise || '',
                data.customerName || '',
                data.total,
                new Date().toISOString()
            ]];
            
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: "'Factures'!A:H",
                valueInputOption: 'RAW',
                requestBody: { values }
            });

            // Envoi Discord
            await fetch(WEBHOOKS.FACTURATION, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: `🧾 Facture N°${data.invoiceNumber}`,
                        fields: [
                            { name: 'Employé', value: data.employee, inline: true },
                            { name: 'Total', value: `${data.total}$`, inline: true }
                        ],
                        color: 0x00ff00
                    }]
                })
            });
        }

        // 3. GESTION DES DEPENSES (Onglet Calculation)
        if (action === 'sendExpense') {
            const values = [[
                new Date().toLocaleDateString('fr-FR'),
                data.initiatedBy,
                'Employé',
                `DEP-${Date.now().toString().slice(-6)}`,
                data.details,
                data.reason,
                1,
                data.amount
            ]];

            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: "'Calculation'!A:H",
                valueInputOption: 'RAW',
                requestBody: { values }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
