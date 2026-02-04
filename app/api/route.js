import { NextResponse } from 'next/server';
import { getSheetData, RANGES } from '../lib/google'; // On importe la logique depuis ton fichier lib

// --- FONCTION PRINCIPALE (POST) ---
export async function POST(req) {
  try {
    const { action, data } = await req.json();
    
    // 1. Connexion via ta nouvelle fonction centralisée
    const { sheets, spreadsheetId } = await getSheetData();

    // =========================================================
    // 1. INITIALISATION (Récupère la liste pour le Select)
    // =========================================================
    if (action === 'getInitData') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.EFFECTIFS,
      });

      const rows = response.data.values || [];
      // On retourne juste les noms pour le login (Col B = Index 1)
      const employees = rows.map(row => row[1]); 
      return NextResponse.json({ success: true, employees });
    }

    // =========================================================
    // 2. LOGIN & PROFIL (Récupère tout : Salaire, CA, RH)
    // =========================================================
    if (action === 'login') {
      const userName = data.user;

      // A. Récupérer les infos de l'employé
      const staffRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.EFFECTIFS,
      });
      const staffRows = staffRes.data.values || [];
      
      // Recherche de la ligne correspondant au nom (Col B = Index 1)
      const userRow = staffRows.find(row => row[1] === userName);

      if (!userRow) return NextResponse.json({ success: false, message: 'Utilisateur introuvable' });

      const profile = {
        nom: userRow[1],
        grade: userRow[2],
        tel: userRow[3],
        iban: userRow[4],
        ca: userRow[9] ? userRow[9].replace('$', '').trim() : "0", // Col J
        salaire: userRow[10] ? userRow[10].replace('$', '').trim() : "0", // Col K
        photo: userRow[11] || "" // Col L
      };

      // B. Récupérer l'historique RH (Sanctions etc)
      const rhRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.RH_LOGS,
      });
      const rhRows = rhRes.data.values || [];
      
      // On filtre les logs où la "Cible" (Col C = Index 2) est l'utilisateur
      const history = rhRows
        .filter(row => row[2] === userName) 
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
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: RANGES.FACTURES,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[invoiceNumber, date, user, itemsString, totals.final, totals.discountPct > 0 ? 'Partenaire' : 'Standard']]
        },
      });

      // B. Mettre à jour le Chiffre d'Affaire (CA) de l'employé dans EFFECTIFS
      // 1. Trouver l'index de la ligne
      const staffRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.EFFECTIFS,
      });
      const rows = staffRes.data.values || [];
      const rowIndex = rows.findIndex(row => row[1] === user); // Col B = Nom

      if (rowIndex !== -1) {
        // Le CA est en Col J (index 9). Google Sheet commence ligne 1, mais range "A2" décale.
        const realRow = rowIndex + 2;
        
        // Récupérer ancienne valeur CA
        let oldCA = parseFloat((rows[rowIndex][9] || "0").replace(/[^\d.-]/g, ''));
        let newCA = oldCA + parseFloat(totals.final);

        // Update Cellule J{realRow}
        await sheets.spreadsheets.values.update({
          spreadsheetId,
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
      
      let rowData = [];
      const uuid = Math.floor(Math.random() * 100000);

      if (type === 'recrutement') {
        rowData = [uuid, date, `${formData.nom} ${formData.prenom}`, 'Recrutement', `Poste: ${formData.poste}`, user, formData.notes];
        
        // OPTIONNEL : Ajouter automatiquement une ligne dans EFFECTIFS si accepté
        if (formData.resultat === 'Accepté' || formData.resultat === 'Essai') {
           const newEmployeeRow = [
             uuid, 
             `${formData.nom} ${formData.prenom}`, 
             formData.poste, 
             formData.tel, 
             "", "", "", // IBAN, Naissance, Age vides
             date, // Date arrivée
             "0", // Ancienneté
             "0$", // CA
             "0$" // Salaire
           ];
           await sheets.spreadsheets.values.append({
              spreadsheetId,
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
      await sheets.spreadsheets.values.append({
        spreadsheetId,
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
      
      const configRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.CONFIG,
      });
      const rows = configRes.data.values || [];
      
      // On cherche une ligne Clé = 'ADMIN_PIN'
      const pinRow = rows.find(r => r[0] === 'ADMIN_PIN');
      const correctPin = pinRow ? pinRow[1] : '0000'; 

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

