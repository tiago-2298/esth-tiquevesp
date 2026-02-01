export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/google'; // Assure-toi que le chemin est bon

// ================= CONFIGURATION VESPUCCI =================
const APP_VERSION = '5.3.0-TITANIUM';

// Configuration Webhooks (Remplacer par tes vrais liens dans le code ou via ENV)
const WEBHOOKS = {
  facturation: process.env.DISCORD_WEBHOOK_FACTURATION || 'TON_LIEN_ICI',
  recrutement: process.env.DISCORD_WEBHOOK_RECRUTEMENT || 'TON_LIEN_ICI',
  convocation: process.env.DISCORD_WEBHOOK_CONVOCATION || 'TON_LIEN_ICI',
  avertissement: process.env.DISCORD_WEBHOOK_AVERTISSEMENT || 'TON_LIEN_ICI',
  licenciement: process.env.DISCORD_WEBHOOK_LICENCIEMENT || 'TON_LIEN_ICI',
  demission: process.env.DISCORD_WEBHOOK_DEMISSION || 'TON_LIEN_ICI',
  depense: process.env.DISCORD_WEBHOOK_DEPENSE || 'TON_LIEN_ICI',
};

// Données statiques (Fallback si Sheets inaccessible)
const EMPLOYEES_FALLBACK = [
  'Alvarez Julio', 'Bloom Soren', 'Price Sun', 'Hernandez Andres', 
  'Jimenez Taziñio', 'Rosales Kali', 'Mason Bloom', 'Daikii Isuke', 
  'Moon Veda', 'Makara Chariya Chan', 'Price Moon', 'Jayden Lockett', 
  'Jayden Coleman', 'Inaya Kinslow', 'Elijah Gonzalez', 'Kilyan Smith', 
  'Obito Valeria', 'Lily Summer'
];

const ROLES = {
  'Alvarez Julio': 'Patron', 'Bloom Soren': 'Co-Patron', 'Price Sun': 'DRH',
  'Hernandez Andres': 'Resp. Coiffeur', 'Mason Bloom': 'Resp. Tatoueur'
};

const ENTERPRISES = {
  'HenHouse': 30, 'Auto Exotic': 30, 'LifeInvader': 30, 
  'Delight': 30, 'Employé Confirmé': 30, 'LTD Sandy Shores': 30
};

const PRODUCTS_DATA = {
  'Tête': [
    {n:'Petit Tatouage (tête)', p:350}, {n:'Moyen Tatouage (tête)', p:450}, {n:'Grand Tatouage (tête)', p:600}
  ],
  'Torse/Dos': [
    {n:'Petit Tatouage (Torse/Dos)', p:600}, {n:'Moyen Tatouage (Torse/Dos)', p:800}, {n:'Grand Tatouage (Torse/Dos)', p:1100}
  ],
  'Jambes': [
    {n:'Petit Tatouage (Jambes)', p:450}, {n:'Moyen Tatouage (Jambes)', p:600}, {n:'Grand Tatouage (Jambes)', p:800}
  ],
  'Bras': [
    {n:'Petit Tatouage (Bras)', p:450}, {n:'Moyen Tatouage (Bras)', p:600}, {n:'Grand Tatouage (Bras)', p:800}
  ],
  'Custom': [
    {n:'Tatouage Custom', p:3000}
  ],
  'Laser': [
    {n:'Petit Laser', p:250}, {n:'Moyen Laser', p:500}, {n:'Grand Laser', p:750}
  ],
  'Coiffeur': [
    {n:'Coupe', p:200}, {n:'Couleur', p:100}, {n:'Barbe', p:100}, 
    {n:'Dégradé', p:100}, {n:'Palette', p:150}, {n:'Épilation', p:50}
  ],
  'Services': [
    {n:'Livraison NORD', p:50}, {n:'Livraison SUD', p:50}
  ]
};

// Aplatir pour recherche rapide des prix
const PRICE_LIST = {};
Object.values(PRODUCTS_DATA).flat().forEach(i => PRICE_LIST[i.n] = i.p);

// ================= HELPERS =================
async function sendDiscord(url, payload) {
  if (!url || url.includes('TON_LIEN')) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) { console.error("Discord Error", e); }
}

async function appendToSheet(range, values) {
  try {
    const { sheets, spreadsheetId } = await getSheetData();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] }
    });
    return true;
  } catch (e) {
    console.error("Sheets Error", e);
    return false;
  }
}

