'use client';
import { useState, useEffect, useMemo } from 'react';

// --- CONFIGURATION DATA ---
const WEBHOOKS = {
  factures: "VOTRE_WEBHOOK_FACTURES",
  direction: "VOTRE_WEBHOOK_DIRECTION",
  recrutement: "VOTRE_WEBHOOK_RECRUTEMENT",
  convocation: "VOTRE_WEBHOOK_CONVOCATION",
  avertissement: "VOTRE_WEBHOOK_AVERTISSEMENT",
  licenciement: "VOTRE_WEBHOOK_LICENCIEMENT", 
  depense: "https://discord.com/api/webhooks/1458467290151653563/SGEnsRQJ2KDDnhUoCRmGp0IRM96o65gP-HVhWrxTzrDef02aS3SwtQKM2WG6iVKE43fs"
};

const EMPLOYEES_LIST = [
  "Alvarez Julio", "Bloom Soren", "Price Sun", "Hernandez Andres", 
  "Mason Bloom", "Jimenez Taziñio", "Rosales Kali", "Daikii Isuke", 
  "Makara Chariya Chan", "Price Moon", "Jayden Lockett", "Jayden Coleman", 
  "Moon Veda", "Inaya Kinslow", "Elijah Gonzalez", "Kilyan Smith", 
  "Obito Valeria", "Lily Summer"
];

const PRODUCTS = [
  { id: 'Tête', icon: 'ri-user-3-fill', color: '#06b6d4', items: [{n:'Petit Tatouage', p:350}, {n:'Moyen Tatouage', p:450}, {n:'Grand Tatouage', p:600}, {n:'Tatouage Visage', p:700}] },
  { id: 'Torse/Dos', icon: 'ri-body-scan-fill', color: '#f59e0b', items: [{n:'Petit Tatouage', p:600}, {n:'Moyen Tatouage', p:800}, {n:'Grand Tatouage', p:1100}, {n:'Dos Complet', p:3000}] },
  { id: 'Bras', icon: 'ri-markup-fill', color: '#8b5cf6', items: [{n:'Petit Tatouage', p:450}, {n:'Moyen Tatouage', p:600}, {n:'Grand Tatouage', p:800}, {n:'Bras Complet', p:2500}] },
  { id: 'Jambes', icon: 'ri-walk-fill', color: '#10b981', items: [{n:'Petit Tatouage', p:450}, {n:'Moyen Tatouage', p:600}, {n:'Grand Tatouage', p:800}, {n:'Jambe Complète', p:2500}] },
  { id: 'Custom', icon: 'ri-edit-2-fill', color: '#94a3b8', items: [{n:'Retouche', p:100}, {n:'Custom Small', p:500}, {n:'Custom Large', p:1500}, {n:'Projet Spécial', p:5000}] },
  { id: 'Laser', icon: 'ri-flashlight-fill', color: '#ef4444', items: [{n:'Petit Laser', p:250}, {n:'Moyen Laser', p:500}, {n:'Grand Laser', p:750}, {n:'Séance Complète', p:1000}] },
  { id: 'Coiffeur', icon: 'ri-scissors-fill', color: '#ec4899', items: [{n:'Coupe', p:200}, {n:'Couleur', p:100}, {n:'Barbe', p:100}, {n:'Dégradé', p:100}] }
];

const PARTNERS = [
  {name:'HenHouse', val:30, img:'https://i.goopics.net/xvvwd2.png', phone:'555-0192'},
  {name:'Auto Exotic', val:30, img:'https://i.goopics.net/jqrtnn.png', phone:'555-1029'},
  {name:'LifeInvader', val:30, img:'https://i.goopics.net/k7g19i.png', phone:'555-3920'},
  {name:'Delight', val:30, img:'https://i.goopics.net/1yiiit.png', phone:'555-8821'},
  {name:'LTD Sandy', val:30, img:'https://i.goopics.net/4x8au4.png', phone:'555-6672'},
  {name:'Biogood', val:30, img:'https://i.goopics.net/3y6ljf.png', phone:'397-3784'},
];

