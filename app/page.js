
'use client';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

// --- CONFIGURATION DATA ---
const CONFIG = {
  companyName: "Vespucci",
  subTitle: "Titanium Edition",
  currency: "$",
  default_employees: ["Soren Bloom", "Julio Alvarez", "Sun Price", "Andres Hernandez", "Taziñio Jimenez"],
  webhooks: {
    // Remplace par tes vrais webhooks Discord
    facture: "URL_WEBHOOK_FACTURE",
    rh: "URL_WEBHOOK_RH", 
    expense: "URL_WEBHOOK_DEPENSE"
  }
};

const MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-3-fill' },
  { id: 'caisse', label: 'Terminal Vente', icon: 'ri-shopping-cart-2-fill' },
  { id: 'admin', label: 'Administration', icon: 'ri-shield-user-fill' },
  { id: 'annuaire', label: 'Annuaire', icon: 'ri-contacts-book-2-fill' },
  { id: 'expenses', label: 'Frais', icon: 'ri-money-dollar-circle-fill' }
];

// Catalogue Produits (Structure "Hen House" mais Design Vespucci)
const PRODUCTS = {
  'Tête': [
    { name: 'Petit Tatouage', price: 350 }, { name: 'Moyen Tatouage', price: 450 },
    { name: 'Grand Tatouage', price: 600 }, { name: 'Tatouage Visage', price: 700 }
  ],
  'Torse/Dos': [
    { name: 'Petit Torse', price: 600 }, { name: 'Moyen Torse', price: 800 },
    { name: 'Grand Torse', price: 1100 }, { name: 'Dos Complet', price: 3000 }
  ],
  'Bras': [
    { name: 'Petit Bras', price: 450 }, { name: 'Moyen Bras', price: 600 },
    { name: 'Bras Complet', price: 2500 }
  ],
  'Jambes': [
    { name: 'Petit Jambe', price: 450 }, { name: 'Jambe Complète', price: 2500 }
  ],
  'Coiffure': [
    { name: 'Coupe Homme', price: 200 }, { name: 'Coupe Femme', price: 200 },
    { name: 'Barbe', price: 100 }, { name: 'Coloration', price: 150 }
  ],
  'Laser': [
    { name: 'Séance Laser', price: 500 }, { name: 'Détatouage', price: 1000 }
  ]
};

