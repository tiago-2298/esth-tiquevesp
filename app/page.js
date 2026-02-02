// app/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Meta = {
  version: string;
  serverTime: string;
  employees: string[];
  directory: Array<{ name: string; role: string; avatar: string; phone: string }>;
  employeeDiscounts: Record<string, { role: string; discount: number }>;
  products: string[];
  productsByCategory: Record<string, string[]>;
  prices: Record<string, number>;
  enterprises: Record<string, { discount: number; phone?: string; image?: string }>;
  currencySymbol: string;
  currencyCode: string;
  totals: { employees: number; products: number };
  ui?: { adminPin?: string }; // si tu veux éviter de renvoyer le pin au client: retire et check côté serveur only
};

type CartItem = { desc: string; qty: number; pu: number };

function randomInvoice() {
  return `INV-${Math.floor(Math.random() * 1_000_000)}`;
}

export default function VespucciTitanium() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState('');
  const [view, setView] = useState<'login' | 'app'>('login');
  const [tab, setTab] = useState<'dashboard' | 'invoice' | 'direction' | 'annuaire'>('dashboard');

  const [toast, setToast] = useState<{ m: string; t: 'success' | 'error' | 'info' } | null>(null);

  // invoice
  const [search, setSearch] = useState('');
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(randomInvoice());
  const [enterprise, setEnterprise] = useState('');
  const [discountActivated, setDiscountActivated] = useState(false);
  const [employeeCard, setEmployeeCard] = useState(false);

  // direction
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState('');

  const [hrModal, setHrModal] = useState<null | {
    type: 'recrutement' | 'convocation' | 'avertissement' | 'licenciement' | 'demission' | 'depense';
    title: string;
    targetLabel: string;
  }>(null);

  const [hrTarget, setHrTarget] = useState(''); // employé cible OU montant
  const [hrDate, setHrDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hrReason, setHrReason] = useState('');
  const [hrDetails, setHrDetails] = useState('');

  const currencySymbol = meta?.currencySymbol || '$';

  const notify = (m: string, t: 'success' | 'error' | 'info' = 'info') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3200);
  };

  const loadMeta = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api', { method: 'POST', body: JSON.stringify({ action: 'getMeta' }) });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || 'Meta error');
      setMeta(j);
    } catch (e: any) {
      notify(`Erreur chargement: ${e?.message || e}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('vespucci_user');
    if (saved) {
      setUser(saved);
      setView('app');
    }
    loadMeta();
  }, []);

  // Totaux invoice
  const employeeDiscountPct = meta?.employeeDiscounts?.[user]?.discount ?? 0;
  const role = meta?.employeeDiscounts?.[user]?.role ?? 'Employé';

  const enterpriseDiscountPct = enterprise && meta?.enterprises?.[enterprise]
    ? (meta.enterprises[enterprise].discount || 0)
    : 0;

  const appliedDiscountPct = discountActivated
    ? (enterprise ? enterpriseDiscountPct : employeeDiscountPct)
    : 0;

  const discountType = discountActivated ? (enterprise ? 'Entreprise' : 'Employé') : 'Aucune';

  const subtotal = useMemo(() => {
    return cart.reduce((s, it) => s + it.qty * it.pu, 0);
  }, [cart]);

  const discountAmount = useMemo(() => +(subtotal * (appliedDiscountPct / 100)).toFixed(2), [subtotal, appliedDiscountPct]);
  const total = useMemo(() => +(subtotal - discountAmount).toFixed(2), [subtotal, discountAmount]);

  const filteredCategories = useMemo(() => {
    if (!meta) return [];
    const q = search.trim().toLowerCase();
    const cats = Object.keys(meta.productsByCategory || {});
    if (!q) return cats;
    return cats.filter(cat => (meta.productsByCategory[cat] || []).some(p => p.toLowerCase().includes(q)));
  }, [meta, search]);

  const productsOfCat = (cat: string) => {
    const list = meta?.productsByCategory?.[cat] || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(p => p.toLowerCase().includes(q));
  };

  const addToCart = (desc: string) => {
    if (!meta) return;
    const pu = meta.prices?.[desc] ?? 0;
    setCart(prev => {
      const idx = prev.findIndex(x => x.desc === desc);
      if (idx >= 0) {
        const n = [...prev];
        n[idx] = { ...n[idx], qty: n[idx].qty + 1 };
        return n;
      }
      return [...prev, { desc, qty: 1, pu }];
    });
  };

  const modQty = (desc: string, delta: number) => {
    setCart(prev => {
      const n = prev.map(it => it.desc === desc ? { ...it, qty: it.qty + delta } : it)
        .filter(it => it.qty > 0);
      return n;
    });
  };

  const clearCart = () => setCart([]);

  const submitInvoice = async () => {
    if (!meta) return;
    if (!user) return notify('Session invalide', 'error');
    if (cart.length === 0) return notify('Panier vide', 'error');

    try {
      const payload = {
        employee: user,
        invoiceNumber,
        enterprise,
        customerName,
        employeeCard,
        discountActivated,
        items: cart.map(i => ({ desc: i.desc, qty: i.qty })),
      };

      const r = await fetch('/api', { method: 'POST', body: JSON.stringify({ action: 'sendFactures', data: payload }) });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || 'Erreur facture');

      notify('Facture envoyée et enregistrée.', 'success');
      clearCart();
      setCustomerName('');
      setInvoiceNumber(randomInvoice());
      setEnterprise('');
      setDiscountActivated(false);
      setEmployeeCard(false);
    } catch (e: any) {
      notify(e?.message || 'Erreur envoi facture', 'error');
    }
  };

  const openHR = (type: any) => {
    const map: any = {
      recrutement: { title: '➕ Recrutement', targetLabel: 'EMPLOYÉ CIBLE' },
      convocation: { title: '📋 Convocation', targetLabel: 'EMPLOYÉ CIBLE' },
      avertissement: { title: '⚠️ Avertissement', targetLabel: 'EMPLOYÉ CIBLE' },
      licenciement: { title: '🔴 Licenciement', targetLabel: 'EMPLOYÉ CIBLE' },
      demission: { title: '📝 Démission', targetLabel: 'EMPLOYÉ CIBLE' },
      depense: { title: '💸 Dépense Entreprise', targetLabel: 'MONTANT ($)' },
    };

    setHrModal({ type, ...map[type] });
    setHrTarget('');
    setHrReason('');
    setHrDetails('');
    setHrDate(new Date().toISOString().slice(0, 10));
  };

  const submitHR = async () => {
    if (!meta) return;
    if (!user) return notify('Session invalide', 'error');
    if (!hrModal) return;

    try {
      const isExpense = hrModal.type === 'depense';

      const payload: any = {
        type: hrModal.type,
        initiatedBy: user,
        reason: hrReason,
        date: hrDate,
        details: hrDetails,
      };

      if (isExpense) {
        payload.amount = hrTarget; // montant
      } else {
        payload.employeeTarget = hrTarget; // employé concerné
      }

      const r = await fetch('/api', { method: 'POST', body: JSON.stringify({ action: 'sendHR', data: payload }) });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || 'Erreur RH');

      notify('Dossier transmis.', 'success');
      setHrModal(null);
    } catch (e: any) {
      notify(e?.message || 'Erreur RH', 'error');
    }
  };

  const logout = () => {
    localStorage.removeItem('vespucci_user');
    setUser('');
    setView('login');
    setTab('dashboard');
    setAdminUnlocked(false);
    notify('Déconnecté.', 'info');
  };

  // =======================
  // UI
  // =======================
  if (loading && !meta) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Chargement...
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --primary: #06b6d4;
          --primary-600: #0891b2;
          --primary-glow: rgba(6, 182, 212, 0.5);
          --primary-dim: rgba(6, 182, 212, 0.08);
          --accent: #8b5cf6;
          --success: #10b981;
          --danger: #ef4444;
          --bg-deep: #0f0f1a;
          --bg-panel: rgba(20, 25, 45, 0.7);
          --glass-border: rgba(255, 255, 255, 0.08);
          --glass-highlight: rgba(255, 255, 255, 0.15);
          --text: #f1f5f9;
          --text-muted: #94a3b8;
          --gradient-primary: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
          --font-ui: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          --font-data: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: var(--font-ui);
          background-color: var(--bg-deep);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
        }
        body::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: -2;
          background:
            radial-gradient(circle at 50% 10%, #1e1e3f 0%, #05050a 100%),
            linear-gradient(45deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 100% 100%, 40px 40px, 40px 40px;
          background-attachment: fixed;
        }
        .hidden { display: none !important; }
        .card {
          background: var(--bg-panel);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid var(--glass-border);
          border-top: 1px solid var(--glass-highlight);
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 18px;
          border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
          border: 1px solid transparent;
          text-transform: uppercase;
          font-size: 0.8rem;
        }
        .btn-primary { background: var(--gradient-primary); color: white; border: none; box-shadow: 0 4px 20px -5px var(--primary-glow); }
        .btn-ghost { background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); color: var(--text-muted); }
        .btn-danger { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #fca5a5; }
        .input, select, textarea {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--glass-border);
          color: white;
          font-family: var(--font-ui);
          font-size: 0.95rem;
        }
        .app-container { max-width: 1400px; margin: 0 auto; padding: 20px; padding-bottom: 80px; }
        .topbar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 15px 20px; margin-bottom: 30px;
          background: rgba(20, 20, 35, 0.6); backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border); border-radius: 18px;
          position: sticky; top: 12px; z-index: 50;
        }
        .bento-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .widget {
          background: var(--bg-panel);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 22px;
          cursor: pointer;
          min-height: 160px;
          display:flex; flex-direction:column; justify-content:space-between;
        }
        .widget:hover { border-color: var(--primary-600); transform: translateY(-2px); }
        .w-large { grid-column: span 2; grid-row: span 2; }
        .w-wide { grid-column: span 4; min-height: 100px; display:flex; align-items:center; justify-content:space-between; }
        .w-stat { font-family: var(--font-data); font-size: 2.2rem; font-weight: 900; }
        .pos-layout { display:grid; grid-template-columns: 2fr 1.1fr; gap: 20px; height: calc(100vh - 160px); }
        .accordion { overflow-y:auto; height: 100%; padding-right: 8px; }
        .cat {
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          margin-bottom: 10px;
          overflow:hidden;
          background: rgba(0,0,0,0.15);
        }
        .cat-h { padding: 14px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; }
        .cat-h:hover { background: rgba(255,255,255,0.04); }
        .cat-b { padding: 14px; display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
        .product {
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          cursor:pointer;
          text-align:center;
        }
        .product:hover { border-color: var(--primary); background: rgba(6,182,212,0.10); }
        .price { font-family: var(--font-data); color: var(--primary); font-weight: 900; margin-top: 6px; }
        .ticket {
          background: #0b0c12; border: 1px solid var(--glass-border);
          border-radius: 20px; overflow:hidden;
          display:flex; flex-direction:column;
        }
        .ticket-head { padding: 16px; border-bottom: 1px dashed var(--glass-border); }
        .cart { flex:1; overflow-y:auto; padding: 14px; }
        .cart-item { display:flex; justify-content:space-between; align-items:center; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.03); margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.06); }
        .cart-actions { display:flex; gap: 8px; align-items:center; }
        .qty-btn { width: 34px; height: 34px; border-radius: 10px; }
        .ticket-foot { padding: 16px; border-top: 1px solid var(--glass-border); background: rgba(15,15,22,0.95); }
        .row { display:flex; justify-content:space-between; margin-bottom: 8px; color: var(--text-muted); font-size: 0.9rem; }
        .row strong { color: var(--text); }
        .toast {
          position: fixed; bottom: 25px; right: 25px; z-index: 9999;
          padding: 14px 18px; border-radius: 14px;
          border: 1px solid var(--glass-border);
          background: rgba(10,10,14,0.85); backdrop-filter: blur(10px);
          min-width: 260px;
        }
        .modal {
          position: fixed; inset: 0; z-index: 9998;
          background: rgba(0,0,0,0.75);
          display:flex; align-items:center; justify-content:center;
          padding: 20px;
        }
      `}} />

      {toast && (
        <div className="toast">
          <div style={{ fontWeight: 900, marginBottom: 4, color: toast.t === 'error' ? '#fca5a5' : toast.t === 'success' ? '#86efac' : '#e2e8f0' }}>
            {toast.t.toUpperCase()}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>{toast.m}</div>
        </div>
      )}

      {view === 'login' ? (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
          <div className="card" style={{ width: 420, textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: '1.8rem', marginBottom: 6 }}>VESPUCCI</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              Titanium Terminal • v{meta?.version || '—'}
            </div>

            <div style={{ textAlign: 'left', marginBottom: 12 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 900, marginBottom: 8 }}>IDENTIFIANT</div>
              <select className="input" value={user} onChange={(e) => setUser(e.target.value)}>
                <option value="">Choisir une identité...</option>
                {meta?.employees?.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', height: 52 }}
              disabled={!user}
              onClick={() => {
                localStorage.setItem('vespucci_user', user);
                setView('app');
                notify(`Bienvenue ${user}`, 'success');
              }}
            >
              INITIALISER LA SESSION
            </button>

            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 10 }}
              onClick={loadMeta}
            >
              SYNCHRONISER DONNÉES (SHEET)
            </button>
          </div>
        </div>
      ) : (
        <div className="app-container">
          <header className="topbar">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }} onClick={() => setTab('dashboard')}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900
              }}>
                V
              </div>
              <div>
                <div style={{ fontWeight: 900 }}>VESPUCCI</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manager • v{meta?.version || '—'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className={`btn ${tab === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('dashboard')}>Dashboard</button>
              <button className={`btn ${tab === 'invoice' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('invoice')}>Caisse</button>
              <button className={`btn ${tab === 'direction' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('direction')}>Direction</button>
              <button className={`btn ${tab === 'annuaire' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('annuaire')}>Annuaire</button>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900 }}>{user}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 900 }}>{role}</div>
              </div>
              <button className="btn btn-danger" onClick={logout}>OFF</button>
            </div>
          </header>

          {tab === 'dashboard' && (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1px' }}>Aperçu Global</div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    Employés: {meta?.totals.employees || 0} • Produits: {meta?.totals.products || 0}
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={loadMeta}>☁️ Sync Sheet</button>
              </div>

              <div className="bento-grid">
                <div className="widget w-large" onClick={() => setTab('invoice')}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 900, fontSize: '0.8rem' }}>MODULE VENTE</div>
                    <div className="w-stat" style={{ marginTop: 10 }}>CAISSE</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>Catalogue + facturation + remises</div>
                  </div>
                  <button className="btn btn-primary">Ouvrir</button>
                </div>

                <div className="widget" onClick={() => setTab('direction')}>
                  <div style={{ color: 'var(--accent)', fontWeight: 900, fontSize: '0.8rem' }}>ADMIN</div>
                  <div className="w-stat">RH</div>
                  <div style={{ color: 'var(--text-muted)' }}>Dossiers staff & dépenses</div>
                </div>

                <div className="widget" onClick={() => setTab('annuaire')}>
                  <div style={{ color: 'var(--success)', fontWeight: 900, fontSize: '0.8rem' }}>CONTACTS</div>
                  <div className="w-stat">TEL</div>
                  <div style={{ color: 'var(--text-muted)' }}>Annuaire (Sheet)</div>
                </div>

                <div className="widget w-wide" style={{ cursor: 'default' }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>SYSTÈME OPÉRATIONNEL</div>
                    <div style={{ color: 'var(--text-muted)' }}>Données live depuis Google Sheets</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-data)', color: 'var(--primary)', fontWeight: 900 }}>
                    {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === 'invoice' && (
            <section>
              <div className="pos-layout">
                {/* Left: catalogue */}
                <div className="card" style={{ padding: 16, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <input
                      className="input"
                      placeholder="Rechercher un service..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <button className="btn btn-ghost" onClick={() => { setSearch(''); setOpenCat(null); }}>Reset</button>
                  </div>

                  <div className="accordion">
                    {filteredCategories.map((cat) => (
                      <div className="cat" key={cat}>
                        <div
                          className="cat-h"
                          onClick={() => setOpenCat(prev => prev === cat ? null : cat)}
                        >
                          <div style={{ fontWeight: 900 }}>{cat}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{openCat === cat ? '▲' : '▼'}</div>
                        </div>

                        {openCat === cat && (
                          <div className="cat-b">
                            {productsOfCat(cat).map((p) => (
                              <div key={p} className="product" onClick={() => addToCart(p)}>
                                <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{p}</div>
                                <div className="price">{currencySymbol}{(meta?.prices?.[p] ?? 0).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: ticket */}
                <div className="ticket">
                  <div className="ticket-head">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontWeight: 900 }}>TICKET</div>
                      <div style={{ fontFamily: 'var(--font-data)', color: 'var(--text-muted)' }}>
                        {cart.reduce((s, i) => s + i.qty, 0)} items
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <input className="input" placeholder="Client" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                      <input className="input" placeholder="ID Facture" value={invoiceNumber} readOnly style={{ opacity: 0.7, fontFamily: 'var(--font-data)' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                      <select className="input" value={enterprise} onChange={(e) => setEnterprise(e.target.value)}>
                        <option value="">Aucune entreprise</option>
                        {Object.keys(meta?.enterprises || {}).map((k) => (
                          <option key={k} value={k}>{k} (-{meta?.enterprises?.[k]?.discount ?? 0}%)</option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 900, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          <input type="checkbox" checked={discountActivated} onChange={(e) => setDiscountActivated(e.target.checked)} />
                          Remise
                        </label>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 900, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          <input type="checkbox" checked={employeeCard} onChange={(e) => setEmployeeCard(e.target.checked)} />
                          Carte
                        </label>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Remise appliquée: <b style={{ color: 'var(--text)' }}>{discountType}</b> • <b style={{ color: 'var(--primary)' }}>{appliedDiscountPct}%</b>
                    </div>
                  </div>

                  <div className="cart">
                    {cart.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', opacity: 0.7, textAlign: 'center', marginTop: 30 }}>
                        Panier vide
                      </div>
                    ) : (
                      cart.map((it) => (
                        <div className="cart-item" key={it.desc}>
                          <div>
                            <div style={{ fontWeight: 900, marginBottom: 4 }}>{it.desc}</div>
                            <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-data)', fontSize: '0.85rem' }}>
                              {currencySymbol}{it.pu.toFixed(2)} × {it.qty}
                            </div>
                          </div>
                          <div className="cart-actions">
                            <button className="btn btn-ghost qty-btn" onClick={() => modQty(it.desc, -1)}>-</button>
                            <button className="btn btn-ghost qty-btn" onClick={() => modQty(it.desc, +1)}>+</button>
                            <button className="btn btn-danger qty-btn" onClick={() => modQty(it.desc, -999)}>✕</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="ticket-foot">
                    <div className="row">
                      <span>Sous-total</span>
                      <strong style={{ fontFamily: 'var(--font-data)' }}>{currencySymbol}{subtotal.toFixed(2)}</strong>
                    </div>
                    <div className="row">
                      <span>Remise ({appliedDiscountPct}%)</span>
                      <strong style={{ fontFamily: 'var(--font-data)', color: 'var(--success)' }}>
                        -{currencySymbol}{discountAmount.toFixed(2)}
                      </strong>
                    </div>
                    <div className="row" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 10 }}>
                      <span style={{ fontWeight: 900, letterSpacing: 1 }}>TOTAL NET</span>
                      <strong style={{ fontFamily: 'var(--font-data)', color: 'var(--primary)', fontSize: '1.2rem' }}>
                        {currencySymbol}{total.toFixed(2)}
                      </strong>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 12, height: 50 }} onClick={submitInvoice}>
                      ENCAISSER
                    </button>

                    <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={clearCart}>
                      Vider Panier
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === 'direction' && (
            <section>
              {!adminUnlocked ? (
                <div className="card" style={{ maxWidth: 520, margin: '60px auto', borderColor: 'rgba(239,68,68,0.25)' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: 10 }}>Accès Restreint</div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Authentification Direction requise</div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <input className="input" placeholder="CODE PIN" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
                    <button
                      className="btn btn-primary"
                      style={{ background: 'var(--danger)' }}
                      onClick={() => {
                        const pinSheet = meta?.ui?.adminPin || '';
                        if (pinSheet && adminPin === pinSheet) {
                          setAdminUnlocked(true);
                          notify('Accès accordé', 'success');
                        } else {
                          notify('Code incorrect', 'error');
                        }
                      }}
                    >
                      OK
                    </button>
                  </div>

                  <div style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    *Le PIN est lu depuis l’onglet <b>Config</b> du Sheet (clé: <b>ADMIN_PIN</b>)
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 900 }}>Panel Direction</div>
                      <div style={{ color: 'var(--text-muted)' }}>RH + Dépenses (écritures Sheets + Discord)</div>
                    </div>
                    <button className="btn btn-ghost" onClick={() => { setAdminUnlocked(false); setAdminPin(''); }}>
                      Verrouiller
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                    <div className="widget" onClick={() => openHR('recrutement')}><div style={{ fontWeight: 900 }}>➕ Recrutement</div><div style={{ color: 'var(--text-muted)' }}>Nouveau contrat</div></div>
                    <div className="widget" onClick={() => openHR('convocation')}><div style={{ fontWeight: 900 }}>📋 Convocation</div><div style={{ color: 'var(--text-muted)' }}>Demande RDV</div></div>
                    <div className="widget" onClick={() => openHR('avertissement')}><div style={{ fontWeight: 900 }}>⚠️ Avertissement</div><div style={{ color: 'var(--text-muted)' }}>Sanction</div></div>
                    <div className="widget" onClick={() => openHR('licenciement')}><div style={{ fontWeight: 900, color: '#fca5a5' }}>🔴 Licenciement</div><div style={{ color: 'var(--text-muted)' }}>Rupture</div></div>
                    <div className="widget" onClick={() => openHR('demission')}><div style={{ fontWeight: 900 }}>📝 Démission</div><div style={{ color: 'var(--text-muted)' }}>Enregistrement</div></div>
                    <div className="widget" style={{ gridColumn: 'span 2' }} onClick={() => openHR('depense')}>
                      <div style={{ fontWeight: 900, color: '#86efac' }}>💸 Dépense Entreprise</div>
                      <div style={{ color: 'var(--text-muted)' }}>Déclaration de frais</div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === 'annuaire' && (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 900 }}>Répertoire</div>
                  <div style={{ color: 'var(--text-muted)' }}>Données récupérées depuis Google Sheets</div>
                </div>
                <button className="btn btn-ghost" onClick={loadMeta}>Sync</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {(meta?.directory || []).map((c) => (
                  <div key={c.name} className="card" style={{ padding: 18, textAlign: 'center' }}>
                    <img
                      src={c.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                      style={{ width: 74, height: 74, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.12)', marginBottom: 10 }}
                    />
                    <div style={{ fontWeight: 900 }}>{c.name}</div>
                    <div style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '0.8rem', marginTop: 4 }}>{c.role || '—'}</div>
                    <div style={{ fontFamily: 'var(--font-data)', color: 'var(--text-muted)', marginTop: 8 }}>{c.phone || '—'}</div>

                    <button
                      className="btn btn-ghost"
                      style={{ width: '100%', marginTop: 12 }}
                      onClick={async () => {
                        if (!c.phone) return notify('Numéro manquant', 'error');
                        await navigator.clipboard.writeText(c.phone);
                        notify('Numéro copié', 'success');
                      }}
                    >
                      Copier
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* MODAL RH */}
          {hrModal && (
            <div className="modal" onClick={() => setHrModal(null)}>
              <div className="card" style={{ width: 520, maxWidth: '95vw' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>{hrModal.title}</div>
                  <button className="btn btn-ghost" onClick={() => setHrModal(null)}>Fermer</button>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 900, marginBottom: 6 }}>
                      {hrModal.targetLabel}
                    </div>
                    <input
                      className="input"
                      placeholder={hrModal.type === 'depense' ? 'ex: 325.75' : 'Nom Prénom'}
                      value={hrTarget}
                      onChange={(e) => setHrTarget(e.target.value)}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 900, marginBottom: 6 }}>
                      DATE EFFECTIVE
                    </div>
                    <input className="input" type="date" value={hrDate} onChange={(e) => setHrDate(e.target.value)} />
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 900, marginBottom: 6 }}>
                      MOTIF / DESCRIPTION
                    </div>
                    <textarea className="input" rows={4} value={hrReason} onChange={(e) => setHrReason(e.target.value)} />
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 900, marginBottom: 6 }}>
                      {hrModal.type === 'depense' ? 'ENTREPRISE / FOURNISSEUR' : 'DÉTAILS (optionnel)'}
                    </div>
                    <input className="input" value={hrDetails} onChange={(e) => setHrDetails(e.target.value)} />
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%', height: 50 }} onClick={submitHR}>
                    Confirmer l'envoi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
