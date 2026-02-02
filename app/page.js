// app/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/* --------------------------------- UTILS -------------------------------- */

const API = async (action, data) => {
  const res = await fetch("/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || "Erreur serveur");
  return json;
};

const randomInvoice = () => `INV-${Math.floor(Math.random() * 1_000_000)}`;

function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState];
}

const cx = (...c) => c.filter(Boolean).join(" ");

function money(symbol, n) {
  const v = Number(n || 0);
  return `${symbol}${v.toFixed(2)}`;
}

/* ------------------------------- UI ATOMS ------------------------------- */

function Button({ variant = "primary", className = "", ...props }) {
  return (
    <button
      className={cx("btn", `btn-${variant}`, className)}
      {...props}
    />
  );
}

function Card({ className = "", ...props }) {
  return <div className={cx("card", className)} {...props} />;
}

function Field({ label, children }) {
  return (
    <div className="field">
      <div className="label">{label}</div>
      {children}
    </div>
  );
}

function Badge({ children, tone = "info" }) {
  return <span className={cx("badge", `badge-${tone}`)}>{children}</span>;
}

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div className="modalTitle">{title}</div>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
        <div className="modalBody">{children}</div>
        {footer ? <div className="modalFoot">{footer}</div> : null}
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={cx("toast", `toast-${toast.t}`)}>
      <div className="toastTitle">{toast.t.toUpperCase()}</div>
      <div className="toastMsg">{toast.m}</div>
    </div>
  );
}

function InitialAvatar({ name }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="avatarFallback">
      {initial}
    </div>
  );
}

/* --------------------------------- PAGE -------------------------------- */

