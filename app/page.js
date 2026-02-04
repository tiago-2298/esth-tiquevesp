'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';

// --- CONFIGURATION CLIENT (Statique pour les produits/partenaires) ---
const CONFIG = {
  logoUrl: "https://i.goopics.net/rdaufk.png", 
  
  // --- PRODUITS ---
  products: [
    { 
      id: 'Tête', icon: 'ri-user-3-fill', color: '#06b6d4', 
      items: [{n:'Petit Tatouage', p:350}, {n:'Moyen Tatouage', p:450}, {n:'Grand Tatouage', p:600}, {n:'Tatouage Visage', p:700}] 
    },
    { 
      id: 'Torse/Dos', icon: 'ri-body-scan-fill', color: '#f59e0b', 
      items: [{n:'Petit Tatouage', p:600}, {n:'Moyen Tatouage', p:800}, {n:'Grand Tatouage', p:1100}, {n:'Dos Complet', p:3000}] 
    },
    { 
      id: 'Bras', icon: 'ri-markup-fill', color: '#8b5cf6', 
      items: [{n:'Petit Tatouage', p:450}, {n:'Moyen Tatouage', p:600}, {n:'Grand Tatouage', p:800}, {n:'Bras Complet', p:2500}] 
    },
    { 
      id: 'Jambes', icon: 'ri-walk-fill', color: '#10b981', 
      items: [{n:'Petit Tatouage', p:450}, {n:'Moyen Tatouage', p:600}, {n:'Grand Tatouage', p:800}, {n:'Jambe Complète', p:2500}] 
    },
    { 
      id: 'Custom', icon: 'ri-edit-2-fill', color: '#94a3b8', 
      items: [{n:'Retouche', p:100}, {n:'Custom Small', p:500}, {n:'Custom Large', p:1500}, {n:'Projet Spécial', p:5000}] 
    },
    { 
      id: 'Laser', icon: 'ri-flashlight-fill', color: '#ef4444', 
      items: [{n:'Petit Laser', p:250}, {n:'Moyen Laser', p:500}, {n:'Grand Laser', p:750}, {n:'Séance Complète', p:1000}] 
    },
    { 
      id: 'Coiffeur', icon: 'ri-scissors-fill', color: '#ec4899', 
      items: [{n:'Coupe', p:200}, {n:'Couleur', p:100}, {n:'Barbe', p:100}, {n:'Dégradé', p:100}] 
    }
  ],
  partners: [
    {name:'HenHouse', val:30}, {name:'Auto Exotic', val:30}, {name:'LifeInvader', val:30},
    {name:'Delight', val:30}, {name:'Biogood', val:30}, {name:'Rex Diners', val:30},
  ],
  default_directory: [
    { nom: "Bloom", prenom: "Soren", grade: "Co-Patron", tel: "575-5535", photo: "https://i.goopics.net/o6gnq3.png" }
  ]
};

// --- UTILITAIRES ---
const formatMoney = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
};

const apiCall = async (action, data) => {
    try {
        const res = await fetch('/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, data })
        });
        return await res.json();
    } catch (e) {
        console.error("API Error", e);
        return { success: false };
    }
};

// --- ICONS ---
const Icons = {
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  Cart: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>,
  Lock: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Power: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  ChevronDown: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  Badge: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74z"></path></svg>,
  Close: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
};

// --- HOOKS ---
const useCart = (user, discountVal) => {
  const [cart, setCart] = useState([]);
  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(x => x.n === product.n);
      if (exists) return prev.map(x => x.n === product.n ? { ...x, q: x.q + 1 } : x);
      return [...prev, { ...product, q: 1 }];
    });
  };
  const updateQty = (index, delta) => {
    setCart(prev => {
      const copy = [...prev];
      const newQty = copy[index].q + delta;
      if (newQty <= 0) copy.splice(index, 1);
      else copy[index] = { ...copy[index], q: newQty };
      return copy;
    });
  };
  const clearCart = () => setCart([]);
  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.p * item.q), 0);
    const discountAmount = subtotal * (discountVal / 100);
    return { subtotal, discountPct: discountVal, discountAmount, final: subtotal - discountAmount };
  }, [cart, discountVal]);
  return { cart, addToCart, updateQty, clearCart, totals };
};

