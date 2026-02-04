import { google } from 'googleapis';
import { NextResponse } from 'next/server';

/**
 * CONFIGURATION DES COLONNES DU SHEET (Basé sur ton image)
 * Assure-toi que l'ordre correspond exactement à ton Sheet.
 */
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGES = {
  EFFECTIFS: 'EFFECTIFS!A2:L', // On ignore la ligne d'en-tête (A1)
  FACTURES: 'FACTURES!A2:F',
  RH_LOGS: 'RH_LOGS!A2:G',
  CONFIG: 'CONFIG!A2:B'
};

// --- AUTHENTIFICATION GOOGLE ---
const getAuthSheets = async () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: 'v4', auth: client });

  return { googleSheets, auth };
};

// --- FONCTION PRINCIPALE (POST) ---
export async function POST(req) {
  try {
    const { action, data } = await req.json();
    const { googleSheets } = await getAuthSheets();

    // =========================================================
    // 1. INITIALISATION (Récupère la liste pour le Select)
    // =========================================================
    if (action === 'getInitData') {
      const response = await googleSheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGES.EFFECTIFS,
      });

      const rows = response.data.values || [];
      // On retourne juste les noms pour le login
      const employees = rows.map(row => row[1]); // Col B = Nom & Prénom
      return NextResponse.json({ success: true, employees });
    }

    // =========================================================
    // 2. LOGIN & PROFIL (Récupère tout : Salaire, CA, RH)
    // =========================================================
    if (action === 'login') {
      const userName = data.user;

      // A. Récupérer les infos de l'employé
      const staffRes = await googleSheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGES.EFFECTIFS,
      });
      const staffRows = staffRes.data.values || [];
      
      // Recherche de la ligne correspondant au nom (Col B = Index 1)
      // Structure Image: A=ID, B=Nom, C=Poste, D=Tel, E=IBAN, F=Naiss, G=Age, H=Arrive, I=Anc, J=CA, K=Salaire
      const userRow = staffRows.find(row => row[1] === userName);

      if (!userRow) return NextResponse.json({ success: false, message: 'Utilisateur introuvable' });

      const profile = {
        nom: userRow[1],
        grade: userRow[2],
        tel: userRow[3],
        iban: userRow[4],
        ca: userRow[9] ? userRow[9].replace('$', '').trim() : "0", // Col J
        salaire: userRow[10] ? userRow[10].replace('$', '').trim() : "0", // Col K
        photo: userRow[11] || "" // Supposons Col L pour photo (à ajouter dans ton sheet)
      };

      // B. Récupérer l'historique RH (Sanctions etc)
      const rhRes = await googleSheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGES.RH_LOGS,
      });
      const rhRows = rhRes.data.values || [];
      
      // On filtre les logs où la "Cible" (Col C = Index 2 supposé) est l'utilisateur
      const history = rhRows
        .filter(row => row[2] === userName) // Supposons: A=ID, B=Date, C=Cible, D=Type, E=Motif, F=Auteur
        .map(row => ({
          date: row[1],
          type: row[3],
          motif: row[4],
          auteur: row[5]
        }));

      return NextResponse.json({ success: true, profile, history });
    }

    // =========================================================
    // 3. ENVOI FACTURE (Ajout ligne + Update CA Employé)
    // =========================================================
    if (action === 'sendFactures') {
      const { user, invoiceNumber, cart, totals } = data;
      const date = new Date().toLocaleDateString("fr-FR");
      const itemsString = cart.map(i => `${i.q}x ${i.n}`).join(', ');

      // A. Ajouter dans l'onglet FACTURES
      await googleSheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: RANGES.FACTURES,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[invoiceNumber, date, user, itemsString, totals.final, totals.discountPct > 0 ? 'Partenaire' : 'Standard']]
        },
      });

      // B. Mettre à jour le Chiffre d'Affaire (CA) de l'employé dans EFFECTIFS
      // 1. Trouver l'index de la ligne
      const staffRes = await googleSheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGES.EFFECTIFS,
      });
      const rows = staffRes.data.values || [];
      const rowIndex = rows.findIndex(row => row[1] === user); // Col B = Nom

      if (rowIndex !== -1) {
        // Le CA est en Col J (index 9). Google Sheet commence à la ligne 1, mais range "A2" décale.
        // Calcul précis de la ligne : rowIndex (0-based) + 2 (Header + 1-based start)
        const realRow = rowIndex + 2;
        
        // Récupérer ancienne valeur CA
        let oldCA = parseFloat((rows[rowIndex][9] || "0").replace(/[^\d.-]/g, ''));
        let newCA = oldCA + parseFloat(totals.final);

        // Update Cellule J{realRow}
        await googleSheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `EFFECTIFS!J${realRow}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[`${newCA}$`]] }
        });
      }

      return NextResponse.json({ success: true });
    }

    // =========================================================
    // 4. ACTION RH (Recrutement, Sanction...)
    // =========================================================
    if (action === 'sendHR') {
      const { type, formData, user } = data;
      const date = new Date().toLocaleDateString("fr-FR");
      
      // Structure des colonnes RH_LOGS : ID, Date, Cible, Type, Motif, Auteur, Détails/Preuve
      let rowData = [];
      const uuid = Math.floor(Math.random() * 100000);

      if (type === 'recrutement') {
        rowData = [uuid, date, `${formData.nom} ${formData.prenom}`, 'Recrutement', `Poste: ${formData.poste}`, user, formData.notes];
        
        // OPTIONNEL : Ajouter automatiquement une ligne dans EFFECTIFS
        if (formData.resultat === 'Accepté' || formData.resultat === 'Essai') {
           const newEmployeeRow = [
             uuid, // ID
             `${formData.nom} ${formData.prenom}`, // Nom complet
             formData.poste, // Poste
             formData.tel, // Tel
             "", // IBAN (vide)
             "", // Date Naissance
             "", // Age
             date, // Date arrivée
             "0", // Ancienneté
             "0$", // CA
             "0$" // Salaire
           ];
           await googleSheets.spreadsheets.values.append({
              spreadsheetId: SHEET_ID,
              range: RANGES.EFFECTIFS,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [newEmployeeRow] },
           });
        }

      } else {
        // Pour Avertissement, Licenciement, Convocation...
        rowData = [uuid, date, formData.target, type, formData.motif, user, formData.proof || ""];
      }

      // Enregistrement dans RH_LOGS
      await googleSheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: RANGES.RH_LOGS,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });

      return NextResponse.json({ success: true });
    }

    // =========================================================
    // 5. VERIFICATION PIN (Sécurité)
    // =========================================================
    if (action === 'verifyPin') {
      const { pin } = data;
      
      const configRes = await googleSheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGES.CONFIG,
      });
      const rows = configRes.data.values || [];
      
      // On cherche une ligne Clé = 'ADMIN_PIN'
      const pinRow = rows.find(r => r[0] === 'ADMIN_PIN');
      const correctPin = pinRow ? pinRow[1] : '0000'; // Code par défaut si non trouvé

      if (pin.toString() === correctPin.toString()) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false });
      }
    }

    return NextResponse.json({ success: false, message: 'Action inconnue' });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
