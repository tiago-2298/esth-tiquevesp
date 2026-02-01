'use client';
import { useState, useEffect } from 'react';

// Données statiques reprises de ton Code.gs
const EMPLOYEES = [
    'Alvarez Julio', 'Bloom Soren', 'Price Sun', 'Hernandez Andres', 
    'Jimenez Taziñio', 'Rosales Kali', 'Mason Bloom', 'Daikii Isuke'
].sort();

const PRODUCTS = {
    'Tatouages': [
        {n:'Petit Tatouage (tête)', p:350}, {n:'Grand Tatouage (tête)', p:600},
        {n:'Tatouage Custom', p:3000}
    ],
    'Coiffeur': [
        {n:'Coupe', p:200}, {n:'Barbe', p:100}, {n:'Palette', p:150}
    ]
};

export default function VespucciApp() {
    const [view, setView] = useState('login');
    const [user, setUser] = useState('');
    const [cart, setCart] = useState([]);
    const [sending, setSending] = useState(false);

    const total = cart.reduce((a, b) => a + (b.p * b.qty), 0);

    const addToCart = (item) => {
        setCart(prev => {
            const ex = prev.find(x => x.n === item.n);
            if (ex) return prev.map(x => x.n === item.n ? {...x, qty: x.qty + 1} : x);
            return [...prev, {...item, qty: 1}];
        });
    };

    const handleAction = async (action, payload) => {
        setSending(true);
        try {
            const res = await fetch('/api', {
                method: 'POST',
                body: JSON.stringify({ action, data: payload })
            });
            const json = await res.json();
            if (json.success) {
                alert("Opération réussie !");
                if (action === 'sendFactures') setCart([]);
            }
        } catch (e) {
            alert("Erreur de connexion");
        }
        setSending(false);
    };

    if (view === 'login') {
        return (
            <div className="login-gate">
                <style jsx>{`
                    .login-gate { height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; color: white; font-family: sans-serif; }
                    .card { background: #111; padding: 40px; border-radius: 20px; border: 1px solid #333; text-align: center; width: 350px; }
                    select, button { width: 100%; padding: 12px; margin-top: 20px; border-radius: 8px; border: 1px solid #444; background: #000; color: white; }
                    button { background: #06b6d4; border: none; font-weight: bold; cursor: pointer; }
                `}</style>
                <div className="card">
                    <h1>VESPUCCI</h1>
                    <select value={user} onChange={e => setUser(e.target.value)}>
                        <option value="">Choisir Identité</option>
                        {EMPLOYEES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <button onClick={() => user && setView('dashboard')}>INITIALISER LA SESSION</button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <style jsx>{`
                .app-container { min-height: 100vh; background: #0a0a0f; color: white; font-family: 'Inter', sans-serif; display: flex; }
                .sidebar { width: 250px; border-right: 1px solid #222; padding: 20px; }
                .main { flex: 1; padding: 40px; }
                .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                .item-card { background: #161620; padding: 20px; border-radius: 15px; border: 1px solid #333; cursor: pointer; }
                .item-card:hover { border-color: #06b6d4; }
                .cart-panel { width: 300px; background: #111; padding: 20px; border-left: 1px solid #222; }
            `}</style>

            <aside className="sidebar">
                <h2>Vespucci</h2>
                <p>{user}</p>
                <hr style={{opacity:0.1, margin:'20px 0'}}/>
                <button onClick={() => setView('dashboard')}>Dashboard</button>
                <button onClick={() => setView('depense')}>Dépenses</button>
                <button onClick={() => setView('login')} style={{color:'red'}}>Déconnexion</button>
            </aside>

            <main className="main">
                {view === 'dashboard' && (
                    <div className="grid">
                        {Object.entries(PRODUCTS).map(([cat, items]) => (
                            <div key={cat} style={{gridColumn:'span 3'}}>
                                <h3>{cat}</h3>
                                <div className="grid">
                                    {items.map(i => (
                                        <div key={i.n} className="item-card" onClick={() => addToCart(i)}>
                                            <h4>{i.n}</h4>
                                            <p style={{color:'#06b6d4'}}>{i.p}$</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {view === 'depense' && (
                    <div className="card" style={{maxWidth:500, background:'#111', padding:30, borderRadius:20}}>
                        <h3>Déclarer une dépense</h3>
                        <input id="dep-amount" type="number" placeholder="Montant" style={{width:'100%', padding:10, margin:'10px 0'}} />
                        <textarea id="dep-reason" placeholder="Motif" style={{width:'100%', padding:10, margin:'10px 0'}} />
                        <button onClick={() => handleAction('sendDepense', {
                            initiatedBy: user,
                            amount: document.getElementById('dep-amount').value,
                            reason: document.getElementById('dep-reason').value
                        })}>Envoyer Direction</button>
                    </div>
                )}
            </main>

            <aside className="cart-panel">
                <h3>Panier</h3>
                {cart.map(i => (
                    <div key={i.n} style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                        <span>{i.n} x{i.qty}</span>
                        <span>{i.p * i.qty}$</span>
                    </div>
                ))}
                <div style={{marginTop:20, borderTop:'1px solid #333', paddingTop:20}}>
                    <h4>Total: {total}$</h4>
                    <button 
                        disabled={sending || cart.length === 0}
                        onClick={() => handleAction('sendFactures', {
                            employee: user,
                            invoiceNumber: "INV-" + Date.now().toString().slice(-6),
                            items: cart,
                            total: total
                        })}
                        style={{width:'100%', padding:15, background:'#06b6d4', border:'none', color:'black', fontWeight:'bold', borderRadius:10}}
                    >
                        {sending ? "Envoi..." : "VALIDER VENTE"}
                    </button>
                </div>
            </aside>
        </div>
    );
}
