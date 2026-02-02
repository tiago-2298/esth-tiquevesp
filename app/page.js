'use client';
import { useState, useEffect, useMemo } from 'react';

// --- CONFIGURATION FRONT ---
const APP_NAME = "Vespucci Manager";
const MODULES = [
  { id: 'dashboard', l: 'Tableau de bord', e: '📊' },
  { id: 'caisse', l: 'Caisse & Vente', e: '💎' },
  { id: 'admin', l: 'Admin & RH', e: '⚖️' },
  { id: 'annuaire', l: 'Annuaire', e: '📒' },
  { id: 'expenses', l: 'Frais', e: '💸' }
];

// Mappage des icones pour les catégories (Remix Icon mapping simple)
const CAT_ICONS = {
  'Tête': '👤', 'Torse/Dos': '👕', 'Bras': '💪', 'Jambes': '🦵',
  'Custom': '🎨', 'Laser': '🔫', 'Coiffure': '✂️', 'Logistique': '📦'
};

const HR_TYPES = ['recrutement', 'convocation', 'avertissement', 'licenciement', 'demission'];

export default function Home() {
  const [view, setView] = useState('login'); // login | app
  const [user, setUser] = useState('');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [data, setData] = useState(null); // Metadata from API
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [sending, setSending] = useState(false);
  
  // State formulaires
  const [invoiceForm, setInvoiceForm] = useState({ client: '', discount: 0, invoiceNumber: '' });
  const [hrForm, setHrForm] = useState({ type: 'recrutement', target: '', reason: '' });
  const [expenseForm, setExpenseForm] = useState({ amount: '', reason: '', file: null });
  const [adminPin, setAdminPin] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // --- AUDIO ---
  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === 'click') {
        osc.frequency.setValueAtTime(800, now); gain.gain.setValueAtTime(0.02, now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(600, now); osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.05, now); osc.stop(now + 0.2);
      }
      osc.start();
    } catch (e) {}
  };

  // --- INIT ---
  useEffect(() => {
    // Générer un ID facture au chargement
    setInvoiceForm(prev => ({ ...prev, invoiceNumber: 'INV-' + Math.floor(100000 + Math.random() * 900000) }));
    
    // Charger les données
    fetch('/api', { method: 'POST', body: JSON.stringify({ action: 'getMeta' }) })
      .then(r => r.json())
      .then(d => { if(d.success) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
      
    // Restaurer session
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

  // --- API CALLS ---
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
            alert('Action effectuée avec succès !');
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
  if (loading) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f0f1a', color:'#06b6d4'}}>CHARGEMENT SYSTÈME...</div>;

  if (view === 'login') return (
    <div className="login-container">
        <style jsx global>{`
            :root { --primary: #06b6d4; --bg: #0f0f1a; --panel: rgba(20, 25, 45, 0.8); --text: #f1f5f9; }
            body { margin: 0; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); overflow: hidden; }
            .login-container { height: 100vh; display: flex; align-items: center; justifyContent: center; background: radial-gradient(circle at 50% 10%, #1e1e3f, #05050a); }
            .card { background: var(--panel); border: 1px solid rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; width: 400px; text-align: center; backdrop-filter: blur(10px); }
            .btn { background: linear-gradient(135deg, #06b6d4, #3b82f6); color: white; border: none; padding: 12px; width: 100%; border-radius: 10px; cursor: pointer; font-weight: bold; margin-top: 20px; transition: 0.3s; }
            .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(6,182,212,0.4); }
            select { width: 100%; padding: 12px; background: rgba(0,0,0,0.5); border: 1px solid #333; color: white; border-radius: 8px; }
        `}</style>
        <div className="card">
            <h1 style={{color:'var(--primary)', marginBottom: 5}}>VESPUCCI</h1>
            <p style={{color:'#64748b', fontSize:'0.8rem', letterSpacing: 2, marginBottom: 30}}>TITANIUM EDITION</p>
            <select onChange={(e) => setUser(e.target.value)} value={user}>
                <option value="">Choisir Identité...</option>
                {data?.employees?.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <button className="btn" disabled={!user} onClick={() => { localStorage.setItem('vespucci_user', user); setView('app'); playSound('success'); }}>INITIALISER</button>
        </div>
    </div>
  );

  return (
    <div className="app">
        <style jsx global>{`
            /* STYLES GLOBAUX */
            .app { display: flex; height: 100vh; }
            .sidebar { width: 80px; background: rgba(10,10,15,0.9); display: flex; flex-direction: column; align-items: center; padding: 20px 0; border-right: 1px solid rgba(255,255,255,0.05); z-index: 10; transition: width 0.3s; }
            .sidebar:hover { width: 220px; }
            .nav-item { width: 90%; padding: 15px; margin-bottom: 5px; border-radius: 12px; color: #94a3b8; cursor: pointer; display: flex; align-items: center; overflow: hidden; white-space: nowrap; transition: 0.2s; }
            .nav-item:hover, .nav-item.active { background: rgba(6, 182, 212, 0.1); color: var(--primary); }
            .nav-icon { font-size: 1.5rem; min-width: 50px; text-align: center; }
            .main { flex: 1; padding: 30px; overflow-y: auto; background: radial-gradient(circle at top right, #1a1a2e, #0f0f1a); }
            
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
            .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; transition: 0.2s; }
            .card:hover { border-color: var(--primary); transform: translateY(-3px); }
            
            .inp { width: 100%; padding: 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; margin-bottom: 10px; }
            .inp:focus { border-color: var(--primary); outline: none; }
            
            .btn-p { background: var(--primary); color: #000; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; }
            .btn-red { background: #ef4444; color: #fff; border: none; padding: 8px; border-radius: 6px; cursor: pointer; }
            
            /* Caisse */
            .pos-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; height: calc(100vh - 60px); }
            .product-btn { background: rgba(255,255,255,0.05); border: 1px solid transparent; padding: 15px; border-radius: 10px; text-align: center; cursor: pointer; display: flex; flex-direction: column; gap: 5px; align-items: center; justify-content: center; height: 100px; }
            .product-btn:hover { background: rgba(6, 182, 212, 0.15); border-color: var(--primary); }
            .ticket { background: #000; border: 1px solid #333; padding: 20px; border-radius: 12px; display: flex; flex-direction: column; }
        `}</style>

        <div className="sidebar">
            <div style={{fontSize:'2rem', marginBottom: 30, color: 'var(--primary)'}}>💎</div>
            {MODULES.map(m => (
                <div key={m.id} className={`nav-item ${currentTab === m.id ? 'active' : ''}`} onClick={() => setCurrentTab(m.id)}>
                    <span className="nav-icon">{m.e}</span>
                    <span style={{fontWeight: 600}}>{m.l}</span>
                </div>
            ))}
            <div style={{marginTop: 'auto'}} className="nav-item" onClick={() => setView('login')}>
                <span className="nav-icon">🚪</span>
                <span>Déconnexion</span>
            </div>
        </div>

        <div className="main">
            {/* DASHBOARD */}
            {currentTab === 'dashboard' && (
                <div>
                    <h1 style={{fontSize:'3rem', marginBottom: 10}}>Bonjour, {user.split(' ')[0]}</h1>
                    <p style={{color:'#94a3b8', marginBottom: 40}}>Terminal Vespucci v5.0 opérationnel.</p>
                    
                    <div className="grid">
                        <div className="card" onClick={() => setCurrentTab('caisse')} style={{cursor:'pointer', background:'linear-gradient(135deg, rgba(6,182,212,0.1), transparent)'}}>
                            <h3 style={{color:'var(--primary)'}}>💎 Nouvelle Vente</h3>
                            <p style={{fontSize:'0.9rem', color:'#94a3b8'}}>Accéder au catalogue</p>
                        </div>
                        <div className="card">
                            <h3>📞 Annuaire</h3>
                            <p style={{fontSize:'1.5rem', fontWeight:'bold'}}>{data?.employees?.length || 0} Employés</p>
                        </div>
                    </div>
                </div>
            )}

            {/* CAISSE */}
            {currentTab === 'caisse' && (
                <div className="pos-layout">
                    <div style={{overflowY: 'auto', paddingRight: 10}}>
                        {Object.entries(data?.productsByCategory || {}).map(([cat, products]) => (
                            <div key={cat} style={{marginBottom: 20}}>
                                <h3 style={{color:'var(--primary)', marginBottom: 10, borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:5}}>
                                    {CAT_ICONS[cat] || '📦'} {cat}
                                </h3>
                                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap: 10}}>
                                    {products.map(p => (
                                        <div key={p} className="product-btn" onClick={() => addToCart(p)}>
                                            <div style={{fontSize:'0.85rem', fontWeight:'bold', lineHeight:1.2}}>{p}</div>
                                            <div style={{fontSize:'0.8rem', color:'var(--primary)'}}>{data?.prices[p] || 0}$</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="ticket">
                        <h2 style={{textAlign:'center', borderBottom:'1px dashed #444', paddingBottom:15, marginBottom:15}}>TICKET</h2>
                        <input className="inp" placeholder="Nom Client" value={invoiceForm.client} onChange={e => setInvoiceForm({...invoiceForm, client: e.target.value})} />
                        
                        <div style={{flex:1, overflowY:'auto', marginBottom: 15}}>
                            {cart.length === 0 ? <div style={{textAlign:'center', color:'#555', marginTop: 50}}>Panier vide</div> : 
                            cart.map((item, idx) => (
                                <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10, background:'rgba(255,255,255,0.05)', padding:8, borderRadius:6}}>
                                    <div>
                                        <div style={{fontSize:'0.9rem'}}>{item.name}</div>
                                        <div style={{fontSize:'0.8rem', color:'#888'}}>{item.price}$ x {item.qty}</div>
                                    </div>
                                    <button className="btn-red" onClick={() => removeFromCart(idx)}>×</button>
                                </div>
                            ))}
                        </div>

                        <div style={{borderTop:'1px dashed #444', paddingTop: 15}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 10}}>
                                <select className="inp" style={{width:'60%', marginBottom:0}} value={invoiceForm.discount} onChange={e => setInvoiceForm({...invoiceForm, discount: Number(e.target.value)})}>
                                    <option value="0">Remise (0%)</option>
                                    <option value="10">VIP (-10%)</option>
                                    <option value="30">Partenaire (-30%)</option>
                                    <option value="50">Moitié Prix (-50%)</option>
                                    <option value="100">Gratuit (100%)</option>
                                </select>
                                <div style={{textAlign:'right'}}>
                                    <div style={{fontSize:'0.8rem', color:'#888'}}>Total</div>
                                    <div style={{fontSize:'1.5rem', fontWeight:'bold', color:'var(--primary)'}}>{calculateTotal().total}$</div>
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
                                {sending ? 'ENVOI...' : 'ENCAISSER 💳'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXPENSES */}
            {currentTab === 'expenses' && (
                <div style={{maxWidth: 500, margin: '0 auto'}}>
                    <h2 style={{textAlign:'center', marginBottom: 20}}>Déclaration de Dépenses</h2>
                    <div className="card">
                        <input className="inp" placeholder="Montant ($)" type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                        <textarea className="inp" placeholder="Justification..." value={expenseForm.reason} onChange={e => setExpenseForm({...expenseForm, reason: e.target.value})} rows="4"></textarea>
                        <div style={{marginBottom: 20, textAlign:'center', border:'1px dashed #555', padding: 20, borderRadius: 10}}>
                            <p style={{marginBottom: 10}}>Preuve (Photo)</p>
                            <input type="file" accept="image/*" onChange={handleExpenseFile} />
                            {expenseForm.file && <img src={expenseForm.file} style={{maxWidth:'100%', marginTop: 10, borderRadius:8}} />}
                        </div>
                        <button className="btn-p" onClick={() => sendAction('sendExpense', expenseForm)}>ENVOYER LA NOTE</button>
                    </div>
                </div>
            )}

            {/* ADMIN / RH */}
            {currentTab === 'admin' && (
                <div style={{maxWidth: 600, margin: '0 auto'}}>
                    <h2 style={{textAlign:'center', marginBottom: 20}}>Administration & RH</h2>
                    
                    {!isAdminUnlocked ? (
                        <div className="card" style={{textAlign:'center'}}>
                            <h3>Accès Restreint</h3>
                            <p style={{marginBottom: 20, color:'#888'}}>Entrez le code PIN Direction</p>
                            <input className="inp" type="password" style={{textAlign:'center', fontSize:'1.5rem', letterSpacing: 5}} maxLength="6" value={adminPin} onChange={e => setAdminPin(e.target.value)} />
                            <button className="btn-p" onClick={() => { if(adminPin === '123459') setIsAdminUnlocked(true); else alert('Code faux'); }}>VERROUILLER</button>
                        </div>
                    ) : (
                        <div className="card">
                            <h3 style={{color: 'var(--primary)', marginBottom: 15}}>Nouvelle Action RH</h3>
                            <select className="inp" value={hrForm.type} onChange={e => setHrForm({...hrForm, type: e.target.value})}>
                                {HR_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                            </select>
                            <input className="inp" placeholder="Employé / Cible concernée" value={hrForm.target} onChange={e => setHrForm({...hrForm, target: e.target.value})} />
                            <textarea className="inp" rows="5" placeholder="Détails du dossier, raison..." value={hrForm.reason} onChange={e => setHrForm({...hrForm, reason: e.target.value})}></textarea>
                            <button className="btn-p" onClick={() => sendAction('sendHR', hrForm)}>TRANSMETTRE LE DOSSIER</button>
                            <button className="btn-red" style={{width:'100%', marginTop: 10}} onClick={() => setIsAdminUnlocked(false)}>VERROUILLER</button>
                        </div>
                    )}
                </div>
            )}
            
            {/* ANNUAIRE */}
            {currentTab === 'annuaire' && (
                <div className="grid">
                    {data?.employees?.map(emp => (
                        <div key={emp} className="card" style={{textAlign:'center'}}>
                            <div style={{width: 60, height: 60, background:'#333', borderRadius:'50%', margin:'0 auto 10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', border:'2px solid var(--primary)'}}>
                                {emp.charAt(0)}
                            </div>
                            <h3>{emp}</h3>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}