// ================= API ENTRY POINT =================
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    // --- 1. GET METADATA (Chargement initial) ---
    if (action === 'getMeta') {
      return NextResponse.json({
        success: true,
        employees: EMPLOYEES_FALLBACK,
        roles: ROLES,
        products: PRODUCTS_DATA,
        prices: PRICE_LIST,
        enterprises: ENTERPRISES,
        partners: [
           { name: "Julio Alvarez", role: "Patron", avatar: "https://i.goopics.net/pjtgz1.png", phone: "682-6030" },
           { name: "Soren Bloom", role: "Co-Patron", avatar: "https://i.goopics.net/o6gnq3.png", phone: "575-5535" },
           { name: "Sun Price", role: "DRH", avatar: "https://i.goopics.net/t7adhn.png", phone: "740-3572" }
        ]
      });
    }

    // --- 2. FACTURATION ---
    if (action === 'sendFactures') {
      const { employee, invoiceNumber, items, enterprise, discountPct, discountType, totalDetails } = data;
      
      // Discord Embed
      const embed = {
        title: `🧾 Facture N°${invoiceNumber}`,
        color: 0x06b6d4, // Cyan Vespucci
        fields: [
          { name: '👤 Vendeur', value: employee, inline: true },
          { name: '🏢 Client/Ent.', value: enterprise || 'Particulier', inline: true },
          { name: '💰 Total Final', value: `**${totalDetails.total}$**`, inline: true },
          { name: '📉 Remise', value: `${discountPct}% (${discountType})`, inline: true },
          { name: '📝 Articles', value: items.map(i => `• ${i.n} (x${i.q})`).join('\n') || 'Aucun' }
        ],
        footer: { text: `Vespucci Titanium • v${APP_VERSION}` },
        timestamp: new Date().toISOString()
      };

      await sendDiscord(WEBHOOKS.facturation, { embeds: [embed] });

      // Google Sheets : On respecte l'ordre exact de tes colonnes
      // ['Date', 'Employé', 'Rôle', 'N° Facture', 'Entreprise', 'Client', 'Carte Employé', 'Type Remise', '% Remise', 'Sous-total', 'Montant Remise', 'Total', 'Nb Articles', 'Détails Articles', 'Horodatage']
      const rowData = [
        new Date().toLocaleDateString('fr-FR'),
        employee,
        ROLES[employee] || 'Employé',
        invoiceNumber,
        enterprise || '',
        data.customerName || '',
        data.employeeCard ? 'Oui' : 'Non',
        discountType,
        discountPct,
        totalDetails.sub,
        totalDetails.discAmount,
        totalDetails.total,
        items.length,
        items.map(i => `${i.n} (x${i.q})`).join('; '),
        new Date().toISOString()
      ];

      await appendToSheet("'Factures'!A:O", rowData);
      return NextResponse.json({ success: true });
    }

    // --- 3. ACTIONS RH (Recrutement, Sanctions...) ---
    if (action === 'sendHR') {
      const { type, author, target, reason, dateEffet } = data;
      
      const colors = {
        recrutement: 0x2ecc71, convocation: 0x3498db, avertissement: 0xf39c12,
        licenciement: 0xe74c3c, demission: 0x9b59b6, depense: 0x1abc9c
      };

      const embed = {
        title: `Action RH : ${type.toUpperCase()}`,
        color: colors[type] || 0x99aab5,
        fields: [
          { name: 'Initiateur', value: author, inline: true },
          { name: 'Cible / Montant', value: target, inline: true },
          { name: 'Date Effet', value: dateEffet, inline: true },
          { name: 'Motif / Détails', value: reason }
        ],
        timestamp: new Date().toISOString()
      };

      const hook = WEBHOOKS[type] || WEBHOOKS.facturation;
      await sendDiscord(hook, { embeds: [embed] });

      // Sauvegarde dans l'onglet RH
      await appendToSheet("'RH'!A:H", [
        new Date().toLocaleDateString('fr-FR'),
        type,
        target, // Cible ou Montant
        reason,
        dateEffet,
        '', // Détails supp
        author,
        new Date().toISOString()
      ]);

      return NextResponse.json({ success: true });
    }

    // --- 4. DEPENSES (Compta) ---
    if (action === 'sendExpense') {
      const { author, amount, reason, supplier, file } = data;

      const embed = {
        title: '💸 Déclaration de Dépense',
        color: 0x1abc9c,
        fields: [
          { name: 'Employé', value: author, inline: true },
          { name: 'Montant', value: `**${amount}$**`, inline: true },
          { name: 'Fournisseur', value: supplier || 'N/A' },
          { name: 'Motif', value: reason }
        ]
      };

      // Gestion image preuve (base64)
      let discordPayload = { embeds: [embed] };
      // Note: Pour envoyer des fichiers via fetch/discord en serverless, c'est plus complexe avec FormData.
      // Ici on simplifie en n'envoyant que le texte si pas de multipart.
      // Si tu as besoin de l'image, il faut utiliser FormData comme dans Hen House.
      
      await sendDiscord(WEBHOOKS.depense, discordPayload);

      // Sauvegarde dans 'Calculation' (Format Dépenses)
      // Headers: ['Date', 'Nom & Prénom', 'Poste', 'ID Facture', 'Entreprise', 'Motifs', 'Quantités', 'Montant']
      const idFact = `DEP-${Math.floor(Date.now()/1000)}`;
      await appendToSheet("'Calculation'!A:H", [
        new Date().toLocaleDateString('fr-FR'),
        author,
        ROLES[author] || 'Employé',
        idFact,
        supplier,
        reason,
        1,
        amount
      ]);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
