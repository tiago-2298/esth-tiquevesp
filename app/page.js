'use client';
import { useState, useEffect, useMemo } from 'react';

// --- CONFIGURATION ---
const APP_VERSION = "Titanium 5.0";

const MODULES = [
  { id: 'dashboard', l: 'Tableau de bord', e: '📊' },
  { id: 'caisse', l: 'Caisse & Vente', e: '💎' },
  { id: 'admin', l: 'Admin & RH', e: '⚖️' },
  { id: 'annuaire', l: 'Annuaire', e: '📒' },
  { id: 'expenses', l: 'Frais', e: '💸' }
];

// Catégories avec Icones
const CAT_ICONS = {
  'Tête': '🧠', 'Torse/Dos': '👕', 'Bras': '💪', 'Jambes': '🦵',
  'Custom': '🎨', 'Laser': '⚡', 'Coiffure': '✂️', 'Logistique': '📦'
};

const HR_TYPES = ['recrutement', 'convocation', 'avertissement', 'licenciement', 'demission'];

export default function Home() {
  const [view, setView] = useState('login'); 
  const [user, setUser] = useState('');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [sending, setSending] = useState(false);
  
  // Filtres Caisse
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [searchTerm, setSearchTerm] = useState('');

  // Formulaires
  const [invoiceForm, setInvoiceForm] = useState({ client: '', discount: 0, invoiceNumber: '' });
  const [hrForm, setHrForm] = useState({ type: 'recrutement', target: '', reason: '' });
  const [expenseForm, setExpenseForm] = useState({ amount: '', reason: '', file: null });
  const [adminPin, setAdminPin] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // --- AUDIO SYSTEM (Bruitages futuristes) ---
  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      
      if (type === 'click') {
        // Son "Bip" technologique
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
      } else if (type === 'success') {
        // Son de validation "Accord majeur"
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.1); // Do#
        osc.frequency.setValueAtTime(659, now + 0.2); // Mi
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
      }
    } catch (e) {}
  };

  // --- INITIALISATION ---
  useEffect(() => {
    setInvoiceForm(prev => ({ ...prev, invoiceNumber: 'INV-' + Math.floor(100000 + Math.random() * 900000) }));
    
    // Simulation chargement API (ou appel réel)
    fetch('/api', { method: 'POST', body: JSON.stringify({ action: 'getMeta' }) })
      .then(r => r.json())
      .then(d => { 
        if(d.success) setData(d); 
        setLoading(false); 
      })
      .catch(() => {
        // Fallback si pas d'API pour la démo visuelle
        setLoading(false);
      });
      
    const savedUser = localStorage.getItem('vespucci_user');
    if(savedUser) { setUser(savedUser); setView('app'); }
  }, []);

  // --- LOGIQUE CAISSE ---
  const addToCart = (item) => {
    playSound('click');
    setCart(prev => {
      const exist = prev.find(i => i.name === item);
      if (exist) return prev.map(i => i.name === item ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { name: item, qty: 1, price: data?.prices?.[item] || 0 }];
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

  const handleExpenseFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setExpenseForm({ ...expenseForm, file: reader.result });
      reader.readAsDataURL(file);
    }
  };

  // --- ACTION ENVOI (API) ---
  const sendAction = async (action, payload) => {
    if(sending) return;
    setSending(true);
    playSound('click');
    
    try {
        const res = await fetch('/api', {
            method: 'POST',
            body: JSON.stringify({ action, data: { ...payload, author: user } })
        });
        const json = await res.json();
        
        if(json.success) {
            playSound('success');
            // Reset des formulaires
            if(action === 'sendFacture') { 
                setCart([]); 
                setInvoiceForm(p => ({...p, client: '', invoiceNumber: 'INV-' + Math.floor(Math.random()*1000000)})); 
            }
            if(action === 'sendHR') setHrForm({ type: 'recrutement', target: '', reason: '' });
            if(action === 'sendExpense') setExpenseForm({ amount: '', reason: '', file: null });
            alert("Action validée avec succès.");
        } else {
            alert('Erreur: ' + (json.error || "Problème serveur"));
        }
    } catch(e) { 
        console.error(e);
        alert('Erreur réseau ou API non connectée'); 
    }
    setSending(false);
  };

  // --- RENDER ---

  // Écran de chargement stylisé
  if (loading) return (
    <div style={{height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#050505', color:'#06b6d4', fontFamily:'monospace'}}>
        <div style={{width: 50, height: 50, border:'3px solid rgba(6,182,212,0.3)', borderTopColor:'#06b6d4', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div>
        <p style={{marginTop: 20, letterSpacing: 3}}>INITIALISATION VESPUCCI...</p>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Écran de Login
  if (view === 'login') return (
    <div className="login-wrapper">
        <style jsx global>{`
            @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;600&display=swap');
            
            :root { 
                --cyan: #06b6d4; 
                --cyan-glow: rgba(6, 182, 212, 0.4);
                --bg-dark: #0f172a;
                --panel: rgba(15, 23, 42, 0.7);
                --glass-border: 1px solid rgba(255,255,255,0.08);
            }
            body { margin: 0; font-family: 'Inter', sans-serif; background: #000; color: #e2e8f0; overflow: hidden; }
            
            /* Background Grid Effect */
            .login-wrapper { 
                height: 100vh; display: flex; align-items: center; justifyContent: center; 
                background-color: #050505;
                background-image: linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px);
                background-size: 40px 40px;
                position: relative;
            }
            .login-wrapper::before {
                content: ''; position: absolute; top:0; left:0; right:0; bottom:0;
                background: radial-gradient(circle at center, transparent 0%, #000 90%);
            }

            .login-card { 
                position: relative; z-index: 10;
                background: rgba(20, 20, 25, 0.6); 
                backdrop-filter: blur(20px);
                border: var(--glass-border);
                padding: 50px; border-radius: 24px; width: 420px; text-align: center; 
                box-shadow: 0 0 40px rgba(6, 182, 212, 0.1);
            }
            
            .btn-login { 
                background: linear-gradient(90deg, var(--cyan), #3b82f6); 
                color: #000; border: none; padding: 15px; width: 100%; border-radius: 12px; 
                font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 1.1rem; letter-spacing: 1px;
                cursor: pointer; margin-top: 30px; transition: 0.3s; 
                box-shadow: 0 0 15px var(--cyan-glow);
            }
            .btn-login:hover { transform: scale(1.02); box-shadow: 0 0 30px var(--cyan-glow); }
            .btn-login:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

            .select-login { 
                width: 100%; padding: 15px; background: rgba(0,0,0,0.6); 
                border: 1px solid #333; color: white; border-radius: 12px; font-size: 1rem; outline: none;
                transition: 0.3s;
            }
            .select-login:focus { border-color: var(--cyan); }
        `}</style>
        
        <div className="login-card">
            <div style={{fontSize:'3rem', marginBottom: 10, filter: 'drop-shadow(0 0 10px var(--cyan))'}}>💎</div>
            <h1 style={{color:'white', marginBottom: 5, fontFamily:'Rajdhani', fontSize:'2.5rem', fontWeight: 700}}>VESPUCCI</h1>
            <p style={{color:'var(--cyan)', fontSize:'0.8rem', letterSpacing: 4, marginBottom: 40, textTransform:'uppercase'}}>Titanium Edition</p>
            
            <div style={{textAlign:'left', marginBottom: 5, fontSize:'0.8rem', color:'#64748b'}}>IDENTIFICATION</div>
            <select className="select-login" onChange={(e) => setUser(e.target.value)} value={user}>
                <option value="">Sélectionner un employé...</option>
                {data?.employees?.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            
            <button className="btn-login" disabled={!user} onClick={() => { localStorage.setItem('vespucci_user', user); setView('app'); playSound('success'); }}>
                ACCÉDER AU TERMINAL
            </button>
        </div>
    </div>
  );

  // Application Principale
  return (
    <div className="app-container">
        <style jsx global>{`
            /* --- LAYOUT & STYLE GLOBAL --- */
            .app-container { display: flex; height: 100vh; background: #0b0c15; color: #fff; font-family: 'Inter', sans-serif; overflow: hidden; }
            
            /* Scrollbar invisible */
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }

            /* --- SIDEBAR (DOCK) --- */
            .dock { 
                width: 80px; height: 100vh; 
                background: rgba(10, 10, 12, 0.8); 
                backdrop-filter: blur(20px);
                border-right: 1px solid rgba(255,255,255,0.05);
                display: flex; flex-direction: column; align-items: center; padding: 30px 0; 
                z-index: 50; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .dock:hover { width: 240px; }
            
            .nav-btn { 
                width: 50px; height: 50px; margin-bottom: 10px; border-radius: 14px; 
                display: flex; align-items: center; justify-content: center; 
                color: #64748b; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
            }
            /* Label masqué par défaut */
            .nav-label { 
                position: absolute; left: 60px; opacity: 0; white-space: nowrap; 
                font-weight: 600; font-family: 'Rajdhani', sans-serif; letter-spacing: 1px; transition: 0.2s; 
            }
            .dock:hover .nav-btn { width: 90%; justify-content: flex-start; padding-left: 15px; }
            .dock:hover .nav-label { opacity: 1; }

            .nav-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
            .nav-btn.active { background: rgba(6, 182, 212, 0.15); color: var(--cyan); border: 1px solid rgba(6, 182, 212, 0.2); box-shadow: 0 0 15px rgba(6, 182, 212, 0.1); }
            .nav-icon { font-size: 1.4rem; z-index: 2; }

            /* --- MAIN CONTENT --- */
            .main-area { 
                flex: 1; padding: 40px; overflow-y: auto; position: relative;
                background: radial-gradient(circle at top right, #1a202c 0%, #000 60%);
            }
            .content-wrapper { max-width: 1400px; margin: 0 auto; animation: fadeIn 0.5s ease; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

            /* --- UI COMPONENTS --- */
            .title-glitch { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 2.5rem; margin-bottom: 5px; background: linear-gradient(90deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            
            .card { 
                background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); 
                border-radius: 20px; padding: 25px; transition: 0.3s; position: relative; overflow: hidden;
            }
            .card::before {
                content:''; position: absolute; top:0; left:0; width: 100%; height: 2px;
                background: linear-gradient(90deg, transparent, var(--cyan), transparent);
                opacity: 0; transition: 0.3s;
            }
            .card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.04); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .card:hover::before { opacity: 1; }

            .grid-dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 25px; margin-bottom: 40px; }
            
            /* --- INPUTS & BUTTONS --- */
            .input-field { 
                width: 100%; background: rgba(0,0,0,0.3); border: 1px solid #333; 
                padding: 14px; border-radius: 12px; color: #fff; outline: none; transition: 0.3s; margin-bottom: 15px; font-family: 'Inter', sans-serif;
            }
            .input-field:focus { border-color: var(--cyan); box-shadow: 0 0 10px rgba(6, 182, 212, 0.2); background: rgba(0,0,0,0.5); }

            .btn-primary { 
                background: var(--cyan); color: #000; border: none; padding: 14px; width: 100%; 
                border-radius: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: 0.3s;
                box-shadow: 0 5px 15px rgba(6, 182, 212, 0.2);
            }
            .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(6, 182, 212, 0.4); background: #22d3ee; }
            .btn-primary:disabled { background: #333; color: #555; box-shadow: none; cursor: not-allowed; transform: none; }

            /* --- CAISSE SPECIFIC --- */
            .pos-container { display: grid; grid-template-columns: 2.5fr 1fr; gap: 30px; height: calc(100vh - 80px); }
            .cat-filters { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 15px; }
            .cat-pill { 
                padding: 8px 16px; border-radius: 50px; background: rgba(255,255,255,0.05); border: 1px solid transparent; 
                cursor: pointer; font-size: 0.85rem; white-space: nowrap; transition: 0.2s; color: #94a3b8;
            }
            .cat-pill:hover { background: rgba(255,255,255,0.1); color: #fff; }
            .cat-pill.active { background: rgba(6, 182, 212, 0.15); border-color: var(--cyan); color: var(--cyan); font-weight: 700; box-shadow: 0 0 15px rgba(6, 182, 212, 0.1); }

            .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; overflow-y: auto; padding-right: 5px; }
            .prod-card { 
                background: linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); 
                border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; 
                padding: 15px; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; justify-content: space-between; height: 110px;
            }
            .prod-card:hover { border-color: var(--cyan); background: rgba(6, 182, 212, 0.05); transform: scale(1.02); }
            .prod-price { font-family: 'Rajdhani', monospace; font-size: 1.1rem; color: var(--cyan); font-weight: 700; text-align: right; }

            .ticket-panel { 
                background: #000; border: 1px solid #222; border-radius: 20px; 
                display: flex; flex-direction: column; padding: 25px; box-shadow: -10px 0 30px rgba(0,0,0,0.5);
            }
            .ticket-items { flex: 1; overflow-y: auto; margin: 20px 0; padding-right: 5px; }
            .ticket-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #222; animation: slideIn 0.2s; }
            @keyframes slideIn { from { transform: translateX(10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            
            .delete-btn { width: 24px; height: 24px; border-radius: 50%; border:none; background: #222; color: #ef4444; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
            .delete-btn:hover { background: #ef4444; color: #fff; }

            /* --- TOTAL BLOCK --- */
            .total-block { background: rgba(10, 20, 15, 0.5); padding: 20px; border-radius: 16px; border: 1px solid rgba(6, 182, 212, 0.2); }
            .total-lcd { font-family: 'Rajdhani', monospace; font-size: 2rem; font-weight: 700; color: var(--cyan); text-align: right; text-shadow: 0 0 10px rgba(6, 182, 212, 0.5); }
        `}</style>

        {/* --- DOCK --- */ }
        <nav className="dock">
            <div style={{fontSize:'2.5rem', marginBottom: 40, filter:'drop-shadow(0 0 15px var(--cyan))'}}>💎</div>
            {MODULES.map(m => (
                <div key={m.id} className={`nav-btn ${currentTab === m.id ? 'active' : ''}`} onClick={() => setCurrentTab(m.id)}>
                    <span className="nav-icon">{m.e}</span>
                    <span className="nav-label">{m.l}</span>
                </div>
            ))}
            <div className="nav-btn" style={{marginTop:'auto'}} onClick={() => setView('login')}>
                <span className="nav-icon">🚪</span>
                <span className="nav-label">Déconnexion</span>
            </div>
        </nav>

        {/* --- CONTENU --- */}
        <div className="main-area">
            <div className="content-wrapper">
                
                {/* HEADER COMMUN */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 40}}>
                    <div>
                        <div style={{color: '#94a3b8', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5}}>VESPUCCI OS • {user.split(' ')[0]}</div>
                        <h1 className="title-glitch">{MODULES.find(m => m.id === currentTab)?.l}</h1>
                    </div>
                    <div style={{textAlign:'right'}}>
                        <div style={{fontFamily:'Rajdhani', fontSize:'2rem', fontWeight:700}}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <div style={{color: 'var(--cyan)', fontSize:'0.8rem'}}>Serveur Sécurisé</div>
                    </div>
                </div>

                {/* --- DASHBOARD --- */}
                {currentTab === 'dashboard' && (
                    <>
                        <div className="grid-dashboard">
                            <div className="card" onClick={() => setCurrentTab('caisse')} style={{cursor:'pointer', background:'linear-gradient(145deg, rgba(6,182,212,0.1), transparent)'}}>
                                <div style={{fontSize:'2rem', marginBottom:10}}>💎</div>
                                <h3 style={{color:'var(--cyan)', marginBottom:5}}>Nouvelle Vente</h3>
                                <p style={{color:'#64748b', fontSize:'0.9rem'}}>Accéder au terminal de paiement</p>
                            </div>
                            <div className="card">
                                <div style={{fontSize:'2rem', marginBottom:10}}>👥</div>
                                <h3>Effectif</h3>
                                <p style={{fontSize:'1.5rem', fontFamily:'Rajdhani', fontWeight:700}}>{data?.employees?.length || 0} <span style={{fontSize:'0.9rem', color:'#64748b', fontWeight:400}}>Employés</span></p>
                            </div>
                            <div className="card">
                                <div style={{fontSize:'2rem', marginBottom:10}}>🏆</div>
                                <h3>Objectifs</h3>
                                <div style={{width:'100%', height:6, background:'#333', borderRadius:10, marginTop:10}}>
                                    <div style={{width:'75%', height:'100%', background:'var(--cyan)', borderRadius:10, boxShadow:'0 0 10px var(--cyan)'}}></div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* --- CAISSE --- */}
                {currentTab === 'caisse' && (
                    <div className="pos-container">
                        {/* Colonne Gauche : Produits */}
                        <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
                            {/* Filtres */}
                            <div className="cat-filters">
                                <div className={`cat-pill ${activeCategory === 'Tous' ? 'active' : ''}`} onClick={() => setActiveCategory('Tous')}>Tout Voir</div>
                                {Object.keys(data?.productsByCategory || {}).map(cat => (
                                    <div key={cat} className={`cat-pill ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                                        {CAT_ICONS[cat]} {cat}
                                    </div>
                                ))}
                            </div>
                            
                            {/* Recherche */}
                            <input className="input-field" placeholder="🔍 Rechercher un service..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{borderRadius: 50, padding: '12px 20px'}} />

                            {/* Grille */}
                            <div className="product-grid">
                                {(data?.allProducts || []).filter(p => {
                                    const matchSearch = p.toLowerCase().includes(searchTerm.toLowerCase());
                                    const matchCat = activeCategory === 'Tous' || data.productsByCategory[activeCategory].includes(p);
                                    return matchSearch && matchCat;
                                }).map(p => (
                                    <div key={p} className="prod-card" onClick={() => addToCart(p)}>
                                        <div style={{fontSize:'0.9rem', fontWeight:600, lineHeight:1.3}}>{p}</div>
                                        <div className="prod-price">{data?.prices[p]}$</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Colonne Droite : Ticket */}
                        <div className="ticket-panel">
                            <div style={{textAlign:'center', marginBottom:20}}>
                                <div style={{fontSize:'1.2rem', fontFamily:'Rajdhani', fontWeight:700, letterSpacing:2}}>TICKET</div>
                                <div style={{fontSize:'0.7rem', color:'#555'}}>{invoiceForm.invoiceNumber}</div>
                            </div>

                            <input className="input-field" placeholder="Nom du Client" value={invoiceForm.client} onChange={e => setInvoiceForm({...invoiceForm, client: e.target.value})} style={{background:'#111', borderColor:'#333'}} />

                            <div className="ticket-items">
                                {cart.length === 0 ? <div style={{textAlign:'center', color:'#333', marginTop: 50, fontStyle:'italic'}}>En attente d'articles...</div> :
                                cart.map((item, idx) => (
                                    <div key={idx} className="ticket-row">
                                        <div style={{flex:1}}>
                                            <div style={{fontSize:'0.9rem', color:'#eee'}}>{item.name}</div>
                                            <div style={{fontSize:'0.8rem', color:'#666'}}>{item.qty} x {item.price}$</div>
                                        </div>
                                        <button className="delete-btn" onClick={() => removeFromCart(idx)}>×</button>
                                    </div>
                                ))}
                            </div>

                            <div className="total-block">
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                                    <select className="input-field" style={{marginBottom:0, padding:'5px 10px', width:'auto', fontSize:'0.8rem'}} value={invoiceForm.discount} onChange={e => setInvoiceForm({...invoiceForm, discount: Number(e.target.value)})}>
                                        <option value="0">Remise (0%)</option>
                                        <option value="10">VIP (-10%)</option>
                                        <option value="30">Partenaire (-30%)</option>
                                        <option value="50">Moitié Prix (-50%)</option>
                                        <option value="100">Gratuit (100%)</option>
                                    </select>
                                    <div style={{textAlign:'right'}}>
                                        <div style={{fontSize:'0.7rem', color:'#888', textTransform:'uppercase'}}>Net à payer</div>
                                        <div className="total-lcd">{calculateTotal().total}$</div>
                                    </div>
                                </div>
                                <button className="btn-primary" disabled={sending || cart.length === 0} 
                                    onClick={() => {
                                        const t = calculateTotal();
                                        sendAction('sendFacture', {
                                            employee: user, client: invoiceForm.client,
                                            items: cart, invoiceNumber: invoiceForm.invoiceNumber,
                                            total: t.sub, discountPct: invoiceForm.discount,
                                            discountAmount: t.discAmt, finalTotal: t.total
                                        });
                                    }}>
                                    {sending ? 'Traitement...' : 'Encaiser 💳'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ADMIN / RH --- */}
                {currentTab === 'admin' && (
                    <div style={{maxWidth: 600, margin:'0 auto'}}>
                        <div className="card">
                            {!isAdminUnlocked ? (
                                <div style={{textAlign:'center', padding:20}}>
                                    <div style={{fontSize:'3rem', marginBottom:10}}>🔒</div>
                                    <h3>Accès Sécurisé</h3>
                                    <p style={{color:'#64748b', marginBottom:20}}>Entrez le code PIN Direction</p>
                                    <input className="input-field" type="password" style={{textAlign:'center', fontSize:'2rem', letterSpacing:10, fontFamily:'monospace'}} maxLength="6" value={adminPin} onChange={e => setAdminPin(e.target.value)} />
                                    <button className="btn-primary" onClick={() => { if(adminPin === '123459') setIsAdminUnlocked(true); else alert('Code Erroné'); }}>Déverrouiller</button>
                                </div>
                            ) : (
                                <div>
                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                                        <h3 style={{color:'var(--cyan)'}}>Gestion RH</h3>
                                        <button onClick={() => setIsAdminUnlocked(false)} style={{background:'transparent', border:'none', color:'#ef4444', cursor:'pointer'}}>Verrouiller</button>
                                    </div>
                                    
                                    <label style={{fontSize:'0.8rem', color:'#64748b', textTransform:'uppercase'}}>Type de dossier</label>
                                    <select className="input-field" value={hrForm.type} onChange={e => setHrForm({...hrForm, type: e.target.value})}>
                                        {HR_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                    </select>

                                    <label style={{fontSize:'0.8rem', color:'#64748b', textTransform:'uppercase'}}>Cible (Employé/Civil)</label>
                                    <input className="input-field" value={hrForm.target} onChange={e => setHrForm({...hrForm, target: e.target.value})} placeholder="Nom Prénom..." />

                                    <label style={{fontSize:'0.8rem', color:'#64748b', textTransform:'uppercase'}}>Détails & Motifs</label>
                                    <textarea className="input-field" rows="4" value={hrForm.reason} onChange={e => setHrForm({...hrForm, reason: e.target.value})} placeholder="Explications..."></textarea>

                                    <button className="btn-primary" onClick={() => sendAction('sendHR', hrForm)}>Transmettre Dossier</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- EXPENSES --- */}
                {currentTab === 'expenses' && (
                    <div style={{maxWidth: 500, margin:'0 auto'}}>
                        <div className="card">
                            <h3 style={{textAlign:'center', marginBottom:20}}>Note de Frais</h3>
                            <input className="input-field" type="number" placeholder="Montant ($)" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                            <textarea className="input-field" rows="3" placeholder="Motif de la dépense..." value={expenseForm.reason} onChange={e => setExpenseForm({...expenseForm, reason: e.target.value})}></textarea>
                            
                            <div style={{border:'1px dashed #333', borderRadius:12, padding:20, textAlign:'center', marginBottom:20}}>
                                <div style={{marginBottom:10, fontSize:'0.9rem', color:'#64748b'}}>Preuve / Facture (Image)</div>
                                <input type="file" accept="image/*" onChange={handleExpenseFile} style={{fontSize:'0.8rem'}} />
                                {expenseForm.file && <img src={expenseForm.file} style={{marginTop:15, maxWidth:'100%', borderRadius:8, border:'1px solid #333'}} />}
                            </div>

                            <button className="btn-primary" onClick={() => sendAction('sendExpense', expenseForm)}>Envoyer à la compta</button>
                        </div>
                    </div>
                )}

                {/* --- ANNUAIRE --- */}
                {currentTab === 'annuaire' && (
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:20}}>
                        {data?.employees?.map(emp => (
                            <div key={emp} className="card" style={{textAlign:'center'}}>
                                <div style={{width:70, height:70, background:'#111', borderRadius:'50%', margin:'0 auto 15px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', border:'2px solid var(--cyan)', boxShadow:'0 0 15px rgba(6,182,212,0.2)'}}>
                                    {emp.charAt(0)}
                                </div>
                                <div style={{fontWeight:700, fontSize:'1.1rem'}}>{emp}</div>
                                <div style={{fontSize:'0.8rem', color:'#64748b', marginTop:5}}>Employé</div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    </div>
  );
}
