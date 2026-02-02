'use client';
import { useState, useEffect } from 'react';

// --- DONNÉES & CONFIG ---
const WEBHOOKS = {
  // Remplace par tes vrais liens Discord si tu n'utilises pas le route.js
  factures: "TON_WEBHOOK_FACTURES", 
  direction: "TON_WEBHOOK_DIRECTION", 
  recrutement: "TON_WEBHOOK_RECRUTEMENT",
  depense: "https://discord.com/api/webhooks/1458467290151653563/SGEnsRQJ2KDDnhUoCRmGp0IRM96o65gP-HVhWrxTzrDef02aS3SwtQKM2WG6iVKE43fs"
};

const EMPLOYEES = [
  "Alvarez Julio", "Bloom Soren", "Price Sun", "Hernandez Andres", "Mason Bloom", 
  "Jimenez Taziñio", "Rosales Kali", "Daikii Isuke", "Makara Chariya Chan", 
  "Price Moon", "Jayden Lockett", "Jayden Coleman", "Moon Veda", "Inaya Kinslow", 
  "Elijah Gonzalez", "Kilyan Smith", "Obito Valeria", "Lily Summer"
];

const PRODUCTS = [
  { id: 'Tête', icon: 'ri-user-3-fill', color: '#06b6d4', items: [{n:'Petit Tatouage', p:350}, {n:'Moyen Tatouage', p:450}, {n:'Grand Tatouage', p:600}, {n:'Tatouage Visage', p:700}] },
  { id: 'Torse/Dos', icon: 'ri-body-scan-fill', color: '#f59e0b', items: [{n:'Petit Tatouage', p:600}, {n:'Moyen Tatouage', p:800}, {n:'Grand Tatouage', p:1100}, {n:'Dos Complet', p:3000}] },
  { id: 'Bras', icon: 'ri-markup-fill', color: '#8b5cf6', items: [{n:'Petit Tatouage', p:450}, {n:'Moyen Tatouage', p:600}, {n:'Grand Tatouage', p:800}, {n:'Bras Complet', p:2500}] },
  { id: 'Jambes', icon: 'ri-walk-fill', color: '#10b981', items: [{n:'Petit Tatouage', p:450}, {n:'Moyen Tatouage', p:600}, {n:'Grand Tatouage', p:800}, {n:'Jambe Complète', p:2500}] },
  { id: 'Custom', icon: 'ri-edit-2-fill', color: '#94a3b8', items: [{n:'Retouche', p:100}, {n:'Custom Small', p:500}, {n:'Custom Large', p:1500}, {n:'Projet Spécial', p:5000}] },
  { id: 'Laser', icon: 'ri-flashlight-fill', color: '#ef4444', items: [{n:'Petit Laser', p:250}, {n:'Moyen Laser', p:500}, {n:'Grand Laser', p:750}, {n:'Séance Complète', p:1000}] },
  { id: 'Coiffure', icon: 'ri-scissors-fill', color: '#ec4899', items: [{n:'Coupe', p:200}, {n:'Couleur', p:100}, {n:'Barbe', p:100}, {n:'Dégradé', p:100}] }
];

const PARTNERS = [
  {name:'HenHouse', val:30}, {name:'Auto Exotic', val:30}, {name:'LifeInvader', val:30},
  {name:'Delight', val:30}, {name:'LTD Sandy', val:30}, {name:'Biogood', val:30}
];

