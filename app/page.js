'use client';
import { useState, useEffect, useMemo } from 'react';

// --- CONFIGURATION ---
const APP_NAME = "VESPUCCI MANAGER";
const APP_VERSION = "TITANIUM v5.0";

const MODULES = [
  { id: 'dashboard', l: 'Tableau de bord', e: '📊' },
  { id: 'caisse', l: 'Caisse & Vente', e: '💎' },
  { id: 'expenses', l: 'Frais & Notes', e: '💸' },
  { id: 'admin', l: 'Direction RH', e: '⚖️' },
  { id: 'annuaire', l: 'Annuaire Staff', e: '📒' }
];

const CAT_ICONS = {
  'Tête': '👤', 'Torse/Dos': '👕', 'Bras': '💪', 'Jambes': '🦵',
  'Custom': '🎨', 'Laser': '⚡', 'Coiffure': '✂️', 'Logistique': '📦'
};

const HR_TYPES = ['recrutement', 'convocation', 'avertissement', 'licenciement', 'demission'];

export default function Home() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState('');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Caisse
  const [cart, setCart] = useState([]);
  const [catFilter, setCatFilter] = useState('All');
  const [invoiceForm, setInvoiceForm] = useState({ client: '', discount: 0, invoiceNumber: '' });
  
  // Forms
  const [hrForm, setHrForm] = useState({ type: 'recrutement', target: '', reason: '' });
  const [expenseForm, setExpenseForm] = useState({ amount: '', reason: '', file: null });
  const [adminPin, setAdminPin] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  
  const [sending, setSending] = useState(false);

  // --- AUDIO ENGINE ---
  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      
      if (type === 'click') {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(1000, now + 0.2);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(); osc.stop(now + 0.3);
      }
    } catch (e) {}
  };

  // --- INIT ---
  useEffect(() => {
    setInvoiceForm(prev => ({ ...prev, invoiceNumber: 'INV-' + Math.floor(100000 + Math.random() * 900000) }));
    
    fetch('/api', { method: 'POST', body: JSON.stringify({ action: 'getMeta' }) })
      .then(r => r.json())
      .then(d => { if(d.success) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
      
    const savedUser = localStorage.getItem('vespucci_user');
    if(savedUser) { setUser(savedUser); setView('app'); }
  }, []);

  // --- LOGIC ---
  const addToCart = (item) => {
    playSound('click');
    setCart(prev => {
      const exist = prev.find(i => i.name === item);
      if (exist) return prev.map(i => i.name === item ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { name: item, qty: 1, price: data.prices[item] || 0 }];
    });
  };

  const removeFromCart = (idx) => {
    const n = [...cart]; n.splice(idx, 1); setCart(n);
  };

  const calculateTotal = () => {
    const sub = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const discAmt = (sub * (invoiceForm.discount / 100));
    return { sub, discAmt, total: sub - discAmt };
  };

  const sendAction = async (action, payload) => {
    if(sending) return;
    setSending(true);
    try {
        const res = await fetch('/api', {
            method: 'POST',
            body: JSON.stringify({ action, data: { ...payload, author: user } })
        });
        const json = await res.json();
        if(json.success) {
            playSound('success');
            // Reset forms
            if(action === 'sendFacture') { setCart([]); setInvoiceForm(p => ({...p, client: '', invoiceNumber: 'INV-' + Math.floor(Math.random()*1000000)})); }
            if(action === 'sendHR') setHrForm({ type: 'recrutement', target: '', reason: '' });
            if(action === 'sendExpense') setExpenseForm({ amount: '', reason: '', file: null });
        } else {
            alert('Erreur: ' + json.error);
        }
    } catch(e) { alert('Erreur réseau'); }
    setSending(false);
  };

  const handleExpenseFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setExpenseForm({ ...expenseForm, file: reader.result });
      reader.readAsDataURL(file);
    }
  };

  // --- RENDER ---
  if (loading) return (
    <div style={{height:'100vh', background:'#09090b', display:'flex', alignItems:'center', justifyContent:'center', color:'#22d3ee', fontFamily:'monospace', flexDirection:'column'}}>
      <div className="spinner"></div>
      <p style={{marginTop: 20, letterSpacing: 3}}>INITIALISATION SYSTEME...</p>
      <style jsx>{`
        .spinner { width: 50px; height: 50px; border: 3px solid rgba(34, 211, 238, 0.3); border-radius: 50%; border-top-color: #22d3ee; animation: spin 1s ease-in-out infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  if (view === 'login') return (
    <div className="login-wrapper">
      <div className="bg-mesh"></div>
      <style jsx global>{`
         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
         body { margin: 0; background: #000; font-family: 'Inter', sans-serif; overflow: hidden; color: #fff; }
         .login-wrapper { height: 100vh; display: flex; align-items: center; justifyContent: center; position: relative; z-index: 1; }
         .bg-mesh { position: absolute; inset: 0; background: radial-gradient(circle at 50% 0%, #1e293b, #000); z-index: -1; }
         
         .login-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 50px;
            width: 420px;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
            animation: slideUp 0.5s ease-out;
         }
         
         .title-glitch { font-size: 2.5rem; font-weight: 800; letter-spacing: -1px; margin: 0; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
         .subtitle { color: #22d3ee; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; letter-spacing: 3px; margin-bottom: 40px; text-transform: uppercase; }
         
         select { width: 100%; padding: 16px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 12px; font-size: 1rem; outline: none; appearance: none; cursor: pointer; transition: 0.2s; }
         select:hover { border-color: #22d3ee; }
         
         .btn-login { margin-top: 20px; width: 100%; padding: 16px; background: #22d3ee; color: #000; font-weight: 800; border: none; border-radius: 12px; cursor: pointer; transition: 0.2s; text-transform: uppercase; letter-spacing: 1px; }
         .btn-login:hover:not(:disabled) { box-shadow: 0 0 20px rgba(34, 211, 238, 0.4); transform: translateY(-2px); }
         .btn-login:disabled { background: #334155; color: #64748b; cursor: not-allowed; }

         @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      
      <div className="login-card">
        <div style={{fontSize:'3rem', marginBottom: 10}}>💎</div>
        <h1 className="title-glitch">VESPUCCI</h1>
        <div className="subtitle">{APP_VERSION}</div>
        
        <div style={{textAlign:'left', marginBottom: 5, fontSize:'0.8rem', color:'#64748b', marginLeft: 5}}>IDENTIFICATION</div>
        <select onChange={(e) => setUser(e.target.value)} value={user}>
            <option value="">Sélectionner un employé...</option>
            {data?.employees?.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        
        <button className="btn-login" disabled={!user} onClick={() => { localStorage.setItem('vespucci_user', user); setView('app'); playSound('success'); }}>
          Connexion <span style={{marginLeft: 10}}>→</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
        <style jsx global>{`
           /* --- DESIGN SYSTEM --- */
           :root {
             --bg-dark: #09090b;
             --panel-bg: rgba(24, 24, 27, 0.6);
             --border-color: rgba(255, 255, 255, 0.06);
             --primary: #22d3ee; /* Cyan */
             --primary-glow: rgba(34, 211, 238, 0.2);
             --text-main: #f4f4f5;
             --text-muted: #a1a1aa;
             --font-ui: 'Inter', sans-serif;
             --font-mono: 'JetBrains Mono', monospace;
           }
           
           /* LAYOUT */
           .app-shell { display: flex; height: 100vh; background: var(--bg-dark); color: var(--text-main); font-family: var(--font-ui); overflow: hidden; }
           
           /* SIDEBAR (DOCK) */
           .sidebar {
             width: 80px; 
             background: rgba(0,0,0,0.4); 
             backdrop-filter: blur(20px);
             border-right: 1px solid var(--border-color);
             display: flex; flex-direction: column; align-items: center;
             padding: 30px 0; z-index: 50; transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
           }
           .sidebar:hover { width: 240px; }
           
           .brand-icon { font-size: 2rem; margin-bottom: 40px; filter: drop-shadow(0 0 10px var(--primary-glow)); transition: 0.3s; }
           .sidebar:hover .brand-icon { transform: scale(1.1); }
           
           .nav-btn {
             width: 80%; padding: 14px; margin-bottom: 8px;
             border-radius: 14px; color: var(--text-muted); cursor: pointer;
             display: flex; align-items: center; gap: 15px;
             transition: all 0.2s; overflow: hidden; white-space: nowrap;
           }
           .nav-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
           .nav-btn.active { background: rgba(34, 211, 238, 0.1); color: var(--primary); border: 1px solid rgba(34, 211, 238, 0.2); }
           .nav-icon { font-size: 1.4rem; min-width: 40px; text-align: center; }
           .nav-label { font-weight: 600; opacity: 0; transition: 0.2s; transform: translateX(-10px); }
           .sidebar:hover .nav-label { opacity: 1; transform: translateX(0); }
           
           .user-pill {
              margin-top: auto; width: 50px; height: 50px; background: #27272a; border-radius: 50%;
              display: flex; align-items: center; justify-content: center; font-weight: 800;
              border: 2px solid var(--border-color); cursor: pointer; transition: 0.3s;
           }
           .user-pill:hover { border-color: var(--primary); color: var(--primary); }
           
           /* MAIN CONTENT */
           .main-area { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }
           .bg-gradient { position: absolute; inset: 0; background: radial-gradient(circle at top right, #1e293b 0%, #09090b 40%); z-index: -1; }
           .content-scroll { flex: 1; overflow-y: auto; padding: 40px; }
           
           /* COMPONENTS */
           .glass-panel {
             background: var(--panel-bg); backdrop-filter: blur(20px);
             border: 1px solid var(--border-color); border-radius: 24px;
             padding: 25px; transition: 0.3s;
           }
           
           .grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
           
           .card-action {
             background: rgba(255,255,255,0.02); border: 1px solid var(--border-color);
             border-radius: 20px; padding: 25px; cursor: pointer; transition: all 0.3s;
             display: flex; flex-direction: column; justify-content: space-between; height: 160px;
           }
           .card-action:hover {
             border-color: var(--primary); transform: translateY(-5px);
             background: linear-gradient(145deg, rgba(34, 211, 238, 0.05), transparent);
             box-shadow: 0 10px 30px -10px var(--primary-glow);
           }
           
           .inp-std {
             width: 100%; padding: 14px 18px; background: #18181b; border: 1px solid #27272a;
             border-radius: 12px; color: #fff; font-family: var(--font-ui); font-size: 0.95rem;
             transition: 0.2s; margin-bottom: 12px;
           }
           .inp-std:focus { outline: none; border-color: var(--primary); background: #27272a; }
           
           .btn-primary {
             background: var(--primary); color: #000; border: none; padding: 14px;
             border-radius: 12px; font-weight: 700; cursor: pointer; text-transform: uppercase;
             letter-spacing: 0.5px; width: 100%; transition: 0.2s;
           }
           .btn-primary:hover:not(:disabled) { box-shadow: 0 0 20px var(--primary-glow); transform: scale(1.01); }
           .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
           
           .btn-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 10px; border-radius: 8px; cursor: pointer; transition:0.2s;}
           .btn-danger:hover { background: #ef4444; color: #fff; }
           
           /* SPECIFIC: CAISSE */
           .pos-container { display: grid; grid-template-columns: 2.2fr 1fr; gap: 30px; height: calc(100vh - 80px); }
           .catalog-section { display: flex; flex-direction: column; overflow: hidden; }
           .filters { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 15px; margin-bottom: 10px; }
           .filter-chip {
             padding: 8px 16px; border-radius: 50px; background: rgba(255,255,255,0.05);
             border: 1px solid var(--border-color); cursor: pointer; white-space: nowrap; font-size: 0.85rem; transition:0.2s;
           }
           .filter-chip.active { background: var(--primary); color: #000; border-color: var(--primary); font-weight: 700; }
           
           .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; overflow-y: auto; padding-right: 5px; }
           .product-card {
             background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);
             border-radius: 16px; padding: 15px; cursor: pointer; text-align: center;
             display: flex; flex-direction: column; justify-content: center; height: 110px;
             transition: 0.2s;
           }
           .product-card:hover { border-color: var(--primary); background: rgba(34, 211, 238, 0.05); }
           .prod-price { color: var(--primary); font-family: var(--font-mono); font-size: 0.8rem; margin-top: 5px; }
           
           .ticket-panel {
             background: #000; border: 1px solid #27272a; border-radius: 20px;
             display: flex; flex-direction: column; overflow: hidden;
             box-shadow: -10px 0 40px rgba(0,0,0,0.5);
           }
           .ticket-body { flex: 1; overflow-y: auto; padding: 20px; }
           .ticket-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 0.9rem; border-bottom: 1px dashed #27272a; padding-bottom: 8px; }
           
        `}</style>

        {/* SIDEBAR */}
        <div className="sidebar">
            <div className="brand-icon">💎</div>
            {MODULES.map(m => (
                <div key={m.id} className={`nav-btn ${currentTab === m.id ? 'active' : ''}`} onClick={() => { playSound('click'); setCurrentTab(m.id); }}>
                    <div className="nav-icon">{m.e}</div>
                    <div className="nav-label">{m.l}</div>
                </div>
            ))}
            <div className="user-pill" onClick={() => setView('login')} title="Déconnexion">
                {user.charAt(0)}
            </div>
        </div>

        {/* CONTENT */}
        <div className="main-area">
            <div className="bg-gradient"></div>
            <div className="content-scroll">
                
                {/* 1. DASHBOARD */}
                {currentTab === 'dashboard' && (
                    <div style={{animation: 'fadeIn 0.5s'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 40}}>
                            <div>
                                <h1 style={{fontSize:'3rem', fontWeight: 900, margin: 0, letterSpacing: '-1px'}}>Bonjour, {user.split(' ')[0]}</h1>
                                <p style={{color:'var(--text-muted)', marginTop: 5}}>Terminal {APP_NAME} <span style={{color:'var(--primary)'}}>Connecté</span></p>
                            </div>
                            <div style={{fontFamily:'var(--font-mono)', opacity: 0.5}}>{new Date().toLocaleDateString()}</div>
                        </div>

                        <div className="grid-layout">
                            <div className="card-action" onClick={() => setCurrentTab('caisse')}>
                                <div style={{width:50, height:50, borderRadius:'50%', background:'rgba(34, 211, 238, 0.1)', color:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem'}}>💎</div>
                                <div>
                                    <h3 style={{margin:0}}>Nouvelle Vente</h3>
                                    <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Ouvrir le terminal de paiement</span>
                                </div>
                            </div>
                            <div className="card-action" onClick={() => setCurrentTab('expenses')}>
                                <div style={{width:50, height:50, borderRadius:'50%', background:'rgba(255, 255, 255, 0.05)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem'}}>🧾</div>
                                <div>
                                    <h3 style={{margin:0}}>Notes de Frais</h3>
                                    <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Déclarer un achat</span>
                                </div>
                            </div>
                             <div className="glass-panel" style={{gridColumn:'span 2', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                                <div>
                                    <h3 style={{margin:0}}>Effectif Actif</h3>
                                    <p style={{margin:0, color:'var(--text-muted)'}}>Employés enregistrés dans la base</p>
                                </div>
                                <div style={{fontSize:'3rem', fontWeight:900, color:'var(--primary)'}}>{data?.employees?.length || 0}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. CAISSE (POS) */}
                {currentTab === 'caisse' && (
                    <div className="pos-container" style={{animation: 'fadeIn 0.3s'}}>
                        
                        {/* GAUCHE : CATALOGUE */}
                        <div className="catalog-section">
                            <h2 style={{fontSize:'1.5rem', fontWeight: 800, marginBottom: 20}}>CATALOGUE</h2>
                            
                            {/* Filtres */}
                            <div className="filters">
                                <div className={`filter-chip ${catFilter === 'All' ? 'active' : ''}`} onClick={() => setCatFilter('All')}>TOUT</div>
                                {Object.keys(data?.productsByCategory || {}).map(cat => (
                                    <div key={cat} className={`filter-chip ${catFilter === cat ? 'active' : ''}`} onClick={() => setCatFilter(cat)}>
                                        {CAT_ICONS[cat]} {cat.toUpperCase()}
                                    </div>
                                ))}
                            </div>
                            
                            {/* Grille Produits */}
                            <div className="product-grid">
                                {data?.allProducts
                                    ?.filter(p => {
                                        if (catFilter === 'All') return true;
                                        return data.productsByCategory[catFilter]?.includes(p);
                                    })
                                    .map(p => (
                                    <div key={p} className="product-card" onClick={() => addToCart(p)}>
                                        <div style={{fontWeight:600, fontSize:'0.9rem', lineHeight:1.2}}>{p}</div>
                                        <div className="prod-price">{data?.prices[p] || 0} $</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DROITE : TICKET */}
                        <div className="ticket-panel">
                            <div style={{padding: 20, borderBottom:'1px solid #27272a'}}>
                                <div style={{fontSize:'0.75rem', color:'var(--text-muted)', letterSpacing:2}}>TICKET N° {invoiceForm.invoiceNumber}</div>
                                <input className="inp-std" style={{marginTop: 10, marginBottom: 0, textAlign:'center', fontWeight:700}} placeholder="NOM CLIENT" value={invoiceForm.client} onChange={e => setInvoiceForm({...invoiceForm, client: e.target.value})} />
                            </div>

                            <div className="ticket-body">
                                {cart.length === 0 ? 
                                    <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#333', flexDirection:'column'}}>
                                        <div style={{fontSize:'2rem', marginBottom:10}}>🛒</div>
                                        <div>Panier vide</div>
                                    </div> 
                                : cart.map((item, idx) => (
                                    <div key={idx} className="ticket-item">
                                        <div>
                                            <div style={{color:'#fff'}}>{item.name}</div>
                                            <div style={{color:'var(--primary)', fontSize:'0.75rem'}}>x{item.qty}</div>
                                        </div>
                                        <div style={{display:'flex', alignItems:'center', gap: 10}}>
                                            <span style={{fontFamily:'var(--font-mono)'}}>{item.price * item.qty} $</span>
                                            <button className="btn-danger" style={{padding:'4px 8px'}} onClick={() => removeFromCart(idx)}>×</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{padding: 20, background:'#09090b', borderTop:'1px solid #27272a'}}>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 10}}>
                                    <select style={{background:'transparent', border:'none', color:'var(--text-muted)', outline:'none'}} value={invoiceForm.discount} onChange={e => setInvoiceForm({...invoiceForm, discount: Number(e.target.value)})}>
                                        <option value="0">Remise (0%)</option>
                                        <option value="20">VIP (-20%)</option>
                                        <option value="50">Staff (-50%)</option>
                                        <option value="100">Offert (100%)</option>
                                    </select>
                                    <div style={{textAlign:'right'}}>
                                        <div style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>TOTAL A PAYER</div>
                                        <div style={{fontSize:'1.8rem', fontWeight:900, color:'var(--primary)', fontFamily:'var(--font-mono)'}}>{calculateTotal().total} $</div>
                                    </div>
                                </div>
                                <button className="btn-primary" disabled={sending || cart.length === 0} onClick={() => {
                                     const totals = calculateTotal();
                                     sendAction('sendFacture', {
                                        employee: user, client: invoiceForm.client, items: cart, invoiceNumber: invoiceForm.invoiceNumber,
                                        total: totals.sub, discountPct: invoiceForm.discount, discountAmount: totals.discAmt, finalTotal: totals.total
                                     });
                                }}>
                                    {sending ? 'TRAITEMENT...' : 'ENCAISSER 💳'}
                                </button>
                            </div>
                        </div>

                    </div>
                )}

                {/* 3. EXPENSES */}
                {currentTab === 'expenses' && (
                    <div style={{maxWidth: 500, margin: '0 auto', animation: 'fadeIn 0.5s'}}>
                        <h2 style={{textAlign:'center', fontSize:'2rem', marginBottom: 30}}>Note de Frais</h2>
                        <div className="glass-panel">
                            <label style={{display:'block', marginBottom:8, fontSize:'0.8rem', color:'var(--text-muted)'}}>MONTANT ($)</label>
                            <input className="inp-std" type="number" placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} style={{fontSize:'1.5rem', fontFamily:'var(--font-mono)'}} />
                            
                            <label style={{display:'block', marginBottom:8, fontSize:'0.8rem', color:'var(--text-muted)'}}>MOTIF / FOURNISSEUR</label>
                            <textarea className="inp-std" rows="3" placeholder="Achat encre, aiguilles..." value={expenseForm.reason} onChange={e => setExpenseForm({...expenseForm, reason: e.target.value})}></textarea>
                            
                            <div style={{margin:'20px 0', padding: 20, border:'1px dashed #3f3f46', borderRadius: 12, textAlign:'center'}}>
                                <div style={{marginBottom: 10, fontSize:'2rem'}}>📸</div>
                                <input type="file" accept="image/*" onChange={handleExpenseFile} style={{color:'var(--text-muted)'}} />
                                {expenseForm.file && <img src={expenseForm.file} style={{width:'100%', height: 150, objectFit:'cover', borderRadius:8, marginTop:15}} />}
                            </div>
                            
                            <button className="btn-primary" onClick={() => sendAction('sendExpense', expenseForm)}>SOUMETTRE LA NOTE</button>
                        </div>
                    </div>
                )}

                {/* 4. ADMIN */}
                {currentTab === 'admin' && (
                    <div style={{maxWidth: 600, margin: '0 auto', animation: 'fadeIn 0.5s'}}>
                        <h2 style={{textAlign:'center', marginBottom: 30}}>Gestion & RH</h2>
                        
                        {!isAdminUnlocked ? (
                            <div className="glass-panel" style={{textAlign:'center', padding: 50}}>
                                <div style={{fontSize:'3rem', marginBottom: 20}}>🔒</div>
                                <h3>Accès Restreint</h3>
                                <p style={{color:'var(--text-muted)', marginBottom: 20}}>Veuillez saisir le code PIN de la direction.</p>
                                <input className="inp-std" type="password" style={{textAlign:'center', fontSize:'2rem', letterSpacing: 10, width: 200, margin:'0 auto 20px auto'}} maxLength="6" value={adminPin} onChange={e => setAdminPin(e.target.value)} />
                                <button className="btn-primary" onClick={() => { if(adminPin === '123459') setIsAdminUnlocked(true); else alert('Code Erroné'); }}>DÉVERROUILLER</button>
                            </div>
                        ) : (
                            <div className="glass-panel">
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20}}>
                                    <h3 style={{margin:0, color:'var(--primary)'}}>Dossier RH</h3>
                                    <button className="btn-danger" onClick={() => setIsAdminUnlocked(false)}>VERROUILLER</button>
                                </div>
                                
                                <select className="inp-std" value={hrForm.type} onChange={e => setHrForm({...hrForm, type: e.target.value})}>
                                    {HR_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                </select>
                                <input className="inp-std" placeholder="Nom de la cible..." value={hrForm.target} onChange={e => setHrForm({...hrForm, target: e.target.value})} />
                                <textarea className="inp-std" rows="6" placeholder="Rédiger le rapport ici..." value={hrForm.reason} onChange={e => setHrForm({...hrForm, reason: e.target.value})}></textarea>
                                
                                <button className="btn-primary" onClick={() => sendAction('sendHR', hrForm)}>ENVOYER LE DOSSIER</button>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. ANNUAIRE */}
                {currentTab === 'annuaire' && (
                    <div style={{animation: 'fadeIn 0.5s'}}>
                        <h2 style={{marginBottom: 30}}>Annuaire Staff ({data?.employees?.length})</h2>
                        <div className="grid-layout">
                            {data?.employees?.map(emp => (
                                <div key={emp} className="glass-panel" style={{textAlign:'center', padding: 30}}>
                                    <div style={{width: 60, height: 60, background:'#000', border:'2px solid var(--primary)', borderRadius:'50%', margin:'0 auto 15px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', fontWeight:800}}>
                                        {emp.charAt(0)}
                                    </div>
                                    <h3 style={{fontSize:'1.1rem', margin:0}}>{emp}</h3>
                                    <div style={{color:'var(--primary)', fontSize:'0.8rem', marginTop: 5}}>ESTHÉTIQUE VESPUCCI</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
}
