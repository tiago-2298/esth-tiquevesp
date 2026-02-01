'use client';
import { useState, useEffect } from 'react';

export default function VespucciTitanium() {
    const [view, setView] = useState('login');
    const [user, setUser] = useState('');
    const [employees, setEmployees] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentSection, setCurrentSection] = useState('dashboard');

    // --- CONFIGURATION LOCALE ---
    const PRODUCTS = [
        { id: 'Tête', icon: 'ri-user-3-fill', color: '#06b6d4', items: [{n:'Petit Tatouage (tête)', p:350}, {n:'Moyen Tatouage (tête)', p:450}, {n:'Grand Tatouage (tête)', p:600}] },
        { id: 'Bras', icon: 'ri-markup-fill', color: '#8b5cf6', items: [{n:'Petit Tatouage (Bras)', p:450}, {n:'Moyen Tatouage (Bras)', p:600}, {n:'Grand Tatouage (Bras)', p:800}] },
        { id: 'Laser', icon: 'ri-flashlight-fill', color: '#ef4444', items: [{n:'Petit Laser', p:250}, {n:'Moyen Laser', p:500}, {n:'Grand Laser', p:750}] },
        { id: 'Coiffeur', icon: 'ri-scissors-fill', color: '#ec4899', items: [{n:'Coupe', p:200}, {n:'Couleur', p:100}, {n:'Barbe', p:100}] }
    ];

    useEffect(() => {
        fetch('/api', { method: 'POST', body: JSON.stringify({ action: 'getMeta' }) })
            .then(res => res.json())
            .then(data => {
                if(data.success) setEmployees(data.employees);
                setLoading(false);
            });
    }, []);

    const addToCart = (item) => {
        const ex = cart.find(x => x.n === item.n);
        if(ex) setCart(cart.map(x => x.n === item.n ? {...x, q: x.q + 1} : x));
        else setCart([...cart, {...item, q: 1}]);
    };

    const submitInvoice = async () => {
        const subtotal = cart.reduce((a, b) => a + (b.p * b.q), 0);
        const res = await fetch('/api', {
            method: 'POST',
            body: JSON.stringify({
                action: 'sendFactures',
                data: {
                    employee: user,
                    invoiceNumber: "INV-" + Date.now().toString().slice(-6),
                    items: cart,
                    subtotal: subtotal,
                    total: subtotal,
                    customerName: document.getElementById('inv-client')?.value || "Inconnu"
                }
            })
        });
        if(res.ok) {
            alert("Facture envoyée avec succès !");
            setCart([]);
        }
    };

    if (loading) return <div className="login-gate">Chargement Titanium...</div>;

    return (
        <>
            <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
            
            {/* INJECTION DU CSS TITANIUM */}
            <style dangerouslySetInnerHTML={{ __html: `
                :root { --primary: #06b6d4; --bg-deep: #0f0f1a; --text: #f1f5f9; --glass-border: rgba(255, 255, 255, 0.08); }
                body { background-color: var(--bg-deep); color: var(--text); font-family: 'Inter', sans-serif; margin:0; }
                .login-gate { position: fixed; inset: 0; background: #000; display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .card { background: rgba(20, 25, 45, 0.7); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: 20px; padding: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
                .btn-primary { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: 700; width:100%; }
                .input { width: 100%; padding: 14px; background: rgba(0,0,0,0.4); border: 1px solid var(--glass-border); color: white; border-radius: 12px; margin: 10px 0; }
                .app-container { max-width: 1400px; margin: 0 auto; padding: 20px; }
                .topbar { display: flex; justify-content: space-between; padding: 20px; background: rgba(20,20,35,0.6); border-radius: 18px; margin-bottom: 30px; }
                .bento-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
                .widget { background: rgba(20,25,45,0.7); border-radius: 20px; padding: 25px; cursor: pointer; border: 1px solid var(--glass-border); transition: 0.3s; }
                .widget:hover { border-color: var(--primary); transform: translateY(-5px); }
                .pos-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
                .product-card { background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 15px; border-radius: 12px; cursor: pointer; text-align: center; }
            `}} />

            {view === 'login' ? (
                <div className="login-gate">
                    <div className="card" style={{ width: 400, textAlign: 'center' }}>
                        <i className="ri-vip-diamond-fill" style={{ fontSize: '3rem', color: '#06b6d4' }}></i>
                        <h1>VESPUCCI</h1>
                        <p style={{ opacity: 0.6 }}>TITANIUM ACCESS</p>
                        <select className="input" onChange={(e) => setUser(e.target.value)}>
                            <option value="">Choisir Identité...</option>
                            {employees.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <button className="btn-primary" onClick={() => user && setView('app')}>INITIALISER SESSION</button>
                    </div>
                </div>
            ) : (
                <div className="app-container">
                    <header className="topbar">
                        <div style={{ fontWeight: 800, fontSize: '1.2rem' }} onClick={() => setCurrentSection('dashboard')}>VESPUCCI MANAGER</div>
                        <div>{user} <button onClick={() => setView('login')} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}><i className="ri-shut-down-line"></i></button></div>
                    </header>

                    {currentSection === 'dashboard' ? (
                        <div className="bento-grid">
                            <div className="widget" style={{ gridColumn: 'span 2' }} onClick={() => setCurrentSection('invoice')}>
                                <i className="ri-shopping-bag-3-fill" style={{ fontSize: '2rem' }}></i>
                                <h3>CAISSE</h3>
                                <p>Accès facturation</p>
                            </div>
                            <div className="widget" onClick={() => setCurrentSection('annuaire')}>
                                <i className="ri-contacts-book-2-fill"></i>
                                <h3>ANNUAIRE</h3>
                            </div>
                        </div>
                    ) : (
                        <div className="pos-layout">
                            <div>
                                <h2>Services</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
                                    {PRODUCTS.flatMap(cat => cat.items).map(item => (
                                        <div key={item.n} className="product-card" onClick={() => addToCart(item)}>
                                            <div>{item.n}</div>
                                            <div style={{color:'#06b6d4', fontWeight:700}}>{item.p}$</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="card">
                                <h3>Ticket</h3>
                                <input id="inv-client" className="input" placeholder="Nom Client" />
                                <div style={{ minHeight: 200 }}>
                                    {cart.map(i => (
                                        <div key={i.n} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                                            <span>{i.n} x{i.q}</span>
                                            <span>{i.p * i.q}$</span>
                                        </div>
                                    ))}
                                </div>
                                <hr style={{ opacity: 0.1 }} />
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'right', color: '#06b6d4' }}>
                                    {cart.reduce((a, b) => a + (b.p * b.q), 0)}$
                                </div>
                                <button className="btn-primary" onClick={submitInvoice} style={{ marginTop: 20 }}>VALIDER</button>
                                <button onClick={() => setCurrentSection('dashboard')} style={{ width: '100%', marginTop: 10, background: 'none', color: 'white', border: 'none', cursor: 'pointer' }}>Retour</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
