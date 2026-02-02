'use client';

import React, { useEffect, useMemo, useState } from 'react';

function randInvoice() {
  return 'INV-' + Math.floor(100000 + Math.random() * 900000);
}

export default function VespucciTitanium() {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session
  const [user, setUser] = useState('');
  const [view, setView] = useState('login'); // login | app
  const [tab, setTab] = useState('dashboard'); // dashboard | invoice | direction | annuaire

  // Toast
  const [toast, setToast] = useState(null);
  const notify = (t, m, s = 'info') => {
    setToast({ t, m, s });
    setTimeout(() => setToast(null), 3500);
  };

  // Caisse
  const [invoiceNumber, setInvoiceNumber] = useState(randInvoice());
  const [customerName, setCustomerName] = useState('');
  const [enterprise, setEnterprise] = useState('');
  const [discountActivated, setDiscountActivated] = useState(false);
  const [employeeCard, setEmployeeCard] = useState(false);
  const [search, setSearch] = useState('');
  const [openCat, setOpenCat] = useState(null);
  const [cart, setCart] = useState([]); // { desc, qty, price }

  // Direction
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const ADMIN_CODE = '123459'; // mets le tiens (ou gère côté serveur si tu veux)

  const [hrModal, setHrModal] = useState(null); // {type}
  const [hrTarget, setHrTarget] = useState('');
  const [hrDate, setHrDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hrReason, setHrReason] = useState('');
  const [hrDetails, setHrDetails] = useState('');

  // API helper
  const api = async (action, data) => {
    const r = await fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
    });
    const j = await r.json();
    if (!j.success) throw new Error(j.error || j.message || 'Erreur');
    return j;
  };

  // Load meta (comme getAppMeta)
  useEffect(() => {
    (async () => {
      try {
        const j = await api('getMeta', {});
        setMeta(j);
      } catch (e) {
        notify('ERREUR', e.message || 'Impossible de charger les données', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Calculs caisse (comme Apps Script)
  const subtotal = useMemo(() => cart.reduce((s, it) => s + it.qty * it.price, 0), [cart]);

  const discountPct = useMemo(() => {
    if (!meta) return 0;
    if (!discountActivated) return 0;
    if (enterprise) return Number(meta.enterprises?.[enterprise]?.discount || 0) || 0;
    return Number(meta.employeeDiscounts?.[user]?.discount || 0) || 0;
  }, [meta, discountActivated, enterprise, user]);

  const discountAmount = useMemo(() => Number((subtotal * (discountPct / 100)).toFixed(2)), [subtotal, discountPct]);
  const total = useMemo(() => Number((subtotal - discountAmount).toFixed(2)), [subtotal, discountAmount]);

  const addToCart = (desc) => {
    if (!meta) return;
    const price = Number(meta.prices?.[desc] || 0);
    setCart((prev) => {
      const copy = [...prev];
      const i = copy.findIndex((x) => x.desc === desc);
      if (i >= 0) copy[i] = { ...copy[i], qty: copy[i].qty + 1 };
      else copy.push({ desc, qty: 1, price });
      return copy;
    });
  };

  const modQty = (idx, delta) => {
    setCart((prev) => {
      const copy = [...prev];
      const it = copy[idx];
      if (!it) return prev;
      const q = it.qty + delta;
      if (q <= 0) copy.splice(idx, 1);
      else copy[idx] = { ...it, qty: q };
      return copy;
    });
  };

  const submitInvoice = async () => {
    if (!cart.length) return notify('PANIER', 'Panier vide', 'error');

    try {
      const payload = {
        employee: user,
        invoiceNumber,
        enterprise: enterprise || '',
        customerName: customerName || '',
        employeeCard,
        discountActivated,
        items: cart.map((x) => ({ desc: x.desc, qty: x.qty })),
      };

      const res = await api('sendFactures', payload);
      notify('FACTURE', res.message || 'Facture envoyée', 'success');

      // reset
      setCart([]);
      setCustomerName('');
      setEnterprise('');
      setDiscountActivated(false);
      setEmployeeCard(false);
      setInvoiceNumber(randInvoice());
    } catch (e) {
      notify('ERREUR FACTURE', e.message, 'error');
    }
  };

  const openHR = (type) => {
    setHrModal({ type });
    setHrTarget('');
    setHrDate(new Date().toISOString().slice(0, 10));
    setHrReason('');
    setHrDetails('');
  };

  const submitHR = async () => {
    if (!hrModal?.type) return;
    if (!hrTarget || !hrDate || !hrReason) return notify('RH', 'Champs incomplets', 'error');

    try {
      const isExpense = hrModal.type === 'depense';
      const payload = {
        type: hrModal.type,
        employee: hrTarget, // Apps Script: "employee" = cible ou montant
        amount: isExpense ? hrTarget : undefined,
        date: new Date(hrDate).toISOString(),
        reason: hrReason,
        initiatedBy: user,
        details: hrDetails || '',
      };

      await api('sendHR', payload);
      notify('DIRECTION', 'Dossier transmis', 'success');
      setHrModal(null);
    } catch (e) {
      notify('ERREUR RH', e.message, 'error');
    }
  };

  const doLogin = () => {
    if (!user) return;
    setView('app');
    notify('SESSION', `Bienvenue ${user}`, 'success');
  };

  const doLogout = () => {
    setView('login');
    setTab('dashboard');
    setAdminUnlocked(false);
    setAdminPin('');
    setCart([]);
    setCustomerName('');
    setInvoiceNumber(randInvoice());
  };

  if (loading && !meta) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Chargement...
      </div>
    );
  }

  return (
    <>
      {/* Styles (reprend ton style “Titanium”, version compacte mais compatible) */}
      <style>{`
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
        * { box-sizing: border-box; }
        body { margin:0; font-family: var(--font-ui); background: var(--bg-deep); color: var(--text); }
        body::before{
          content:""; position:fixed; inset:0; z-index:-2;
          background:
            radial-gradient(circle at 50% 10%, #1e1e3f 0%, #05050a 100%),
            linear-gradient(45deg, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(-45deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 100% 100%, 40px 40px, 40px 40px;
          background-attachment: fixed;
        }
        .hidden { display:none !important; }
        .btn {
          display:inline-flex; align-items:center; justify-content:center; gap:10px;
          padding: 12px 18px; border-radius: 12px; font-weight: 800;
          cursor:pointer; border: 1px solid transparent; letter-spacing: .5px; text-transform: uppercase; font-size: .8rem;
        }
        .btn-primary { background: var(--gradient-primary); color:#fff; box-shadow: 0 4px 20px -5px var(--primary-glow); }
        .btn-ghost { background: rgba(255,255,255,0.03); border:1px solid var(--glass-border); color: var(--text-muted); }
        .btn-danger { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #ffb4b4; }
        .input, select, textarea {
          width:100%; padding: 14px 18px; border-radius: 12px;
          background: rgba(0,0,0,0.4); border:1px solid var(--glass-border);
          color:#fff; font-size: .95rem;
        }
        .card {
          background: var(--bg-panel);
          backdrop-filter: blur(20px) saturate(180%);
          border:1px solid var(--glass-border);
          border-top: 1px solid var(--glass-highlight);
          border-radius: 20px; padding: 22px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .wrap { max-width: 1400px; margin: 0 auto; padding: 18px; }
        .topbar {
          display:flex; justify-content:space-between; align-items:center;
          padding: 14px 18px; margin: 18px 0 22px;
          background: rgba(20,20,35,.6);
          border: 1px solid var(--glass-border);
          border-radius: 18px;
          position: sticky; top: 14px; z-index: 50;
          backdrop-filter: blur(18px);
        }
        .bento { display:grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .widget {
          background: var(--bg-panel); border:1px solid var(--glass-border);
          border-radius: 20px; padding: 22px; min-height: 150px;
          cursor:pointer; display:flex; flex-direction:column; justify-content:space-between;
        }
        .w-large { grid-column: span 2; grid-row: span 2; }
        .w-stat { font-family: var(--font-data); font-size: 2.2rem; font-weight: 900; margin: 10px 0; }
        .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pos { display:grid; grid-template-columns: 2fr 1.05fr; gap: 18px; height: calc(100vh - 160px); }
        .catalog { overflow:hidden; display:flex; flex-direction:column; gap: 12px; }
        .scroll { overflow:auto; padding-right: 6px; flex:1; }
        .accHead {
          display:flex; justify-content:space-between; align-items:center;
          padding: 14px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          cursor:pointer;
        }
        .accBody { padding: 14px; border: 1px solid var(--glass-border); border-top:none; border-radius: 0 0 14px 14px; background: rgba(0,0,0,0.22); }
        .prodGrid { display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
        .prod {
          background: rgba(255,255,255,0.03);
          border:1px solid var(--glass-border);
          border-radius: 12px;
          padding: 12px;
          cursor:pointer;
          text-align:center;
          display:flex; flex-direction:column; gap: 6px;
        }
        .price { font-family: var(--font-data); color: var(--primary); font-weight: 900; font-size: .9rem; }
        .ticket {
          background: #0b0c12; border:1px solid var(--glass-border);
          border-radius: 20px; overflow:hidden;
          display:flex; flex-direction:column;
        }
        .ticketHead { padding: 16px; border-bottom: 1px dashed var(--glass-border); background: rgba(255,255,255,0.02); }
        .ticketBody { flex:1; overflow:auto; padding: 14px; }
        .line {
          display:flex; justify-content:space-between; align-items:center;
          padding: 10px 12px; margin-bottom: 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border-left: 2px solid var(--glass-border);
        }
        .qtyBtn { width: 28px; height: 28px; border-radius: 10px; border:1px solid var(--glass-border); background: rgba(255,255,255,0.03); color:#fff; cursor:pointer; }
        .ticketFoot { padding: 16px; border-top: 1px solid var(--glass-border); background: rgba(15,15,22,0.95); }
        .muted { color: var(--text-muted); font-size: .85rem; }
        .toast {
          position: fixed; right: 20px; bottom: 20px; z-index: 9999;
          background: rgba(15,15,22,0.95);
          border:1px solid var(--glass-border);
          border-left: 4px solid var(--primary);
          border-radius: 16px;
          padding: 12px 16px;
          min-width: 260px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .toast.error { border-left-color: var(--danger); }
        .toast.success { border-left-color: var(--success); }
        .modalBack {
          position: fixed; inset:0; background: rgba(0,0,0,0.75);
          display:flex; align-items:center; justify-content:center;
          z-index: 9998;
        }
        .modal { width: min(560px, 92vw); }
        .dirGrid { display:grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .miniCard {
          background: rgba(255,255,255,0.02);
          border:1px solid var(--glass-border);
          border-radius: 16px;
          padding: 14px;
          cursor:pointer;
        }
        .ann { display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
        .avatar {
          width: 70px; height: 70px; border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.08);
          object-fit: cover;
          margin-bottom: 10px;
        }
      `}</style>

      {/* TOAST */}
      {toast && (
        <div className={`toast ${toast.s}`}>
          <div style={{ fontWeight: 900, marginBottom: 4 }}>{toast.t}</div>
          <div className="muted">{toast.m}</div>
        </div>
      )}

      <div className="wrap">
        {/* LOGIN */}
        {view === 'login' ? (
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: 420, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💎</div>
              <div style={{ fontWeight: 900, fontSize: '1.8rem' }}>VESPUCCI</div>
              <div className="muted" style={{ marginBottom: 18, textTransform: 'uppercase', letterSpacing: 2 }}>
                Titanium Access • v{meta?.version}
              </div>

              <div style={{ textAlign: 'left', marginBottom: 14 }}>
                <div style={{ fontSize: '.75rem', fontWeight: 900, color: 'var(--primary)', marginBottom: 6 }}>
                  Identifiant
                </div>
                <select className="input" value={user} onChange={(e) => setUser(e.target.value)}>
                  <option value="">Choisir une identité...</option>
                  {meta?.employees?.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn btn-primary" style={{ width: '100%' }} onClick={doLogin} disabled={!user}>
                INITIALISER LA SESSION
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* TOPBAR */}
            <div className="topbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setTab('dashboard')}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  💎
                </div>
                <div>
                  <div style={{ fontWeight: 900, letterSpacing: -0.3 }}>VESPUCCI</div>
                  <div className="muted" style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
                    Manager • {meta?.currencyCode}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setTab('dashboard')}>
                  Dashboard
                </button>
                <button className="btn btn-ghost" onClick={() => setTab('invoice')}>
                  Caisse
                </button>
                <button className="btn btn-ghost" onClick={() => setTab('direction')}>
                  Direction
                </button>
                <button className="btn btn-ghost" onClick={() => setTab('annuaire')}>
                  Annuaire
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900 }}>{user}</div>
                  <div className="muted" style={{ color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {meta?.employeeDiscounts?.[user]?.role || 'Employé'}
                  </div>
                </div>
                <button className="btn btn-danger" onClick={doLogout}>
                  ⏻
                </button>
              </div>
            </div>

            {/* DASHBOARD */}
            {tab === 'dashboard' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: -1 }}>Aperçu Global</div>
                    <div className="muted">Terminal connecté • Produits: {meta?.totals?.products} • Employés: {meta?.totals?.employees}</div>
                  </div>
                  <div className="muted" style={{ fontFamily: 'var(--font-data)' }}>
                    {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="bento">
                  <div className="widget w-large" onClick={() => setTab('invoice')}>
                    <div>
                      <div className="muted" style={{ textTransform: 'uppercase', fontWeight: 900, letterSpacing: 2 }}>
                        Module Vente
                      </div>
                      <div className="w-stat">CAISSE</div>
                      <div className="muted">Catalogue + facturation + Sheet + Discord</div>
                    </div>
                    <button className="btn btn-primary">Ouvrir</button>
                  </div>

                  <div className="widget" onClick={() => setTab('direction')}>
                    <div>
                      <div className="muted" style={{ textTransform: 'uppercase', fontWeight: 900, letterSpacing: 2, color: 'var(--accent)' }}>
                        Administration
                      </div>
                      <div className="w-stat" style={{ fontSize: '1.8rem' }}>RH</div>
                      <div className="muted">Convoc / avertiss / dépense / etc.</div>
                    </div>
                  </div>

                  <div className="widget" onClick={() => setTab('annuaire')}>
                    <div>
                      <div className="muted" style={{ textTransform: 'uppercase', fontWeight: 900, letterSpacing: 2, color: 'var(--success)' }}>
                        Contacts
                      </div>
                      <div className="w-stat" style={{ fontSize: '1.8rem' }}>TEL</div>
                      <div className="muted">Annuaire depuis le Sheet</div>
                    </div>
                  </div>

                  <div className="widget" style={{ cursor: 'default' }}>
                    <div>
                      <div className="muted" style={{ textTransform: 'uppercase', fontWeight: 900, letterSpacing: 2 }}>
                        Système
                      </div>
                      <div style={{ fontFamily: 'var(--font-data)', fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)' }}>
                        v{meta?.version}
                      </div>
                      <div className="muted">API / Discord / Sheets</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INVOICE */}
            {tab === 'invoice' && (
              <div className="pos">
                {/* Catalogue */}
                <div className="catalog">
                  <input className="input" placeholder="Rechercher un service..." value={search} onChange={(e) => setSearch(e.target.value)} />

                  <div className="scroll">
                    {Object.entries(meta.productsByCategory || {}).map(([cat, items]) => {
                      const filtered = items.filter((p) => p.toLowerCase().includes(search.toLowerCase()));
                      if (search && !filtered.length) return null;

                      const isOpen = openCat === cat || Boolean(search);
                      return (
                        <div key={cat} style={{ marginBottom: 10 }}>
                          <div className="accHead" onClick={() => setOpenCat(isOpen ? null : cat)}>
                            <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>{cat}</div>
                            <div className="muted">{isOpen ? '▲' : '▼'}</div>
                          </div>
                          {isOpen && (
                            <div className="accBody">
                              <div className="prodGrid">
                                {(search ? filtered : items).map((p) => (
                                  <div className="prod" key={p} onClick={() => addToCart(p)}>
                                    <div style={{ fontWeight: 800, fontSize: '.85rem' }}>{p}</div>
                                    <div className="price">
                                      {meta.currencySymbol}
                                      {Number(meta.prices?.[p] || 0).toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ticket */}
                <div className="ticket">
                  <div className="ticketHead">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontWeight: 900, letterSpacing: 2 }}>TICKET</div>
                      <div className="muted" style={{ fontFamily: 'var(--font-data)' }}>
                        {cart.reduce((s, x) => s + x.qty, 0)} items
                      </div>
                    </div>

                    <div className="grid2">
                      <input className="input" placeholder="Client" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                      <input className="input" placeholder="ID Facture" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                    </div>

                    <div style={{ marginTop: 10 }} className="grid2">
                      <select className="input" value={enterprise} onChange={(e) => setEnterprise(e.target.value)}>
                        <option value="">Entreprise (optionnel)</option>
                        {Object.keys(meta.enterprises || {}).map((k) => (
                          <option key={k} value={k}>
                            {k} (-{meta.enterprises[k].discount}%)
                          </option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="checkbox" checked={discountActivated} onChange={(e) => setDiscountActivated(e.target.checked)} />
                          Remise activée
                        </label>

                        <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="checkbox" checked={employeeCard} onChange={(e) => setEmployeeCard(e.target.checked)} />
                          Carte employé
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="ticketBody">
                    {!cart.length ? (
                      <div className="muted" style={{ opacity: 0.6, textAlign: 'center', marginTop: 30 }}>
                        Panier vide
                      </div>
                    ) : (
                      cart.map((it, idx) => (
                        <div className="line" key={it.desc}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: '.92rem' }}>{it.desc}</div>
                            <div className="muted" style={{ fontFamily: 'var(--font-data)' }}>
                              {meta.currencySymbol}
                              {it.price.toFixed(2)} × {it.qty}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button className="qtyBtn" onClick={() => modQty(idx, -1)}>
                              –
                            </button>
                            <button className="qtyBtn" onClick={() => modQty(idx, +1)} style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                              +
                            </button>
                            <button className="qtyBtn" onClick={() => modQty(idx, -999)} style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
                              🗑
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="ticketFoot">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }} className="muted">
                      <span>Sous-total</span>
                      <span style={{ fontFamily: 'var(--font-data)' }}>
                        {meta.currencySymbol}
                        {subtotal.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="muted">
                      <span>Remise ({discountPct}%)</span>
                      <span style={{ fontFamily: 'var(--font-data)', color: 'var(--success)' }}>
                        -{meta.currencySymbol}
                        {discountAmount.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontWeight: 900, letterSpacing: 1 }}>TOTAL NET</span>
                      <span style={{ fontWeight: 900, fontSize: '1.3rem', color: 'var(--primary)', fontFamily: 'var(--font-data)' }}>
                        {meta.currencySymbol}
                        {total.toFixed(2)}
                      </span>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={submitInvoice}>
                      ENCAISSER
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DIRECTION */}
            {tab === 'direction' && (
              <div style={{ maxWidth: 900, margin: '0 auto' }}>
                {!adminUnlocked ? (
                  <div className="card" style={{ borderColor: 'rgba(239,68,68,0.25)', marginTop: 50 }}>
                    <div style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: 6 }}>Accès Restreint</div>
                    <div className="muted" style={{ marginBottom: 16 }}>Authentification Direction Requise</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input className="input" placeholder="CODE PIN" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
                      <button
                        className="btn btn-primary"
                        style={{ background: 'var(--danger)' }}
                        onClick={() => {
                          if (adminPin === ADMIN_CODE) setAdminUnlocked(true);
                          else notify('PIN', 'Code incorrect', 'error');
                        }}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '1.6rem' }}>Panel de Direction</div>
                        <div className="muted">RH & Finances (dépenses)</div>
                      </div>
                      <button className="btn btn-ghost" onClick={() => { setAdminUnlocked(false); setAdminPin(''); }}>
                        Verrouiller
                      </button>
                    </div>

                    <div className="dirGrid">
                      <div className="miniCard" onClick={() => openHR('recrutement')}>
                        <div style={{ fontWeight: 900 }}>➕ Recrutement</div>
                        <div className="muted">Nouveau contrat</div>
                      </div>
                      <div className="miniCard" onClick={() => openHR('convocation')}>
                        <div style={{ fontWeight: 900 }}>📋 Convocation</div>
                        <div className="muted">Demande RDV</div>
                      </div>
                      <div className="miniCard" onClick={() => openHR('avertissement')}>
                        <div style={{ fontWeight: 900 }}>⚠️ Avertissement</div>
                        <div className="muted">Sanction</div>
                      </div>
                      <div className="miniCard" onClick={() => openHR('licenciement')} style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
                        <div style={{ fontWeight: 900, color: '#ffb4b4' }}>🔴 Licenciement</div>
                        <div className="muted">Rupture</div>
                      </div>
                      <div className="miniCard" onClick={() => openHR('demission')}>
                        <div style={{ fontWeight: 900 }}>📝 Démission</div>
                        <div className="muted">Enregistrer</div>
                      </div>
                      <div className="miniCard" onClick={() => openHR('depense')} style={{ gridColumn: 'span 2' }}>
                        <div style={{ fontWeight: 900 }}>💸 Dépense Entreprise</div>
                        <div className="muted">Déclaration de frais</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ANNUAIRE */}
            {tab === 'annuaire' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>Répertoire</div>
                    <div className="muted">Données depuis `/api` (et onglet “Employés” si présent)</div>
                  </div>
                </div>

                <div className="ann">
                  {(meta.directory || []).map((c, idx) => (
                    <div className="card" key={idx} style={{ textAlign: 'center' }}>
                      <img className="avatar" src={c.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} alt="" />
                      <div style={{ fontWeight: 900 }}>{c.name}</div>
                      <div className="muted" style={{ marginBottom: 10, color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase' }}>
                        {c.role || 'Employé'}
                      </div>
                      <div style={{ fontFamily: 'var(--font-data)', fontWeight: 900, letterSpacing: 1 }}>{c.phone || '—'}</div>
                      <button
                        className="btn btn-ghost"
                        style={{ width: '100%', marginTop: 12 }}
                        onClick={() => {
                          const txt = c.phone || '';
                          navigator.clipboard.writeText(txt);
                          notify('COPIÉ', `Numéro copié: ${txt}`, 'success');
                        }}
                      >
                        Copier
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODAL RH */}
            {hrModal && (
              <div className="modalBack" onClick={() => setHrModal(null)}>
                <div className="card modal" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>
                      RH: {hrModal.type.toUpperCase()}
                    </div>
                    <button className="btn btn-ghost" onClick={() => setHrModal(null)}>
                      ✕
                    </button>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div className="muted" style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                      {hrModal.type === 'depense' ? 'Montant ($)' : 'Employé concerné'}
                    </div>
                    <input className="input" value={hrTarget} onChange={(e) => setHrTarget(e.target.value)} placeholder={hrModal.type === 'depense' ? 'Ex: 325.75' : 'Nom Prénom'} />
                  </div>

                  <div className="grid2" style={{ marginBottom: 10 }}>
                    <div>
                      <div className="muted" style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        Date effective
                      </div>
                      <input className="input" type="date" value={hrDate} onChange={(e) => setHrDate(e.target.value)} />
                    </div>

                    <div>
                      <div className="muted" style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        Détails (optionnel)
                      </div>
                      <input className="input" value={hrDetails} onChange={(e) => setHrDetails(e.target.value)} placeholder={hrModal.type === 'depense' ? 'Fournisseur / Entreprise' : 'Infos supplémentaires'} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div className="muted" style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                      Motif / Description
                    </div>
                    <textarea className="input" rows={4} value={hrReason} onChange={(e) => setHrReason(e.target.value)} placeholder="Détails du dossier..." />
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitHR}>
                    Confirmer l’envoi
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
