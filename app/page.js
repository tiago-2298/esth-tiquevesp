'use client';
import { useState, useEffect } from 'react';

export default function VespucciTitanium() {
    const [view, setView] = useState('login'); // 'login', 'dashboard', 'invoice', etc.
    const [user, setUser] = useState('');
    const [employees, setEmployees] = useState([]);
    const [cart, setCart] = useState([]);
    const [invoiceNum, setInvoiceNum] = useState('');
    const [discount, setDiscount] = useState(0);

    // Initialisation & Sync Employees
    useEffect(() => {
        setInvoiceNum("INV-" + Math.floor(Math.random() * 1000000));
        fetch('/api', { method: 'POST', body: JSON.stringify({ action: 'getMeta' }) })
            .then(res => res.json())
            .then(data => {
                if (data.success) setEmployees(data.employees);
            });
    }, []);

    // Configuration des produits (Identique à ton HTML)
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
        {name:'HenHouse', val:30}, {name:'Auto Exotic', val:30}, {name:'LifeInvader', val:30}, {name:'Delight', val:30}
    ];

    // Fonctions Logiques
    const addToCart = (item) => {
        const exist = cart.find(x => x.n === item.n);
        if (exist) setCart(cart.map(x => x.n === item.n ? { ...x, q: x.q + 1 } : x));
        else setCart([...cart, { ...item, q: 1 }]);
    };

    const submitInvoice = async () => {
        const subtotal = cart.reduce((a, b) => a + (b.p * b.q), 0);
        const total = subtotal * (1 - discount / 100);
        
        const res = await fetch('/api', {
            method: 'POST',
            body: JSON.stringify({
                action: 'sendFactures',
                data: {
                    employee: user,
                    invoiceNumber: invoiceNum,
                    customerName: document.getElementById('inv-client').value,
                    items: cart,
                    subtotal: subtotal,
                    total: total,
                    discountPct: discount,
                    discountAmount: subtotal - total
                }
            })
        });
        if (res.ok) {
            alert("Facture enregistrée !");
            setCart([]);
            setInvoiceNum("INV-" + Math.floor(Math.random() * 1000000));
        }
    };

    return (
        <>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
                <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
            </head>

            {/* GARDER TON CSS COMPLET ICI DANS UNE BALISE STYLE */}
            <style dangerouslySetInnerHTML={{ __html: `
                :root { --primary: #06b6d4; --primary-600: #0891b2; --primary-glow: rgba(6, 182, 212, 0.5); --bg-deep: #0f0f1a; --bg-panel: rgba(20, 25, 45, 0.7); --text: #f1f5f9; --text-muted: #94a3b8; --font-ui: 'Inter', sans-serif; --font-data: 'JetBrains Mono', monospace; }
                * { box-sizing: border-box; margin: 0; padding: 0; outline: none; transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1); }
                body { font-family: var(--font-ui); background-color: var(--bg-deep); color: var(--text); min-height: 100vh; overflow-x: hidden; }
                .login-gate { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: #000000; }
                .card { background: var(--bg-panel); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
                .input, select { width: 100%; padding: 14px 18px; border-radius: 12px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255,255,255,0.08); color: white; }
                .btn-primary { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; }
                .app-container { max-width: 1600px; margin: 0 auto; padding: 20px; }
                .hidden { display: none; }
                .pos-layout { display: grid; grid-template-columns: 2fr 1.1fr; gap: 30px; height: calc(100vh - 150px); }
                .product-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 15px; cursor: pointer; text-align: center; }
                .product-card:hover { background: rgba(6, 182, 212, 0.15); border-color: var(--primary); }
                /* ... Ajoute ici tout le reste de ton CSS Titanium ... */
            `}} />

            {/* VUE LOGIN */}
            {view === 'login' && (
                <div id="gate" className="login-gate">
                    <div className="card" style={{ width: '400px', textAlign: 'center' }}>
                        <div className="ri-vip-diamond-fill" style={{ fontSize: '3rem', color: '#06b6d4', marginBottom: '20px' }}></div>
                        <h1 style={{ marginBottom: '5px' }}>Vespucci</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '30px' }}>Titanium Access</p>
                        <select className="input" onChange={(e) => setUser(e.target.value)}>
                            <option value="">Choisir une identité...</option>
                            {employees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                        </select>
                        <button className="btn-p btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => user && setView('dashboard')}>INITIALISER SESSION</button>
                    </div>
                </div>
            )}

            {/* VUE PRINCIPALE */}
            {view !== 'login' && (
                <div className="app-container">
                    <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '18px', marginBottom: '40px' }}>
                        <div style={{ fontWeight: 800 }}>VESPUCCI <span style={{ color: 'var(--primary)' }}>TITANIUM</span></div>
                        <div>{user}</div>
                    </header>

                    {/* VUE DASHBOARD (BENTO) */}
                    {view === 'dashboard' && (
                        <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                            <div className="card" onClick={() => setView('invoice')} style={{ cursor: 'pointer' }}>
                                <i className="ri-shopping-bag-3-fill" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
                                <h3 style={{ marginTop: '10px' }}>CAISSE</h3>
                            </div>
                            <div className="card" onClick={() => setView('depense')} style={{ cursor: 'pointer' }}>
                                <i className="ri-money-dollar-circle-fill" style={{ fontSize: '2rem', color: '#1abc9c' }}></i>
                                <h3 style={{ marginTop: '10px' }}>DÉPENSES</h3>
                            </div>
                        </div>
                    )}

                    {/* VUE CAISSE (POS) */}
                    {view === 'invoice' && (
                        <div className="pos-layout">
                            <div className="catalog">
                                {PRODUCTS.map(cat => (
                                    <div key={cat.id} style={{ marginBottom: '20px' }}>
                                        <h4 style={{ color: cat.color, marginBottom: '10px' }}>{cat.id}</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                            {cat.items.map(i => (
                                                <div key={i.n} className="product-card" onClick={() => addToCart(i)}>
                                                    <div>{i.n}</div>
                                                    <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{i.p}$</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <button className="btn-primary" onClick={() => setView('dashboard')}>Retour</button>
                            </div>
                            
                            <div className="ticket card">
                                <h3>TICKET</h3>
                                <input id="inv-client" className="input" placeholder="Nom Client" style={{ margin: '15px 0' }} />
                                <div style={{ minHeight: '200px' }}>
                                    {cart.map(item => (
                                        <div key={item.n} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #333' }}>
                                            <span>{item.n} x{item.q}</span>
                                            <span>{item.p * item.q}$</span>
                                        </div>
                                    ))}
                                </div>
                                <select className="input" onChange={(e) => setDiscount(e.target.value)}>
                                    <option value="0">Pas de remise</option>
                                    {PARTNERS.map(p => <option key={p.name} value={p.val}>{p.name} (-{p.val}%)</option>)}
                                </select>
                                <div style={{ fontSize: '1.5rem', textAlign: 'right', marginTop: '20px', color: 'var(--primary)' }}>
                                    Total: {cart.reduce((a, b) => a + (b.p * b.q), 0) * (1 - discount / 100)}$
                                </div>
                                <button className="btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={submitInvoice}>VALIDER FACTURE</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
