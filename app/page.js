'use client';
import { useState, useEffect, useMemo } from 'react';

// --- CONFIGURATION FRONT ---
const APP_NAME = "Vespucci Manager";

const MODULES = [
  { id: 'dashboard', l: 'Tableau de bord', e: '📊' },
  { id: 'caisse', l: 'Caisse & Tattoo', e: '💎' }, // Icône Diamant pour le côté Premium
  { id: 'expenses', l: 'Frais & Achats', e: '💸' },
  { id: 'admin', l: 'Direction & RH', e: '⚖️' },
  { id: 'annuaire', l: 'Annuaire Staff', e: '📒' },
];

// Icônes spécifiques Tattoo / Coiffure
const CAT_ICONS = {
  'Tête': '💆‍♂️', 
  'Torse/Dos': '👕', 
  'Bras': '💪', 
  'Jambes': '🦵',
  'Custom': '🎨', 
  'Laser': '✨', 
  'Coiffure': '✂️', 
  'Logistique': '📦'
};

const HR_TYPES = ['recrutement', 'convocation', 'avertissement', 'licenciement', 'demission'];

export default function Home() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState('');
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // Data & States
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [sending, setSending] = useState(false);
  const [activeCat, setActiveCat] = useState('Toutes'); // Pour filtrer la caisse
  
  // Forms
  const [invoiceForm, setInvoiceForm] = useState({ client: '', discount: 0, invoiceNumber: '' });
  const [hrForm, setHrForm] = useState({ type: 'recrutement', target: '', reason: '' });
  const [expenseForm, setExpenseForm] = useState({ amount: '', reason: '', file: null });
  const [adminPin, setAdminPin] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // --- AUDIO SYSTEM (Bruitages Futuristes) ---
  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      
      if (type === 'click') {
        // Son "High Tech" court
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
      } else if (type === 'success') {
        // Son de validation Harmonieux
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1); // Do#
        osc.frequency.setValueAtTime(659.25, now + 0.2); // Mi
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
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

  // --- LOGIC CAISSE ---
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

  // --- API ---
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
            // Petit délai pour l'animation
            setTimeout(() => alert('Action validée.'), 100);
            
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
    <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a', color:'#06b6d4', flexDirection:'column'}}>
       <div className="spinner"></div>
       <style jsx>{`
         .spinner { width: 50px; height: 50px; border: 3px solid rgba(6,182,212,0.3); border-radius: 50%; border-top-color: #06b6d4; animation: spin 1s ease-in-out infinite; margin-bottom: 20px;}
         @keyframes spin { to { transform: rotate(360deg); } }
       `}</style>
       <div style={{letterSpacing:3, fontSize:'0.8rem'}}>CHARGEMENT VESPUCCI...</div>
    </div>
  );

  if (view === 'login') return (
    <div className="login-container">
        <style jsx global>{`
            :root { 
                --primary: #06b6d4; /* Cyan électrique */
                --primary-glow: rgba(6, 182, 212, 0.5);
                --bg: #0f172a; /* Bleu nuit profond */
                --panel: rgba(30, 41, 59, 0.7); 
                --text: #f8fafc;
                --border: 1px solid rgba(255,255,255,0.1);
            }
            body { margin: 0; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); overflow: hidden; }
            
            .login-container { 
                height: 100vh; display: flex; align-items: center; justifyContent: center; 
                background: radial-gradient(circle at 50% 0%, #1e293b, #0f172a); 
            }
            .card { 
                background: var(--panel); border: var(--border); 
                padding: 50px; border-radius: 24px; width: 420px; text-align: center; 
                backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
            .btn { 
                background: linear-gradient(135deg, #06b6d4, #0ea5e9); 
                color: white; border: none; padding: 16px; width: 100%; border-radius: 12px; 
                cursor: pointer; font-weight: 700; font-size: 1rem; margin-top: 25px; 
                transition: 0.3s; box-shadow: 0 0 20px var(--primary-glow);
            }
            .btn:hover { transform: translateY(-2px); box-shadow: 0 0 30px var(--primary-glow); }
            .btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
            
            select { 
                width: 100%; padding: 14px; background: rgba(15, 23, 42, 0.8); 
                border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 12px; outline: none;
            }
        `}</style>
        <div className="card">
            <div style={{fontSize:'3rem', marginBottom: 10, filter: 'drop-shadow(0 0 10px var(--primary))'}}>💎</div>
            <h1 style={{color:'white', marginBottom: 5, fontSize:'2rem', letterSpacing:'-1px'}}>VESPUCCI</h1>
            <p style={{color:'#94a3b8', fontSize:'0.75rem', letterSpacing: 4, marginBottom: 40, textTransform:'uppercase'}}>Titanium Manager V5</p>
            
            <select onChange={(e) => setUser(e.target.value)} value={user}>
                <option value="">Sélectionner votre identité...</option>
                {data?.employees?.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            
            <button className="btn" disabled={!user} onClick={() => { localStorage.setItem('vespucci_user', user); setView('app'); playSound('success'); }}>
                INITIALISER LA SESSION
            </button>
        </div>
    </div>
  );

  return (
    <div className="app">
        <style jsx global>{`
            /* LAYOUT */
            .app { display: flex; height: 100vh; background: #0f172a; }
            
            /* SIDEBAR (Dock style) */
            .sidebar { 
                width: 90px; background: rgba(15, 23, 42, 0.95); 
                display: flex; flex-direction: column; align-items: center; padding: 30px 0; 
                border-right: 1px solid rgba(255,255,255,0.05); z-index: 10; 
                transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
            }
            .sidebar:hover { width: 260px; }
            
            .nav-item { 
                width: 80%; padding: 14px; margin-bottom: 8px; border-radius: 16px; 
                color: #64748b; cursor: pointer; display: flex; align-items: center; 
                overflow: hidden; white-space: nowrap; transition: 0.3s; 
            }
            .nav-item:hover { background: rgba(255,255,255,0.05); color: #f8fafc; }
            .nav-item.active { 
                background: linear-gradient(90deg, rgba(6, 182, 212, 0.1), transparent); 
                color: var(--primary); border-left: 3px solid var(--primary);
            }
            .nav-icon { font-size: 1.6rem; min-width: 60px; text-align: center; }
            .nav-label { font-weight: 600; font-size: 0.95rem; opacity: 0; transition: 0.2s; transform: translateX(-10px); }
            .sidebar:hover .nav-label { opacity: 1; transform: translateX(0); }

            /* MAIN AREA */
            .main { 
                flex: 1; padding: 40px; overflow-y: auto; 
                background: radial-gradient(circle at top right, #1e293b, #0f172a); 
            }
            
            /* UI ELEMENTS */
            .card { 
                background: rgba(30, 41, 59, 0.6); 
                border: 1px solid rgba(255,255,255,0.05); 
                padding: 24px; border-radius: 20px; 
                backdrop-filter: blur(10px);
                transition: 0.3s; 
            }
            .card:hover { border-color: rgba(6, 182, 212, 0.3); transform: translateY(-4px); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3); }
            
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
            
            /* INPUTS */
            .inp { 
                width: 100%; padding: 14px; 
                background: rgba(15, 23, 42, 0.6); 
                border: 1px solid rgba(255,255,255,0.1); 
                border-radius: 12px; color: white; margin-bottom: 12px; 
                font-family: 'Inter', sans-serif;
                transition: 0.2s;
            }
            .inp:focus { border-color: var(--primary); outline: none; background: rgba(15, 23, 42, 0.9); box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1); }
            
            /* BUTTONS */
            .btn-p { 
                background: var(--primary); color: #000; border: none; 
                padding: 14px; border-radius: 12px; font-weight: 700; 
                cursor: pointer; width: 100%; transition: 0.2s; text-transform: uppercase; letter-spacing: 0.5px;
            }
            .btn-p:hover { box-shadow: 0 0 20px rgba(6, 182, 212, 0.4); }
            .btn-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s;}
            .btn-red:hover { background: rgba(239, 68, 68, 1); color: white; }

            /* CAISSE SPECIFIQUE */
            .pos-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; height: calc(100vh - 80px); }
            .cat-tabs { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 15px; }
            .cat-tab { 
                padding: 8px 16px; border-radius: 50px; cursor: pointer; white-space: nowrap; font-size: 0.85rem; font-weight: 600;
                background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid transparent; transition:0.2s;
            }
            .cat-tab:hover { background: rgba(255,255,255,0.1); color: white; }
            .cat-tab.active { background: var(--primary); color: #000; box-shadow: 0 0 15px rgba(6, 182, 212, 0.3); }

            .product-btn { 
                background: rgba(30, 41, 59, 0.4); 
                border: 1px solid rgba(255,255,255,0.05); 
                padding: 15px; border-radius: 16px; 
                text-align: center; cursor: pointer; 
                display: flex; flex-direction: column; gap: 6px; 
                align-items: center; justify-content: center; height: 110px; transition: 0.2s;
            }
            .product-btn:hover { background: rgba(6, 182, 212, 0.1); border-color: var(--primary); transform: translateY(-2px); }
            
            .ticket { 
                background: #0f172a; border: 1px solid rgba(255,255,255,0.1); 
                padding: 24px; border-radius: 20px; display: flex; flex-direction: column; 
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            }
        `}</style>

        <div className="sidebar">
            <div style={{fontSize:'2.5rem', marginBottom: 40, filter:'drop-shadow(0 0 10px var(--primary))'}}>💎</div>
            {MODULES.map(m => (
                <div key={m.id} className={`nav-item ${currentTab === m.id ? 'active' : ''}`} onClick={() => setCurrentTab(m.id)}>
                    <span className="nav-icon">{m.e}</span>
                    <span className="nav-label">{m.l}</span>
                </div>
            ))}
            <div style={{marginTop: 'auto'}} className="nav-item" onClick={() => setView('login')}>
                <span className="nav-icon" style={{color:'#ef4444'}}>🚪</span>
                <span className="nav-label" style={{color:'#ef4444'}}>Déconnexion</span>
            </div>
        </div>

        <div className="main">
            {/* DASHBOARD */}
            {currentTab === 'dashboard' && (
                <div style={{animation: 'fadeIn 0.5s'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 40}}>
                        <div>
                            <h1 style={{fontSize:'3.5rem', marginBottom: 5, letterSpacing:'-2px', lineHeight: 1}}>Bonjour, <span style={{color:'var(--primary)'}}>{user.split(' ')[0]}</span></h1>
                            <p style={{color:'#94a3b8'}}>Terminal Vespucci prêt.</p>
                        </div>
                        <div style={{textAlign:'right'}}>
                            <div style={{fontSize:'2.5rem', fontWeight: 900, opacity: 0.1}}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                    </div>
                    
                    <div className="grid">
                        <div className="card" onClick={() => setCurrentTab('caisse')} style={{cursor:'pointer', position:'relative', overflow:'hidden'}}>
                            <div style={{position:'absolute', top:-20, right:-20, fontSize:'8rem', opacity:0.05}}>💎</div>
                            <h3 style={{color:'var(--primary)', fontSize:'1.4rem'}}>Nouvelle Vente</h3>
                            <p style={{fontSize:'0.9rem', color:'#94a3b8', marginTop: 5}}>Accéder au catalogue tattoo & coiffure</p>
                            <div style={{marginTop: 20, color:'var(--primary)', fontWeight:'bold'}}>Ouvrir la caisse →</div>
                        </div>
                        <div className="card">
                            <h3>📞 Annuaire</h3>
                            <div style={{fontSize:'2.5rem', fontWeight:'900', marginTop: 10}}>{data?.employees?.length || 0}</div>
                            <p style={{fontSize:'0.8rem', color:'#94a3b8'}}>Employés enregistrés</p>
                        </div>
                        <div className="card" onClick={() => setCurrentTab('expenses')} style={{cursor:'pointer'}}>
                            <h3>💸 Dépense Rapide</h3>
                            <p style={{fontSize:'0.9rem', color:'#94a3b8', marginTop: 5}}>Déclarer un achat fournisseur</p>
                        </div>
                    </div>
                </div>
            )}

            {/* CAISSE */}
            {currentTab === 'caisse' && (
                <div className="pos-layout" style={{animation: 'fadeIn 0.3s'}}>
                    <div style={{display:'flex', flexDirection:'column', overflow:'hidden'}}>
                        {/* Onglets Catégories */}
                        <div className="cat-tabs">
                            <div className={`cat-tab ${activeCat === 'Toutes' ? 'active' : ''}`} onClick={() => setActiveCat('Toutes')}>Tout</div>
                            {Object.keys(data?.productsByCategory || {}).map(cat => (
                                <div key={cat} className={`cat-tab ${activeCat === cat ? 'active' : ''}`} onClick={() => setActiveCat(cat)}>
                                    {CAT_ICONS[cat]} {cat}
                                </div>
                            ))}
                        </div>

                        {/* Grille Produits */}
                        <div style={{overflowY: 'auto', paddingRight: 10, flex: 1}}>
                            {Object.entries(data?.productsByCategory || {}).filter(([c]) => activeCat === 'Toutes' || activeCat === c).map(([cat, products]) => (
                                <div key={cat} style={{marginBottom: 25}}>
                                    {activeCat === 'Toutes' && <h4 style={{color:'#64748b', marginBottom: 10, textTransform:'uppercase', fontSize:'0.8rem', letterSpacing:1}}>{cat}</h4>}
                                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap: 12}}>
                                        {products.map(p => (
                                            <div key={p} className="product-btn" onClick={() => addToCart(p)}>
                                                <div style={{fontSize:'0.85rem', fontWeight:'600', lineHeight:1.3}}>{p}</div>
                                                <div style={{fontSize:'0.9rem', color:'var(--primary)', fontWeight:'bold', marginTop: 5}}>{data?.prices[p] || 0}$</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ticket */}
                    <div className="ticket">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20, borderBottom:'1px dashed #333', paddingBottom:15}}>
                            <h2 style={{fontSize:'1.2rem', letterSpacing: 1}}>TICKET</h2>
                            <div style={{fontSize:'0.8rem', color:'#64748b'}}>#{invoiceForm.invoiceNumber}</div>
                        </div>
                        
                        <input className="inp" placeholder="Nom du Client" value={invoiceForm.client} onChange={e => setInvoiceForm({...invoiceForm, client: e.target.value})} style={{background:'#020617', border:'1px solid #1e293b'}} />
                        
                        <div style={{flex:1, overflowY:'auto', marginBottom: 15, paddingRight:5}}>
                            {cart.length === 0 ? 
                                <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#334155', fontStyle:'italic'}}>
                                    En attente d'articles...
                                </div> : 
                                cart.map((item, idx) => (
                                <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8, background:'rgba(255,255,255,0.03)', padding:'10px', borderRadius:8}}>
                                    <div>
                                        <div style={{fontSize:'0.9rem', fontWeight:'500'}}>{item.name}</div>
                                        <div style={{fontSize:'0.75rem', color:'#94a3b8'}}>{item.price}$ x {item.qty}</div>
                                    </div>
                                    <button className="btn-red" onClick={() => removeFromCart(idx)}>×</button>
                                </div>
                            ))}
                        </div>

                        <div style={{borderTop:'1px dashed #333', paddingTop: 20}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 15}}>
                                <select className="inp" style={{width:'60%', marginBottom:0, padding:'8px'}} value={invoiceForm.discount} onChange={e => setInvoiceForm({...invoiceForm, discount: Number(e.target.value)})}>
                                    <option value="0">Aucune remise</option>
                                    <option value="10">VIP (-10%)</option>
                                    <option value="30">Partenaire (-30%)</option>
                                    <option value="50">Moitié Prix (-50%)</option>
                                    <option value="100">Offert (100%)</option>
                                </select>
                                <div style={{textAlign:'right'}}>
                                    <div style={{fontSize:'0.7rem', color:'#94a3b8', textTransform:'uppercase'}}>Total à payer</div>
                                    <div style={{fontSize:'1.8rem', fontWeight:'900', color:'var(--primary)', lineHeight:1}}>{calculateTotal().total}$</div>
                                </div>
                            </div>
                            <button className="btn-p" disabled={sending || cart.length === 0} 
                                onClick={() => {
                                    const totals = calculateTotal();
                                    sendAction('sendFacture', {
                                        employee: user,
                                        client: invoiceForm.client,
                                        items: cart,
                                        invoiceNumber: invoiceForm.invoiceNumber,
                                        total: totals.sub,
                                        discountPct: invoiceForm.discount,
                                        discountAmount: totals.discAmt,
                                        finalTotal: totals.total
                                    });
                                }}
                            >
                                {sending ? 'Envoi...' : 'ENCAISSER 💳'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXPENSES */}
            {currentTab === 'expenses' && (
                <div style={{maxWidth: 500, margin: '0 auto', animation: 'fadeIn 0.5s'}}>
                    <h2 style={{textAlign:'center', marginBottom: 10}}>Déclaration de Dépenses</h2>
                    <p style={{textAlign:'center', color:'#94a3b8', marginBottom: 30}}>Achats encres, matériel, aiguilles...</p>
                    
                    <div className="card">
                        <label style={{display:'block', marginBottom:5, fontSize:'0.8rem', color:'#94a3b8'}}>Montant</label>
                        <input className="inp" placeholder="0.00 $" type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                        
                        <label style={{display:'block', marginBottom:5, fontSize:'0.8rem', color:'#94a3b8'}}>Justification</label>
                        <textarea className="inp" placeholder="Ex: Commande d'aiguilles 5RL..." value={expenseForm.reason} onChange={e => setExpenseForm({...expenseForm, reason: e.target.value})} rows="4"></textarea>
                        
                        <div style={{marginBottom: 20, textAlign:'center', border:'2px dashed rgba(255,255,255,0.1)', padding: 20, borderRadius: 12, cursor:'pointer'}} onClick={() => document.getElementById('fileUpload').click()}>
                            <p style={{marginBottom: 10, fontSize:'0.9rem'}}>📎 Joindre une preuve (Photo)</p>
                            <input id="fileUpload" type="file" accept="image/*" onChange={handleExpenseFile} hidden />
                            {expenseForm.file ? 
                                <img src={expenseForm.file} style={{width:'100%', height:'150px', objectFit:'cover', borderRadius:8}} /> :
                                <div style={{fontSize:'2rem', opacity:0.3}}>📷</div>
                            }
                        </div>
                        <button className="btn-p" onClick={() => sendAction('sendExpense', expenseForm)}>ENVOYER LA NOTE</button>
                    </div>
                </div>
            )}

            {/* ADMIN / RH */}
            {currentTab === 'admin' && (
                <div style={{maxWidth: 600, margin: '0 auto', animation: 'fadeIn 0.5s'}}>
                    <h2 style={{textAlign:'center', marginBottom: 30}}>Administration & RH</h2>
                    
                    {!isAdminUnlocked ? (
                        <div className="card" style={{textAlign:'center', padding:'60px 40px'}}>
                            <div style={{fontSize:'3rem', marginBottom: 20}}>🔒</div>
                            <h3>Accès Restreint</h3>
                            <p style={{marginBottom: 30, color:'#94a3b8'}}>Veuillez saisir le code PIN de la direction.</p>
                            <input className="inp" type="password" style={{textAlign:'center', fontSize:'2rem', letterSpacing: 10, width:'200px', margin:'0 auto 20px auto'}} maxLength="6" value={adminPin} onChange={e => setAdminPin(e.target.value)} />
                            <button className="btn-p" onClick={() => { if(adminPin === '123459') setIsAdminUnlocked(true); else alert('Code erroné'); }}>DÉVERROUILLER</button>
                        </div>
                    ) : (
                        <div className="card">
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
                                <h3 style={{color: 'var(--primary)'}}>Nouvelle Action RH</h3>
                                <div style={{fontSize:'0.8rem', background:'rgba(6,182,212,0.1)', color:'var(--primary)', padding:'4px 8px', borderRadius:4}}>MODE ADMIN</div>
                            </div>
                            
                            <label style={{display:'block', marginBottom:5, fontSize:'0.8rem', color:'#94a3b8'}}>Type d'action</label>
                            <select className="inp" value={hrForm.type} onChange={e => setHrForm({...hrForm, type: e.target.value})}>
                                {HR_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                            </select>
                            
                            <label style={{display:'block', marginBottom:5, fontSize:'0.8rem', color:'#94a3b8'}}>Cible</label>
                            <input className="inp" placeholder="Nom de l'employé concerné" value={hrForm.target} onChange={e => setHrForm({...hrForm, target: e.target.value})} />
                            
                            <label style={{display:'block', marginBottom:5, fontSize:'0.8rem', color:'#94a3b8'}}>Détails</label>
                            <textarea className="inp" rows="5" placeholder="Raison, date d'effet, détails..." value={hrForm.reason} onChange={e => setHrForm({...hrForm, reason: e.target.value})}></textarea>
                            
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10}}>
                                <button className="btn-red" onClick={() => setIsAdminUnlocked(false)}>VERROUILLER</button>
                                <button className="btn-p" onClick={() => sendAction('sendHR', hrForm)}>TRANSMETTRE</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* ANNUAIRE */}
            {currentTab === 'annuaire' && (
                <div style={{animation: 'fadeIn 0.5s'}}>
                    <h2 style={{marginBottom: 30}}>Annuaire du personnel</h2>
                    <div className="grid">
                        {data?.employees?.map(emp => (
                            <div key={emp} className="card" style={{textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center'}}>
                                <div style={{width: 70, height: 70, background:'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius:'50%', marginBottom: 15, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', border:'2px solid var(--primary)', boxShadow:'0 0 15px rgba(6,182,212,0.2)'}}>
                                    {emp.charAt(0)}
                                </div>
                                <h3 style={{fontSize:'1.1rem', marginBottom: 5}}>{emp}</h3>
                                <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>Employé</div>
                                <button className="btn-p" style={{marginTop: 15, padding: '8px', fontSize:'0.8rem', background:'rgba(255,255,255,0.05)', color:'white'}} onClick={() => alert('Numéro copié !')}>
                                    📞 CONTACTER
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}