const DEFAULT_DIRECTORY = [
  { nom: "Bloom", prenom: "Soren", grade: "Co-Patron", tel: "575-5535", photo: "https://i.goopics.net/o6gnq3.png" }
];

export default function Home() {
  const [view, setView] = useState('login'); // login, dashboard, invoice, direction, annuaire
  const [user, setUser] = useState('');
  const [clock, setClock] = useState('00:00');
  
  // States Caisse
  const [cart, setCart] = useState([]);
  const [openCat, setOpenCat] = useState(null); // Index de la catégorie ouverte
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceDetails, setInvoiceDetails] = useState({ client: '', discount: 0, id: '' });

  // States Admin
  const [adminPin, setAdminPin] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [modalHR, setModalHR] = useState({ show: false, type: '' });
  const [hrForm, setHrForm] = useState({ target: '', date: '', reason: '' });

  // States Annuaire
  const [contacts, setContacts] = useState([]);
  const [modalAddContact, setModalAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ nom: '', prenom: '', grade: 'Employé', tel: '', photo: '' });
  const [modalContact, setModalContact] = useState(null); // Contact objet ou null

  // Init
  useEffect(() => {
    // Clock
    const timer = setInterval(() => setClock(new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})), 1000);
    // Invoice ID
    setInvoiceDetails(prev => ({ ...prev, id: 'INV-' + Math.floor(Math.random() * 1000000) }));
    // Load contacts
    const savedContacts = localStorage.getItem('vespucci_contacts');
    if (savedContacts) setContacts(JSON.parse(savedContacts));
    else setContacts(DEFAULT_DIRECTORY);

    return () => clearInterval(timer);
  }, []);

  // --- LOGIC CAISSE ---
  const toggleCat = (idx) => setOpenCat(openCat === idx ? null : idx);

  const addToCart = (item) => {
    setCart(prev => {
      const exist = prev.find(x => x.n === item.n);
      if(exist) return prev.map(x => x.n === item.n ? {...x, q: x.q + 1} : x);
      return [...prev, {...item, q: 1}];
    });
  };

  const modQty = (idx, amount) => {
    setCart(prev => {
      const newCart = [...prev];
      newCart[idx].q += amount;
      if(newCart[idx].q <= 0) newCart.splice(idx, 1);
      return newCart;
    });
  };

  const calculateTotal = () => {
    const sub = cart.reduce((a, b) => a + (b.p * b.q), 0);
    const discAmt = sub * (invoiceDetails.discount / 100);
    return { sub, discAmt, total: sub - discAmt };
  };

  const submitInvoice = async () => {
    if(cart.length === 0) return alert("Panier vide");
    const totals = calculateTotal();
    
    const embed = {
      title: "🧾 Facture Validée",
      color: 3447003,
      footer: { text: "Vespucci • Titanium Edition" },
      timestamp: new Date(),
      fields: [
        {name:"Vendeur", value: user, inline:true},
        {name:"Client", value: invoiceDetails.client || "Inconnu", inline:true},
        {name:"Total Payé", value: `**${totals.total.toFixed(0)} $**`, inline:true},
        {name:"Détails", value: cart.map(i=>`• ${i.n} (x${i.q})`).join('\n')}
      ]
    };

    await fetch(WEBHOOKS.factures, {
      method: "POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({embeds:[embed]})
    });

    setCart([]);
    setInvoiceDetails(prev => ({ ...prev, client: '', id: 'INV-' + Math.floor(Math.random() * 1000000) }));
    alert("Facture envoyée !");
  };

  // --- LOGIC RH ---
  const sendHR = async (e) => {
    e.preventDefault();
    const type = modalHR.type;
    const embed = { 
        title: "Action RH: "+type.toUpperCase(), 
        color: type === 'licenciement' ? 15548997 : 3447003,
        fields: [
        {name:"Auteur", value: user, inline:true},
        {name:"Cible/Montant", value: hrForm.target, inline:true},
        {name:"Date Effet", value: hrForm.date, inline:true},
        {name:"Détails", value: hrForm.reason}
    ]};
    
    await fetch(WEBHOOKS[type] || WEBHOOKS.direction, {
        method: "POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({embeds:[embed]})
    });
    setModalHR({ show: false, type: '' });
    setHrForm({ target: '', date: '', reason: '' });
    alert("Dossier transmis");
  };

  // --- LOGIC CONTACTS ---
  const saveContact = (e) => {
    e.preventDefault();
    const newList = [...contacts, newContact];
    setContacts(newList);
    localStorage.setItem('vespucci_contacts', JSON.stringify(newList));
    setModalAddContact(false);
    setNewContact({ nom: '', prenom: '', grade: 'Employé', tel: '', photo: '' });
  };

  // --- RENDER ---
  if (view === 'login') return (
    <div className="login-gate">
      <div className="card" style={{width: 400, textAlign: 'center', borderColor: 'rgba(6,182,212,0.3)', boxShadow:'0 0 60px -20px var(--primary-glow)'}}>
        <div style={{fontSize:'3rem', marginBottom:20, color:'white', filter:'drop-shadow(0 0 15px var(--primary-glow))'}}>
            <i className="ri-vip-diamond-fill"></i>
        </div>
        <h1 style={{fontSize:'1.8rem', fontWeight:800, marginBottom:5}}>Vespucci</h1>
        <p style={{color:'var(--text-muted)', fontSize:'0.75rem', letterSpacing:3, textTransform:'uppercase', marginBottom:30}}>Titanium Access</p>
        
        <div style={{textAlign:'left', marginBottom:20}}>
            <label style={{fontSize:'0.7rem', color:'var(--primary)', fontWeight:700, display:'block', marginBottom:8, textTransform:'uppercase'}}>Identifiant</label>
            <select className="input" onChange={(e) => setUser(e.target.value)} value={user}>
                <option value="">Choisir une identité...</option>
                {EMPLOYEES_LIST.sort().map(e => <option key={e} value={e}>{e}</option>)}
            </select>
        </div>
        <button className="btn btn-primary" style={{width:'100%'}} disabled={!user} onClick={() => setView('dashboard')}>
            INITIALISER LA SESSION
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-container anim-enter" style={{maxWidth: 1600, margin: '0 auto', padding: 20}}>
      
      {/* TOPBAR */}
      <header className="flex-sb" style={{padding:'15px 30px', marginBottom:40, background:'rgba(20,20,35,0.6)', backdropFilter:'blur(20px)', border:'1px solid var(--glass-border)', borderRadius:18, position:'sticky', top:20, zIndex:100}}>
        <div className="flex-c" style={{gap:15, cursor:'pointer'}} onClick={() => setView('dashboard')}>
            <div style={{width:40, height:40, background:'var(--gradient-primary)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'white', boxShadow:'0 0 20px var(--primary-glow)'}}>
                <i className="ri-vip-diamond-fill"></i>
            </div>
            <div style={{lineHeight:1.2}}>
                <div style={{fontWeight:800, fontSize:'1.1rem'}}>VESPUCCI</div>
                <div style={{fontSize:'0.7rem', color:'var(--text-muted)', letterSpacing:2, textTransform:'uppercase'}}>Manager v5.2</div>
            </div>
        </div>
        <div className="flex-c" style={{gap:20}}>
            {view !== 'dashboard' && <button className="btn btn-ghost" onClick={() => setView('dashboard')}><i className="ri-layout-grid-fill"></i> Dashboard</button>}
            <div style={{textAlign:'right'}}>
                <div style={{fontWeight:700, fontSize:'0.9rem'}}>{user}</div>
                <div style={{fontSize:'0.7rem', color:'var(--primary)', fontWeight:800, letterSpacing:1}}>Employé</div>
            </div>
            <button className="btn btn-ghost btn-icon" style={{color:'var(--danger)', borderColor:'rgba(239,68,68,0.3)'}} onClick={() => setView('login')}><i className="ri-shut-down-line"></i></button>
        </div>
      </header>

      {/* VIEW: DASHBOARD */}
      {view === 'dashboard' && (
        <section className="anim-enter">
            <div className="flex-sb" style={{marginBottom:30, alignItems:'flex-end'}}>
                <div>
                    <h2 style={{fontSize:'2.2rem', fontWeight:800}}>Aperçu Global</h2>
                    <p style={{color:'var(--text-muted)'}}>Terminal de gestion connecté.</p>
                </div>
                <div style={{fontFamily:'var(--font-data)', background:'rgba(255,255,255,0.03)', padding:'8px 16px', borderRadius:8, border:'1px solid var(--glass-border)'}}>
                    <i className="ri-time-line" style={{color:'var(--primary)', marginRight:8}}></i>{clock}
                </div>
            </div>

            <div className="bento-grid">
                <div className="widget w-large" onClick={() => setView('invoice')}>
                    <i className="ri-shopping-bag-3-fill" style={{position:'absolute', right:-20, bottom:-20, fontSize:'8rem', opacity:0.05, transform:'rotate(-15deg)'}}></i>
                    <div>
                        <span className="cc-role-badge" style={{background:'rgba(255,255,255,0.1)', color:'white'}}>Module Vente</span>
                        <h3 style={{fontSize:'2.5rem', fontWeight:700, marginTop:15, fontFamily:'var(--font-data)'}}>CAISSE</h3>
                        <p style={{color:'rgba(255,255,255,0.6)', fontSize:'0.9rem'}}>Accès au catalogue produits et facturation.</p>
                    </div>
                    <button className="btn btn-primary" style={{width:'fit-content', marginTop:20}}>Ouvrir <i className="ri-arrow-right-line"></i></button>
                </div>

                <div className="widget" style={{gridColumn:'span 1'}} onClick={() => setView('direction')}>
                    <i className="ri-shield-star-fill" style={{position:'absolute', right:-20, bottom:-20, fontSize:'6rem', opacity:0.05, color:'var(--accent)'}}></i>
                    <div style={{color:'var(--accent)', fontWeight:700, fontSize:'0.8rem'}}>ADMINISTRATION</div>
                    <div style={{fontSize:'2.5rem', fontWeight:700, fontFamily:'var(--font-data)'}}>RH</div>
                    <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Dossiers & Finances</div>
                </div>

                <div className="widget" style={{gridColumn:'span 1'}} onClick={() => setView('annuaire')}>
                    <i className="ri-contacts-book-2-fill" style={{position:'absolute', right:-20, bottom:-20, fontSize:'6rem', opacity:0.05, color:'var(--success)'}}></i>
                    <div style={{color:'var(--success)', fontWeight:700, fontSize:'0.8rem'}}>CONTACTS</div>
                    <div style={{fontSize:'2.5rem', fontWeight:700, fontFamily:'var(--font-data)'}}>TEL</div>
                    <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Annuaire Entreprise</div>
                </div>
            </div>
        </section>
      )}

      {/* VIEW: INVOICE (CAISSE) */}
      {view === 'invoice' && (
        <section className="anim-enter">
            <div className="pos-layout">
                {/* Catalogue */}
                <div style={{display:'flex', flexDirection:'column', gap:20, overflow:'hidden', height:'100%'}}>
                    <div style={{position:'relative'}}>
                        <i className="ri-search-2-line" style={{position:'absolute', left:18, top:18, color:'var(--text-muted)'}}></i>
                        <input className="input" placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{paddingLeft:50}} />
                    </div>
                    
                    <div style={{overflowY:'auto', flex:1, paddingRight:8}}>
                        {PRODUCTS.map((cat, idx) => (
                            <div key={idx} className="pos-accordion-item" style={{display: searchQuery && !cat.items.some(i => i.n.toLowerCase().includes(searchQuery.toLowerCase())) ? 'none' : 'block'}}>
                                <div 
                                    className={`pos-acc-header ${openCat === idx || searchQuery ? 'active' : ''}`} 
                                    onClick={() => toggleCat(idx)}
                                >
                                    <div className="flex-c" style={{gap:15, fontWeight:600, fontSize:'0.9rem'}}>
                                        <div style={{width:32, height:32, borderRadius:8, background:`${cat.color}20`, color:cat.color, display:'flex', alignItems:'center', justifyContent:'center'}}>
                                            <i className={cat.icon}></i>
                                        </div>
                                        {cat.id}
                                    </div>
                                    <i className={`ri-arrow-down-s-line ${openCat === idx ? 'ri-arrow-up-s-line' : ''}`}></i>
                                </div>
                                
                                {(openCat === idx || searchQuery) && (
                                    <div className="product-grid-inner">
                                        {cat.items.filter(i => i.n.toLowerCase().includes(searchQuery.toLowerCase())).map((item, iIdx) => (
                                            <div key={iIdx} className="product-card" onClick={() => addToCart(item)}>
                                                <div style={{fontSize:'0.8rem', fontWeight:500, lineHeight:1.2, marginBottom:5}}>{item.n}</div>
                                                <div style={{fontFamily:'var(--font-data)', fontSize:'0.85rem', color:'var(--primary)', fontWeight:700, background:'rgba(0,0,0,0.3)', padding:'2px 8px', borderRadius:6}}>{item.p}$</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ticket */}
                <div className="ticket-panel">
                    <div style={{padding:20, borderBottom:'1px dashed var(--glass-border)', background:'rgba(255,255,255,0.02)'}}>
                        <div className="flex-sb" style={{marginBottom:15}}>
                            <span style={{fontWeight:700, fontSize:'0.9rem'}}><i className="ri-file-list-3-fill"></i> TICKET</span>
                            <span style={{background:'var(--primary)', color:'white', fontWeight:700, fontSize:'0.75rem', padding:'3px 8px', borderRadius:6}}>{cart.reduce((a,b)=>a+b.q,0)}</span>
                        </div>
                        <div className="grid-2" style={{gap:10}}>
                            <input className="input" placeholder="Client" value={invoiceDetails.client} onChange={e => setInvoiceDetails({...invoiceDetails, client: e.target.value})} style={{fontSize:'0.85rem'}} />
                            <input className="input" value={invoiceDetails.id} readOnly style={{opacity:0.6, fontFamily:'var(--font-data)', textAlign:'center'}} />
                        </div>
                    </div>

                    <div style={{flex:1, overflowY:'auto', padding:15}}>
                        {cart.length === 0 ? (
                             <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted)', opacity:0.2}}>
                                <i className="ri-shopping-cart-line" style={{fontSize:'3rem', marginBottom:10}}></i>
                                <span style={{fontSize:'0.8rem'}}>Vide</span>
                             </div>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 15px', marginBottom:8, borderRadius:10, background:'rgba(255,255,255,0.03)', borderLeft:'2px solid var(--glass-border)'}}>
                                    <div>
                                        <div style={{fontWeight:600, fontSize:'0.9rem'}}>{item.n}</div>
                                        <div style={{fontSize:'0.75rem', color:'var(--text-muted)', fontFamily:'var(--font-data)'}}>{item.p}$ x {item.q}</div>
                                    </div>
                                    <div className="flex-c" style={{gap:5}}>
                                        <button className="btn btn-ghost btn-icon" style={{width:24, height:24}} onClick={() => modQty(idx, -1)}>-</button>
                                        <button className="btn btn-ghost btn-icon" style={{width:24, height:24, color:'var(--success)'}} onClick={() => modQty(idx, 1)}>+</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{background:'rgba(15,15,22,0.95)', borderTop:'1px solid var(--glass-border)', padding:25, backdropFilter:'blur(10px)'}}>
                         <div className="flex-sb" style={{marginBottom:15}}>
                            <select className="input" style={{padding:'6px 10px', width:'auto', fontSize:'0.8rem'}} value={invoiceDetails.discount} onChange={e => setInvoiceDetails({...invoiceDetails, discount: Number(e.target.value)})}>
                                <option value="0">Remise (0%)</option>
                                {PARTNERS.map(p => <option key={p.name} value={p.val}>{p.name} (-{p.val}%)</option>)}
                            </select>
                            <span style={{color:'var(--success)', fontFamily:'var(--font-data)'}}>-{calculateTotal().discAmt.toFixed(0)} $</span>
                         </div>
                         <div className="flex-sb" style={{marginBottom:15, paddingTop:15, borderTop:'1px solid rgba(255,255,255,0.1)'}}>
                            <span style={{fontWeight:800, fontSize:'1rem'}}>TOTAL NET</span>
                            <span style={{fontWeight:800, fontSize:'1.6rem', color:'var(--primary)'}}>{calculateTotal().total.toFixed(0)} $</span>
                         </div>
                         <button className="btn btn-primary" style={{width:'100%', padding:14}} onClick={submitInvoice}>ENCAISSER</button>
                    </div>
                </div>
            </div>
        </section>
      )}

      {/* VIEW: DIRECTION */}
      {view === 'direction' && (
        <section className="anim-enter" style={{maxWidth:900, margin:'0 auto'}}>
            {!isAdminUnlocked ? (
                <div className="card" style={{maxWidth:450, margin:'80px auto', textAlign:'center', borderColor:'var(--danger)'}}>
                    <div style={{width:60, height:60, background:'rgba(239,68,68,0.1)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', color:'var(--danger)', fontSize:'1.8rem'}}>
                        <i className="ri-lock-password-fill"></i>
                    </div>
                    <h3>Accès Restreint</h3>
                    <div style={{display:'flex', gap:15, marginTop:20}}>
                        <input type="password" className="input" style={{textAlign:'center', letterSpacing:5, fontSize:'1.1rem'}} placeholder="PIN" value={adminPin} onChange={e => setAdminPin(e.target.value)} />
                        <button className="btn btn-primary" style={{background:'var(--danger)'}} onClick={() => { if(adminPin === '123459') setIsAdminUnlocked(true); else alert('Code Faux'); }}>OK</button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-sb" style={{marginBottom:30}}>
                        <h2>Panel Direction</h2>
                        <button className="btn btn-ghost" onClick={() => setIsAdminUnlocked(false)}>Verrouiller</button>
                    </div>
                    <div className="grid-3">
                         {['Recrutement', 'Convocation', 'Avertissement', 'Licenciement'].map(type => (
                             <div key={type} className="widget" style={{minHeight:120}} onClick={() => setModalHR({show:true, type: type.toLowerCase()})}>
                                 <div style={{fontWeight:700, fontSize:'1.1rem'}}>{type}</div>
                                 <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Action RH</div>
                                 <i className="ri-folder-user-line" style={{position:'absolute', right:15, bottom:15, fontSize:'2rem', opacity:0.1}}></i>
                             </div>
                         ))}
                         <div className="widget" style={{minHeight:120, borderColor:'var(--success)'}} onClick={() => setModalHR({show:true, type: 'depense'})}>
                                 <div style={{fontWeight:700, fontSize:'1.1rem', color:'var(--success)'}}>Dépense</div>
                                 <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Note de frais</div>
                         </div>
                    </div>
                </>
            )}
        </section>
      )}

      {/* VIEW: ANNUAIRE */}
      {view === 'annuaire' && (
        <section className="anim-enter">
            <div className="flex-sb" style={{marginBottom:30}}>
                <h2>Répertoire</h2>
                <button className="btn btn-success" onClick={() => setModalAddContact(true)}>Nouveau Contact</button>
            </div>
            <div className="grid-3">
                {contacts.map((c, i) => (
                    <div key={i} className="contact-card" onClick={() => setModalContact(c)}>
                        <div style={{padding:25, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center'}}>
                            <img src={c.photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} className="cc-avatar" />
                            <div className="cc-role-badge" style={{marginBottom:10}}>{c.grade}</div>
                            <div style={{fontWeight:700, fontSize:'1.1rem'}}>{c.prenom} {c.nom}</div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      )}

      {/* MODALS */}
      {modalHR.show && (
        <div className="login-gate" style={{background:'rgba(0,0,0,0.8)', zIndex:2000}}>
            <div className="card" style={{width:500}}>
                <h3>RH: {modalHR.type.toUpperCase()}</h3>
                <form onSubmit={sendHR} style={{marginTop:20}}>
                    <input className="input" placeholder="Cible / Montant" required style={{marginBottom:15}} value={hrForm.target} onChange={e => setHrForm({...hrForm, target: e.target.value})} />
                    <input type="date" className="input" required style={{marginBottom:15}} value={hrForm.date} onChange={e => setHrForm({...hrForm, date: e.target.value})} />
                    <textarea className="input" rows="4" placeholder="Raison..." required style={{marginBottom:20}} value={hrForm.reason} onChange={e => setHrForm({...hrForm, reason: e.target.value})}></textarea>
                    <div className="grid-2">
                        <button type="button" className="btn btn-ghost" onClick={() => setModalHR({show:false, type:''})}>Annuler</button>
                        <button type="submit" className="btn btn-primary">Envoyer</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {modalContact && (
        <div className="login-gate" style={{background:'rgba(0,0,0,0.9)', zIndex:2200}}>
            <div className="card" style={{width:380, textAlign:'center', paddingTop:40, borderColor:'var(--primary)'}}>
                <img src={modalContact.photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} style={{width:120, height:120, borderRadius:'50%', marginBottom:20, border:'4px solid var(--primary)', objectFit:'cover'}} />
                <h3 style={{fontSize:'1.6rem', marginBottom:5}}>{modalContact.prenom} {modalContact.nom}</h3>
                <div style={{fontSize:'1.4rem', fontWeight:700, color:'var(--text-muted)', marginBottom:30, fontFamily:'var(--font-data)'}}>{modalContact.tel}</div>
                <div className="grid-2">
                    <button className="btn btn-primary" onClick={() => alert("Simulation Appel...")}>APPELER</button>
                    <button className="btn btn-ghost" onClick={() => setModalContact(null)}>FERMER</button>
                </div>
            </div>
        </div>
      )}

      {modalAddContact && (
        <div className="login-gate" style={{background:'rgba(0,0,0,0.8)', zIndex:2100}}>
            <div className="card" style={{width:450}}>
                <h3>Ajouter Contact</h3>
                <form onSubmit={saveContact} style={{marginTop:20}}>
                    <div className="grid-2" style={{marginBottom:15}}>
                        <input className="input" placeholder="Nom" required onChange={e=>setNewContact({...newContact, nom:e.target.value})} />
                        <input className="input" placeholder="Prénom" required onChange={e=>setNewContact({...newContact, prenom:e.target.value})} />
                    </div>
                    <input className="input" placeholder="Tel" required style={{marginBottom:15}} onChange={e=>setNewContact({...newContact, tel:e.target.value})} />
                    <input className="input" placeholder="URL Photo" style={{marginBottom:20}} onChange={e=>setNewContact({...newContact, photo:e.target.value})} />
                    <div className="grid-2">
                        <button type="button" className="btn btn-ghost" onClick={() => setModalAddContact(false)}>Annuler</button>
                        <button type="submit" className="btn btn-success">Sauvegarder</button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}