export default function Home() {
  const [view, setView] = useState('login'); 
  const [user, setUser] = useState('');
  const [clock, setClock] = useState('00:00');
  
  // CAISSE
  const [cart, setCart] = useState([]);
  const [invoice, setInvoice] = useState({ client: '', discount: 0, id: '' });
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState(null);

  // ADMIN
  const [adminPin, setAdminPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [hrModal, setHrModal] = useState(null); // 'recrutement', etc.
  const [hrData, setHrData] = useState({ target: '', reason: '', date: '' });

  // ANNUAIRE
  const [contacts, setContacts] = useState([{ nom: "Bloom", prenom: "Soren", grade: "Co-Patron", tel: "575-5535" }]);
  const [contactModal, setContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ nom:'', prenom:'', tel:'', grade:'Employé' });

  useEffect(() => {
    setInterval(() => setClock(new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})), 1000);
    setInvoice(p => ({...p, id: 'INV-'+Math.floor(Math.random()*1000000)}));
    
    // Charger contacts sauvegardés
    const saved = localStorage.getItem('vespucci_contacts');
    if(saved) setContacts(JSON.parse(saved));
  }, []);

  // --- FONCTIONS ---
  const playSound = (type) => {
    // Petit son d'interface (Optionnel)
    try {
        const audio = new Audio(type === 'click' ? 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' : '');
        audio.volume = 0.2; audio.play().catch(e=>{});
    } catch(e){}
  };

  const addToCart = (item) => {
    playSound('click');
    setCart(prev => {
        const exist = prev.find(i => i.n === item.n);
        if(exist) return prev.map(i => i.n === item.n ? {...i, q: i.q+1} : i);
        return [...prev, {...item, q:1}];
    });
  };

  const calcTotal = () => {
    const sub = cart.reduce((a,b) => a + (b.p * b.q), 0);
    const discAmt = sub * (invoice.discount / 100);
    return { sub, discAmt, total: sub - discAmt };
  };

  // --- API HANDLERS (Via route.js ou direct) ---
  const sendToDiscord = async (type, payload) => {
    // On passe par notre route API locale pour cacher les webhooks (Sécurité)
    // Si tu veux utiliser les liens directs, remplace '/api/proxy' par WEBHOOKS[type]
    
    const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ webhookUrl: WEBHOOKS[type] || WEBHOOKS.direction, embed: payload })
    });
    
    if(res.ok) alert("✅ Données transmises au serveur sécurisé.");
    else alert("❌ Erreur de transmission.");
  };

  const submitInvoice = () => {
    if(cart.length === 0) return;
    const { total } = calcTotal();
    const embed = {
        title: "💎 Facture Validée",
        color: 3447003,
        fields: [
            {name: "Vendeur", value: user, inline: true},
            {name: "Client", value: invoice.client || "Inconnu", inline: true},
            {name: "Montant", value: `**${total.toFixed(0)} $**`, inline: true},
            {name: "Articles", value: cart.map(i => `${i.n} x${i.q}`).join('\n')}
        ],
        footer: { text: "Vespucci Titanium • System" }
    };
    sendToDiscord('factures', embed);
    setCart([]);
    setInvoice(p => ({...p, client:'', id: 'INV-'+Math.floor(Math.random()*1000000)}));
  };

  const submitHR = (e) => {
    e.preventDefault();
    const embed = {
        title: `Dossier RH: ${hrModal.toUpperCase()}`,
        color: hrModal === 'licenciement' ? 15548997 : 3447003,
        fields: [
            {name: "Auteur", value: user, inline: true},
            {name: "Cible", value: hrData.target, inline: true},
            {name: "Raison", value: hrData.reason},
            {name: "Date", value: hrData.date}
        ]
    };
    sendToDiscord(hrModal, embed);
    setHrModal(null);
  };

  const saveContact = () => {
      const list = [...contacts, newContact];
      setContacts(list);
      localStorage.setItem('vespucci_contacts', JSON.stringify(list));
      setContactModal(false);
  };

  // --- VUE LOGIN ---
  if(view === 'login') return (
    <div className="login-gate">
        <div className="card" style={{width: 400, textAlign:'center'}}>
            <i className="ri-vip-diamond-fill" style={{fontSize:'3rem', color:'var(--primary)', filter:'drop-shadow(0 0 15px var(--primary))'}}></i>
            <h1 style={{fontSize:'2rem', fontWeight:800, marginTop:10}}>VESPUCCI</h1>
            <p style={{color:'var(--text-muted)', letterSpacing:3, fontSize:'0.8rem', marginBottom:30}}>TITANIUM EDITION</p>
            
            <div style={{textAlign:'left', marginBottom:20}}>
                <label style={{fontSize:'0.75rem', fontWeight:700, color:'var(--primary)', textTransform:'uppercase'}}>Identifiant</label>
                <select className="input" onChange={e => setUser(e.target.value)}>
                    <option value="">Choisir identité...</option>
                    {EMPLOYEES.sort().map(e => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>
            <button className="btn btn-primary" style={{width:'100%'}} disabled={!user} onClick={() => setView('dashboard')}>CONNEXION CRYPTÉE</button>
        </div>
    </div>
  );

  // --- VUE PRINCIPALE ---
  return (
    <div style={{maxWidth:1600, margin:'0 auto', padding:20}}>
        {/* TOP BAR */}
        <header className="flex-sb card" style={{padding:'15px 30px', marginBottom:30, position:'sticky', top:20, zIndex:50}}>
            <div className="flex-c" style={{gap:15, cursor:'pointer'}} onClick={() => setView('dashboard')}>
                <div style={{width:40, height:40, background:'linear-gradient(135deg, var(--primary), #3b82f6)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'white', boxShadow:'0 0 15px var(--primary-dim)'}}>
                    <i className="ri-vip-diamond-fill"></i>
                </div>
                <div>
                    <div style={{fontWeight:800, fontSize:'1.1rem'}}>VESPUCCI</div>
                    <div style={{fontSize:'0.7rem', color:'var(--text-muted)', letterSpacing:1}}>MANAGER V5.0</div>
                </div>
            </div>
            
            <div className="flex-c" style={{gap:20}}>
                {view !== 'dashboard' && <button className="btn btn-ghost" onClick={() => setView('dashboard')}>DASHBOARD</button>}
                <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:700}}>{user}</div>
                    <div style={{fontSize:'0.7rem', color:'var(--primary)', fontWeight:700}}>EN LIGNE</div>
                </div>
                <button className="btn btn-ghost" onClick={() => setView('login')}><i className="ri-shut-down-line" style={{color:'var(--danger)'}}></i></button>
            </div>
        </header>

        {/* DASHBOARD */}
        {view === 'dashboard' && (
            <div className="anim-enter">
                <div className="flex-sb" style={{marginBottom:30}}>
                    <h2 style={{fontSize:'2rem', fontWeight:800}}>Vue d'ensemble</h2>
                    <div className="btn-ghost" style={{fontFamily:'var(--font-data)', padding:'8px 15px', borderRadius:8}}>{clock}</div>
                </div>

                <div className="bento-grid">
                    <div className="widget w-large" onClick={() => setView('caisse')}>
                        <i className="ri-shopping-cart-2-fill" style={{position:'absolute', right:-20, bottom:-20, fontSize:'8rem', opacity:0.05, transform:'rotate(-10deg)'}}></i>
                        <div>
                            <span className="cc-role-badge" style={{background:'rgba(255,255,255,0.1)', padding:'4px 8px', borderRadius:5, fontSize:'0.7rem'}}>MODULE VENTE</span>
                            <h3 className="w-stat" style={{marginTop:15}}>CAISSE</h3>
                            <p style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>Catalogue produits & Facturation</p>
                        </div>
                        <button className="btn btn-primary" style={{width:'fit-content', marginTop:20}}>OUVRIR <i className="ri-arrow-right-line"></i></button>
                    </div>

                    <div className="widget" onClick={() => setView('admin')}>
                        <i className="ri-shield-star-fill" style={{position:'absolute', right:-20, bottom:-20, fontSize:'6rem', opacity:0.05, color:'var(--accent)'}}></i>
                        <div style={{color:'var(--accent)', fontWeight:700, fontSize:'0.8rem'}}>ADMIN</div>
                        <div className="w-stat">RH</div>
                        <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Gestion Personnel</div>
                    </div>

                    <div className="widget" onClick={() => setView('annuaire')}>
                        <i className="ri-contacts-book-2-fill" style={{position:'absolute', right:-20, bottom:-20, fontSize:'6rem', opacity:0.05, color:'var(--success)'}}></i>
                        <div style={{color:'var(--success)', fontWeight:700, fontSize:'0.8rem'}}>BOTIN</div>
                        <div className="w-stat">TEL</div>
                        <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Annuaire Entreprise</div>
                    </div>
                </div>
            </div>
        )}

        {/* CAISSE */}
        {view === 'caisse' && (
            <div className="pos-layout anim-enter">
                <div style={{display:'flex', flexDirection:'column', gap:20, height:'100%'}}>
                    <div style={{position:'relative'}}>
                        <i className="ri-search-line" style={{position:'absolute', left:15, top:15, color:'var(--text-muted)'}}></i>
                        <input className="input" placeholder="Rechercher un service..." style={{paddingLeft:45}} value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    
                    <div style={{overflowY:'auto', paddingRight:10}}>
                        {PRODUCTS.map((cat, idx) => (
                            <div key={idx} style={{marginBottom:15}}>
                                <div onClick={() => setActiveCat(activeCat === idx ? null : idx)} 
                                     style={{display:'flex', justifyContent:'space-between', padding:15, background:'rgba(255,255,255,0.03)', borderRadius:12, cursor:'pointer', border:'1px solid var(--glass-border)', marginBottom:5}}>
                                    <div className="flex-c" style={{gap:10, fontWeight:600}}>
                                        <i className={cat.icon} style={{color:cat.color}}></i> {cat.id}
                                    </div>
                                    <i className={`ri-arrow-${activeCat === idx ? 'up' : 'down'}-s-line`}></i>
                                </div>
                                
                                {(activeCat === idx || search) && (
                                    <div className="grid-3" style={{gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:10, padding:10, background:'rgba(0,0,0,0.2)', borderRadius:12}}>
                                        {cat.items.filter(i => i.n.toLowerCase().includes(search.toLowerCase())).map((item, i) => (
                                            <div key={i} className="product-card" onClick={() => addToCart(item)}>
                                                <div style={{fontSize:'0.85rem', fontWeight:600, marginBottom:5}}>{item.n}</div>
                                                <div style={{fontFamily:'var(--font-data)', color:'var(--primary)', fontWeight:700}}>{item.p}$</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card" style={{display:'flex', flexDirection:'column', height:'100%', padding:0, overflow:'hidden'}}>
                    <div style={{padding:20, borderBottom:'1px solid var(--glass-border)', background:'rgba(255,255,255,0.02)'}}>
                        <div className="flex-sb" style={{marginBottom:15}}>
                            <span style={{fontWeight:700}}><i className="ri-file-list-3-line"></i> TICKET</span>
                            <span style={{background:'var(--primary)', padding:'2px 8px', borderRadius:5, fontSize:'0.75rem', fontWeight:700}}>{cart.length}</span>
                        </div>
                        <div className="grid-2" style={{gap:10}}>
                            <input className="input" placeholder="Client" value={invoice.client} onChange={e => setInvoice({...invoice, client:e.target.value})} />
                            <input className="input" value={invoice.id} readOnly style={{opacity:0.5, textAlign:'center', fontFamily:'var(--font-data)'}} />
                        </div>
                    </div>

                    <div style={{flex:1, overflowY:'auto', padding:20}}>
                        {cart.length === 0 ? <div style={{textAlign:'center', color:'var(--text-muted)', marginTop:50}}>Panier vide...</div> : 
                         cart.map((item, idx) => (
                            <div key={idx} className="flex-sb" style={{marginBottom:10, padding:10, background:'rgba(255,255,255,0.03)', borderRadius:8}}>
                                <div>
                                    <div style={{fontSize:'0.9rem', fontWeight:600}}>{item.n}</div>
                                    <div style={{fontSize:'0.75rem', color:'var(--text-muted)', fontFamily:'var(--font-data)'}}>{item.p}$ x {item.q}</div>
                                </div>
                                <i className="ri-delete-bin-line" style={{color:'var(--danger)', cursor:'pointer'}} onClick={() => {
                                    const n = [...cart]; n.splice(idx,1); setCart(n);
                                }}></i>
                            </div>
                        ))}
                    </div>

                    <div style={{padding:25, background:'rgba(0,0,0,0.5)', borderTop:'1px solid var(--glass-border)'}}>
                        <div className="flex-sb" style={{marginBottom:15}}>
                            <select className="input" style={{width:'auto', padding:8}} onChange={e => setInvoice({...invoice, discount: Number(e.target.value)})}>
                                <option value="0">Remise 0%</option>
                                {PARTNERS.map(p => <option key={p.name} value={p.val}>{p.name} -{p.val}%</option>)}
                            </select>
                            <div style={{textAlign:'right'}}>
                                <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>TOTAL NET</div>
                                <div style={{fontSize:'1.5rem', fontWeight:800, color:'var(--primary)', fontFamily:'var(--font-data)'}}>{calcTotal().total.toFixed(0)} $</div>
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{width:'100%'}} onClick={submitInvoice}>ENCAISSER</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL ADMIN RH */}
        {hrModal && (
            <div className="login-gate" style={{background:'rgba(0,0,0,0.8)', zIndex:2000}}>
                <div className="card" style={{width:500}}>
                    <h3>RH: {hrModal.toUpperCase()}</h3>
                    <form onSubmit={submitHR} style={{marginTop:20}}>
                        <input className="input" placeholder="Cible / Montant" required style={{marginBottom:15}} onChange={e => setHrData({...hrData, target:e.target.value})} />
                        <input type="date" className="input" required style={{marginBottom:15}} onChange={e => setHrData({...hrData, date:e.target.value})} />
                        <textarea className="input" rows="4" placeholder="Motif..." required style={{marginBottom:20}} onChange={e => setHrData({...hrData, reason:e.target.value})}></textarea>
                        <div className="grid-2">
                            <button type="button" className="btn btn-ghost" onClick={() => setHrModal(null)}>ANNULER</button>
                            <button type="submit" className="btn btn-primary">ENVOYER</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* VUE ADMIN */}
        {view === 'admin' && (
            <div className="anim-enter" style={{maxWidth:900, margin:'0 auto'}}>
                {!unlocked ? (
                    <div className="card" style={{textAlign:'center', maxWidth:400, margin:'50px auto'}}>
                        <i className="ri-lock-password-fill" style={{fontSize:'3rem', color:'var(--danger)'}}></i>
                        <h3>ACCÈS RESTREINT</h3>
                        <div style={{display:'flex', gap:10, marginTop:20}}>
                            <input type="password" className="input" placeholder="CODE PIN" style={{textAlign:'center', letterSpacing:5}} value={adminPin} onChange={e => setAdminPin(e.target.value)} />
                            <button className="btn btn-primary" onClick={() => {if(adminPin==='123459') setUnlocked(true)}}>OK</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex-sb" style={{marginBottom:30}}>
                            <h2>Panel Direction</h2>
                            <button className="btn btn-ghost" onClick={() => setUnlocked(false)}>VERROUILLER</button>
                        </div>
                        <div className="grid-3">
                            {['recrutement', 'convocation', 'avertissement', 'licenciement'].map(t => (
                                <div key={t} className="widget" style={{minHeight:120}} onClick={() => setHrModal(t)}>
                                    <div style={{fontWeight:700, textTransform:'uppercase'}}>{t}</div>
                                    <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Action RH</div>
                                </div>
                            ))}
                            <div className="widget" style={{minHeight:120, borderColor:'var(--success)'}} onClick={() => setHrModal('depense')}>
                                <div style={{fontWeight:700, color:'var(--success)'}}>DÉPENSE</div>
                                <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Trésorerie</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* VUE ANNUAIRE */}
        {view === 'annuaire' && (
            <div className="anim-enter">
                <div className="flex-sb" style={{marginBottom:30}}>
                    <h2>Répertoire</h2>
                    <button className="btn btn-primary" onClick={() => setContactModal(true)}>+ NOUVEAU</button>
                </div>
                <div className="grid-3">
                    {contacts.map((c,i) => (
                        <div key={i} className="card" style={{textAlign:'center', padding:20}}>
                            <div style={{width:80, height:80, background:'#222', borderRadius:'50%', margin:'0 auto 15px', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--primary)'}}>
                                <span style={{fontSize:'1.5rem', fontWeight:700}}>{c.nom[0]}</span>
                            </div>
                            <div style={{fontWeight:700}}>{c.prenom} {c.nom}</div>
                            <div style={{fontSize:'0.8rem', color:'var(--primary)', marginBottom:5}}>{c.grade}</div>
                            <div style={{fontFamily:'var(--font-data)', fontSize:'1.1rem'}}>{c.tel}</div>
                        </div>
                    ))}
                </div>
                
                {contactModal && (
                    <div className="login-gate" style={{background:'rgba(0,0,0,0.8)', zIndex:2000}}>
                        <div className="card" style={{width:400}}>
                            <h3>Nouveau Contact</h3>
                            <div className="grid-2" style={{margin:'20px 0'}}>
                                <input className="input" placeholder="Nom" onChange={e => setNewContact({...newContact, nom:e.target.value})} />
                                <input className="input" placeholder="Prénom" onChange={e => setNewContact({...newContact, prenom:e.target.value})} />
                            </div>
                            <input className="input" placeholder="Téléphone" style={{marginBottom:20}} onChange={e => setNewContact({...newContact, tel:e.target.value})} />
                            <div className="grid-2">
                                <button className="btn btn-ghost" onClick={() => setContactModal(false)}>ANNULER</button>
                                <button className="btn btn-primary" onClick={saveContact}>SAUVEGARDER</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}