export default function VespucciManager() {
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState('login'); // login | app
  const [user, setUser] = useState('');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  
  // Caisse State
  const [activeCategory, setActiveCategory] = useState('Tête');
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceForm, setInvoiceForm] = useState({ client: '', discount: 0, invoiceNumber: '' });

  // Admin State
  const [pin, setPin] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [hrForm, setHrForm] = useState({ type: 'recrutement', target: '', reason: '' });

  // Init
  useEffect(() => {
    // Horloge
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})), 1000);
    // Invoice ID generator
    setInvoiceForm(prev => ({ ...prev, invoiceNumber: 'INV-' + Math.floor(100000 + Math.random() * 900000) }));
    return () => clearInterval(timer);
  }, []);

  // --- AUDIO ---
  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === 'click') {
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.05, now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        osc.stop(now + 0.2);
      }
      osc.start(now);
    } catch(e) {}
  };

  // --- LOGIC CAISSE ---
  const addToCart = (item) => {
    playSound('click');
    setCart(prev => {
      const exist = prev.find(i => i.name === item.name);
      if (exist) return prev.map(i => i.name === item.name ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (index, delta) => {
    const newCart = [...cart];
    newCart[index].qty += delta;
    if (newCart[index].qty <= 0) newCart.splice(index, 1);
    setCart(newCart);
  };

  const calculateTotal = () => {
    const sub = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const discAmt = (sub * (invoiceForm.discount / 100));
    return { sub, discAmt, total: sub - discAmt };
  };

  const handleSendInvoice = async () => {
    if (cart.length === 0) return alert("Panier vide !");
    setLoading(true);
    playSound('success');
    
    // Simulation API
    await new Promise(r => setTimeout(r, 1000));
    
    // Webhook Logic would go here using fetch()
    
    setLoading(false);
    alert(`Facture de ${calculateTotal().total}$ encaissée !`);
    setCart([]);
    setInvoiceForm(p => ({...p, client:'', invoiceNumber: 'INV-' + Math.floor(Math.random()*900000)}));
  };

  // --- RENDER ---
  return (
    <>
      <Head>
         {/* Import Remix Icon pour que les icones fonctionnent */}
        <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        /* ====== ESTHÉTIQUE TITANIUM (Base fournie) ====== */
        :root {
          --primary: #06b6d4;
          --primary-glow: rgba(6, 182, 212, 0.5);
          --primary-dim: rgba(6, 182, 212, 0.1);
          --accent: #8b5cf6;
          --bg-deep: #0f0f1a;
          --bg-panel: rgba(20, 25, 45, 0.75);
          --glass-border: rgba(255, 255, 255, 0.08);
          --text: #f1f5f9;
          --text-muted: #94a3b8;
          --font-ui: 'Inter', sans-serif;
          --font-data: 'JetBrains Mono', monospace;
        }

        * { box-sizing: border-box; outline: none; }
        
        body {
          margin: 0; padding: 0;
          font-family: var(--font-ui);
          background-color: var(--bg-deep);
          color: var(--text);
          height: 100vh; overflow: hidden;
        }

        /* FOND GRILLE */
        .bg-grid {
          position: fixed; inset: 0; z-index: -1;
          background: 
            radial-gradient(circle at 50% 10%, #1e1e3f 0%, #05050a 100%),
            linear-gradient(45deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 100% 100%, 40px 40px, 40px 40px;
        }

        /* CLASSES UTILITAIRES & COMPOSANTS */
        .glass-panel {
          background: var(--bg-panel);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
        }

        .btn {
          padding: 12px 20px; border-radius: 10px; border: none; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: 0.3s; font-size: 0.9rem;
        }
        .btn-primary {
          background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
          color: white; box-shadow: 0 4px 15px var(--primary-dim);
        }
        .btn-primary:hover { box-shadow: 0 0 20px var(--primary-glow); transform: translateY(-2px); }
        .btn-ghost { background: rgba(255,255,255,0.05); color: var(--text); }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); }
        
        .btn-icon { width: 36px; height: 36px; padding: 0; border-radius: 8px; }

        .input {
          width: 100%; padding: 12px 15px; border-radius: 10px;
          background: rgba(0,0,0,0.4); border: 1px solid var(--glass-border);
          color: white; font-family: var(--font-ui); transition: 0.3s;
        }
        .input:focus { border-color: var(--primary); background: rgba(0,0,0,0.6); }

        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

        /* ANIMATIONS */
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .anim-enter { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>

      {/* --- BACKGROUND --- */}
      <div className="bg-grid"></div>

      {/* --- VIEW: LOGIN --- */}
      {view === 'login' && (
        <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background:'black'}}>
          <div className="glass-panel anim-enter" style={{width: 400, padding: 40, textAlign: 'center', borderColor: 'var(--primary-dim)'}}>
            <div style={{fontSize: '3rem', color: 'var(--primary)', marginBottom: 20, filter: 'drop-shadow(0 0 15px var(--primary))'}}>
              <i className="ri-vip-diamond-fill"></i>
            </div>
            <h1 style={{fontSize: '2rem', margin: '0 0 10px 0', letterSpacing: '-1px'}}>VESPUCCI</h1>
            <p style={{color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 3, fontSize: '0.8rem', marginBottom: 40}}>Titanium OS Access</p>
            
            <div style={{textAlign:'left', marginBottom: 20}}>
                <label style={{fontSize:'0.75rem', color:'var(--primary)', fontWeight:700, textTransform:'uppercase'}}>Identité</label>
                <select className="input" onChange={(e) => setUser(e.target.value)} value={user} style={{marginTop: 5}}>
                    <option value="">Choisir employé...</option>
                    {CONFIG.default_employees.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>

            <button className="btn btn-primary" style={{width: '100%'}} disabled={!user} onClick={() => { playSound('success'); setView('app'); }}>
              INITIALISER SYSTÈME <i className="ri-arrow-right-line"></i>
            </button>
          </div>
        </div>
      )}

      {/* --- VIEW: APP --- */}
      {view === 'app' && (
        <div style={{display: 'flex', height: '100vh', maxWidth: 1600, margin: '0 auto', overflow: 'hidden'}}>
          
          {/* SIDEBAR (DOCK STYLE) */}
          <div className="glass-panel" style={{width: 80, margin: '20px 0 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 0', borderRadius: 20}}>
            <div style={{fontSize: '2rem', color: 'var(--primary)', marginBottom: 40, filter:'drop-shadow(0 0 10px var(--primary))'}}>
                <i className="ri-vip-diamond-line"></i>
            </div>
            
            <div style={{display:'flex', flexDirection:'column', gap: 15, width:'100%', alignItems:'center'}}>
                {MODULES.map(mod => (
                    <button 
                        key={mod.id} 
                        onClick={() => { setCurrentTab(mod.id); playSound('click'); }}
                        className="btn"
                        style={{
                            width: 50, height: 50, padding: 0, 
                            background: currentTab === mod.id ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                            color: currentTab === mod.id ? 'var(--primary)' : 'var(--text-muted)',
                            border: currentTab === mod.id ? '1px solid var(--primary)' : 'none'
                        }}
                        title={mod.label}
                    >
                        <i className={mod.icon} style={{fontSize: '1.4rem'}}></i>
                    </button>
                ))}
            </div>

            <button className="btn btn-ghost" style={{marginTop: 'auto', color: '#ef4444'}} onClick={() => setView('login')}>
                <i className="ri-shut-down-line" style={{fontSize: '1.4rem'}}></i>
            </button>
          </div>

          {/* MAIN CONTENT AREA */}
          <div style={{flex: 1, padding: '20px 30px', overflowY: 'auto', display:'flex', flexDirection:'column'}}>
            
            {/* TOP BAR */}
            <div className="glass-panel" style={{padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, minHeight: 80}}>
                <div>
                    <h2 style={{margin: 0, fontSize: '1.5rem', fontWeight: 800}}>{MODULES.find(m => m.id === currentTab)?.label}</h2>
                    <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Bienvenue, {user}</span>
                </div>
                <div style={{textAlign: 'right'}}>
                    <div style={{fontFamily: 'var(--font-data)', fontSize: '1.2rem', fontWeight: 700}}>{currentTime}</div>
                    <div style={{color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'}}>Connexion Sécurisée</div>
                </div>
            </div>

            {/* CONTENT: DASHBOARD (BENTO GRID) */}
            {currentTab === 'dashboard' && (
                <div className="anim-enter" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20}}>
                    {/* Widget Caisse */}
                    <div className="glass-panel" onClick={() => setCurrentTab('caisse')} style={{gridColumn: 'span 2', gridRow: 'span 2', padding: 30, cursor: 'pointer', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(20,25,45,0.8))'}}>
                        <i className="ri-shopping-cart-2-fill" style={{position:'absolute', right: -20, bottom: -20, fontSize: '10rem', opacity: 0.1, transform: 'rotate(-15deg)'}}></i>
                        <h3 style={{fontSize: '2.5rem', margin: 0}}>CAISSE</h3>
                        <p style={{color: 'var(--text-muted)'}}>Accès rapide au terminal de vente</p>
                        <button className="btn btn-primary" style={{marginTop: 20}}>Ouvrir <i className="ri-arrow-right-line"></i></button>
                    </div>

                    {/* Widget Staff */}
                    <div className="glass-panel" style={{gridColumn: 'span 1', padding: 20, display:'flex', flexDirection:'column', justifyContent:'center'}}>
                        <div style={{color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem'}}>EFFECTIF</div>
                        <div style={{fontSize: '2rem', fontFamily: 'var(--font-data)', fontWeight: 700}}>{CONFIG.default_employees.length}</div>
                        <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Employés actifs</div>
                    </div>

                    {/* Widget Stats */}
                    <div className="glass-panel" style={{gridColumn: 'span 1', padding: 20, display:'flex', flexDirection:'column', justifyContent:'center'}}>
                        <div style={{color: '#10b981', fontWeight: 700, fontSize: '0.8rem'}}>CHIFFRE AFFAIRES</div>
                        <div style={{fontSize: '2rem', fontFamily: 'var(--font-data)', fontWeight: 700}}>-- $</div>
                        <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Session en cours</div>
                    </div>

                    {/* Widget Admin */}
                    <div className="glass-panel" onClick={() => setCurrentTab('admin')} style={{gridColumn: 'span 2', padding: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20}}>
                         <div style={{width: 50, height: 50, background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '1.5rem'}}>
                            <i className="ri-lock-2-fill"></i>
                         </div>
                         <div>
                             <div style={{fontWeight: 700}}>Administration</div>
                             <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Accès direction requis</div>
                         </div>
                    </div>
                </div>
            )}

            {/* CONTENT: CAISSE (LAYOUT HEN HOUSE / DESIGN TITANIUM) */}
            {currentTab === 'caisse' && (
                <div className="anim-enter" style={{display: 'flex', gap: 20, height: 'calc(100vh - 180px)'}}>
                    
                    {/* Colonne Gauche: Catégories & Produits */}
                    <div style={{flex: 2, display: 'flex', flexDirection: 'column', gap: 20}}>
                        
                        {/* Filtres Catégories */}
                        <div style={{display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 5}}>
                            {Object.keys(PRODUCTS).map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className="glass-panel"
                                    style={{
                                        padding: '10px 20px', 
                                        border: activeCategory === cat ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                                        background: activeCategory === cat ? 'rgba(6,182,212,0.15)' : 'var(--bg-panel)',
                                        color: activeCategory === cat ? 'var(--primary)' : 'var(--text-muted)',
                                        cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.85rem'
                                    }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Grille Produits */}
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 15, overflowY: 'auto', paddingRight: 5}}>
                            {PRODUCTS[activeCategory].map((prod, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => addToCart(prod)}
                                    className="glass-panel"
                                    style={{
                                        padding: 15, cursor: 'pointer', display: 'flex', flexDirection: 'column', 
                                        justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: 110,
                                        transition: '0.2s', border: '1px solid var(--glass-border)'
                                    }}
                                    onMouseOver={(e) => {e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-3px)'}}
                                    onMouseOut={(e) => {e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'translateY(0)'}}
                                >
                                    <div style={{fontSize: '0.9rem', fontWeight: 600, marginBottom: 5}}>{prod.name}</div>
                                    <div style={{fontFamily: 'var(--font-data)', color: 'var(--primary)', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem'}}>
                                        {prod.price} $
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Colonne Droite: Ticket */}
                    <div className="glass-panel" style={{flex: 1, display: 'flex', flexDirection: 'column', padding: 20}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: 15, marginBottom: 15}}>
                            <span style={{fontWeight: 700}}>TICKET # {invoiceForm.invoiceNumber.split('-')[1]}</span>
                            <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{cart.reduce((a,b) => a+b.qty, 0)} articles</span>
                        </div>

                        <div style={{marginBottom: 15}}>
                            <input type="text" className="input" placeholder="Nom Client" value={invoiceForm.client} onChange={e => setInvoiceForm({...invoiceForm, client: e.target.value})} />
                        </div>

                        <div style={{flex: 1, overflowY: 'auto', marginBottom: 15}}>
                            {cart.length === 0 ? (
                                <div style={{textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, opacity: 0.5}}>
                                    <i className="ri-shopping-basket-2-line" style={{fontSize: '3rem'}}></i>
                                    <p>Panier vide</p>
                                </div>
                            ) : (
                                cart.map((item, i) => (
                                    <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8}}>
                                        <div>
                                            <div style={{fontSize: '0.9rem'}}>{item.name}</div>
                                            <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-data)'}}>{item.price}$ x {item.qty}</div>
                                        </div>
                                        <div style={{display: 'flex', gap: 5}}>
                                            <button className="btn btn-icon btn-ghost" onClick={() => updateQty(i, -1)}>-</button>
                                            <button className="btn btn-icon btn-ghost" onClick={() => updateQty(i, 1)}>+</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 12}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
                                <select className="input" style={{width: 'auto', padding: '5px 10px', fontSize: '0.8rem'}} value={invoiceForm.discount} onChange={e => setInvoiceForm({...invoiceForm, discount: Number(e.target.value)})}>
                                    <option value={0}>Remise 0%</option>
                                    <option value={10}>VIP -10%</option>
                                    <option value={50}>Employé -50%</option>
                                    <option value={100}>Offert -100%</option>
                                </select>
                                <div style={{textAlign: 'right'}}>
                                    <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Total Net</div>
                                    <div style={{fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-data)'}}>{calculateTotal().total} $</div>
                                </div>
                            </div>
                            <button className="btn btn-primary" style={{width: '100%'}} onClick={handleSendInvoice} disabled={loading}>
                                {loading ? 'Envoi...' : <span><i className="ri-secure-payment-line"></i> ENCAISSER</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTENT: ADMIN (RH) */}
            {currentTab === 'admin' && (
                <div className="anim-enter" style={{maxWidth: 600, margin: '0 auto'}}>
                    {!adminUnlocked ? (
                        <div className="glass-panel" style={{padding: 40, textAlign: 'center'}}>
                            <i className="ri-lock-password-fill" style={{fontSize: '3rem', color: '#ef4444', marginBottom: 20}}></i>
                            <h3>Accès Direction</h3>
                            <input type="password" className="input" placeholder="CODE PIN" style={{textAlign: 'center', fontSize: '1.5rem', letterSpacing: 5, fontFamily: 'var(--font-data)', marginBottom: 20}} value={pin} onChange={e => setPin(e.target.value)} />
                            <button className="btn btn-primary" style={{width: '100%', background: '#ef4444'}} onClick={() => pin === '1234' ? setAdminUnlocked(true) : alert('Code faux')}>DÉVERROUILLER</button>
                        </div>
                    ) : (
                        <div className="glass-panel" style={{padding: 30}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20}}>
                                <h3 style={{margin:0}}>Gestion RH</h3>
                                <button className="btn btn-ghost btn-icon" onClick={() => setAdminUnlocked(false)}><i className="ri-lock-line"></i></button>
                            </div>
                            
                            <div style={{display:'grid', gap: 15}}>
                                <div>
                                    <label style={{fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase'}}>Type d'action</label>
                                    <select className="input" value={hrForm.type} onChange={e => setHrForm({...hrForm, type: e.target.value})}>
                                        <option value="recrutement">Recrutement</option>
                                        <option value="licenciement">Licenciement</option>
                                        <option value="avertissement">Avertissement</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase'}}>Cible</label>
                                    <input className="input" placeholder="Nom de l'employé" value={hrForm.target} onChange={e => setHrForm({...hrForm, target: e.target.value})} />
                                </div>
                                <div>
                                    <label style={{fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase'}}>Notes</label>
                                    <textarea className="input" rows={4} placeholder="Raison..." value={hrForm.reason} onChange={e => setHrForm({...hrForm, reason: e.target.value})}></textarea>
                                </div>
                                <button className="btn btn-primary" onClick={() => { alert('Dossier envoyé'); setHrForm({type:'recrutement', target:'', reason:''}) }}>SOUMETTRE DOSSIER</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* CONTENT: ANNUAIRE */}
            {currentTab === 'annuaire' && (
                <div className="anim-enter" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20}}>
                    {CONFIG.default_employees.map((emp, i) => (
                        <div key={i} className="glass-panel" style={{padding: 20, textAlign: 'center', cursor: 'pointer', transition: '0.3s'}} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}>
                            <div style={{width: 60, height: 60, background: 'var(--bg-deep)', borderRadius: '50%', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary)', fontSize: '1.2rem', fontWeight: 700}}>
                                {emp.charAt(0)}
                            </div>
                            <div style={{fontWeight: 700}}>{emp}</div>
                            <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Employé</div>
                            <div style={{marginTop: 15, fontFamily: 'var(--font-data)', fontSize: '0.9rem', color: 'var(--primary)'}}>555-{1000+i}</div>
                        </div>
                    ))}
                </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}

```

