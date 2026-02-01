import { google } from 'googleapis';

export async function getSheetData() {
  // Vérification des variables d'environnement
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
    throw new Error("Identifiants Google manquants dans .env.local");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId: process.env.GOOGLE_SHEET_ID };
}

// Récupère les employés. 
// Note : Si tu n'as pas d'onglet "Employés" spécifique, on utilisera la liste en dur dans route.js par défaut.
// Mais cette fonction reste utile si tu veux créer un onglet "Staff" pour gérer les accès dynamiquement.
export async function getEmployees() {
  try {
    const { sheets, spreadsheetId } = await getSheetData();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Staff'!A2:C", // Suppose un onglet Staff: A=Nom, B=Role, C=Phone
    });
    return response.data.values || [];
  } catch (e) {
    console.log("Pas d'onglet Staff trouvé ou erreur, utilisation fallback.");
    return []; 
  }
}
