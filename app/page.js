'use client';

import React, { useEffect, useRef } from 'react';

type VespucciMeta = {
  version: string;
  serverTime: string;
  employees: string[];
  directory: Array<{ name: string; role: string; avatar: string; phone: string }>;
  employeeDiscounts: Record<string, { role: string; discount: number }>;
  products: string[];
  productsByCategory: Record<string, string[]>;
  prices: Record<string, number>;
  enterprises: Record<string, { discount: number }>;
  partners: Array<{ name: string; discount: number; img: string; phone: string }>;
  currencySymbol: string;
  currencyCode: string;
  discordConfigured: boolean;
  sheetsConfigured: boolean;
  totals: { employees: number; products: number };
};

declare global {
  interface Window {
    __VESPUCCI_META__?: VespucciMeta;
    app?: any;
  }
}

function formatAmount(n: any, symbol = '$') {
  const v = Number(n) || 0;
  return `${symbol}${v.toFixed(2)}`;
}

async function apiCall<T = any>(action: string, data?: any): Promise<T> {
  const res = await fetch('/api/vespucci', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ action, data }),
  });
  const json = await res.json();
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || 'Erreur serveur');
  }
  return json;
}

function attachApp(meta: VespucciMeta) {
  const CURRENCY_SYMBOL = meta.currencySymbol || '$';

  const getEmployeeRole = (name: string) => meta.employeeDiscounts?.[name]?.role || '';
  const getEmployeeDiscount = (name: string) => meta.employeeDiscounts?.[name]?.discount || 0;
  const getEnterpriseDiscount = (ent: string) => meta.enterprises?.[ent]?.discount || 0;

  const toast = (m: string, t: 'success' | 'error' = 'success') => {
    const c = document.getElementById('toast-container');
    if (!c) return;

    const d = document.createElement('div');
    d.className = 'card';
    d.style.cssText = `padding:12px 24px; margin-bottom:15px; border-left:4px solid ${
      t === 'error' ? '#ef4444' : '#10b981'
    }; background: rgba(15,15,22,0.95); animation: fadeIn 0.3s;`;

    d.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">
      <i class="${t === 'error' ? 'ri-error-warning-fill' : 'ri-checkbox-circle-fill'}" 
         style="color:${t === 'error' ? '#ef4444' : '#10b981'}"></i> 
      ${m}
    </div>`;

    c.appendChild(d);
    setTimeout(() => d.remove(), 3200);
  };

  const setInvoiceId = () => {
    const inv = document.getElementById('inv-number') as HTMLInputElement | null;
    if (inv) inv.value = `INV-${Math.floor(Math.random() * 1000000)}`;
  };

  // App "DOM driven" comme ton HTML GS
  window.app = {
    user: null as null | { name: string },
    cart: [] as Array<{ desc: string; price: number; qty: number }>,
    currentContact: null as null | string,

    init: () => {
      // employees
      const sel = document.getElementById('employeeSelect') as HTMLSelectElement | null;
      if (sel) {
        sel.innerHTML = `<option value="" selected>Choisir une identité...</option>`;
        meta.employees.forEach((e) => {
          const opt = document.createElement('option');
          opt.value = e;
          opt.textContent = e;
          sel.appendChild(opt);
        });
      }

      // enterprises select (disc-select)
      const discSel = document.getElementById('disc-select') as HTMLSelectElement | null;
      if (discSel) {
        discSel.innerHTML = '';
        const opt0 = document.createElement('option');
        opt0.value = '';
        opt0.innerText = 'Entreprise (aucune)';
        discSel.appendChild(opt0);

        // On affiche les partenaires (mêmes noms que ENTERPRISES)
        meta.partners.forEach((p) => {
          const opt = document.createElement('option');
          opt.value = p.name; // IMPORTANT: on envoie le NOM (comme Apps Script)
          opt.innerText = `${p.name} (-${p.discount}%)`;
          discSel.appendChild(opt);
        });
      }

      // clock
      const tick = () => {
        const el = document.getElementById('clock');
        if (el) el.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      };
      tick();
      setInterval(tick, 1000);

      // seed directory local
      const key = 'vespucci_contacts';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(existing) || existing.length === 0) {
        // convert meta.directory -> local format
        const initial = meta.directory.map((d) => {
          const parts = d.name.split(' ');
          const prenom = parts[0] || '';
          const nom = parts.slice(1).join(' ') || '';
          return { nom, prenom, grade: d.role || 'Employé', tel: d.phone || '', photo: d.avatar || '' };
        });
        localStorage.setItem(key, JSON.stringify(initial));
      }

      window.app.renderCatalog();
      window.app.renderPartners();
      window.app.renderAnnuaire();
      setInvoiceId();
      window.app.calc();
    },

    login: () => {
      const sel = document.getElementById('employeeSelect') as HTMLSelectElement | null;
      const name = sel?.value || '';
      if (!name) return;

      window.app.user = { name };
      const gate = document.getElementById('gate');
      const content = document.getElementById('app-content');
      gate?.classList.add('hidden');
      content?.classList.remove('hidden');

      const uname = document.getElementById('u-name');
      if (uname) uname.textContent = name;

      const urole = document.getElementById('u-role');
      if (urole) urole.textContent = getEmployeeRole(name) || 'Employé';

      toast(`Bienvenue ${name}`, 'success');
      window.app.go('dashboard');
    },

    logout: () => {
      window.app.user = null;
      window.app.cart = [];
      window.app.renderCart();

      document.getElementById('gate')?.classList.remove('hidden');
      document.getElementById('app-content')?.classList.add('hidden');
    },

    go: (id: string) => {
      document.querySelectorAll('section').forEach((s) => s.classList.add('hidden'));
      document.getElementById(`view-${id}`)?.classList.remove('hidden');

      const nav = document.getElementById('nav-actions');
      if (nav) nav.classList.toggle('hidden', id === 'dashboard');
    },

    // === CATALOGUE / ACCORDEON ===
    renderCatalog: () => {
      const c = document.getElementById('catalog-list');
      if (!c) return;
      c.innerHTML = '';

      const categories = meta.productsByCategory || {};
      const catKeys = Object.keys(categories);

      catKeys.forEach((catName, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'pos-accordion-item';

        const header = document.createElement('div');
        header.className = 'pos-acc-header';
        header.id = `cat-header-${idx}`;
        header.onclick = () => window.app.toggleCat(idx);

        header.innerHTML = `
          <div class="flex-c" style="gap:15px; font-weight:600; font-size:0.9rem;">
            <div style="width:32px; height:32px; border-radius:8px; background:rgba(6,182,212,0.12); color:var(--primary);
                        display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(6,182,212,0.12);">
              <i class="ri-grid-fill"></i>
            </div>
            ${catName}
          </div>
          <i class="ri-arrow-down-s-line arrow" id="arrow-${idx}"></i>
        `;

        const content = document.createElement('div');
        content.className = 'pos-acc-content';
        content.id = `cat-content-${idx}`;

        const grid = document.createElement('div');
        grid.className = 'product-grid-inner';

        categories[catName].forEach((prodName) => {
          const price = Number(meta.prices?.[prodName] ?? 0);

          const btn = document.createElement('div');
          btn.className = 'product-card';
          btn.onclick = (e) => {
            e.stopPropagation();
            window.app.addToCart({ desc: prodName, price });
          };

          btn.innerHTML = `
            <div class="pc-name">${prodName}</div>
            <div class="pc-price">${price.toFixed(0)}${CURRENCY_SYMBOL}</div>
          `;
          grid.appendChild(btn);
        });

        content.appendChild(grid);
        wrapper.appendChild(header);
        wrapper.appendChild(content);
        c.appendChild(wrapper);
      });
    },

    toggleCat: (idx: number) => {
      // fermer les autres
      const categoriesCount = Object.keys(meta.productsByCategory || {}).length;
      for (let i = 0; i < categoriesCount; i++) {
        if (i === idx) continue;
        const h = document.getElementById(`cat-header-${i}`);
        const cc = document.getElementById(`cat-content-${i}`) as HTMLDivElement | null;
        if (h && cc) {
          h.classList.remove('active');
          cc.style.display = 'none';
        }
      }

      const header = document.getElementById(`cat-header-${idx}`);
      const content = document.getElementById(`cat-content-${idx}`) as HTMLDivElement | null;
      if (!header || !content) return;

      const isOpen = header.classList.contains('active');
      if (isOpen) {
        header.classList.remove('active');
        content.style.display = 'none';
      } else {
        header.classList.add('active');
        content.style.display = 'block';
      }
    },

    // === PANIER ===
    addToCart: (item: { desc: string; price: number }) => {
      const ex = window.app.cart.find((x: any) => x.desc === item.desc);
      if (ex) ex.qty++;
      else window.app.cart.push({ ...item, qty: 1 });
      window.app.renderCart();
    },

    modQty: (idx: number, n: number) => {
      window.app.cart[idx].qty += n;
      if (window.app.cart[idx].qty <= 0) window.app.cart.splice(idx, 1);
      window.app.renderCart();
    },

    renderCart: () => {
      const b = document.getElementById('cart-body');
      if (!b) return;
      b.innerHTML = '';

      let totalQty = 0;

      if (window.app.cart.length === 0) {
        b.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); opacity:0.2;">
            <i class="ri-shopping-cart-line" style="font-size: 3rem; margin-bottom: 10px;"></i>
            <span style="font-size: 0.8rem;">En attente d'articles</span>
          </div>`;
      } else {
        window.app.cart.forEach((i: any, idx: number) => {
          totalQty += i.qty;
          const row = document.createElement('div');
          row.className = 'cart-item';
          row.innerHTML = `
            <div>
              <div style="font-weight:600; font-size: 0.9rem; margin-bottom:2px;">${i.desc}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-family: var(--font-data);">${i.price}${CURRENCY_SYMBOL} x ${i.qty}</div>
            </div>
            <div class="flex-c" style="gap:5px;">
              <button class="btn btn-ghost btn-icon" style="width:24px; height:24px;" data-a="dec">-</button>
              <button class="btn btn-ghost btn-icon" style="width:24px; height:24px; color:var(--success);" data-a="inc">+</button>
              <button class="btn btn-ghost btn-icon" style="color:var(--danger); width:24px; height:24px;" data-a="del"><i class="ri-delete-bin-line"></i></button>
            </div>`;

          const dec = row.querySelector('[data-a="dec"]') as HTMLButtonElement | null;
          const inc = row.querySelector('[data-a="inc"]') as HTMLButtonElement | null;
          const del = row.querySelector('[data-a="del"]') as HTMLButtonElement | null;

          dec && (dec.onclick = () => window.app.modQty(idx, -1));
          inc && (inc.onclick = () => window.app.modQty(idx, +1));
          del && (del.onclick = () => window.app.modQty(idx, -999));

          b.appendChild(row);
        });
      }

      const cc = document.getElementById('cart-count');
      if (cc) cc.textContent = String(totalQty);

      window.app.calc();
    },

    // === CALCULS (comme Apps Script) ===
    calc: () => {
      const sub = window.app.cart.reduce((a: number, b: any) => a + b.price * b.qty, 0);

      const discountActivated = (document.getElementById('disc-active') as HTMLInputElement | null)?.checked || false;
      const enterprise = (document.getElementById('disc-select') as HTMLSelectElement | null)?.value?.trim() || '';

      const employeeName = window.app.user?.name || '';
      let discountPct = 0;
      let discountType = 'Aucune';

      if (discountActivated) {
        if (enterprise) {
          discountPct = getEnterpriseDiscount(enterprise);
          discountType = 'Entreprise';
        } else {
          discountPct = getEmployeeDiscount(employeeName);
          discountType = 'Employé';
        }
      }

      const discountAmount = +(sub * (discountPct / 100)).toFixed(2);
      const total = +(sub - discountAmount).toFixed(2);

      const subEl = document.getElementById('sub-total');
      const discAmtEl = document.getElementById('disc-amount');
      const discLblEl = document.getElementById('disc-label');
      const totalEl = document.getElementById('total-pay');

      if (subEl) subEl.textContent = `${sub.toFixed(2)} ${CURRENCY_SYMBOL}`;
      if (discAmtEl) discAmtEl.textContent = `-${discountAmount.toFixed(2)} ${CURRENCY_SYMBOL}`;
      if (discLblEl) discLblEl.textContent = `Remise ${discountType} (${discountPct.toFixed(2)}%)`;
      if (totalEl) totalEl.textContent = `${total.toFixed(2)} ${CURRENCY_SYMBOL}`;

      return { sub, discountPct, discountAmount, total, discountType, enterprise, discountActivated };
    },

    // === FACTURE (API => Discord + Sheets) ===
    submitInvoice: async () => {
      if (!window.app.user?.name) return toast('Non connecté', 'error');
      if (window.app.cart.length === 0) return toast('Panier vide', 'error');

      const invNumber = (document.getElementById('inv-number') as HTMLInputElement | null)?.value?.trim() || '';
      const client = (document.getElementById('inv-client') as HTMLInputElement | null)?.value?.trim() || '';
      const employeeCard = (document.getElementById('inv-card') as HTMLInputElement | null)?.checked || false;

      const computed = window.app.calc();

      const payload = {
        employee: window.app.user.name,
        invoiceNumber: invNumber,
        enterprise: computed.enterprise, // string
        customerName: client,
        employeeCard,
        discountActivated: computed.discountActivated,
        items: window.app.cart.map((i: any) => ({ desc: i.desc, qty: i.qty })), // Apps Script format
      };

      try {
        const res = await apiCall('sendFactures', payload);
        toast(res.message || 'Facture envoyée', 'success');

        // reset UI
        window.app.cart = [];
        window.app.renderCart();

        const invClient = document.getElementById('inv-client') as HTMLInputElement | null;
        if (invClient) invClient.value = '';

        setInvoiceId();
      } catch (e: any) {
        toast(e?.message || 'Erreur facture', 'error');
      }
    },

    // === PARTENAIRES ===
    renderPartners: () => {
      const d = document.getElementById('partners-list');
      if (!d) return;
      d.innerHTML = '';

      meta.partners.forEach((p) => {
        const c = document.createElement('div');
        c.className = 'contact-card';
        c.style.height = '160px';
        c.style.background = `linear-gradient(to top, #000 0%, transparent 100%), url('${p.img}') center/cover`;
        c.onclick = () => window.app.openContact(p.name, p.phone, p.img, 'Partenaire');

        c.innerHTML = `
          <div style="position:absolute; bottom:15px; left:15px; font-weight:700; font-size: 1rem; text-shadow: 0 2px 4px black;">
            ${p.name}
          </div>
          <div style="position:absolute; top:15px; right:15px; background:var(--primary); padding:2px 8px; border-radius:6px;
                      font-size:0.75rem; font-weight:bold; box-shadow: 0 0 10px var(--primary-glow);">
            -${p.discount}%
          </div>`;
        d.appendChild(c);
      });
    },

    // === ANNUAIRE ===
    renderAnnuaire: () => {
      const g = document.getElementById('annuaire-grid');
      if (!g) return;
      g.innerHTML = '';

      const list = JSON.parse(localStorage.getItem('vespucci_contacts') || '[]');
      list.forEach((c: any) => {
        const d = document.createElement('div');
        d.className = 'contact-card';

        const img = c.photo && c.photo.length > 5 ? c.photo : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        d.onclick = () => window.app.openContact(`${c.prenom} ${c.nom}`, c.tel, img, c.grade);

        d.innerHTML = `
          <div style="padding: 25px; text-align: center; display:flex; flex-direction:column; align-items:center;">
            <img src="${img}" class="cc-avatar">
            <div class="cc-role-badge" style="margin-bottom: 10px;">${c.grade}</div>
            <div style="font-weight:700; font-size:1.1rem;">${c.prenom} ${c.nom}</div>
          </div>`;
        g.appendChild(d);
      });
    },

    openAddContactModal: () => {
      document.getElementById('modal-add-contact')?.classList.remove('hidden');
      ['new-nom', 'new-prenom', 'new-tel', 'new-photo'].forEach((id) => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el) el.value = '';
      });
    },

    saveContact: (e: any) => {
      e.preventDefault();
      const nc = {
        nom: (document.getElementById('new-nom') as HTMLInputElement).value,
        prenom: (document.getElementById('new-prenom') as HTMLInputElement).value,
        grade: (document.getElementById('new-grade') as HTMLSelectElement).value,
        tel: (document.getElementById('new-tel') as HTMLInputElement).value,
        photo: (document.getElementById('new-photo') as HTMLInputElement).value,
      };

      const key = 'vespucci_contacts';
      const l = JSON.parse(localStorage.getItem(key) || '[]');
      l.push(nc);
      localStorage.setItem(key, JSON.stringify(l));

      window.app.renderAnnuaire();
      document.getElementById('modal-add-contact')?.classList.add('hidden');
      toast('Contact sauvegardé', 'success');
    },

    // === ADMIN / RH (API => Discord + Sheets) ===
    checkAdmin: () => {
      const pass = (document.getElementById('admin-pass') as HTMLInputElement | null)?.value || '';
      // ⚠️ Comme ton HTML: PIN côté client. (Si tu veux sécuriser vraiment: passer par API)
      const ADMIN_CODE = '123459';

      if (pass === ADMIN_CODE) {
        document.getElementById('admin-lock')?.classList.add('hidden');
        document.getElementById('admin-panel')?.classList.remove('hidden');
      } else {
        toast('Code Incorrect', 'error');
      }
    },

    openHR: (type: string) => {
      document.getElementById('modal-hr')?.classList.remove('hidden');
      (document.getElementById('hr-type') as HTMLInputElement).value = type;

      const title = document.getElementById('hr-title');
      if (title) title.textContent = `RH: ${type.toUpperCase()}`;

      const lblTarget = document.getElementById('lbl-target');
      if (lblTarget) lblTarget.textContent = type === 'depense' ? 'MONTANT ($)' : 'EMPLOYÉ CIBLE';

      const detailsLbl = document.getElementById('lbl-details');
      if (detailsLbl) detailsLbl.textContent = type === 'depense' ? 'Entreprise / Fournisseur' : 'Détails (optionnel)';

      // reset
      (document.getElementById('hr-target') as HTMLInputElement).value = '';
      (document.getElementById('hr-reason') as HTMLTextAreaElement).value = '';
      (document.getElementById('hr-details') as HTMLInputElement).value = '';
      (document.getElementById('hr-date') as HTMLInputElement).value = new Date().toISOString().slice(0, 10);
    },

    submitHR: async (e: any) => {
      e.preventDefault();
      if (!window.app.user?.name) return toast('Non connecté', 'error');

      const type = (document.getElementById('hr-type') as HTMLInputElement).value;
      const target = (document.getElementById('hr-target') as HTMLInputElement).value;
      const date = (document.getElementById('hr-date') as HTMLInputElement).value;
      const reason = (document.getElementById('hr-reason') as HTMLTextAreaElement).value;
      const details = (document.getElementById('hr-details') as HTMLInputElement).value;

      try {
        await apiCall('sendHRNotification', {
          type,
          employee: target, // Apps Script utilise data.employee (montant si depense)
          date,
          reason,
          details,
          initiatedBy: window.app.user.name,
        });

        document.getElementById('modal-hr')?.classList.add('hidden');
        toast('Dossier transmis', 'success');
      } catch (err: any) {
        toast(err?.message || 'Erreur RH', 'error');
      }
    },

    // === CONTACT MODAL ===
    openContact: (n: string, p: string, i: string, g: string) => {
      window.app.currentContact = p;
      (document.getElementById('c-name') as HTMLElement).innerText = n;
      (document.getElementById('c-phone') as HTMLElement).innerText = p;
      (document.getElementById('c-img') as HTMLImageElement).src = i;
      (document.getElementById('c-grade') as HTMLElement).innerText = g || 'Contact';
      document.getElementById('modal-contact')?.classList.remove('hidden');
    },

    closeContact: () => document.getElementById('modal-contact')?.classList.add('hidden'),

    callContact: () => {
      toast(`Appel sortant vers ${(document.getElementById('c-phone') as HTMLElement).innerText}...`, 'success');
    },

    copyContact: () => window.app.copy(window.app.currentContact),

    copy: (t: string) => {
      navigator.clipboard.writeText(t);
      toast('Numéro copié', 'success');
    },

    toast,

    // === SEARCH ===
    filterProducts: (q: string) => {
      q = (q || '').toLowerCase();
      document.querySelectorAll('.pos-accordion-item').forEach((wrapper) => {
        let hasMatch = false;
        (wrapper as HTMLElement).querySelectorAll('.product-card').forEach((card) => {
          const name = (card.querySelector('.pc-name') as HTMLElement)?.innerText?.toLowerCase() || '';
          if (name.includes(q)) {
            (card as HTMLElement).style.display = 'flex';
            hasMatch = true;
          } else {
            (card as HTMLElement).style.display = 'none';
          }
        });

        if (q !== '') {
          (wrapper as HTMLElement).style.display = hasMatch ? 'block' : 'none';
        } else {
          (wrapper as HTMLElement).style.display = 'block';
          (wrapper as HTMLElement).querySelectorAll('.product-card').forEach((c) => ((c as HTMLElement).style.display = 'flex'));
        }
      });
    },
  };
}

