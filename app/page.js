'use client';

import React, { useEffect } from 'react';

export default function VespucciTitanium() {
  useEffect(() => {
    // On s'assure que le script de l'application s'exécute après le montage du composant
    if (typeof window !== 'undefined' && window.app) {
      window.app.init();
    }
  }, []);

  return (
    <>
      {/* DÉBUT DU HTML ORIGINAL (Adapté pour Next.js)
      */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* ====== 1. ESTHÉTIQUE TITANIUM V3 (PURE VISUAL) ====== */
        :root {
          --primary: #06b6d4;
          --primary-600: #0891b2;
          --primary-glow: rgba(6, 182, 212, 0.5);
          --primary-dim: rgba(6, 182, 212, 0.08);
          --accent: #8b5cf6;
          --accent-glow: rgba(139, 92, 246, 0.5);
          --success: #10b981;
          --warning: #f59e0b;
          --danger: #ef4444;
          --bg-deep: #0f0f1a; 
          --bg-panel: rgba(20, 25, 45, 0.7); 
          --glass-border: rgba(255, 255, 255, 0.08);
          --glass-highlight: rgba(255, 255, 255, 0.15);
          --text: #f1f5f9;
          --text-muted: #94a3b8;
          --gradient-primary: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
          --font-ui: 'Inter', sans-serif;
          --font-data: 'JetBrains Mono', monospace;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; outline: none; -webkit-tap-highlight-color: transparent; transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1); }

        body {
          font-family: var(--font-ui);
          background-color: var(--bg-deep);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
          line-height: 1.6;
        }

        body::before {
          content: ""; 
          position: fixed; 
          inset: 0; 
          z-index: -2;
          background: 
            radial-gradient(circle at 50% 10%, #1e1e3f 0%, #05050a 100%),
            linear-gradient(45deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 100% 100%, 40px 40px, 40px 40px;
          background-attachment: fixed;
        }

        .hidden { display: none !important; }
        .flex-c { display: flex; align-items: center; }
        .flex-sb { display: flex; justify-content: space-between; align-items: center; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }

        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer;
          border: 1px solid transparent; letter-spacing: 0.5px; text-transform: uppercase; font-size: 0.8rem;
        }

        .btn-primary { 
          background: var(--gradient-primary); color: white; border: none; 
          box-shadow: 0 4px 20px -5px var(--primary-glow);
        }

        .btn-ghost { 
          background: rgba(255,255,255,0.03); 
          border: 1px solid var(--glass-border); 
          color: var(--text-muted); 
        }

        .btn-success { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
        .btn-icon { width: 40px; height: 40px; padding: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; }

        .input, select, textarea {
          width: 100%; padding: 14px 18px; border-radius: 12px;
          background: rgba(0, 0, 0, 0.4); border: 1px solid var(--glass-border);
          color: white; font-family: var(--font-ui); font-size: 0.95rem;
        }

        .card {
          background: var(--bg-panel);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid var(--glass-border); 
          border-top: 1px solid var(--glass-highlight);
          border-radius: 20px; padding: 25px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4); 
          position: relative; overflow: hidden;
        }

        .login-gate { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: #000000; }
        .login-diamond { font-size: 3rem; margin-bottom: 20px; filter: drop-shadow(0 0 15px var(--primary-glow)); animation: float 4s ease-in-out infinite; color: white; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .anim-enter { animation: fadeIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }

        .app-container { max-width: 1600px; margin: 0 auto; padding: 20px; padding-bottom: 80px; }
        .topbar { display: flex; justify-content: space-between; align-items: center; padding: 15px 30px; margin-bottom: 40px; background: rgba(20, 20, 35, 0.6); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: 18px; position: sticky; top: 20px; z-index: 100; }

        .bento-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .widget { background: var(--bg-panel); border: 1px solid var(--glass-border); border-radius: 20px; padding: 25px; position: relative; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; min-height: 180px; }
        .w-large { grid-column: span 2; grid-row: span 2; }
        .w-wide { grid-column: span 4; display: flex; flex-direction: row; align-items: center; padding: 20px 30px; min-height: 100px; }
        .w-stat { font-family: var(--font-data); font-size: 2.5rem; font-weight: 700; color: white; margin: 10px 0; }

        .pos-layout { display: grid; grid-template-columns: 2fr 1.1fr; gap: 30px; height: calc(100vh - 150px); }
        .catalog-area { display: flex; flex-direction: column; gap: 20px; overflow: hidden; height: 100%; }
        .accordion-container { overflow-y: auto; flex: 1; }
        .pos-acc-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 14px; cursor: pointer; }
        .pos-acc-content { display: none; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); padding: 20px; }
        .product-grid-inner { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
        .product-card { background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 15px; cursor: pointer; display: flex; flex-direction: column; align-items: center; text-align: center; height: 100px; }
        .ticket-panel { background: #0b0c12; border: 1px solid var(--glass-border); display: flex; flex-direction: column; overflow: hidden; height: 100%; border-radius: 20px; }
        .cart-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; margin-bottom: 8px; border-radius: 10px; background: rgba(255,255,255,0.03); }
        .cart-total-section { background: rgba(15,15,22,0.95); border-top: 1px solid var(--glass-border); padding: 25px; }

        .contact-card { background: var(--bg-panel); border: 1px solid var(--glass-border); border-radius: 16px; overflow: hidden; cursor: pointer; text-align: center; }
        .cc-avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 3px solid #1e1e2d; }
        .cc-role-badge { background: rgba(6, 182, 212, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
      ` }} />

      {/* LOGIN GATE */}
      <div id="gate" className="login-gate">
        <div className="card">
          <div className="login-diamond">
            <i className="ri-vip-diamond-fill"></i>
          </div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '5px', fontWeight: 800, letterSpacing: '-1px' }}>Vespucci</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '30px', textTransform: 'uppercase', letterSpacing: '3px' }}>Titanium Access</p>
          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--primary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Identifiant</label>
            <select id="employeeSelect" className="input">
              <option value="">Choisir une identité...</option>
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', height: '50px' }} onClick={() => window.app.login()}>
            INITIALISER LA SESSION <i className="ri-arrow-right-line"></i>
          </button>
        </div>
      </div>

      {/* APP CONTENT */}
      <div className="app-container hidden" id="app-content">
        <header className="topbar anim-enter">
          <div className="flex-c" style={{ gap: '15px', cursor: 'pointer' }} onClick={() => window.app.go('dashboard')}>
            <div style={{ width: '40px', height: '40px', background: 'var(--gradient-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <i className="ri-vip-diamond-fill"></i>
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>VESPUCCI</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Manager v5.2</div>
            </div>
          </div>
          <div id="nav-actions" className="hidden">
            <button className="btn btn-ghost" onClick={() => window.app.go('dashboard')}><i className="ri-layout-grid-fill"></i> Dashboard</button>
          </div>
          <div className="flex-c" style={{ gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div id="u-name" style={{ fontWeight: 700, fontSize: '0.9rem' }}>User</div>
              <div id="u-role" style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800 }}>Employé</div>
            </div>
            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={() => window.app.logout()}><i className="ri-shut-down-line"></i></button>
          </div>
        </header>

        {/* DASHBOARD */}
        <section id="view-dashboard" className="anim-enter">
          <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Aperçu Global</h2>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: '8px' }}>
              <span id="clock">00:00</span>
            </div>
          </div>
          <div className="bento-grid">
            <div className="widget w-large" onClick={() => window.app.go('invoice')}>
              <h3 className="w-stat">CAISSE</h3>
              <button className="btn btn-primary">Ouvrir</button>
            </div>
            <div className="widget" onClick={() => window.app.go('direction')}>ADMIN</div>
            <div className="widget" onClick={() => window.app.go('annuaire')}>CONTACTS</div>
          </div>
        </section>

        {/* INVOICE */}
        <section id="view-invoice" className="hidden anim-enter">
          <div className="pos-layout">
            <div className="catalog-area">
              <input type="text" className="input" placeholder="Rechercher..." onKeyUp={(e) => window.app.filterProducts(e.target.value)} />
              <div id="catalog-list" className="accordion-container"></div>
            </div>
            <div className="ticket-panel">
              <div id="cart-body" style={{ flex: 1, padding: '15px' }}></div>
              <div className="cart-total-section">
                <div className="flex-sb"><span>TOTAL</span> <span id="total-pay">0 $</span></div>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} onClick={() => window.app.submitInvoice()}>ENCAISSER</button>
              </div>
            </div>
          </div>
        </section>

        {/* ANNUAIRE */}
        <section id="view-annuaire" className="hidden anim-enter">
          <div id="annuaire-grid" className="grid-3"></div>
        </section>
      </div>

      <div id="toast-container" style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 3000 }}></div>

      {/* SCRIPT LOGIQUE */}
      <script dangerouslySetInnerHTML={{ __html: `
        const CFG = {
          webhooks: {
            factures: "VOTRE_WEBHOOK",
            depense: "https://discord.com/api/webhooks/1458467290151653563/SGEnsRQJ2KDDnhUoCRmGp0IRM96o65gP-HVhWrxTzrDef02aS3SwtQKM2WG6iVKE43fs"
          },
          fallback_employees: ["Alvarez Julio", "Bloom Soren", "Price Sun", "Lily Summer"],
          products: [
            { id: 'Tête', icon: 'ri-user-3-fill', color: '#06b6d4', items: [{n:'Petit Tatouage', p:350}, {n:'Moyen Tatouage', p:450}] },
            { id: 'Coiffeur', icon: 'ri-scissors-fill', color: '#ec4899', items: [{n:'Coupe', p:200}, {n:'Barbe', p:100}] }
          ]
        };

        window.app = {
          user: null, cart: [],
          init: () => {
            const sel = document.getElementById('employeeSelect');
            if(sel) {
              CFG.fallback_employees.sort().forEach(e => { 
                let opt = document.createElement('option'); 
                opt.value = e; opt.textContent = e; 
                sel.appendChild(opt); 
              });
            }
            window.app.renderCatalog();
            setInterval(() => {
              const el = document.getElementById('clock');
              if(el) el.innerText = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
            }, 1000);
          },
          login: () => {
            const name = document.getElementById('employeeSelect').value;
            if(!name) return;
            window.app.user = { name };
            document.getElementById('gate').classList.add('hidden');
            document.getElementById('app-content').classList.remove('hidden');
            document.getElementById('u-name').innerText = name;
          },
          logout: () => {
            document.getElementById('gate').classList.remove('hidden');
            document.getElementById('app-content').classList.add('hidden');
          },
          go: (id) => {
            document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
            document.getElementById('view-'+id).classList.remove('hidden');
          },
          renderCatalog: () => {
            const c = document.getElementById('catalog-list');
            if(!c) return;
            c.innerHTML = '';
            CFG.products.forEach((cat, idx) => {
              let h = document.createElement('div');
              h.className = 'pos-acc-header';
              h.innerHTML = cat.id;
              h.onclick = () => {
                const content = h.nextSibling;
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
              };
              let cont = document.createElement('div');
              cont.className = 'pos-acc-content';
              cat.items.forEach(i => {
                let p = document.createElement('div');
                p.className = 'product-card';
                p.innerHTML = i.n + ' ' + i.p + '$';
                p.onclick = () => window.app.addToCart(i);
                cont.appendChild(p);
              });
              c.appendChild(h);
              c.appendChild(cont);
            });
          },
          addToCart: (i) => {
            window.app.cart.push(i);
            window.app.renderCart();
          },
          renderCart: () => {
            const b = document.getElementById('cart-body');
            b.innerHTML = window.app.cart.map(i => '<div class="cart-item">' + i.n + '</div>').join('');
            document.getElementById('total-pay').innerText = window.app.cart.reduce((a,b)=>a+b.p,0) + ' $';
          },
          submitInvoice: () => {
            alert('Facture envoyée !');
            window.app.cart = [];
            window.app.renderCart();
          }
        };
      ` }} />
    </>
  );
}
