'use client';
import { useState, useEffect, useMemo } from 'react';

// --- STYLES & CONFIG ---
// On utilise styled-jsx pour garder ton style CSS directement dans le composant
const THEME = {
  primary: '#06b6d4',
  bg: '#0f0f1a',
  panel: 'rgba(20, 25, 45, 0.7)',
  glass: 'rgba(255, 255, 255, 0.03)',
  text: '#f1f5f9'
};

const MODULES = [
  { id: 'dashboard', l: 'Dashboard', icon: 'ri-layout-grid-fill' },
  { id: 'invoice', l: 'Caisse', icon: 'ri-shopping-bag-3-fill' },
  { id: 'directory', l: 'Annuaire', icon: 'ri-contacts-book-2-fill' },
  { id: 'admin', l: 'Direction', icon: 'ri-shield-star-fill' },
];

export default function Home() {
  // --- STATES ---
  const [view, setView] = useState('login');
  const [user, setUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // Stocke produits, prix, employés...
  
  // Facturation States
  const [cart, setCart] = useState([]);
  const [invoiceConfig, setInvoiceConfig] = useState({
    client: '',
    enterprise: '',
    invoiceNum: '',
    discount: 0
  });
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState(null);

  // Admin States
  const [adminPin, setAdminPin] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [hrForm, setHrForm] = useState({ type: 'recrutement', target: '', reason: '', date: '', details: '' });

  // --- EFFECTS ---
  useEffect(() => {
    // Chargement initial des données
    fetch('/api', { method: 'POST', body: JSON.stringify({ action: 'getMeta' }) })
      .then(r => r.json())
      .then(d => {
        if(d.success) {
          setData(d);
          setInvoiceConfig(prev => ({...prev, invoiceNum: 'INV-' + Math.floor(Math.random()*1000000)}));
        }
        setLoading(false);
      });
      
    // Récup session locale
    const savedUser = localStorage.getItem('vespucci_user');
    if(savedUser) { setUser(savedUser); setView('dashboard'); }
  }, []);

  // Calculs totaux panier
  const totals = useMemo(() => {
    const sub = cart.reduce((acc, item) => acc + (item.p * item.q), 0);
    // Logique remise : Si entreprise sélectionnée -> remise entreprise, sinon remise manuelle/employé
    let discPct = 0;
    let discType = 'Aucune';

    if (invoiceConfig.enterprise && data?.enterprises[invoiceConfig.enterprise]) {
      discPct = data.enterprises[invoiceConfig.enterprise];
      discType = 'Partenaire';
    } else if (invoiceConfig.discount > 0) {
      discPct = invoiceConfig.discount;
      discType = 'Manuelle';
    }

    const discAmount = (sub * discPct) / 100;
    return { sub, discPct, discType, discAmount, total: sub - discAmount };
  }, [cart, invoiceConfig, data]);

  // --- ACTIONS ---
  const handleLogin = () => {
    if(!user) return;
    localStorage.setItem('vespucci_user', user);
    setView('dashboard');
  };

  const logout = () => {
    localStorage.removeItem('vespucci_user');
    setUser('');
    setView('login');
  };

  const addToCart = (product) => {
    setCart(prev => {
      const exist = prev.find(i => i.n === product.n);
      if(exist) return prev.map(i => i.n === product.n ? {...i, q: i.q + 1} : i);
      return [...prev, {...product, q: 1}];
    });
  };

  const sendInvoice = async () => {
    if(cart.length === 0) return alert('Panier vide');
    
    await fetch('/api', {
      method: 'POST',
      body: JSON.stringify({
        action: 'sendFactures',
        data: {
          employee: user,
          invoiceNumber: invoiceConfig.invoiceNum,
          items: cart,
          enterprise: invoiceConfig.enterprise,
          customerName: invoiceConfig.client,
          discountPct: totals.discPct,
          discountType: totals.discType,
          totalDetails: { sub: totals.sub, discAmount: totals.discAmount, total: totals.total }
        }
      })
    });
    
    alert('Facture envoyée !');
    setCart([]);
    setInvoiceConfig({...invoiceConfig, client: '', enterprise: '', invoiceNum: 'INV-' + Math.floor(Math.random()*1000000)});
  };

  const checkAdmin = () => {
    // Code pin simple (à changer si besoin)
    if(adminPin === '123459') setIsAdminUnlocked(true);
    else alert('Code faux');
  };

  const sendHR = async (type) => {
    // Mapping pour savoir si c'est une dépense ou une action RH
    const action = type === 'depense' ? 'sendExpense' : 'sendHR';
    const payload = type === 'depense' 
      ? { author: user, amount: hrForm.target, reason: hrForm.reason, supplier: hrForm.details }
      : { type, author: user, target: hrForm.target, reason: hrForm.reason, dateEffet: hrForm.date };

    await fetch('/api', {
      method: 'POST',
      body: JSON.stringify({ action, data: payload })
    });
    alert('Dossier transmis');
    setHrForm({ type: 'recrutement', target: '', reason: '', date: '', details: '' });
  };

  // --- RENDU ---
  if(loading) return <div className="loading">Chargement Vespucci OS...</div>;

  return (
    <div className="app-container">
      {/* GLOBAL STYLES (Adaptation de ton CSS) */}
      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap');

        :root {
          --primary: ${THEME.primary};
          --bg-deep: ${THEME.bg};
          --panel: ${THEME.panel};
          --text: ${THEME.text};
        }

        body {
          background-color: var(--bg-deep);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          margin: 0;
          overflow-x: hidden;
          background-image: 
            radial-gradient(circle at 50% 10%, #1e1e3f 0%, #05050a 100%),
            linear-gradient(45deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 100% 100%, 40px 40px;
        }

        .btn {
          padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; border: none;
          transition: 0.2s; text-transform: uppercase; font-size: 0.8rem;
        }
        .btn-primary { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; }
        .btn-primary:hover { box-shadow: 0 0 20px rgba(6, 182, 212, 0.4); transform: translateY(-2px); }
        
        .input, select {
          width: 100%; padding: 12px; border-radius: 10px;
          background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
          color: white; margin-bottom: 10px;
        }

        .card {
          background: var(--panel); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px; padding: 25px; backdrop-filter: blur(10px);
        }

        .grid-dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        
        .nav-bar {
          display: flex; gap: 20px; padding: 20px; 
          background: rgba(20,20,35,0.8); backdrop-filter: blur(10px);
          position: sticky; top: 0; z-index: 100; border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .nav-item { cursor: pointer; opacity: 0.6; transition: 0.2s; display: flex; align-items: center; gap: 8px; }
        .nav-item:hover, .nav-item.active { opacity: 1; color: var(--primary); font-weight: 700; }
      `}</style>

      {/* --- LOGIN VIEW --- */}
      {view === 'login' && (
        <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="card" style={{width: 400, textAlign: 'center'}}>
            <i className="ri-vip-diamond-fill" style={{fontSize: '3rem', color: THEME.primary, marginBottom: 20}}></i>
            <h1 style={{marginBottom: 30}}>Vespucci Titanium</h1>
            <select className="input" value={user} onChange={e => setUser(e.target.value)}>
              <option value="">Choisir identité...</option>
              {data?.employees.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <button className="btn btn-primary" style={{width: '100%'}} onClick={handleLogin}>Connexion</button>
          </div>
        </div>
      )}

      {/* --- APP VIEW --- */}
      {view !== 'login' && (
        <>
          <nav className="nav-bar">
            <div style={{marginRight: 'auto', fontWeight: 900, fontSize: '1.2rem'}}>VESPUCCI OS</div>
            {MODULES.map(m => (
              <div key={m.id} className={`nav-item ${view === m.id ? 'active' : ''}`} onClick={() => setView(m.id)}>
                <i className={m.icon}></i> {m.l}
              </div>
            ))}
            <div className="nav-item" style={{color: '#ef4444'}} onClick={logout}><i className="ri-shut-down-line"></i></div>
          </nav>

          <main style={{padding: 30, maxWidth: 1600, margin: '0 auto'}}>
            
            {/* DASHBOARD */}
            {view === 'dashboard' && (
              <div className="grid-dashboard">
                <div className="card" onClick={() => setView('invoice')} style={{cursor: 'pointer', background: 'linear-gradient(160deg, rgba(30,30,58,0.6), rgba(6,182,212,0.1))'}}>
                  <i className="ri-shopping-bag-3-fill" style={{fontSize: '2rem', color: THEME.primary}}></i>
                  <h2>CAISSE</h2>
                  <p style={{color: '#94a3b8'}}>Accès facturation</p>
                </div>
                <div className="card" onClick={() => setView('directory')} style={{cursor: 'pointer'}}>
                  <i className="ri-contacts-book-2-fill" style={{fontSize: '2rem', color: '#10b981'}}></i>
                  <h2>CONTACTS</h2>
                  <p style={{color: '#94a3b8'}}>Annuaire entreprise</p>
                </div>
                <div className="card" onClick={() => setView('admin')} style={{cursor: 'pointer'}}>
                  <i className="ri-shield-star-fill" style={{fontSize: '2rem', color: '#8b5cf6'}}></i>
                  <h2>DIRECTION</h2>
                  <p style={{color: '#94a3b8'}}>Gestion RH & Finances</p>
                </div>
              </div>
            )}

            {/* CAISSE (INVOICE) */}
            {view === 'invoice' && (
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 30}}>
                {/* Catalogue */}
                <div>
                   <input type="text" className="input" placeholder="🔍 Rechercher..." onChange={e => setSearch(e.target.value)} />
                   <div style={{display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10}}>
                      <button className={`btn ${!catFilter ? 'btn-primary' : ''}`} style={{background: !catFilter ? '' : '#222'}} onClick={() => setCatFilter(null)}>Tout</button>
                      {Object.keys(data?.products || {}).map(cat => (
                        <button key={cat} className="btn" style={{background: catFilter === cat ? THEME.primary : '#222', color: 'white'}} onClick={() => setCatFilter(cat)}>{cat}</button>
                      ))}
                   </div>
                   
                   <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 15, marginTop: 20}}>
                      {Object.entries(data?.products || {}).map(([cat, items]) => {
                        if (catFilter && catFilter !== cat) return null;
                        return items.filter(i => i.n.toLowerCase().includes(search.toLowerCase())).map(item => (
                          <div key={item.n} className="card" style={{padding: 15, cursor: 'pointer', textAlign: 'center', transition: '0.2s'}} onClick={() => addToCart(item)}>
                             <div style={{fontSize: '0.9rem', fontWeight: 600, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{item.n}</div>
                             <div style={{marginTop: 10, color: THEME.primary, fontWeight: 800}}>{item.p}$</div>
                          </div>
                        ));
                      })}
                   </div>
                </div>

                {/* Panier */}
                <div className="card" style={{display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)', position: 'sticky', top: 100}}>
                   <h3>Ticket Client</h3>
                   <input className="input" placeholder="Client" value={invoiceConfig.client} onChange={e => setInvoiceConfig({...invoiceConfig, client: e.target.value})} />
                   <select className="input" value={invoiceConfig.enterprise} onChange={e => setInvoiceConfig({...invoiceConfig, enterprise: e.target.value})}>
                      <option value="">Entreprise (Optionnel)</option>
                      {Object.keys(data?.enterprises || {}).map(e => <option key={e} value={e}>{e} (-{data.enterprises[e]}%)</option>)}
                   </select>

                   <div style={{flex: 1, overflowY: 'auto', margin: '15px 0'}}>
                      {cart.map((item, idx) => (
                        <div key={idx} style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10, background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8}}>
                           <div>{item.n} <span style={{fontSize: '0.8rem', color: '#999'}}>x{item.q}</span></div>
                           <div style={{fontWeight: 'bold'}}>{item.p * item.q}$</div>
                           <button onClick={() => {
                             const newCart = [...cart];
                             newCart.splice(idx, 1);
                             setCart(newCart);
                           }} style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer'}}>×</button>
                        </div>
                      ))}
                   </div>

                   <div style={{borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 15}}>
                      <div style={{display: 'flex', justifyContent: 'space-between'}}><span>Sous-total</span><span>{totals.sub}$</span></div>
                      <div style={{display: 'flex', justifyContent: 'space-between', color: '#10b981'}}><span>Remise ({totals.discType})</span><span>-{totals.discAmount}$</span></div>
                      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 900, marginTop: 10}}><span>TOTAL</span><span>{totals.total}$</span></div>
                      <button className="btn btn-primary" style={{width: '100%', marginTop: 20}} onClick={sendInvoice}>ENCAISSER</button>
                   </div>
                </div>
              </div>
            )}

            {/* ADMIN */}
            {view === 'admin' && (
              <div style={{maxWidth: 600, margin: '0 auto'}}>
                {!isAdminUnlocked ? (
                  <div className="card" style={{textAlign: 'center'}}>
                    <h2>Accès Restreint</h2>
                    <input type="password" className="input" style={{textAlign: 'center', fontSize: '1.5rem', letterSpacing: 5}} placeholder="PIN" value={adminPin} onChange={e => setAdminPin(e.target.value)} />
                    <button className="btn btn-primary" onClick={checkAdmin}>Déverrouiller</button>
                  </div>
                ) : (
                  <div className="card">
                    <h2 style={{marginBottom: 20}}>Panel Direction</h2>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20}}>
                       {['recrutement', 'convocation', 'avertissement', 'licenciement', 'depense'].map(t => (
                         <button key={t} className="btn" style={{background: hrForm.type === t ? THEME.primary : '#222', color: 'white'}} onClick={() => setHrForm({...hrForm, type: t})}>{t}</button>
                       ))}
                    </div>

                    <label>Cible / Montant</label>
                    <input className="input" value={hrForm.target} onChange={e => setHrForm({...hrForm, target: e.target.value})} placeholder={hrForm.type === 'depense' ? "Montant (ex: 500)" : "Nom de l'employé"} />
                    
                    <label>{hrForm.type === 'depense' ? 'Fournisseur' : 'Date effet'}</label>
                    <input className="input" value={hrForm.date} onChange={e => setHrForm({...hrForm, date: e.target.value})} type={hrForm.type === 'depense' ? 'text' : 'date'} placeholder={hrForm.type === 'depense' ? 'Nom du fournisseur' : ''} />
                    
                    <label>Motif / Raison</label>
                    <textarea className="input" style={{height: 100}} value={hrForm.reason} onChange={e => setHrForm({...hrForm, reason: e.target.value})}></textarea>
                    
                    <button className="btn btn-primary" style={{width: '100%'}} onClick={() => sendHR(hrForm.type)}>Envoyer Dossier</button>
                  </div>
                )}
              </div>
            )}

            {/* ANNUAIRE */}
            {view === 'directory' && (
              <div className="grid-dashboard">
                {data?.partners.map((p, i) => (
                   <div key={i} className="card" style={{textAlign: 'center'}}>
                      <img src={p.avatar} style={{width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${THEME.primary}`}} />
                      <h3 style={{margin: '10px 0'}}>{p.name}</h3>
                      <div style={{background: 'rgba(6, 182, 212, 0.1)', color: THEME.primary, padding: '5px 10px', borderRadius: 6, display: 'inline-block', marginBottom: 15, fontSize: '0.8rem', fontWeight: 'bold'}}>{p.role}</div>
                      <div style={{fontFamily: 'JetBrains Mono', fontSize: '1.2rem', fontWeight: 700}}>{p.phone}</div>
                   </div>
                ))}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}
