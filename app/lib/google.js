import { google } from 'googleapis';

// --- AJOUT IMPORTANT : EXPORT DE LA CONSTANTE RANGES ---
export const RANGES = {
  EFFECTIFS: 'EFFECTIFS!A2:L',
  FACTURES: 'FACTURES!A2:F',
  RH_LOGS: 'RH_LOGS!A2:G',
  CONFIG: 'CONFIG!A2:B'
};

export async function getSheetData() {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Identifiants Google manquants dans les variables d'environnement");
  }

  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId: process.env.GOOGLE_SHEET_ID };
}