export default function VespucciTitanium() {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useLocalStorageState("vespucci_user", "");
  const [view, setView] = useState(user ? "app" : "login");

  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);

  // POS
  const [search, setSearch] = useState("");
  const [openCat, setOpenCat] = useState(null);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(randomInvoice());
  const [enterprise, setEnterprise] = useState("");
  const [discountActivated, setDiscountActivated] = useState(false);
  const [employeeCard, setEmployeeCard] = useState(false);

  // Direction
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState("");

  // HR Modal
  const [hrModal, setHrModal] = useState(null);
  const [hrTarget, setHrTarget] = useState("");
  const [hrDate, setHrDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hrReason, setHrReason] = useState("");
  const [hrDetails, setHrDetails] = useState("");

  const currencySymbol = meta?.currencySymbol || "$";
  const role = meta?.employeeDiscounts?.[user]?.role || "Employé";
  const employeeDiscountPct = meta?.employeeDiscounts?.[user]?.discount ?? 0;

  const enterpriseDiscountPct =
    enterprise && meta?.enterprises?.[enterprise] ? meta.enterprises[enterprise].discount || 0 : 0;

  const appliedDiscountPct = discountActivated
    ? enterprise
      ? enterpriseDiscountPct
      : employeeDiscountPct
    : 0;

  const discountType = discountActivated ? (enterprise ? "Entreprise" : "Employé") : "Aucune";

  const notify = (m, t = "info") => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3200);
  };

  const loadMeta = async () => {
    try {
      setLoading(true);
      const m = await API("getMeta");
      setMeta(m);
    } catch (e) {
      notify(`Erreur chargement: ${e?.message || e}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  // Derived: filtered categories/products
  const filteredCategories = useMemo(() => {
    if (!meta) return [];
    const q = search.trim().toLowerCase();
    const cats = Object.keys(meta.productsByCategory || {});
    if (!q) return cats;
    return cats.filter((cat) => (meta.productsByCategory[cat] || []).some((p) => p.toLowerCase().includes(q)));
  }, [meta, search]);

  const productsOfCat = (cat) => {
    const list = meta?.productsByCategory?.[cat] || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.toLowerCase().includes(q));
  };

  // Cart totals
  const subtotal = useMemo(() => cart.reduce((s, it) => s + it.qty * it.pu, 0), [cart]);
  const discountAmount = useMemo(
    () => +(subtotal * (appliedDiscountPct / 100)).toFixed(2),
    [subtotal, appliedDiscountPct]
  );
  const total = useMemo(() => +(subtotal - discountAmount).toFixed(2), [subtotal, discountAmount]);

  const addToCart = (desc) => {
    if (!meta) return;
    const pu = meta.prices?.[desc] ?? 0;
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.desc === desc);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { desc, qty: 1, pu }];
    });
  };

  const modQty = (desc, delta) => {
    setCart((prev) =>
      prev
        .map((it) => (it.desc === desc ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0)
    );
  };

  const clearCart = () => setCart([]);

  const submitInvoice = async () => {
    if (!meta) return;
    if (!user) return notify("Session invalide", "error");
    if (cart.length === 0) return notify("Panier vide", "error");

    try {
      await API("sendFactures", {
        employee: user,
        invoiceNumber,
        enterprise,
        customerName,
        employeeCard,
        discountActivated,
        items: cart.map((i) => ({ desc: i.desc, qty: i.qty })),
      });

      notify("Facture envoyée et enregistrée.", "success");
      clearCart();
      setCustomerName("");
      setInvoiceNumber(randomInvoice());
      setEnterprise("");
      setDiscountActivated(false);
      setEmployeeCard(false);
    } catch (e) {
      notify(e?.message || "Erreur envoi facture", "error");
    }
  };

  const openHR = (type) => {
    const map = {
      recrutement: { title: "➕ Recrutement", targetLabel: "EMPLOYÉ CIBLE" },
      convocation: { title: "📋 Convocation", targetLabel: "EMPLOYÉ CIBLE" },
      avertissement: { title: "⚠️ Avertissement", targetLabel: "EMPLOYÉ CIBLE" },
      licenciement: { title: "🔴 Licenciement", targetLabel: "EMPLOYÉ CIBLE" },
      demission: { title: "📝 Démission", targetLabel: "EMPLOYÉ CIBLE" },
      depense: { title: "💸 Dépense Entreprise", targetLabel: "MONTANT" },
    };

    setHrModal({ type, ...map[type] });
    setHrTarget("");
    setHrReason("");
    setHrDetails("");
    setHrDate(new Date().toISOString().slice(0, 10));
  };

  const submitHR = async () => {
    if (!meta) return;
    if (!user) return notify("Session invalide", "error");
    if (!hrModal) return;

    try {
      const isExpense = hrModal.type === "depense";
      const payload = {
        type: hrModal.type,
        initiatedBy: user,
        reason: hrReason,
        date: hrDate,
        details: hrDetails,
      };
      if (isExpense) payload.amount = hrTarget;
      else payload.employeeTarget = hrTarget;

      await API("sendHR", payload);

      notify("Dossier transmis.", "success");
      setHrModal(null);
    } catch (e) {
      notify(e?.message || "Erreur RH", "error");
    }
  };

  const logout = () => {
    setUser("");
    setView("login");
    setTab("dashboard");
    setAdminUnlocked(false);
    notify("Déconnecté.", "info");
  };

  // Auto-switch if user exists
  useEffect(() => {
    setView(user ? "app" : "login");
  }, [user]);

  const countItems = cart.reduce((s, i) => s + i.qty, 0);

  if (loading && !meta) {
    return (
      <div className="screenCenter">
        <div className="loaderCard">
          <div className="loaderTitle">VESPUCCI</div>
          <div className="loaderSub">Synchronisation Google Sheets...</div>
          <div className="loaderBar" />
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        :root{
          --bg0:#05060b;
          --bg1:#070816;
          --panel: rgba(14, 18, 35, .62);
          --panel2: rgba(10, 12, 22, .72);
          --border: rgba(255,255,255,.08);
          --border2: rgba(255,255,255,.14);
          --txt:#eaf0ff;
          --muted:#a8b3d6;
          --muted2:#7b86aa;

          --c1:#06b6d4;
          --c2:#3b82f6;
          --c3:#8b5cf6;
          --ok:#10b981;
          --err:#ef4444;
          --warn:#f59e0b;

          --shadow: 0 22px 60px rgba(0,0,0,.55);
          --radius: 18px;
          --radius2: 24px;
          --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          --ui: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }

        *{ box-sizing:border-box; }
        body{
          margin:0;
          color:var(--txt);
          font-family:var(--ui);
          min-height:100vh;
          background:
            radial-gradient(1200px 600px at 20% 0%, rgba(59,130,246,.25), transparent 55%),
            radial-gradient(900px 500px at 90% 20%, rgba(139,92,246,.22), transparent 58%),
            radial-gradient(900px 700px at 40% 90%, rgba(6,182,212,.18), transparent 60%),
            linear-gradient(180deg, var(--bg1), var(--bg0));
          overflow-x:hidden;
        }

        .screenCenter{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
        }

        .loaderCard{
          width:min(520px, 94vw);
          padding:26px;
          border:1px solid var(--border);
          border-radius:var(--radius2);
          background: var(--panel);
          box-shadow: var(--shadow);
          backdrop-filter: blur(18px) saturate(160%);
        }
        .loaderTitle{ font-weight:900; letter-spacing:.18em; font-size:20px; }
        .loaderSub{ margin-top:8px; color:var(--muted); }
        .loaderBar{
          height:10px; border-radius:999px;
          margin-top:16px;
          background: linear-gradient(90deg, rgba(6,182,212,.15), rgba(59,130,246,.5), rgba(139,92,246,.15));
          position:relative;
          overflow:hidden;
        }
        .loaderBar:before{
          content:"";
          position:absolute; inset:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent);
          transform: translateX(-100%);
          animation: shimmer 1.1s infinite;
        }
        @keyframes shimmer{ to{ transform: translateX(100%); } }

        .app{
          max-width: 1400px;
          margin: 0 auto;
          padding: 18px;
          padding-bottom: 80px;
        }

        .topbar{
          position: sticky;
          top: 12px;
          z-index: 40;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 14px;
          padding: 14px 14px;
          border-radius: var(--radius2);
          border: 1px solid var(--border);
          background: rgba(10, 12, 22, .62);
          backdrop-filter: blur(18px) saturate(170%);
          box-shadow: 0 10px 40px rgba(0,0,0,.35);
        }

        .brand{
          display:flex; align-items:center; gap:12px;
          cursor:pointer;
          user-select:none;
        }
        .brandLogo{
          width:42px; height:42px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--c1), var(--c2));
          box-shadow: 0 10px 25px rgba(6,182,212,.22);
          display:flex; align-items:center; justify-content:center;
          font-weight:900;
        }
        .brandTitle{ font-weight:900; letter-spacing:.12em; }
        .brandSub{ font-size:12px; color:var(--muted); margin-top:2px; }

        .tabs{
          display:flex; gap:10px;
          flex-wrap:wrap;
          justify-content:center;
        }

        .userBox{
          display:flex; align-items:center; gap:12px;
        }
        .userName{ font-weight:900; text-align:right; }
        .userRole{ font-size:12px; color: rgba(6,182,212,.95); font-weight:900; text-align:right; }

        .card{
          background: var(--panel);
          border: 1px solid var(--border);
          border-top: 1px solid var(--border2);
          border-radius: var(--radius2);
          box-shadow: var(--shadow);
          backdrop-filter: blur(18px) saturate(160%);
        }

        .btn{
          height: 44px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid transparent;
          font-weight: 900;
          letter-spacing: .06em;
          text-transform: uppercase;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          transition: transform .12s ease, filter .12s ease, border-color .12s ease;
          user-select:none;
        }
        .btn:active{ transform: translateY(1px); }
        .btn-primary{
          background: linear-gradient(135deg, var(--c1), var(--c2));
          color:white;
          box-shadow: 0 12px 28px rgba(59,130,246,.18);
        }
        .btn-ghost{
          background: rgba(255,255,255,.04);
          border-color: var(--border);
          color: var(--muted);
        }
        .btn-danger{
          background: rgba(239,68,68,.12);
          border-color: rgba(239,68,68,.22);
          color: #ffb4b4;
        }

        input, select, textarea{
          width: 100%;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: rgba(0,0,0,.35);
          padding: 12px 12px;
          color: var(--txt);
          outline:none;
          font-family: var(--ui);
        }
        textarea{ resize: vertical; min-height: 104px; }

        .field .label{
          font-size: 11px;
          letter-spacing: .16em;
          font-weight: 900;
          color: var(--muted2);
          margin: 6px 0 8px;
        }

        .badge{
          display:inline-flex;
          align-items:center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .05em;
          border: 1px solid var(--border);
          background: rgba(255,255,255,.04);
          color: var(--muted);
        }
        .badge-info{ border-color: rgba(6,182,212,.24); color: rgba(6,182,212,.95); background: rgba(6,182,212,.08); }
        .badge-ok{ border-color: rgba(16,185,129,.24); color: rgba(16,185,129,.95); background: rgba(16,185,129,.08); }
        .badge-warn{ border-color: rgba(245,158,11,.24); color: rgba(245,158,11,.95); background: rgba(245,158,11,.08); }

        .grid{
          display:grid;
          gap: 16px;
        }
        .gridDash{
          grid-template-columns: repeat(4, 1fr);
        }

        .widget{
          padding: 18px;
          border-radius: var(--radius2);
          border: 1px solid var(--border);
          background: rgba(14, 18, 35, .42);
          cursor:pointer;
          transition: transform .15s ease, border-color .15s ease;
          min-height: 150px;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }
        .widget:hover{
          transform: translateY(-2px);
          border-color: rgba(6,182,212,.35);
        }
        .widgetBig{ grid-column: span 2; grid-row: span 2; min-height: 316px; }
        .widgetWide{ grid-column: span 4; min-height: 92px; cursor: default; }

        .stat{
          font-family: var(--mono);
          font-size: 34px;
          font-weight: 900;
        }
        .muted{ color: var(--muted); }
        .mono{ font-family: var(--mono); }

        .pos{
          display:grid;
          grid-template-columns: 2fr 1.1fr;
          gap: 16px;
          align-items: start;
        }

        .catalog{
          padding: 14px;
          overflow: hidden;
        }
        .catalogTop{
          display:flex;
          gap: 10px;
          margin-bottom: 10px;
        }

        .accordion{
          overflow-y: auto;
          max-height: calc(100vh - 200px);
          padding-right: 6px;
        }
        .cat{
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          background: rgba(0,0,0,.20);
          margin-bottom: 10px;
        }
        .catHead{
          padding: 14px 14px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          cursor:pointer;
        }
        .catHead:hover{ background: rgba(255,255,255,.03); }
        .catBody{
          padding: 12px;
          display:grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
        }
        .prod{
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px;
          background: rgba(255,255,255,.03);
          cursor:pointer;
          transition: border-color .12s ease, transform .12s ease;
          text-align:center;
        }
        .prod:hover{
          border-color: rgba(6,182,212,.35);
          transform: translateY(-1px);
        }
        .price{
          margin-top: 8px;
          font-family: var(--mono);
          font-weight: 900;
          color: rgba(6,182,212,.95);
        }

        .ticket{
          border-radius: var(--radius2);
          border: 1px solid var(--border);
          background: var(--panel2);
          overflow: hidden;
        }
        .ticketHead{
          padding: 16px;
          border-bottom: 1px dashed rgba(255,255,255,.12);
        }
        .ticketBody{
          padding: 14px;
          max-height: calc(100vh - 420px);
          overflow-y: auto;
        }
        .ticketFoot{
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,.08);
          background: rgba(8,10,18,.72);
          position: sticky;
          bottom: 0;
        }

        .cartItem{
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.03);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          margin-bottom: 10px;
        }

        .qty{
          display:flex;
          align-items:center;
          gap: 8px;
        }
        .qtyBtn{
          width: 40px;
          height: 40px;
          padding:0;
        }

        .row{
          display:flex;
          justify-content:space-between;
          margin-bottom: 8px;
          color: var(--muted);
          font-size: 14px;
        }
        .row strong{ color: var(--txt); }

        .toast{
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 99;
          min-width: 260px;
          max-width: 360px;
          padding: 14px 14px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: rgba(10,12,22,.84);
          backdrop-filter: blur(14px);
          box-shadow: 0 16px 40px rgba(0,0,0,.45);
        }
        .toastTitle{ font-weight: 900; letter-spacing: .12em; font-size: 12px; }
        .toastMsg{ margin-top: 6px; color: var(--muted); }
        .toast-info .toastTitle{ color: rgba(6,182,212,.95); }
        .toast-success .toastTitle{ color: rgba(16,185,129,.95); }
        .toast-error .toastTitle{ color: rgba(239,68,68,.95); }

        .modalOverlay{
          position: fixed; inset:0;
          z-index: 80;
          background: rgba(0,0,0,.72);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 18px;
        }
        .modal{
          width: min(560px, 95vw);
          border-radius: var(--radius2);
          border: 1px solid var(--border);
          background: rgba(12,14,26,.86);
          backdrop-filter: blur(18px) saturate(160%);
          box-shadow: var(--shadow);
          overflow:hidden;
        }
        .modalHead{
          padding: 14px 14px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .modalTitle{ font-weight: 900; letter-spacing: .08em; }
        .modalBody{ padding: 14px; }
        .modalFoot{ padding: 14px; border-top: 1px solid rgba(255,255,255,.08); }

        .avatarFallback{
          width: 74px; height: 74px;
          border-radius: 999px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight: 900;
          font-size: 28px;
          border: 1px solid rgba(255,255,255,.14);
          background: linear-gradient(135deg, rgba(6,182,212,.25), rgba(59,130,246,.25));
        }

        .directoryGrid{
          display:grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
        }

        @media (max-width: 980px){
          .gridDash{ grid-template-columns: repeat(2, 1fr); }
          .widgetWide{ grid-column: span 2; }
          .pos{ grid-template-columns: 1fr; }
          .accordion{ max-height: 56vh; }
          .ticketBody{ max-height: 36vh; }
        }
      `}</style>

      <Toast toast={toast} />

      {/* ------------------------------ LOGIN ------------------------------ */}
      {view === "login" ? (
        <div className="screenCenter">
          <Card className="loaderCard">
            <div className="loaderTitle">VESPUCCI</div>
            <div className="loaderSub">Titanium Terminal • v{meta?.version || "—"}</div>

            <div style={{ marginTop: 16 }}>
              <Field label="IDENTIFIANT (Sheets)">
                <select value={user} onChange={(e) => setUser(e.target.value)}>
                  <option value="">Choisir une identité...</option>
                  {meta?.employees?.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </Field>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                <Button
                  variant="primary"
                  disabled={!user}
                  onClick={() => {
                    if (!user) return;
                    setView("app");
                    notify(`Bienvenue ${user}`, "success");
                  }}
                >
                  Initialiser la session
                </Button>

                <Button variant="ghost" onClick={loadMeta}>
                  Synchroniser Sheet
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="app">
          {/* ------------------------------ TOPBAR ------------------------------ */}
          <header className="topbar">
            <div className="brand" onClick={() => setTab("dashboard")}>
              <div className="brandLogo">V</div>
              <div>
                <div className="brandTitle">VESPUCCI</div>
                <div className="brandSub">Manager • v{meta?.version || "—"}</div>
              </div>
            </div>

            <div className="tabs">
              <Button variant={tab === "dashboard" ? "primary" : "ghost"} onClick={() => setTab("dashboard")}>
                Dashboard
              </Button>
              <Button variant={tab === "invoice" ? "primary" : "ghost"} onClick={() => setTab("invoice")}>
                Caisse
              </Button>
              <Button variant={tab === "direction" ? "primary" : "ghost"} onClick={() => setTab("direction")}>
                Direction
              </Button>
              <Button variant={tab === "annuaire" ? "primary" : "ghost"} onClick={() => setTab("annuaire")}>
                Annuaire
              </Button>
            </div>

            <div className="userBox">
              <div>
                <div className="userName">{user}</div>
                <div className="userRole">{role}</div>
              </div>
              <Button variant="danger" onClick={logout}>
                Off
              </Button>
            </div>
          </header>

          {/* ------------------------------ DASHBOARD ------------------------------ */}
          {tab === "dashboard" && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-.02em" }}>Aperçu Global</div>
                  <div className="muted">
                    Employés: <span className="mono">{meta?.totals?.employees || 0}</span> • Produits:{" "}
                    <span className="mono">{meta?.totals?.products || 0}</span>
                  </div>
                </div>
                <Button variant="ghost" onClick={loadMeta}>Sync Sheet</Button>
              </div>

              <div className="grid gridDash">
                <div className="widget widgetBig" onClick={() => setTab("invoice")}>
                  <div>
                    <Badge tone="info">MODULE VENTE</Badge>
                    <div className="stat" style={{ marginTop: 12 }}>CAISSE</div>
                    <div className="muted" style={{ marginTop: 8 }}>
                      Catalogue • Factures • Remises
                    </div>
                  </div>
                  <Button variant="primary">Ouvrir</Button>
                </div>

                <div className="widget" onClick={() => setTab("direction")}>
                  <Badge tone="warn">ADMIN</Badge>
                  <div className="stat">RH</div>
                  <div className="muted">Dossiers staff & dépenses</div>
                </div>

                <div className="widget" onClick={() => setTab("annuaire")}>
                  <Badge tone="ok">CONTACTS</Badge>
                  <div className="stat">TEL</div>
                  <div className="muted">Annuaire depuis Sheets</div>
                </div>

                <div className="widget widgetWide">
                  <div>
                    <div style={{ fontWeight: 900, letterSpacing: ".08em" }}>SYSTÈME OPÉRATIONNEL</div>
                    <div className="muted">Données live depuis Google Sheets</div>
                  </div>
                  <div className="mono" style={{ color: "rgba(6,182,212,.95)", fontWeight: 900 }}>
                    {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------ CAISSE ------------------------------ */}
          {tab === "invoice" && (
            <div style={{ marginTop: 16 }}>
              <div className="pos">
                <Card className="catalog">
                  <div className="catalogTop">
                    <input
                      placeholder="Rechercher un service..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearch("");
                        setOpenCat(null);
                      }}
                    >
                      Reset
                    </Button>
                  </div>

                  <div className="accordion">
                    {filteredCategories.map((cat) => (
                      <div className="cat" key={cat}>
                        <div
                          className="catHead"
                          onClick={() => setOpenCat((prev) => (prev === cat ? null : cat))}
                        >
                          <div style={{ fontWeight: 900 }}>{cat}</div>
                          <div className="muted">{openCat === cat ? "▲" : "▼"}</div>
                        </div>

                        {openCat === cat && (
                          <div className="catBody">
                            {productsOfCat(cat).map((p) => (
                              <div key={p} className="prod" onClick={() => addToCart(p)}>
                                <div style={{ fontWeight: 900, fontSize: 13 }}>{p}</div>
                                <div className="price">{money(currencySymbol, meta?.prices?.[p] ?? 0)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="ticket">
                  <div className="ticketHead">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900, letterSpacing: ".12em" }}>TICKET</div>
                      <Badge tone="info">{countItems} items</Badge>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                      <Field label="CLIENT">
                        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                      </Field>
                      <Field label="ID FACTURE">
                        <input value={invoiceNumber} readOnly className="mono" style={{ opacity: 0.75 }} />
                      </Field>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Field label="ENTREPRISE">
                        <select value={enterprise} onChange={(e) => setEnterprise(e.target.value)}>
                          <option value="">Aucune entreprise</option>
                          {Object.keys(meta?.enterprises || {}).map((k) => (
                            <option key={k} value={k}>
                              {k} (-{meta?.enterprises?.[k]?.discount ?? 0}%)
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="OPTIONS">
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontWeight: 900 }}>
                            <input type="checkbox" checked={discountActivated} onChange={(e) => setDiscountActivated(e.target.checked)} />
                            Remise
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontWeight: 900 }}>
                            <input type="checkbox" checked={employeeCard} onChange={(e) => setEmployeeCard(e.target.checked)} />
                            Carte
                          </label>
                        </div>
                      </Field>
                    </div>

                    <div className="muted" style={{ marginTop: 6 }}>
                      Remise: <b style={{ color: "var(--txt)" }}>{discountType}</b> •{" "}
                      <b style={{ color: "rgba(6,182,212,.95)" }}>{appliedDiscountPct}%</b>
                    </div>
                  </div>

                  <div className="ticketBody">
                    {cart.length === 0 ? (
                      <div className="muted" style={{ textAlign: "center", marginTop: 18 }}>
                        Panier vide
                      </div>
                    ) : (
                      cart.map((it) => (
                        <div key={it.desc} className="cartItem">
                          <div>
                            <div style={{ fontWeight: 900 }}>{it.desc}</div>
                            <div className="muted mono" style={{ marginTop: 4 }}>
                              {money(currencySymbol, it.pu)} × {it.qty}
                            </div>
                          </div>
                          <div className="qty">
                            <Button className="qtyBtn" variant="ghost" onClick={() => modQty(it.desc, -1)}>-</Button>
                            <Button className="qtyBtn" variant="ghost" onClick={() => modQty(it.desc, +1)}>+</Button>
                            <Button className="qtyBtn" variant="danger" onClick={() => modQty(it.desc, -999)}>✕</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="ticketFoot">
                    <div className="row">
                      <span>Sous-total</span>
                      <strong className="mono">{money(currencySymbol, subtotal)}</strong>
                    </div>
                    <div className="row">
                      <span>Remise ({appliedDiscountPct}%)</span>
                      <strong className="mono" style={{ color: "rgba(16,185,129,.95)" }}>
                        -{money(currencySymbol, discountAmount)}
                      </strong>
                    </div>
                    <div className="row" style={{ paddingTop: 10, marginTop: 10, borderTop: "1px solid rgba(255,255,255,.10)" }}>
                      <span style={{ fontWeight: 900, letterSpacing: ".14em" }}>TOTAL NET</span>
                      <strong className="mono" style={{ color: "rgba(6,182,212,.95)", fontSize: 18 }}>
                        {money(currencySymbol, total)}
                      </strong>
                    </div>

                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <Button variant="primary" onClick={submitInvoice}>Encaisser</Button>
                      <Button variant="ghost" onClick={clearCart}>Vider panier</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------ DIRECTION ------------------------------ */}
          {tab === "direction" && (
            <div style={{ marginTop: 16 }}>
              {!adminUnlocked ? (
                <Card style={{ maxWidth: 560, margin: "56px auto", padding: 18, borderColor: "rgba(239,68,68,.22)" }}>
                  <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: ".08em" }}>Accès Direction</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Authentification requise (PIN vient du Sheet : <b>Config → ADMIN_PIN</b>)
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginTop: 14 }}>
                    <input placeholder="CODE PIN" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
                    <Button
                      variant="primary"
                      onClick={() => {
                        const pinSheet = meta?.ui?.adminPin || "";
                        if (pinSheet && adminPin === pinSheet) {
                          setAdminUnlocked(true);
                          notify("Accès accordé", "success");
                        } else {
                          notify("Code incorrect", "error");
                        }
                      }}
                    >
                      OK
                    </Button>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <Button variant="ghost" onClick={loadMeta}>Resync Sheet</Button>
                  </div>
                </Card>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 30, fontWeight: 900 }}>Panel Direction</div>
                      <div className="muted">RH + Dépenses (Sheets + Discord)</div>
                    </div>
                    <Button variant="ghost" onClick={() => { setAdminUnlocked(false); setAdminPin(""); }}>
                      Verrouiller
                    </Button>
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                    <div className="widget" onClick={() => openHR("recrutement")}>
                      <Badge tone="ok">RH</Badge>
                      <div className="stat">➕</div>
                      <div className="muted">Recrutement</div>
                    </div>
                    <div className="widget" onClick={() => openHR("convocation")}>
                      <Badge tone="info">RH</Badge>
                      <div className="stat">📋</div>
                      <div className="muted">Convocation</div>
                    </div>
                    <div className="widget" onClick={() => openHR("avertissement")}>
                      <Badge tone="warn">RH</Badge>
                      <div className="stat">⚠️</div>
                      <div className="muted">Avertissement</div>
                    </div>
                    <div className="widget" onClick={() => openHR("licenciement")}>
                      <Badge tone="warn">RH</Badge>
                      <div className="stat" style={{ color: "rgba(239,68,68,.95)" }}>⛔</div>
                      <div className="muted">Licenciement</div>
                    </div>
                    <div className="widget" onClick={() => openHR("demission")}>
                      <Badge tone="info">RH</Badge>
                      <div className="stat">📝</div>
                      <div className="muted">Démission</div>
                    </div>

                    <div className="widget" style={{ gridColumn: "span 2" }} onClick={() => openHR("depense")}>
                      <Badge tone="ok">FINANCE</Badge>
                      <div className="stat">💸</div>
                      <div className="muted">Déclaration de dépense</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ------------------------------ ANNUAIRE ------------------------------ */}
          {tab === "annuaire" && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 900 }}>Répertoire</div>
                  <div className="muted">Données récupérées depuis Google Sheets</div>
                </div>
                <Button variant="ghost" onClick={loadMeta}>Sync</Button>
              </div>

              <div className="directoryGrid">
                {(meta?.directory || []).map((c) => (
                  <Card key={c.name} style={{ padding: 16, textAlign: "center" }}>
                    {c.avatar ? (
                      <img
                        src={c.avatar}
                        alt={c.name}
                        style={{
                          width: 74,
                          height: 74,
                          borderRadius: 999,
                          objectFit: "cover",
                          border: "1px solid rgba(255,255,255,.14)",
                          marginBottom: 10,
                        }}
                      />
                    ) : (
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                        <InitialAvatar name={c.name} />
                      </div>
                    )}

                    <div style={{ fontWeight: 900 }}>{c.name}</div>
                    <div style={{ marginTop: 6 }}>
                      <Badge tone="info">{c.role || "—"}</Badge>
                    </div>

                    <div className="mono muted" style={{ marginTop: 10 }}>
                      {c.phone || "—"}
                    </div>

                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          if (!c.phone) return notify("Numéro manquant", "error");
                          await navigator.clipboard.writeText(c.phone);
                          notify("Numéro copié", "success");
                        }}
                      >
                        Copier
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------------ HR MODAL ------------------------------ */}
          <Modal
            open={!!hrModal}
            onClose={() => setHrModal(null)}
            title={hrModal?.title || "RH"}
            footer={
              <Button variant="primary" onClick={submitHR}>
                Confirmer l'envoi
              </Button>
            }
          >
            {hrModal && (
              <div className="grid" style={{ gap: 12 }}>
                <Field label={hrModal.targetLabel}>
                  <input
                    placeholder={hrModal.type === "depense" ? "ex: 325.75" : "Nom Prénom"}
                    value={hrTarget}
                    onChange={(e) => setHrTarget(e.target.value)}
                  />
                </Field>

                <Field label="DATE EFFECTIVE">
                  <input type="date" value={hrDate} onChange={(e) => setHrDate(e.target.value)} />
                </Field>

                <Field label="MOTIF / DESCRIPTION">
                  <textarea value={hrReason} onChange={(e) => setHrReason(e.target.value)} />
                </Field>

                <Field label={hrModal.type === "depense" ? "ENTREPRISE / FOURNISSEUR" : "DÉTAILS (OPTIONNEL)"}>
                  <input value={hrDetails} onChange={(e) => setHrDetails(e.target.value)} />
                </Field>
              </div>
            )}
          </Modal>
        </div>
      )}
    </>
  );
}
