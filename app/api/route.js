import { NextResponse } from 'next/server';
import { getSheetData, RANGES } from '../lib/google'; 

export async function POST(req) {
  try {
    const { action, data } = await req.json();
    const { sheets, spreadsheetId } = await getSheetData();

    // =========================================================
    // 1. INITIALISATION : Charge l'annuaire complet pour le Login + Onglet Annuaire
    // =========================================================
    if (action === 'getInitData') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.EFFECTIFS,
      });

      const rows = response.data.values || [];
      
      // On transforme les lignes du Sheet en objets propres
      // Col B[1]=Nom, Col C[2]=Poste, Col D[3]=Tel, Col L[11]=Photo
      const directory = rows.map(row => ({
        nom: row[1] || "Inconnu",
        poste: row[2] || "Non défini",
        tel: row[3] || "555-????",
        photo: row[11] || "" 
      })).filter(p => p.nom !== "Nom & Prénom"); // On retire l'en-tête si présent

      return NextResponse.json({ success: true, directory });
    }

    // =========================================================
    // 2. LOGIN & PROFIL
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
      const history = (rhRes.data.values || [])
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

      // Mise à jour CA
      const staffRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: RANGES.EFFECTIFS });
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
    // 4. RH & SECURITE
    // =========================================================
    if (action === 'sendHR') {
      const { type, formData, user } = data;
      const date = new Date().toLocaleDateString("fr-FR");
      const uuid = Math.floor(Math.random() * 100000);
      let rowData = [];

      if (type === 'recrutement') {
        rowData = [uuid, date, `${formData.nom} ${formData.prenom}`, 'Recrutement', `Poste: ${formData.poste}`, user, formData.notes];
        // Ajout auto dans effectifs si accepté
        if (formData.resultat === 'Accepté' || formData.resultat === 'Essai') {
           const newRow = [uuid, `${formData.nom} ${formData.prenom}`, formData.poste, formData.tel, "", "", "", date, "0", "0$", "0$"];
           await sheets.spreadsheets.values.append({ spreadsheetId, range: RANGES.EFFECTIFS, valueInputOption: 'USER_ENTERED', requestBody: { values: [newRow] }});
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

    if (action === 'verifyPin') {
      const { pin } = data;
      const configRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: RANGES.CONFIG });
      const pinRow = (configRes.data.values || []).find(r => r[0] === 'ADMIN_PIN');
      return NextResponse.json({ success: pin.toString() === (pinRow ? pinRow[1] : '0000').toString() });
    }

    return NextResponse.json({ success: false, message: 'Action inconnue' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