// --- COMPONENTS ---
const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.s}`}>
      <div className="toast-dot"></div>
      <div><div className="toast-title">{toast.t}</div><div className="toast-msg">{toast.m}</div></div>
    </div>
  );
};

// --- LOGIN VIEW ---
const LoginView = ({ employees, onLogin, isLoadingList }) => {
  const [selectedUser, setSelectedUser] = useState('');

  return (
    <div className="login-container">
      <div className="login-content-wrapper">
        <div className="brand-logo-large">
            <img src={CONFIG.logoUrl} alt="Vespucci Logo" style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'20px'}} />
        </div>
        <div className="brand-text-large">
            <h1>VESPUCCI</h1>
            <p>ESTHETIC & INK • MANAGER</p>
        </div>
        
        <div className="login-form">
          <div className="select-container">
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} disabled={isLoadingList}>
              <option value="">{isLoadingList ? 'Chargement...' : 'Sélectionner votre identité'}</option>
              {employees.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <div className="select-icon"><Icons.Users /></div>
          </div>
          <button className="btn-primary-large" onClick={() => onLogin(selectedUser)} disabled={!selectedUser}>
            Démarrer la session
          </button>
        </div>
        <div className="login-footer">System Version 6.3 • Secure Access</div>
      </div>
    </div>
  );
};

export default function VespucciInk() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login'); 
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState(null);

  // Data State
  const [employeesList, setEmployeesList] = useState([]);
  const [user, setUser] = useState('');
  const [userProfile, setUserProfile] = useState(null); // Pour stocker salaire, CA, etc.
  const [userHistory, setUserHistory] = useState([]);   // Pour les sanctions

  // Invoice States
  const [invoiceNumber, setInvoiceNumber] = useState(''); 
  const [discountVal, setDiscountVal] = useState(0); 
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null); 
  
  // Admin States
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [shakeError, setShakeError] = useState(false);
  const [successUnlock, setSuccessUnlock] = useState(false);
  const [directory, setDirectory] = useState([]);
  
  // Modals
  const [addContactModal, setAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ nom: '', prenom: '', grade: 'Employé', tel: '', photo: '' });
  const [activeAdminModal, setActiveAdminModal] = useState(null); 
  const [adminFormData, setAdminFormData] = useState({});

  const { cart, addToCart, updateQty, clearCart, totals } = useCart(user, discountVal);

  const notify = useCallback((t, m, s = 'info') => {
    setToast({ t, m, s });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // 1. CHARGEMENT INITIAL : Récupérer la liste des employés depuis le Sheet
  useEffect(() => {
    const initApp = async () => {
        // Charger l'annuaire local (backup)
        const savedDir = localStorage.getItem('vespucci_contacts');
        if (savedDir) setDirectory(JSON.parse(savedDir));
        else setDirectory(CONFIG.default_directory);

        // Appel API pour avoir la liste fraîche pour le login
        const res = await apiCall('getInitData', {});
        if (res.success) {
            setEmployeesList(res.employees);
        } else {
            notify('Erreur', 'Impossible de charger la liste du personnel', 'error');
            // Fallback sur liste statique si API down
            setEmployeesList(["Mode Offline - Vérifiez API"]);
        }
        setLoading(false);
    };
    initApp();
  }, [notify]);

  // 2. GESTION DU LOGIN : Récupérer le profil complet
  const handleLogin = async (u) => { 
      setLoading(true); // Petit effet de chargement
      const res = await apiCall('login', { user: u });
      
      if (res.success) {
          setUser(u);
          setUserProfile(res.profile);
          setUserHistory(res.history || []);
          setView('app');
          notify('Bienvenue', `Session ouverte pour ${u}`, 'success');
      } else {
          notify('Erreur', 'Impossible de récupérer le profil', 'error');
      }
      setLoading(false);
  };

  const submitInvoice = async () => {
    if (!cart.length) return notify('Attention', 'Le panier est vide', 'error');
    if (!invoiceNumber) return notify('Attention', 'Numéro de facture manquant', 'error');
    
    const res = await apiCall('sendFactures', {
        user, invoiceNumber, cart, totals
    });

    if(res.success) {
        notify('Succès', `Facture ${invoiceNumber} envoyée`, 'success');
        clearCart(); setInvoiceNumber(''); setDiscountVal(0);
        // On pourrait recharger le profil ici pour voir le CA augmenter
        const updatedProfile = await apiCall('login', { user });
        if(updatedProfile.success) setUserProfile(updatedProfile.profile);
    } else {
        notify('Erreur', 'Echec de l\'envoi (API)', 'error');
    }
  };

  const submitAdminForm = async () => {
    const type = activeAdminModal;
    const data = adminFormData;
    
    if (!type) return;
    if (type === 'recrutement' && (!data.nom || !data.prenom)) return notify('Erreur', 'Nom/Prénom requis', 'error');
    if (type !== 'recrutement' && !data.target && type !== 'depense') return notify('Erreur', 'Cible manquante', 'error');
    
    const res = await apiCall('sendHR', {
        type, formData: data, user
    });

    if(res.success) {
        notify('Envoyé', 'Dossier transmis avec succès', 'success');
        setActiveAdminModal(null);
        setAdminFormData({});
    } else {
        notify('Erreur', 'Erreur lors de la transmission', 'error');
    }
  };

  const openAdminModal = (type) => {
    setActiveAdminModal(type);
    setAdminFormData({}); 
  };

  const verifyPinAndUnlock = async () => {
      const res = await apiCall('verifyPin', { pin: adminPin });
      if (res.success) {
        setSuccessUnlock(true);
        setTimeout(() => {
            setAdminUnlocked(true);
            setSuccessUnlock(false);
            notify('Succès', 'Accès autorisé', 'success');
        }, 600);
      } else {
        setShakeError(true);
        notify('Erreur', 'Code d\'accès refusé', 'error');
        setTimeout(() => setAdminPin(''), 400);
      }
  };

  const handleKeypadPress = useCallback((val) => {
    setShakeError(false);
    if (val === 'C') { setAdminPin(''); return; }
    if (val === 'DEL') { setAdminPin(prev => prev.slice(0, -1)); return; }
    if (val === 'GO') {
        setTimeout(() => verifyPinAndUnlock(), 10);
        return;
    }
    if (adminPin.length < 8) {
        setAdminPin(prev => prev + val.toString());
    }
  }, [adminPin]);

  useEffect(() => {
    if (tab !== 'direction' || adminUnlocked) return;
    const handleKeyDown = (e) => {
        if (e.key >= '0' && e.key <= '9') handleKeypadPress(parseInt(e.key));
        else if (e.key === 'Enter') handleKeypadPress('GO');
        else if (e.key === 'Backspace') handleKeypadPress('DEL');
        else if (e.key === 'Escape') handleKeypadPress('C');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tab, adminUnlocked, handleKeypadPress]);

  const saveContact = () => {
      const newList = [...directory, newContact];
      setDirectory(newList); localStorage.setItem('vespucci_contacts', JSON.stringify(newList));
      setAddContactModal(false); setNewContact({ nom: '', prenom: '', grade: 'Employé', tel: '', photo: '' });
      notify('Effectifs', 'Base de données mise à jour', 'success');
  };

  const toggleCategory = (id) => {
    if (activeCategory === id) setActiveCategory(null);
    else setActiveCategory(id);
  };

  // --- STYLES ---
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
    @import url('https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css');
    :root { --bg-app: #050505; --bg-sidebar: #0a0a0a; --bg-card: #141414; --bg-input: #1f1f1f; --accent: #C5A065; --accent-hover: #e0b674; --text-main: #f2f2f2; --text-muted: #888888; --border: #262626; --success: #059669; --danger: #991b1b; --radius: 12px; --font-ui: 'Outfit', sans-serif; --font-display: 'Outfit', sans-serif; --font-mono: 'Courier New', Courier, monospace; }
    body { background-color: var(--bg-app); color: var(--text-main); font-family: var(--font-ui); margin: 0; overflow: hidden; -webkit-font-smoothing: antialiased; }
    .pin-container { padding: 60px 0; max-width: 400px; margin: 0 auto; animation: fadeIn 0.5s ease; position: relative; }
    .pin-display { background: #080808; border: 1px solid var(--border); border-radius: 16px; padding: 0 20px; text-align: center; color: var(--accent); font-family: var(--font-mono); font-size: 2.5rem; letter-spacing: 12px; margin-bottom: 30px; height: 70px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 10px rgba(0,0,0,0.8); text-shadow: 0 0 10px rgba(197, 160, 101, 0.5); position: relative; overflow: hidden; }
    .pin-dot { width: 14px; height: 14px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 10px var(--accent); animation: popIn 0.2s; }
    .shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; border-color: var(--danger) !important; color: var(--danger) !important; box-shadow: 0 0 20px rgba(153, 27, 27, 0.4) !important; }
    .unlock-success { animation: pulseGreen 0.6s ease forwards; }
    @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
    @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
    @keyframes pulseGreen { 0% { border-color: var(--accent); } 50% { border-color: var(--success); box-shadow: 0 0 30px var(--success); color: var(--success); } 100% { border-color: var(--success); } }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
    .app-layout { display: flex; height: 100vh; width: 100vw; background: var(--bg-app); }
    .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .main-content { flex: 1; padding: 40px; overflow-y: auto; max-width: 1800px; margin: 0 auto; width: 100%; box-sizing: border-box; }
    .sidebar { width: 280px; background: var(--bg-sidebar); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 30px 20px; z-index: 20; justify-content: space-between; box-shadow: 5px 0 20px rgba(0,0,0,0.2); }
    .brand-section { display: flex; align-items: center; gap: 16px; margin-bottom: 50px; padding: 0 10px; }
    .brand-logo { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; border: 2px solid var(--accent); box-shadow: 0 0 15px rgba(197, 160, 101, 0.2); }
    .brand-logo img { width: 100%; height: 100%; object-fit: cover; }
    .brand-name { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--accent); letter-spacing: 1px; }
    .brand-sub { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; margin-top: 2px; }
    .nav-item { display: flex; align-items: center; gap: 14px; padding: 14px 20px; margin-bottom: 8px; border-radius: 12px; color: var(--text-muted); cursor: pointer; transition: all 0.2s ease; font-size: 0.95rem; font-weight: 500; }
    .nav-item:hover { background: rgba(255,255,255,0.02); color: var(--text-main); }
    .nav-item.active { background: linear-gradient(90deg, rgba(197, 160, 101, 0.15), transparent); color: var(--accent); border-left: 3px solid var(--accent); }
    .header { height: 80px; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; background: transparent; }
    .page-title { font-family: var(--font-display); font-size: 1.8rem; font-weight: 600; color: white; }
    .user-profile { display: flex; align-items: center; gap: 14px; background: var(--bg-card); padding: 8px 10px 8px 20px; border-radius: 40px; border: 1px solid var(--border); transition: 0.2s; }
    .user-name { font-size: 0.9rem; font-weight: 600; color: var(--text-main); }
    .user-avatar { width: 36px; height: 36px; background: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #000; font-size: 0.9rem; }
    .pos-layout { display: grid; grid-template-columns: 1fr 450px; gap: 40px; height: calc(100vh - 160px); min-height: 0; }
    .menu-section { display: flex; flex-direction: column; gap: 24px; height: 100%; overflow: hidden; min-height: 0; }
    .search-bar { display: flex; align-items: center; gap: 14px; background: var(--bg-card); border: 1px solid var(--border); padding: 16px 20px; border-radius: var(--radius); transition: 0.2s; }
    .search-bar:focus-within { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
    .search-input { background: transparent; border: none; color: white; font-size: 1rem; width: 100%; outline: none; font-family: var(--font-ui); }
    .categories-list { overflow-y: auto; padding-right: 10px; flex: 1; }
    .category-accordion { margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-card); overflow: hidden; transition: 0.3s; }
    .category-header { padding: 18px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-family: var(--font-display); font-size: 1.05rem; letter-spacing: 0.5px; background: rgba(255,255,255,0.02); }
    .category-header:hover { background: rgba(255,255,255,0.05); }
    .category-header.active { background: rgba(197, 160, 101, 0.1); color: var(--accent); border-bottom: 1px solid var(--border); }
    .accordion-content { padding: 16px; background: #0a0a0a; animation: slideDown 0.3s ease-out; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
    .product-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; cursor: pointer; transition: 0.2s; display: flex; flex-direction: row; align-items: center; justify-content: space-between; min-height: auto; }
    .product-card:hover { border-color: var(--accent); background: #1f1f1f; transform: translateY(-2px); }
    .product-name { font-weight: 500; font-size: 0.9rem; color: var(--text-main); text-align: left; }
    .product-price { font-family: var(--font-display); color: var(--accent); font-size: 0.95rem; font-weight: 600; white-space: nowrap; margin-left: 10px; }
    .active-partner { border-color: var(--accent); background: rgba(197, 160, 101, 0.1); }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .receipt-paper { background: #111111; border: 1px solid #333; border-radius: 6px; display: flex; flex-direction: column; height: 100%; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5); font-family: var(--font-ui); }
    .receipt-header { padding: 24px; background: #161616; border-bottom: 2px dashed #333; text-align: center; flex-shrink: 0; }
    .receipt-title { font-size: 1.2rem; font-weight: 700; letter-spacing: 2px; color: white; text-transform: uppercase; margin-bottom: 4px; }
    .receipt-subtitle { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 20px; font-family: var(--font-mono); }
    .receipt-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); }
    .receipt-invoice-row { background: #0a0a0a; border: 1px dashed #333; border-radius: 4px; display: flex; align-items: center; margin-bottom: 8px; overflow: hidden; }
    .receipt-invoice-prefix { background: #222; padding: 10px 12px; font-size: 0.85rem; color: #888; font-family: var(--font-mono); border-right: 1px solid #333; }
    .receipt-invoice-input { background: transparent; border: none; width: 100%; color: var(--accent); font-family: var(--font-mono); font-weight: 700; font-size: 1rem; outline: none; padding: 10px; }
    .receipt-body { flex: 1; overflow-y: auto; padding: 10px 0; background: #111; }
    .receipt-table-head { display: grid; grid-template-columns: 90px 1fr 80px 30px; padding: 5px 16px; margin-bottom: 5px; font-size: 0.7rem; text-transform: uppercase; color: #555; font-weight: 700; border-bottom: 1px solid #222; text-align: left; }
    .receipt-row { display: grid; grid-template-columns: 90px 1fr 80px 30px; padding: 8px 16px; align-items: center; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .qty-control { display: flex; align-items: center; gap: 6px; background: #000; border: 1px solid #333; border-radius: 4px; padding: 2px; width: fit-content; }
    .qty-btn { width: 20px; height: 20px; background: #222; border: none; color: #888; border-radius: 3px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; line-height: 1; padding: 0; }
    .qty-btn:hover { background: #333; color: white; }
    .qty-val { font-family: var(--font-mono); font-size: 0.85rem; min-width: 16px; text-align: center; font-weight: 600; color: var(--accent); }
    .r-name { color: #ddd; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; font-size: 0.85rem; }
    .r-price { font-family: var(--font-mono); text-align: right; color: #888; font-size: 0.85rem; }
    .r-del { color: #333; cursor: pointer; text-align: right; transition: 0.2s; display: flex; align-items: center; justify-content: flex-end; }
    .r-del:hover { color: var(--danger); }
    .receipt-empty-state { text-align: center; padding-top: 60px; color: #333; font-style: italic; font-size: 0.9rem; }
    .receipt-footer { background: #161616; border-top: 2px dashed #333; padding: 20px; flex-shrink: 0; }
    .rf-line { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.85rem; margin-bottom: 6px; color: #888; }
    .rf-line.sub { color: #aaa; }
    .rf-line.disc { color: var(--accent); }
    .rf-total-section { margin-top: 15px; padding-top: 15px; border-top: 1px solid #333; display: flex; justify-content: space-between; align-items: flex-end; }
    .rf-label { font-size: 1.2rem; font-weight: 800; color: white; letter-spacing: 1px; }
    .rf-total { font-family: var(--font-mono); font-size: 2.2rem; font-weight: 700; color: var(--accent); line-height: 1; }
    .receipt-actions { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
    .btn-checkout { background: var(--accent); color: #111; border: none; padding: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; font-size: 1rem; cursor: pointer; width: 100%; border-radius: 4px; transition: 0.2s; }
    .btn-checkout:hover { background: #d4b075; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(197, 160, 101, 0.2); }
    .btn-cancel { background: transparent; border: 1px solid #333; color: #555; padding: 10px; font-size: 0.75rem; text-transform: uppercase; cursor: pointer; width: 100%; border-radius: 4px; }
    .btn-cancel:hover { border-color: var(--danger); color: var(--danger); }
    .login-container { display: flex; align-items: center; justify-content: center; height: 100vh; background: radial-gradient(circle at center, #1a1a1a 0%, #000000 100%); }
    .login-content-wrapper { text-align: center; width: 100%; max-width: 420px; animation: fadeIn 0.8s ease-out; }
    .brand-logo-large { width: 120px; height: 120px; border-radius: 30px; margin: 0 auto 40px; box-shadow: 0 0 80px rgba(197, 160, 101, 0.15); border: 2px solid var(--accent); padding:4px; }
    .brand-text-large h1 { font-family: var(--font-display); font-size: 3rem; margin: 0; letter-spacing: 4px; color: var(--accent); font-weight: 600; }
    .brand-text-large p { color: var(--text-muted); font-size: 0.8rem; letter-spacing: 4px; margin-top: 10px; font-weight:300; }
    .login-form { margin-top: 60px; display: flex; flex-direction: column; gap: 20px; }
    .select-container { position: relative; }
    .select-container select { width: 100%; padding: 18px 18px 18px 50px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 14px; color: white; font-size: 1rem; outline: none; appearance: none; cursor: pointer; transition: 0.2s; }
    .select-container select:focus { border-color: var(--accent); background: rgba(0,0,0,0.5); }
    .select-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: var(--accent); pointer-events: none; }
    .btn-primary-large { width: 100%; padding: 18px; background: var(--accent); color: black; border: none; border-radius: 14px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: 0.2s; text-transform: uppercase; letter-spacing: 1px; }
    .btn-primary-large:hover { background: var(--accent-hover); transform: translateY(-2px); box-shadow: 0 10px 30px rgba(197, 160, 101, 0.2); }
    .btn-primary-large:disabled { opacity: 0.3; cursor: not-allowed; transform: none; box-shadow: none; }
    .login-footer { margin-top: 80px; color: #444; font-size: 0.7rem; letter-spacing: 1px; text-transform: uppercase; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-bottom: 40px; }
    .stat-card { background: linear-gradient(145deg, var(--bg-card), #1a1a1a); border: 1px solid var(--border); border-radius: var(--radius); padding: 30px; display: flex; flex-direction: column; justify-content: space-between; min-height: 160px; transition: 0.3s; cursor: default; position: relative; overflow: hidden; }
    .stat-card:hover { border-color: var(--accent); transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .stat-label { color: var(--text-muted); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .stat-value { font-family: var(--font-display); font-size: 3.5rem; font-weight: 600; color: var(--text-main); line-height: 1; }
    .stat-link { margin-top: auto; font-size: 0.85rem; color: var(--accent); display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 500; }
    .contact-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
    .contact-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; display: flex; align-items: center; gap: 20px; transition: 0.2s; }
    .contact-card:hover { border-color: var(--accent); background: #1a1a1a; }
    .contact-img { width: 64px; height: 64px; border-radius: 20px; object-fit: cover; background: #27272a; }
    .contact-placeholder { width: 64px; height: 64px; border-radius: 20px; background: var(--bg-input); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-muted); font-size: 1.2rem; }
    .admin-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
    .admin-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; display: flex; flex-direction: column; gap: 18px; cursor: pointer; transition: 0.2s; }
    .admin-card:hover { border-color: var(--accent); background: rgba(197, 160, 101, 0.05); transform: translateY(-2px); }
    .admin-icon { width: 48px; height: 48px; background: rgba(255,255,255,0.05); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: var(--accent); }
    .toast { position: fixed; bottom: 40px; right: 40px; background: var(--bg-card); border: 1px solid var(--border); padding: 20px 24px; border-radius: 14px; z-index: 100; display: flex; gap: 16px; align-items: center; box-shadow: 0 20px 50px -10px rgba(0,0,0,0.6); animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .toast-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); }
    .toast-success .toast-dot { background: var(--success); box-shadow: 0 0 10px var(--success); }
    .toast-error .toast-dot { background: var(--danger); box-shadow: 0 0 10px var(--danger); }
    .toast-title { font-weight: 600; font-size: 1rem; color: var(--text-main); }
    .toast-msg { font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 50; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease; }
    .modal-card { width: 500px; background: #111; border: 1px solid var(--border); border-radius: 16px; padding: 0; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); overflow: hidden; animation: slideUp 0.3s ease; }
    .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #161616; }
    .modal-title { font-family: var(--font-display); font-size: 1.1rem; color: white; font-weight: 600; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer { padding: 20px 24px; background: #161616; border-top: 1px solid var(--border); display: flex; gap: 12px; justify-content: flex-end; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
    .form-input, .form-select, .form-textarea { background: var(--bg-input); border: 1px solid var(--border); color: white; padding: 12px; border-radius: 8px; outline: none; font-family: var(--font-ui); font-size: 0.95rem; transition: 0.2s; width: 100%; box-sizing: border-box; }
    .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--accent); background: #222; }
    .form-textarea { resize: vertical; min-height: 80px; }
    /* Nouveaux styles pour le profil */
    .profile-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding-top: 20px; }
    .profile-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 30px; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .profile-img-lg { width: 120px; height: 120px; border-radius: 30px; border: 3px solid var(--accent); margin-bottom: 20px; object-fit: cover; }
    .profile-name-lg { font-family: var(--font-display); font-size: 2rem; color: white; font-weight: 700; }
    .profile-grade-lg { color: var(--accent); text-transform: uppercase; letter-spacing: 2px; font-size: 0.9rem; margin-top: 5px; }
    .profile-stats-row { display: flex; gap: 20px; width: 100%; margin-top: 30px; }
    .p-stat-box { flex: 1; background: rgba(255,255,255,0.03); border-radius: 12px; padding: 15px; }
    .p-stat-val { font-family: var(--font-mono); font-size: 1.4rem; color: var(--text-main); font-weight: 700; }
    .p-stat-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-top: 4px; }
    .history-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; display: flex; flex-direction: column; height: 100%; }
    .history-header { padding: 20px; border-bottom: 1px solid var(--border); font-family: var(--font-display); font-size: 1.1rem; color: white; font-weight: 600; display:flex; justify-content:space-between; align-items:center;}
    .history-list { padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .history-item { padding: 16px; border-radius: 8px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); display: flex; gap: 14px; }
    .h-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
    .h-content { flex: 1; }
    .h-title { color: white; font-weight: 600; font-size: 0.95rem; }
    .h-date { color: var(--text-muted); font-size: 0.75rem; margin-bottom: 4px; font-family: var(--font-mono); }
    .h-desc { color: #aaa; font-size: 0.85rem; margin-top: 4px; line-height: 1.4; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `;

  if (loading) return <div style={{height:'100vh', background:'#050505', display:'flex', alignItems:'center', justifyContent:'center', color:'#C5A065', fontFamily:'sans-serif', fontSize:'1.2rem', letterSpacing:'4px'}}>VESPUCCI • CHARGEMENT</div>;

  if (view === 'login') return (
    <>
        <style>{styles}</style>
        <LoginView employees={employeesList} onLogin={handleLogin} isLoadingList={employeesList.length === 0} />
    </>
  );

  return (
    <div className="app-layout">
      <style>{styles}</style>
      <Toast toast={toast} />

      <aside className="sidebar">
        <div>
            <div className="brand-section">
                <div className="brand-logo">
                    <img src={CONFIG.logoUrl} alt="Logo" />
                </div>
                <div>
                    <div className="brand-name">VESPUCCI</div>
                    <div className="brand-sub">ESTHETIC V6</div>
                </div>
            </div>
            <nav>
                <div className={`nav-item ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
                    <Icons.Dashboard /> Dashboard
                </div>
                <div className={`nav-item ${tab === 'invoice' ? 'active' : ''}`} onClick={() => setTab('invoice')}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', width:'100%'}}>
                        <Icons.Cart /> Caisse & Services
                        {cart.length > 0 && (
                            <div className="cart-count">
                                <div className="cart-count-value" style={{background:'var(--accent)',color:'black',fontSize:'0.75rem',fontWeight:700,minWidth:'20px',height:'20px',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 6px'}}>{cart.length}</div>
                            </div>
                        )}
                    </div>
                </div>
                <div className={`nav-item ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
                    <Icons.User /> Mon Profil
                </div>
                <div className={`nav-item ${tab === 'annuaire' ? 'active' : ''}`} onClick={() => setTab('annuaire')}>
                    <Icons.Users /> Staff
                </div>
                <div className={`nav-item ${tab === 'direction' ? 'active' : ''}`} onClick={() => setTab('direction')}>
                    <Icons.Lock /> Administration
                </div>
            </nav>
        </div>
        <div className="nav-item" onClick={() => setView('login')} style={{color:'var(--danger)', marginTop:'auto', border:'none'}}>
            <Icons.Power /> Déconnexion
        </div>
      </aside>

      <div className="main-wrapper">
          <header className="header">
              <div className="page-title">
                  {tab === 'dashboard' && 'Vue d\'ensemble'}
                  {tab === 'invoice' && 'Terminal de Vente'}
                  {tab === 'profile' && 'Mon Dossier'}
                  {tab === 'annuaire' && 'Équipe & Planning'}
                  {tab === 'direction' && 'Gestion Interne'}
              </div>
              <div className="user-profile">
                  <span className="user-name">{user}</span>
                  <div className="user-avatar">{user.charAt(0)}</div>
              </div>
          </header>

          <main className="main-content">
            
            {tab === 'dashboard' && (
                <div style={{animation:'fadeIn 0.5s ease'}}>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-label">Services Disponibles</div>
                            <div className="stat-value">{CONFIG.products.reduce((acc, cat) => acc + cat.items.length, 0)}</div>
                            <div className="stat-link" onClick={() => setTab('invoice')}>Consulter le catalogue →</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Artistes / Staff</div>
                            <div className="stat-value">{employeesList.length > 0 ? employeesList.length : CONFIG.employees.length}</div>
                            <div className="stat-link" onClick={() => setTab('annuaire')}>Gérer l'équipe →</div>
                        </div>
                        <div className="stat-card" style={{borderColor:'var(--accent)', background:'linear-gradient(145deg, rgba(197, 160, 101, 0.1), transparent)'}}>
                            <div className="stat-label" style={{color:'var(--accent)'}}>Accès Rapide</div>
                            <div className="stat-value" style={{fontSize:'2.2rem', color:'var(--accent)'}}>Nouvelle Vente</div>
                            <div className="stat-link" onClick={() => setTab('invoice')}>Ouvrir la caisse →</div>
                        </div>
                    </div>
                </div>
            )}

            {/* NOUVEL ONGLET : MON PROFIL */}
            {tab === 'profile' && userProfile && (
                 <div className="profile-layout" style={{animation:'fadeIn 0.5s ease'}}>
                    {/* Carte d'identité */}
                    <div className="profile-card">
                        <img 
                            src={userProfile.photo || CONFIG.logoUrl} 
                            className="profile-img-lg"
                            onError={(e) => {e.target.src = CONFIG.logoUrl}}
                        />
                        <div className="profile-name-lg">{userProfile.nom}</div>
                        <div className="profile-grade-lg">{userProfile.grade}</div>

                        <div className="profile-stats-row">
                            <div className="p-stat-box">
                                <div className="p-stat-val" style={{color:'#10b981'}}>{userProfile.salaire}</div>
                                <div className="p-stat-label">Salaire Net</div>
                            </div>
                            <div className="p-stat-box">
                                <div className="p-stat-val" style={{color:'#06b6d4'}}>{userProfile.ca}</div>
                                <div className="p-stat-label">Chiffre d'Affaires</div>
                            </div>
                        </div>
                        
                        <div style={{marginTop:'30px', width:'100%', textAlign:'left', background:'rgba(255,255,255,0.02)', padding:'20px', borderRadius:'12px'}}>
                            <div style={{color:'var(--text-muted)', fontSize:'0.8rem', marginBottom:'8px'}}>INFOS BANCAIRES</div>
                            <div style={{fontFamily:'var(--font-mono)', fontSize:'1.1rem'}}>{userProfile.iban || 'NON RENSEIGNÉ'}</div>
                            <div style={{color:'var(--text-muted)', fontSize:'0.8rem', marginTop:'16px', marginBottom:'8px'}}>TÉLÉPHONE</div>
                            <div style={{fontFamily:'var(--font-mono)', fontSize:'1.1rem'}}>{userProfile.tel}</div>
                        </div>
                    </div>

                    {/* Historique Sanctions */}
                    <div className="history-card">
                        <div className="history-header">
                            <span>Dossier Administratif</span>
                            <span style={{fontSize:'0.8rem', background: userHistory.length === 0 ? '#10b981' : '#f59e0b', padding:'4px 10px', borderRadius:'20px', color:'black'}}>
                                {userHistory.length === 0 ? 'Dossier Vierge' : `${userHistory.length} Entrée(s)`}
                            </span>
                        </div>
                        <div className="history-list">
                            {userHistory.length === 0 && (
                                <div style={{textAlign:'center', padding:'40px', color:'var(--text-muted)', fontStyle:'italic'}}>
                                    Aucune sanction ou note administrative.
                                </div>
                            )}
                            {userHistory.map((h, i) => (
                                <div key={i} className="history-item">
                                    <div className="h-icon" style={{
                                        background: h.type.includes('Blâme') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                        color: h.type.includes('Blâme') ? '#ef4444' : '#f59e0b'
                                    }}>
                                        {h.type.includes('Blâme') ? '🔴' : '⚠️'}
                                    </div>
                                    <div className="h-content">
                                        <div className="h-date">{h.date} • {h.type}</div>
                                        <div className="h-title">Par: {h.auteur}</div>
                                        <div className="h-desc">{h.motif}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
            )}

            {tab === 'invoice' && (
                <div className="pos-layout">
                    {/* GAUCHE: CATALOGUE + PARTENAIRES */}
                    <div className="menu-section">
                        <div className="search-bar">
                            <Icons.Search style={{color:'var(--text-muted)'}} />
                            <input className="search-input" placeholder="Rechercher un soin, tatouage..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                        </div>
                        <div className="categories-list">
                            {/* PARTENAIRES */}
                            <div className="category-accordion">
                                <div className={`category-header ${activeCategory === 'partners' ? 'active' : ''}`} onClick={() => toggleCategory('partners')}>
                                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                        <Icons.Badge />
                                        Remises Partenaires
                                    </div>
                                    <Icons.ChevronDown style={{transform: activeCategory === 'partners' ? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.3s', opacity:0.6}} />
                                </div>
                                {activeCategory === 'partners' && (
                                    <div className="accordion-content">
                                        <div className="products-grid">
                                            {CONFIG.partners.map(p => (
                                                <div 
                                                    key={p.name} 
                                                    className={`product-card ${discountVal === p.val ? 'active-partner' : ''}`}
                                                    onClick={() => setDiscountVal(discountVal === p.val ? 0 : p.val)}
                                                >
                                                    <div className="product-name" style={{fontWeight:700}}>{p.name}</div>
                                                    <div className="product-price">-{p.val}%</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PRODUITS */}
                            {CONFIG.products.map((cat) => (
                                <div key={cat.id} className="category-accordion">
                                    <div className={`category-header ${activeCategory === cat.id ? 'active' : ''}`} onClick={() => toggleCategory(cat.id)}>
                                        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                            <i className={cat.icon} style={{color: cat.color, fontSize:'1.2rem'}}></i> 
                                            {cat.id}
                                        </div>
                                        <Icons.ChevronDown style={{transform: activeCategory === cat.id ? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.3s', opacity:0.6}} />
                                    </div>
                                    {activeCategory === cat.id && (
                                        <div className="accordion-content">
                                            <div className="products-grid">
                                                {cat.items.filter(i => i.n.toLowerCase().includes(search.toLowerCase())).map(p => (
                                                    <div key={p.n} className="product-card" onClick={() => addToCart(p)}>
                                                        <div className="product-name">{p.n}</div>
                                                        <div className="product-price">{formatMoney(p.p)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DROITE: TICKET DE CAISSE */}
                    <div className="receipt-paper">
                        <div className="receipt-header">
                            <div className="receipt-title">VESPUCCI INK</div>
                            <div className="receipt-subtitle">ESTHETIC CENTER & TATTOO</div>
                            <div className="receipt-meta">
                                <span>DATE: {new Date().toLocaleDateString()}</span>
                            </div>
                            <div className="receipt-invoice-row" style={{marginBottom:0}}>
                                <div className="receipt-invoice-prefix">Facture-</div>
                                <input 
                                    className="receipt-invoice-input"
                                    placeholder="000000"
                                    value={invoiceNumber}
                                    onChange={e => setInvoiceNumber(e.target.value)}
                                    maxLength={8}
                                />
                            </div>
                        </div>

                        <div className="receipt-table-head">
                            <span>QTÉ</span>
                            <span>DESIGNATION</span>
                            <span style={{textAlign:'right'}}>PRIX</span>
                            <span></span>
                        </div>

                        <div className="receipt-body">
                            {cart.length === 0 && (
                                <div className="receipt-empty-state">
                                    -- AUCUN ARTICLE --
                                </div>
                            )}
                            {cart.map((item, i) => (
                                <div key={i} className="receipt-row">
                                    {/* CONTROLE QUANTITE */}
                                    <div className="qty-control">
                                        <button className="qty-btn" onClick={() => updateQty(i, -1)}>-</button>
                                        <span className="qty-val">{item.q}</span>
                                        <button className="qty-btn" onClick={() => updateQty(i, 1)}>+</button>
                                    </div>

                                    <div className="r-name">{item.n}</div>
                                    <div className="r-price">{formatMoney(item.p * item.q)}</div>
                                    <div className="r-del" onClick={() => updateQty(i, -item.q)}>
                                        <Icons.Trash />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="receipt-footer">
                            <div className="rf-line sub">
                                <span>SOUS-TOTAL HT</span>
                                <span>{formatMoney(totals.subtotal)}</span>
                            </div>
                            {totals.discountAmount > 0 && (
                                <div className="rf-line disc">
                                    <span>REMISE ({totals.discountPct}%)</span>
                                    <span>- {formatMoney(totals.discountAmount)}</span>
                                </div>
                            )}
                            
                            <div className="rf-total-section">
                                <span className="rf-label">TOTAL NET</span>
                                <span className="rf-total">{formatMoney(totals.final)}</span>
                            </div>

                            <div className="receipt-actions">
                                <button className="btn-checkout" onClick={submitInvoice}>
                                    ENCAISSER
                                </button>
                                {cart.length > 0 && (
                                    <button className="btn-cancel" onClick={clearCart}>
                                        ANNULER / VIDER
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'direction' && (
                <div style={{maxWidth:'900px', margin:'0 auto'}}>
                    {!adminUnlocked ? (
                        <div className="pin-container">
                            <div style={{marginBottom:'40px', textAlign:'center'}}>
                                <div style={{width:'80px', height:'80px', background:'rgba(20,20,20,0.5)', border:'2px solid var(--accent)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent)', margin:'0 auto 20px', boxShadow:'0 0 40px rgba(197, 160, 101, 0.15)'}}>
                                    <Icons.Lock />
                                </div>
                                <h2 style={{fontSize:'2rem', fontFamily:'var(--font-display)', color:'white', margin:'0 0 10px 0', letterSpacing:'2px'}}>SÉCURITÉ</h2>
                                <p style={{color:'var(--text-muted)', fontSize:'0.9rem', margin:0}}>Accès restreint à la direction</p>
                            </div>

                            <div className={`pin-display ${shakeError ? 'shake' : ''} ${successUnlock ? 'unlock-success' : ''}`}>
                                {adminPin.length > 0 ? (
                                    <div style={{display:'flex', gap:'12px'}}>
                                        {[...Array(adminPin.length)].map((_, i) => (
                                            <div key={i} className="pin-dot"></div>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{opacity:0.3, fontSize:'0.9rem', letterSpacing:'4px', fontFamily:'var(--font-ui)', textTransform:'uppercase'}}>SAISIR CODE</span>
                                )}
                            </div>
                            <div style={{marginTop:'40px', textAlign:'center'}}>
                                 <p style={{fontSize:'0.9rem', color:'#888', fontFamily:'var(--font-ui)'}}>
                                    Utilisez votre clavier pour entrer le code de sécurité.
                                </p>
                                <p style={{fontSize:'0.75rem', color:'#555', fontFamily:'var(--font-mono)', marginTop:'10px'}}>
                                    [0-9] • [ENTER] pour valider
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{animation:'fadeIn 0.5s ease'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'40px'}}>
                                <div>
                                    <h2 style={{fontSize:'2rem', fontFamily:'var(--font-display)', margin:0, color:'var(--accent)'}}>Panel Direction</h2>
                                    <p style={{margin:0, color:'var(--text-muted)'}}>Gestion RH et Administrative</p>
                                </div>
                                <button onClick={() => setAdminUnlocked(false)} style={{cursor:'pointer', width:'auto', background:'rgba(255,255,255,0.05)', border:'none', padding:'10px 20px', borderRadius:'8px', color:'white'}}>Verrouiller</button>
                            </div>
                            <div className="admin-grid">
                                {[
                                    {id: 'recrutement', label: 'Recrutement', icon: '📝'},
                                    {id: 'convocation', label: 'Convocation', icon: '✉️'},
                                    {id: 'avertissement', label: 'Avertissement', icon: '⚠️'},
                                    {id: 'licenciement', label: 'Licenciement', icon: '🚫'},
                                    {id: 'depense', label: 'Déclarer Frais', icon: '💸'}
                                ].map(action => (
                                    <div key={action.id} className="admin-card" onClick={() => openAdminModal(action.id)}>
                                        <div className="admin-icon">{action.icon}</div>
                                        <div style={{fontWeight:600, fontSize:'1.1rem'}}>{action.label}</div>
                                        <div style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>Créer un nouveau dossier</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === 'annuaire' && (
                <div>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'40px'}}>
                          <div>
                              <h2 style={{fontSize:'2rem', fontFamily:'var(--font-display)', margin:0, color:'var(--accent)'}}>Répertoire Staff</h2>
                              <p style={{margin:0, color:'var(--text-muted)'}}>Liste des employés actifs</p>
                          </div>
                          <button onClick={() => setAddContactModal(true)} style={{cursor:'pointer', width:'auto', background:'var(--accent)', color:'black', fontWeight:700, border:'none', padding:'14px 24px', borderRadius:'12px'}}>+ Ajouter</button>
                      </div>
                    
                    <div className="contact-grid">
                        {/* On combine l'annuaire local et la liste API si besoin, ici on garde le local pour l'édition rapide */}
                        {directory.map((contact, i) => (
                            <div key={i} className="contact-card">
                                {contact.photo ? <img src={contact.photo} className="contact-img" /> : <div className="contact-placeholder">{contact.nom[0]}</div>}
                                <div>
                                    <div style={{fontWeight:600, fontSize:'1.1rem', color:'var(--text-main)'}}>{contact.prenom} {contact.nom}</div>
                                    <div style={{fontSize:'0.85rem', color:'var(--accent)', fontWeight:500, margin:'4px 0', textTransform:'uppercase', letterSpacing:'1px'}}>{contact.grade}</div>
                                    <div style={{fontSize:'0.9rem', color:'var(--text-muted)'}}>{contact.tel}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL AJOUT CONTACT */}
            {addContactModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-header">
                            <span className="modal-title">Nouveau Membre</span>
                            <div style={{cursor:'pointer'}} onClick={() => setAddContactModal(false)}><Icons.Close/></div>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Nom</label>
                                <input className="form-input" placeholder="Nom de famille" value={newContact.nom} onChange={e => setNewContact({...newContact, nom: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Prénom</label>
                                <input className="form-input" placeholder="Prénom" value={newContact.prenom} onChange={e => setNewContact({...newContact, prenom: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Grade</label>
                                <input className="form-input" placeholder="Poste" value={newContact.grade} onChange={e => setNewContact({...newContact, grade: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Numéro</label>
                                <input className="form-input" placeholder="555-XXXX" value={newContact.tel} onChange={e => setNewContact({...newContact, tel: e.target.value})} />
                            </div>
                             <div className="form-group">
                                <label className="form-label">Photo (URL)</label>
                                <input className="form-input" placeholder="https://..." value={newContact.photo} onChange={e => setNewContact({...newContact, photo: e.target.value})} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" style={{width:'auto'}} onClick={() => setAddContactModal(false)}>Annuler</button>
                            <button className="btn-primary-large" style={{width:'auto', padding:'12px 24px'}} onClick={saveContact}>Sauvegarder</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DIRECTION FORMULAIRES */}
            {activeAdminModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-header">
                            <span className="modal-title" style={{textTransform:'capitalize'}}>
                                Dossier: {activeAdminModal}
                            </span>
                            <div style={{cursor:'pointer'}} onClick={() => setActiveAdminModal(null)}><Icons.Close/></div>
                        </div>
                        
                        <div className="modal-body">
                            
                            {/* FORMULAIRE RECRUTEMENT */}
                            {activeAdminModal === 'recrutement' && (
                                <>
                                    <div style={{display:'flex', gap:'16px'}}>
                                        <div className="form-group" style={{flex:1}}>
                                            <label className="form-label">Nom</label>
                                            <input className="form-input" placeholder="Nom" onChange={e => setAdminFormData({...adminFormData, nom: e.target.value})} />
                                        </div>
                                        <div className="form-group" style={{flex:1}}>
                                            <label className="form-label">Prénom</label>
                                            <input className="form-input" placeholder="Prénom" onChange={e => setAdminFormData({...adminFormData, prenom: e.target.value})} />
                                        </div>
                                    </div>
                                    <div style={{display:'flex', gap:'16px'}}>
                                        <div className="form-group" style={{flex:1}}>
                                            <label className="form-label">Poste Visé</label>
                                            <select className="form-select" onChange={e => setAdminFormData({...adminFormData, poste: e.target.value})}>
                                                <option value="">Sélectionner...</option>
                                                <option value="Tatoueur">Tatoueur</option>
                                                <option value="Coiffeur">Coiffeur</option>
                                                <option value="Piercieur / Laser">Piercieur / Laser</option>
                                                <option value="Accueil / Management">Accueil / Management</option>
                                                <option value="Apprenti">Apprenti</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{flex:1}}>
                                            <label className="form-label">Téléphone</label>
                                            <input className="form-input" placeholder="555-XXXX" onChange={e => setAdminFormData({...adminFormData, tel: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Qualités</label>
                                        <div style={{display:'flex', gap:'10px'}}>
                                            <input className="form-input" placeholder="Qualité 1" onChange={e => setAdminFormData({...adminFormData, q1: e.target.value})} />
                                            <input className="form-input" placeholder="Qualité 2" onChange={e => setAdminFormData({...adminFormData, q2: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Défauts</label>
                                        <div style={{display:'flex', gap:'10px'}}>
                                            <input className="form-input" placeholder="Défaut 1" onChange={e => setAdminFormData({...adminFormData, d1: e.target.value})} />
                                            <input className="form-input" placeholder="Défaut 2" onChange={e => setAdminFormData({...adminFormData, d2: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Notes de l'entretien</label>
                                        <textarea className="form-textarea" placeholder="Remarques..." onChange={e => setAdminFormData({...adminFormData, notes: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Décision</label>
                                        <select className="form-select" onChange={e => setAdminFormData({...adminFormData, resultat: e.target.value})}>
                                            <option value="">...</option>
                                            <option value="Accepté">✅ Accepté</option>
                                            <option value="Essai">⚠️ Essai</option>
                                            <option value="Refusé">❌ Refusé</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* FORMULAIRE CONVOCATION */}
                            {activeAdminModal === 'convocation' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Employé</label>
                                        <select className="form-select" onChange={e => setAdminFormData({...adminFormData, target: e.target.value})}>
                                            <option value="">Sélectionner...</option>
                                            {employeesList.map((c,i) => <option key={i} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div style={{display:'flex', gap:'16px'}}>
                                        <div className="form-group" style={{flex:1}}>
                                            <label className="form-label">Date & Heure</label>
                                            <input className="form-input" placeholder="Date" onChange={e => setAdminFormData({...adminFormData, date: e.target.value})} />
                                        </div>
                                        <div className="form-group" style={{flex:1}}>
                                            <label className="form-label">Urgence</label>
                                            <select className="form-select" onChange={e => setAdminFormData({...adminFormData, urgence: e.target.value})}>
                                                <option value="Standard">Standard</option>
                                                <option value="Haute">Haute</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Motif</label>
                                        <textarea className="form-textarea" onChange={e => setAdminFormData({...adminFormData, motif: e.target.value})} />
                                    </div>
                                </>
                            )}

                            {/* FORMULAIRE AVERTISSEMENT */}
                            {activeAdminModal === 'avertissement' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Employé</label>
                                        <select className="form-select" onChange={e => setAdminFormData({...adminFormData, target: e.target.value})}>
                                            <option value="">Sélectionner...</option>
                                            {employeesList.map((c,i) => <option key={i} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Gravité</label>
                                        <select className="form-select" onChange={e => setAdminFormData({...adminFormData, severity: e.target.value})}>
                                            <option value="1 - Rappel">🟢 1 - Rappel Verbal</option>
                                            <option value="2 - Avertissement">🟠 2 - Avertissement Écrit</option>
                                            <option value="3 - Blâme">🔴 3 - Blâme / Mise à pied</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Preuve (URL)</label>
                                        <input className="form-input" onChange={e => setAdminFormData({...adminFormData, proof: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Motif</label>
                                        <textarea className="form-textarea" onChange={e => setAdminFormData({...adminFormData, motif: e.target.value})} />
                                    </div>
                                </>
                            )}

                            {/* FORMULAIRE LICENCIEMENT */}
                            {activeAdminModal === 'licenciement' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Employé</label>
                                        <select className="form-select" onChange={e => setAdminFormData({...adminFormData, target: e.target.value})}>
                                            <option value="">Sélectionner...</option>
                                            {employeesList.map((c,i) => <option key={i} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Blacklist</label>
                                        <select className="form-select" onChange={e => setAdminFormData({...adminFormData, blacklisted: e.target.value})}>
                                            <option value="Non">Non</option>
                                            <option value="Oui">Oui (Interdiction)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Motif</label>
                                        <textarea className="form-textarea" onChange={e => setAdminFormData({...adminFormData, motif: e.target.value})} />
                                    </div>
                                </>
                            )}

                            {/* FORMULAIRE DEPENSE */}
                            {activeAdminModal === 'depense' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Objet</label>
                                        <input className="form-input" onChange={e => setAdminFormData({...adminFormData, item: e.target.value})} />
                                    </div>
                                    <div style={{display:'flex', gap:'16px'}}>
                                        <div className="form-group" style={{flex:1}}>
                                            <label className="form-label">Montant ($)</label>
                                            <input type="number" className="form-input" onChange={e => setAdminFormData({...adminFormData, amount: e.target.value})} />
                                        </div>
                                        <div className="form-group" style={{flex:1}}>
                                            <label className="form-label">Méthode</label>
                                            <select className="form-select" onChange={e => setAdminFormData({...adminFormData, method: e.target.value})}>
                                                <option value="Espèces">Espèces</option>
                                                <option value="Virement">Virement</option>
                                                <option value="Personnel">Avance Perso</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Preuve (URL)</label>
                                        <input className="form-input" onChange={e => setAdminFormData({...adminFormData, proof: e.target.value})} />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" style={{width:'auto'}} onClick={() => setActiveAdminModal(null)}>Annuler</button>
                            <button className="btn-primary-large" style={{width:'auto', padding:'12px 24px'}} onClick={submitAdminForm}>Transmettre</button>
                        </div>
                    </div>
                </div>
            )}
          </main>
      </div>
    </div>
  );
}
