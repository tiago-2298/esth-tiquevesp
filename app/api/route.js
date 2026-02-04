import { NextResponse } from 'next/server';
import { getSheetData, RANGES } from '../lib/google'; 

export async function POST(req) {
  try {
    const { action, data } = await req.json();
    const { sheets, spreadsheetId } = await getSheetData();

    // =========================================================
    // 1. INITIALISATION (Récupère Annuaire complet et sécurisé)
    // =========================================================
    if (action === 'getInitData') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.EFFECTIFS,
      });

      const rows = response.data.values || [];
      
      // 1. Liste simple pour le menu déroulant (Login) - On filtre les vides
      const employees = rows
        .filter(row => row[1]) // Garde seulement si la colonne Nom est remplie
        .map(row => row[1]); 
      
      // 2. Annuaire complet sécurisé
      const directory = rows
        .filter(row => row[1]) // IMPORTANT : On ignore les lignes vides ici pour éviter le crash
        .map(row => {
            // Découpage intelligent du nom "Alvarez Julio" -> Nom: Alvarez, Prénom: Julio
            const fullName = row[1] || "Inconnu";
            const parts = fullName.split(' ');
            const nom = parts[0];
            const prenom = parts.slice(1).join(' '); // Le reste est le prénom

            return {
                nom: nom, 
                prenom: prenom,
                grade: row[2] || "Non défini",
                tel: row[3] || "N/A",
                photo: row[11] || "" 
            };
        });

      return NextResponse.json({ success: true, employees, directory });
    }

    // =========================================================
    // 2. LOGIN (Reste identique mais sécurisé)
    // =========================================================
    if (action === 'login') {
      const userName = data.user;
      const staffRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: RANGES.EFFECTIFS });
      const staffRows = staffRes.data.values || [];
      const userRow = staffRows.find(row => row[1] === userName);

      if (!userRow) return NextResponse.json({ success: false, message: 'Introuvable' });

      const profile = {
        nom: userRow[1],
        grade: userRow[2],
        tel: userRow[3],
        iban: userRow[4],
        ca: userRow[9] ? userRow[9].replace('$', '').trim() : "0", 
        salaire: userRow[10] ? userRow[10].replace('$', '').trim() : "0", 
        photo: userRow[11] || "" 
      };

      const rhRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: RANGES.RH_LOGS });
      const rhRows = rhRes.data.values || [];
      const history = rhRows.filter(row => row[2] === userName).map(row => ({
          date: row[1], type: row[3], motif: row[4], auteur: row[5]
      }));

      return NextResponse.json({ success: true, profile, history });
    }

    // ... (Le reste : sendFactures, sendHR, verifyPin reste identique au code précédent) ...
    // Je ne remets pas tout pour ne pas saturer, garde la fin de ton fichier route.js actuel 
    // ou dis-moi si tu veux le fichier entier à nouveau.
    
    // --- PARTIE SUIVANTE À GARDER TELLE QUELLE ---
    if (action === 'sendFactures') {
      const { user, invoiceNumber, cart, totals } = data;
      const date = new Date().toLocaleDateString("fr-FR");
      const itemsString = cart.map(i => `${i.q}x ${i.n}`).join(', ');
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: RANGES.FACTURES, valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[invoiceNumber, date, user, itemsString, totals.final, totals.discountPct > 0 ? 'Partenaire' : 'Standard']] },
      });
      // Update CA
      const staffRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: RANGES.EFFECTIFS });
      const rows = staffRes.data.values || [];
      const rowIndex = rows.findIndex(row => row[1] === user); 
      if (rowIndex !== -1) {
        const realRow = rowIndex + 2;
        let oldCA = parseFloat((rows[rowIndex][9] || "0").replace(/[^\d.-]/g, ''));
        let newCA = oldCA + parseFloat(totals.final);
        await sheets.spreadsheets.values.update({
          spreadsheetId, range: `EFFECTIFS!J${realRow}`, valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[`${newCA}$`]] }
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'sendHR') {
      const { type, formData, user } = data;
      const date = new Date().toLocaleDateString("fr-FR");
      let rowData = [];
      const uuid = Math.floor(Math.random() * 100000);
      if (type === 'recrutement') {
        rowData = [uuid, date, `${formData.nom} ${formData.prenom}`, 'Recrutement', `Poste: ${formData.poste}`, user, formData.notes];
        if (formData.resultat === 'Accepté' || formData.resultat === 'Essai') {
           const newEmployeeRow = [uuid, `${formData.nom} ${formData.prenom}`, formData.poste, formData.tel, "", "", "", date, "0", "0$", "0$"];
           await sheets.spreadsheets.values.append({ spreadsheetId, range: RANGES.EFFECTIFS, valueInputOption: 'USER_ENTERED', requestBody: { values: [newEmployeeRow] } });
        }
      } else {
        rowData = [uuid, date, formData.target, type, formData.motif, user, formData.proof || ""];
      }
      await sheets.spreadsheets.values.append({ spreadsheetId, range: RANGES.RH_LOGS, valueInputOption: 'USER_ENTERED', requestBody: { values: [rowData] } });
      return NextResponse.json({ success: true });
    }

    if (action === 'verifyPin') {
      const { pin } = data;
      const configRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: RANGES.CONFIG });
      const rows = configRes.data.values || [];
      const pinRow = rows.find(r => r[0] === 'ADMIN_PIN');
      const correctPin = pinRow ? pinRow[1] : '0000'; 
      return NextResponse.json({ success: pin.toString() === correctPin.toString() });
    }

    return NextResponse.json({ success: false, message: 'Action inconnue' });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
