'use client';
import { useState, useEffect } from 'react';

export default function VespucciApp() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState('');
  const [data, setData] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceNum, setInvoiceNum] = useState('');

  // Chargement des données au démarrage
  useEffect(() => {
    fetch('/api', { method: 'POST', body: JSON.stringify({ action: 'getMeta' }) })
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); });
    setInvoiceNum("INV-" + Math.floor(Math.random() * 1000000));
  }, []);

  const addToCart = (p) => {
    const existing = cart.find(item => item.desc === p);
    if (existing) {
      setCart(cart.map(item => item.desc === p ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { desc: p, qty: 1, price: data.prices[p] }]);
    }
  };

  const sendInvoice = async () => {
    const res = await fetch('/api', {
      method: 'POST',
      body: JSON.stringify({
        action: 'sendFactures',
        data: {
          employee: user,
          invoiceNumber: invoiceNum,
          items: cart,
          customerName: document.getElementById('custName').value
        }
      })
    });
    if (res.ok) {
      alert("Facture envoyée !");
      setCart([]);
      setInvoiceNum("INV-" + Math.floor(Math.random() * 1000000));
    }
  };

  if (loading) return <div style={{color:'white', textAlign:'center', marginTop:'20%'}}>Chargement du système Vespucci...</div>;

  return (
    <main style={{ backgroundColor: '#0f0f1a', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif', padding: '20px' }}>
      {view === 'login' ? (
        <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', background: '#14192d', padding: '40px', borderRadius: '20px', border: '1px solid #06b6d4' }}>
          <h1 style={{ color: '#06b6d4' }}>VESPUCCI</h1>
          <select 
            style={{ width: '100%', padding: '10px', margin: '20px 0', background: '#000', color: '#fff' }}
            onChange={(e) => setUser(e.target.value)}
          >
            <option>Choisir Employé</option>
            {data?.employees.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button 
            style={{ width: '100%', padding: '10px', background: '#06b6d4', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => user && setView('dashboard')}
          >
            INITIALISER SESSION
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
          {/* CATALOGUE */}
          <section>
            <h2>Catalogue Services</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
              {Object.keys(data.prices).map(p => (
                <div 
                  key={p} 
                  onClick={() => addToCart(p)}
                  style={{ background: '#14192d', padding: '15px', borderRadius: '10px', cursor: 'pointer', border: '1px solid #ffffff10', textAlign: 'center' }}
                >
                  <div style={{ fontSize: '0.8rem' }}>{p}</div>
                  <div style={{ color: '#06b6d4', fontWeight: 'bold' }}>{data.prices[p]}$</div>
                </div>
              ))}
            </div>
          </section>

          {/* PANIER */}
          <aside style={{ background: '#0b0c12', padding: '20px', borderRadius: '20px', border: '1px solid #ffffff10' }}>
            <h3>Ticket Client</h3>
            <input id="custName" placeholder="Nom du client" style={{ width: '100%', marginBottom: '10px', padding: '8px', background: '#000', color: '#fff', border: '1px solid #333' }} />
            <div style={{ minHeight: '300px' }}>
              {cart.map(item => (
                <div key={item.desc} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                  <span>{item.desc} x{item.qty}</span>
                  <span>{item.price * item.qty}$</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '2px dashed #333', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', color: '#06b6d4', fontWeight: 'bold' }}>
                <span>TOTAL</span>
                <span>{cart.reduce((acc, i) => acc + (i.price * i.qty), 0)}$</span>
              </div>
              <button 
                onClick={sendInvoice}
                style={{ width: '100%', marginTop: '20px', padding: '15px', background: '#06b6d4', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: cart.length ? 'pointer' : 'not-allowed' }}
                disabled={!cart.length}
              >
                ENCAISSER
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