export default function VespucciTitanium() {
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    (async () => {
      try {
        const res = await apiCall<{ success: true; data: VespucciMeta }>('getAppMeta');
        window.__VESPUCCI_META__ = res.data;
        attachApp(res.data);
        window.app.init();
      } catch (e: any) {
        console.error(e);
        alert(e?.message || 'Erreur chargement meta');
      }
    })();
  }, []);

  return (
    <>
      {/* Fonts + Icons (comme ton HTML GS) */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />
      <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />

      {/* CSS (reprend ton style Titanium) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
:root {
  --primary: #06b6d4;
  --primary-600: #0891b2;
  --primary-glow: rgba(6, 182, 212, 0.5);
  --primary-dim: rgba(6, 182, 212, 0.08);
  --accent: #8b5cf6;
  --accent-glow: rgba(139, 92, 246, 0.5);
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --bg-deep: #0f0f1a;
  --bg-panel: rgba(20, 25, 45, 0.7);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-highlight: rgba(255, 255, 255, 0.15);
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --gradient-primary: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
  --font-ui: 'Inter', sans-serif;
  --font-data: 'JetBrains Mono', monospace;
}
* { box-sizing: border-box; margin: 0; padding: 0; outline: none; -webkit-tap-highlight-color: transparent; transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1); }
body {
  font-family: var(--font-ui);
  background-color: var(--bg-deep);
  color: var(--text);
  min-height: 100vh;
  overflow-x: hidden;
  line-height: 1.6;
}
body::before{
  content:""; position:fixed; inset:0; z-index:-2;
  background:
    radial-gradient(circle at 50% 10%, #1e1e3f 0%, #05050a 100%),
    linear-gradient(45deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 100% 100%, 40px 40px, 40px 40px;
  background-attachment: fixed;
}
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: var(--primary); }
.hidden { display:none !important; }
.flex-c { display:flex; align-items:center; }
.flex-sb { display:flex; justify-content:space-between; align-items:center; }
.grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
.grid-3 { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:20px; }

.btn {
  display:inline-flex; align-items:center; justify-content:center; gap:10px;
  padding:12px 24px; border-radius:12px; font-weight:600; cursor:pointer;
  border: 1px solid transparent; font-size:0.9rem; position:relative; overflow:hidden;
  letter-spacing:0.5px; text-transform:uppercase; font-size:0.8rem;
}
.btn-primary { background: var(--gradient-primary); color:white; border:none; box-shadow: 0 4px 20px -5px var(--primary-glow); }
.btn-ghost { background: rgba(255,255,255,0.03); border:1px solid var(--glass-border); color:var(--text-muted); }
.btn-success { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
.btn-icon { width:40px; height:40px; padding:0; border-radius:10px; display:flex; align-items:center; justify-content:center; }

.input, select, textarea {
  width:100%; padding:14px 18px; border-radius:12px;
  background: rgba(0,0,0,0.4); border:1px solid var(--glass-border);
  color:white; font-family: var(--font-ui); font-size:0.95rem;
}
.input:focus { border-color: var(--primary); background: rgba(0,0,0,0.7); box-shadow: 0 0 0 2px var(--primary-dim); }

.card{
  background: var(--bg-panel);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-top: 1px solid var(--glass-highlight);
  border-radius: 20px; padding: 25px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  position: relative; overflow:hidden;
}

.login-gate{ position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; background:#000; }
.login-diamond{ font-size:3rem; margin-bottom:20px; filter: drop-shadow(0 0 15px var(--primary-glow)); color:white; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.anim-enter{ animation: fadeIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity:0; }

.app-container{ max-width: 1600px; margin: 0 auto; padding:20px; padding-bottom:80px; }
.topbar{
  display:flex; justify-content:space-between; align-items:center;
  padding: 15px 30px; margin-bottom:40px;
  background: rgba(20,20,35,0.6); backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border); border-radius:18px;
  position: sticky; top: 20px; z-index: 100;
}

.bento-grid{ display:grid; grid-template-columns: repeat(4, 1fr); gap:24px; }
.widget{
  background: var(--bg-panel); border:1px solid var(--glass-border);
  border-radius: 20px; padding:25px; position:relative; overflow:hidden;
  cursor:pointer; display:flex; flex-direction:column; justify-content:space-between;
  min-height:180px;
}
.w-large{ grid-column: span 2; grid-row: span 2; }
.w-medium{ grid-column: span 1; }
.w-wide{ grid-column: span 4; display:flex; flex-direction: row; align-items:center; padding: 20px 30px; min-height:100px; }
.w-stat{ font-family: var(--font-data); font-size:2.5rem; font-weight:700; color:white; margin:10px 0; letter-spacing: -1px; }
.cc-role-badge{
  background: rgba(6, 182, 212, 0.1); color: var(--primary);
  border: 1px solid rgba(6, 182, 212, 0.2);
  padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px; display: inline-block;
}

.pos-layout{ display:grid; grid-template-columns: 2fr 1.1fr; gap:30px; height: calc(100vh - 150px); }
.catalog-area{ display:flex; flex-direction:column; gap:20px; overflow:hidden; height:100%; }
.search-bar-wrap{ position:relative; flex-shrink:0; }
.search-bar-wrap i{ position:absolute; left:18px; top:18px; color: var(--text-muted); }
.search-bar-wrap input{ padding-left:50px; background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.1); }
.accordion-container{ overflow-y:auto; padding-right:8px; flex:1; padding-bottom:20px; }
.pos-accordion-item{ margin-bottom:12px; }
.pos-acc-header{
  display:flex; justify-content:space-between; align-items:center;
  padding: 16px 20px;
  background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  border:1px solid var(--glass-border); border-radius:14px;
  cursor:pointer;
}
.pos-acc-header.active{
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.1), transparent);
  border-color: var(--primary-600);
  box-shadow: inset 3px 0 0 var(--primary);
}
.pos-acc-content{
  display:none;
  background: rgba(0,0,0,0.2);
  border:1px solid var(--glass-border); border-top:none;
  border-bottom-left-radius:14px; border-bottom-right-radius:14px;
  padding:20px; margin-top:-2px;
}
.product-grid-inner{ display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:12px; }
.product-card{
  background: rgba(255,255,255,0.03); border:1px solid var(--glass-border);
  border-radius:12px; padding:15px; cursor:pointer;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
  text-align:center; height:100px;
}
.pc-price{ font-family: var(--font-data); font-size:0.85rem; color: var(--primary); font-weight:700; background: rgba(0,0,0,0.3); padding:2px 8px; border-radius:6px; }
.pc-name{ font-size:0.8rem; font-weight:500; line-height:1.2; }

.ticket-panel{
  background:#0b0c12; border:1px solid var(--glass-border);
  display:flex; flex-direction:column; overflow:hidden; height:100%;
  border-radius:20px; box-shadow: -10px 0 30px rgba(0,0,0,0.4);
}
.cart-item{
  display:flex; justify-content:space-between; align-items:center;
  padding:12px 15px; margin-bottom:8px; border-radius:10px;
  background: rgba(255,255,255,0.03); border-left:2px solid var(--glass-border);
}
.cart-total-section{ background: rgba(15,15,22,0.95); border-top:1px solid var(--glass-border); padding:25px; backdrop-filter: blur(10px); }

.contact-card{
  background: var(--bg-panel); border: 1px solid var(--glass-border);
  border-radius: 16px; overflow:hidden; position:relative;
  cursor:pointer; text-align:center;
}
.cc-avatar{
  width:80px; height:80px; border-radius:50%; object-fit:cover;
  border:3px solid #1e1e2d; box-shadow: 0 5px 15px rgba(0,0,0,0.5);
  margin-bottom:12px;
}

.module-card{
  background: rgba(255,255,255,0.02); border:1px solid var(--glass-border);
  border-radius:16px; padding:20px; text-align:left; cursor:pointer;
  display:flex; flex-direction:column; gap:12px;
}
`,
        }}
      />

      {/* LOGIN */}
      <div id="gate" className="login-gate">
        <div className="card" style={{ width: 400, textAlign: 'center', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
          <div className="login-diamond">
            <i className="ri-vip-diamond-fill" />
          </div>

          <h1 style={{ fontSize: '1.8rem', marginBottom: 5, fontWeight: 800, letterSpacing: '-1px' }}>Vespucci</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 30, textTransform: 'uppercase', letterSpacing: 3 }}>
            Titanium Access
          </p>

          <div style={{ textAlign: 'left', marginBottom: 20 }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--primary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
              Identifiant
            </label>
            <select id="employeeSelect" className="input">
              <option value="" selected>
                Choisir une identité...
              </option>
            </select>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', height: 50 }} onClick={() => window.app?.login()}>
            INITIALISER LA SESSION <i className="ri-arrow-right-line" />
          </button>
        </div>
      </div>

      {/* APP */}
      <div className="app-container hidden" id="app-content">
        <header className="topbar anim-enter">
          <div className="flex-c" style={{ gap: 15, cursor: 'pointer' }} onClick={() => window.app?.go('dashboard')}>
            <div
              style={{
                width: 40,
                height: 40,
                background: 'var(--gradient-primary)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 0 20px var(--primary-glow)',
              }}
            >
              <i className="ri-vip-diamond-fill" />
            </div>

            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.5px' }}>VESPUCCI</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Manager v5.2</div>
            </div>
          </div>

          <div id="nav-actions" className="hidden">
            <button className="btn btn-ghost" onClick={() => window.app?.go('dashboard')}>
              <i className="ri-layout-grid-fill" /> Dashboard
            </button>
          </div>

          <div className="flex-c" style={{ gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div id="u-name" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                User
              </div>
              <div id="u-role" style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, letterSpacing: 1 }}>
                Employé
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => window.app?.logout()}>
              <i className="ri-shut-down-line" />
            </button>
          </div>
        </header>

        {/* DASHBOARD */}
        <section id="view-dashboard" className="anim-enter">
          <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: 5 }}>Aperçu Global</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Terminal de gestion connecté.</p>
            </div>

            <div
              style={{
                textAlign: 'right',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-data)',
                fontSize: '1rem',
                background: 'rgba(255,255,255,0.03)',
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--glass-border)',
              }}
            >
              <i className="ri-time-line" style={{ color: 'var(--primary)' }} /> <span id="clock">00:00</span>
            </div>
          </div>

          <div className="bento-grid">
            <div className="widget w-large" onClick={() => window.app?.go('invoice')}>
              <div>
                <div className="cc-role-badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', marginBottom: 0 }}>
                  Module Vente
                </div>
                <h3 className="w-stat" style={{ marginTop: 15 }}>
                  CAISSE
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', maxWidth: '90%' }}>Accès au catalogue produits et facturation.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-primary">
                  Ouvrir <i className="ri-arrow-right-line" />
                </button>
              </div>
            </div>

            <div className="widget w-medium" onClick={() => window.app?.go('direction')}>
              <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>ADMINISTRATION</div>
              <div className="w-stat">RH</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dossiers Staff & Finances</div>
            </div>

            <div className="widget w-medium" onClick={() => window.app?.go('annuaire')}>
              <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>CONTACTS</div>
              <div className="w-stat">TEL</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Annuaire Entreprise</div>
            </div>

            <div className="widget w-wide" style={{ cursor: 'default' }}>
              <div className="flex-c" style={{ gap: 20, flex: 1 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: 'rgba(16,185,129,0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--success)',
                    fontSize: '1.2rem',
                  }}
                >
                  <i className="ri-server-fill" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>SYSTÈME OPÉRATIONNEL</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Réseau Sécurisé</div>
                </div>
              </div>

              <div style={{ width: 1, height: 30, background: 'var(--glass-border)', margin: '0 30px' }} />

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>PING</div>
                <div style={{ fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-data)', fontSize: '1.1rem' }}>12ms</div>
              </div>
            </div>
          </div>
        </section>

        {/* INVOICE */}
        <section id="view-invoice" className="hidden anim-enter">
          <div className="pos-layout">
            <div className="catalog-area">
              <div className="search-bar-wrap">
                <i className="ri-search-2-line" />
                <input type="text" className="input" placeholder="Rechercher un service..." onKeyUp={(e) => window.app?.filterProducts((e.target as HTMLInputElement).value)} />
              </div>
              <div id="catalog-list" className="accordion-container" />
            </div>

            <div className="ticket-panel">
              <div style={{ padding: 20, borderBottom: '1px dashed var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex-sb" style={{ marginBottom: 15 }}>
                  <span style={{ fontWeight: 700, letterSpacing: 1, fontSize: '0.9rem' }}>
                    <i className="ri-file-list-3-fill" /> TICKET
                  </span>
                  <span id="cart-count" style={{ background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6 }}>
                    0
                  </span>
                </div>

                <div className="grid-2" style={{ gap: 10 }}>
                  <input type="text" id="inv-client" className="input" placeholder="Client" style={{ fontSize: '0.85rem' }} />
                  <input type="text" id="inv-number" className="input" placeholder="ID Facture" readOnly style={{ opacity: 0.6, cursor: 'default', fontFamily: 'var(--font-data)' }} />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <input id="inv-card" type="checkbox" />
                    Carte employé
                  </label>

                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <input id="disc-active" type="checkbox" onChange={() => window.app?.calc()} />
                    Activer remise
                  </label>
                </div>
              </div>

              <div id="cart-body" style={{ flex: 1, overflowY: 'auto', padding: 15 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', opacity: 0.2 }}>
                  <i className="ri-shopping-cart-line" style={{ fontSize: '3rem', marginBottom: 10 }} />
                  <span style={{ fontSize: '0.8rem' }}>En attente d'articles</span>
                </div>
              </div>

              <div className="cart-total-section">
                <div className="flex-sb" style={{ marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Sous-total</span> <span id="sub-total" style={{ fontFamily: 'var(--font-data)' }}>0 $</span>
                </div>

                <div className="flex-sb" style={{ marginBottom: 10 }}>
                  <select id="disc-select" className="input" onChange={() => window.app?.calc()} style={{ padding: '6px 10px', width: 'auto', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)' }} />
                  <span style={{ color: 'var(--success)', fontFamily: 'var(--font-data)' }} id="disc-amount">
                    -0 $
                  </span>
                </div>

                <div style={{ marginBottom: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }} id="disc-label">
                  Remise Aucune (0.00%)
                </div>

                <div className="flex-sb" style={{ marginBottom: 15, paddingTop: 15, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: 1 }}>TOTAL NET</span>
                  <span style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--primary)' }} id="total-pay">
                    0 $
                  </span>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.9rem', padding: 14 }} onClick={() => window.app?.submitInvoice()}>
                  <i className="ri-secure-payment-line" /> ENCAISSER
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* DIRECTION */}
        <section id="view-direction" className="hidden anim-enter">
          <div id="admin-lock" className="card" style={{ maxWidth: 450, margin: '80px auto', textAlign: 'center', borderColor: 'var(--danger)' }}>
            <div
              style={{
                width: 60,
                height: 60,
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: 'var(--danger)',
                fontSize: '1.8rem',
              }}
            >
              <i className="ri-lock-password-fill" />
            </div>

            <h3 style={{ marginBottom: 10 }}>Accès Restreint</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 25, fontSize: '0.85rem' }}>Authentification Direction Requise</p>

            <div style={{ display: 'flex', gap: 15 }}>
              <input type="password" id="admin-pass" className="input" placeholder="CODE PIN" style={{ textAlign: 'center', letterSpacing: 5, fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-data)' }} />
              <button className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={() => window.app?.checkAdmin()}>
                <i className="ri-key-2-line" />
              </button>
            </div>
          </div>

          <div id="admin-panel" className="hidden">
            <h2 style={{ marginBottom: 30, fontSize: '1.8rem', fontWeight: 800 }}>Panel de Direction</h2>

            <div className="grid-2" style={{ alignItems: 'start', gap: 40 }}>
              <div>
                <h4 style={{ marginBottom: 20, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Gestion RH</h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 15 }}>
                  <div className="module-card" onClick={() => window.app?.openHR('recrutement')}>
                    <div style={{ fontWeight: 700 }}>Recrutement</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nouveau contrat</div>
                  </div>

                  <div className="module-card" onClick={() => window.app?.openHR('convocation')}>
                    <div style={{ fontWeight: 700 }}>Convocation</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Demande RDV</div>
                  </div>

                  <div className="module-card" onClick={() => window.app?.openHR('avertissement')}>
                    <div style={{ fontWeight: 700 }}>Avertissement</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sanction</div>
                  </div>

                  <div className="module-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={() => window.app?.openHR('licenciement')}>
                    <div style={{ fontWeight: 700, color: '#f87171' }}>Licenciement</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rupture</div>
                  </div>

                  <div className="module-card" style={{ gridColumn: 'span 2' }} onClick={() => window.app?.openHR('demission')}>
                    <div style={{ fontWeight: 700 }}>Démission</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Départ enregistré</div>
                  </div>

                  <div className="module-card" style={{ gridColumn: 'span 2' }} onClick={() => window.app?.openHR('depense')}>
                    <div style={{ fontWeight: 700 }}>Dépense Entreprise</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Déclaration de frais</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: 20, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Partenaires</h4>
                <div id="partners-list" className="grid-2" />
              </div>
            </div>
          </div>
        </section>

        {/* ANNUAIRE */}
        <section id="view-annuaire" className="hidden anim-enter">
          <div className="flex-sb" style={{ marginBottom: 30 }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Répertoire</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Base de données employés.</p>
            </div>
            <div style={{ display: 'flex', gap: 15 }}>
              <button className="btn btn-ghost" onClick={() => window.app?.renderAnnuaire()}>
                <i className="ri-refresh-line" />
              </button>
              <button className="btn btn-success" onClick={() => window.app?.openAddContactModal()}>
                <i className="ri-user-add-line" /> Nouveau
              </button>
            </div>
          </div>
          <div id="annuaire-grid" className="grid-3" />
        </section>
      </div>

      {/* MODAL RH */}
      <div id="modal-hr" className="login-gate hidden" style={{ background: 'rgba(0,0,0,0.8)', zIndex: 2000 }}>
        <div className="card anim-enter" style={{ width: 520, maxWidth: '90%' }}>
          <div className="flex-sb" style={{ marginBottom: 25 }}>
            <h3 id="hr-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Action RH
            </h3>
            <button className="btn btn-ghost btn-icon" onClick={() => document.getElementById('modal-hr')?.classList.add('hidden')}>
              <i className="ri-close-line" />
            </button>
          </div>

          <form id="hr-form" onSubmit={(e) => window.app?.submitHR(e)}>
            <input type="hidden" id="hr-type" />
            <div style={{ marginBottom: 16 }}>
              <label id="lbl-target" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                Cible
              </label>
              <input type="text" id="hr-target" className="input" required placeholder="Nom prénom ou Montant" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Date Effet</label>
              <input type="date" id="hr-date" className="input" required />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label id="lbl-details" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                Détails (optionnel)
              </label>
              <input type="text" id="hr-details" className="input" placeholder="Ex: Fournisseur / Informations complémentaires" />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Notes & Raison</label>
              <textarea id="hr-reason" rows={4} className="input" required placeholder="Détails du dossier..." />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Confirmer l&apos;envoi
            </button>
          </form>
        </div>
      </div>

      {/* MODAL ADD CONTACT */}
      <div id="modal-add-contact" className="login-gate hidden" style={{ background: 'rgba(0,0,0,0.8)', zIndex: 2100 }}>
        <div className="card anim-enter" style={{ width: 450 }}>
          <h3 style={{ marginBottom: 25, fontSize: '1.2rem' }}>Nouveau Contact</h3>
          <form onSubmit={(e) => window.app?.saveContact(e)}>
            <div className="grid-2" style={{ marginBottom: 15 }}>
              <input type="text" id="new-nom" className="input" required placeholder="Nom" />
              <input type="text" id="new-prenom" className="input" required placeholder="Prénom" />
            </div>
            <select id="new-grade" className="input" style={{ marginBottom: 15 }}>
              <option value="Employé">Employé</option>
              <option value="Responsable">Responsable</option>
              <option value="Direction">Direction</option>
              <option value="Autre">Autre</option>
            </select>
            <input type="text" id="new-tel" className="input" required placeholder="Téléphone (555-xxxx)" style={{ marginBottom: 15 }} />
            <input type="text" id="new-photo" className="input" placeholder="URL Photo (Optionnel)" style={{ marginBottom: 25 }} />

            <div className="grid-2">
              <button type="button" className="btn btn-ghost" onClick={() => document.getElementById('modal-add-contact')?.classList.add('hidden')}>
                Annuler
              </button>
              <button type="submit" className="btn btn-success">
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL CONTACT */}
      <div id="modal-contact" className="login-gate hidden" style={{ zIndex: 2200, background: 'rgba(0,0,0,0.9)' }}>
        <div className="card anim-enter" style={{ width: 380, textAlign: 'center', paddingTop: 40, borderColor: 'var(--primary)' }}>
          <img id="c-img" src="" style={{ width: 120, height: 120, borderRadius: '50%', marginBottom: 20, border: '4px solid var(--primary)', objectFit: 'cover', boxShadow: '0 0 40px var(--primary-glow)' }} />
          <div style={{ marginBottom: 15 }}>
            <div id="c-grade" className="cc-role-badge" style={{ marginBottom: 0 }}>
              GRADE
            </div>
          </div>
          <h3 id="c-name" style={{ fontSize: '1.6rem', marginBottom: 5, fontWeight: 700 }}>
            Nom Prénom
          </h3>
          <div id="c-phone" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 30, letterSpacing: 2, fontFamily: 'var(--font-data)' }}>
            555-0000
          </div>

          <div className="grid-2" style={{ gap: 15 }}>
            <button className="btn btn-primary" onClick={() => window.app?.callContact()}>
              <i className="ri-phone-fill" /> APPELER
            </button>
            <button className="btn btn-ghost" onClick={() => window.app?.copyContact()}>
              <i className="ri-file-copy-line" /> COPIER
            </button>
          </div>

          <button className="btn btn-ghost" onClick={() => window.app?.closeContact()} style={{ marginTop: 15, width: '100%', border: 'none' }}>
            Fermer
          </button>
        </div>
      </div>

      <div id="toast-container" style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 3000 }} />
    </>
  );
}
