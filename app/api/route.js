import { NextResponse } from 'next/server';
import { getSheetData, RANGES } from '../lib/google'; 

// --- FONCTION PRINCIPALE (POST) ---
export async function POST(req) {
  try {
    const { action, data } = await req.json();
    
    // 1. Connexion via ta fonction centralisée
    const { sheets, spreadsheetId } = await getSheetData();

    // =========================================================
    // 1. INITIALISATION (Liste Login + Annuaire complet)
    // =========================================================
    if (action === 'getInitData') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.EFFECTIFS,
      });

      const rows = response.data.values || [];
      
      // A. Liste simple pour le menu déroulant (Login)
      const employees = rows.map(row => row[1]); 
      
      // B. Liste structurée pour l'Annuaire (Nom, Poste, Tel, Photo)
      // Basé sur ton image : Col B=Nom, C=Poste, D=Tel, L=Photo (supposé)
      const directory = rows.map(row => ({
          nom: row[1], // On met le nom complet ici
          prenom: '',  // On laisse vide pour éviter les erreurs de découpage
          grade: row[2],
          tel: row[3],
          photo: row[11] || "" 
      }));

      return NextResponse.json({ success: true, employees, directory });
    }

    // =========================================================
    // 2. LOGIN & PROFIL (Récupère tout : Salaire, CA, RH)
    // =========================================================
    if (action === 'login') {
      const userName = data.user;

      const staffRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.EFFECTIFS,
      });
      const staffRows = staffRes.data.values || [];
      
      const userRow = staffRows.find(row => row[1] === userName);

      if (!userRow) return NextResponse.json({ success: false, message: 'Utilisateur introuvable' });

      const profile = {
        nom: userRow[1],
        grade: userRow[2],
        tel: userRow[3],
        iban: userRow[4],
        ca: userRow[9] ? userRow[9].replace('$', '').trim() : "0", 
        salaire: userRow[10] ? userRow[10].replace('$', '').trim() : "0", 
        photo: userRow[11] || "" 
      };

      const rhRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.RH_LOGS,
      });
      const rhRows = rhRes.data.values || [];
      
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
    // 3. ENVOI FACTURE
    // =========================================================
    if (action === 'sendFactures') {
      const { user, invoiceNumber, cart, totals } = data;
      const date = new Date().toLocaleDateString("fr-FR");
      const itemsString = cart.map(i => `${i.q}x ${i.n}`).join(', ');

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: RANGES.FACTURES,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[invoiceNumber, date, user, itemsString, totals.final, totals.discountPct > 0 ? 'Partenaire' : 'Standard']]
        },
      });

      const staffRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.EFFECTIFS,
      });
      const rows = staffRes.data.values || [];
      const rowIndex = rows.findIndex(row => row[1] === user); 

      if (rowIndex !== -1) {
        const realRow = rowIndex + 2;
        let oldCA = parseFloat((rows[rowIndex][9] || "0").replace(/[^\d.-]/g, ''));
        let newCA = oldCA + parseFloat(totals.final);

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
    // 4. ACTION RH
    // =========================================================
    if (action === 'sendHR') {
      const { type, formData, user } = data;
      const date = new Date().toLocaleDateString("fr-FR");
      
      let rowData = [];
      const uuid = Math.floor(Math.random() * 100000);

      if (type === 'recrutement') {
        rowData = [uuid, date, `${formData.nom} ${formData.prenom}`, 'Recrutement', `Poste: ${formData.poste}`, user, formData.notes];
        
        if (formData.resultat === 'Accepté' || formData.resultat === 'Essai') {
           const newEmployeeRow = [
             uuid, 
             `${formData.nom} ${formData.prenom}`, 
             formData.poste, 
             formData.tel, 
             "", "", "", 
             date, 
             "0", 
             "0$", 
             "0$" 
           ];
           await sheets.spreadsheets.values.append({
              spreadsheetId,
              range: RANGES.EFFECTIFS,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [newEmployeeRow] },
           });
        }

      } else {
        rowData = [uuid, date, formData.target, type, formData.motif, user, formData.proof || ""];
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: RANGES.RH_LOGS,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });

      return NextResponse.json({ success: true });
    }

    // =========================================================
    // 5. VERIFICATION PIN
    // =========================================================
    if (action === 'verifyPin') {
      const { pin } = data;
      
      const configRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.CONFIG,
      });
      const rows = configRes.data.values || [];
      
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
