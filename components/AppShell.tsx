import type { ReactNode } from "react";
import type { AppCopy } from "@/lib/i18n";
import type { AppPage, Language } from "@/lib/models";
import { InstallAppButton } from "@/components/InstallAppButton";

type AppShellProps = {
  children: ReactNode;
  page: AppPage;
  lang: Language;
  theme: "light" | "dark";
  w: AppCopy;
  user: string;
  error: string;
  notice: string;
  onPageChange: (page: AppPage) => void;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onDismissError: () => void;
  onDismissNotice: () => void;
};

const pages: AppPage[] = ["dashboard", "inventory", "rawMaterials", "sales", "customers", "attendance"];

function NavIcon({ page }: { page: AppPage }) {
  const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<AppPage, ReactNode> = {
    dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5"/><rect x="13.5" y="10" width="7" height="10.5" rx="1.5"/><rect x="3.5" y="13" width="7" height="7.5" rx="1.5"/></>,
    inventory: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.5 7.5 4 7.5-4M12 12v9"/></>,
    rawMaterials: <><path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 1.9-1.4L22 8H6"/><path d="M10 20h.01M18 20h.01"/></>,
    sales: <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></>,
    customers: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7" r="4"/><path d="M17 11a4 4 0 0 0 0-8M21 20v-1.5a4 4 0 0 0-3-3.87"/></>,
    attendance: <><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 10h17M8 15l2.5 2.5L16 12"/></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true" {...shared}>{paths[page]}</svg>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-mark${compact ? " compact" : ""}`}><img src="/apple-touch-icon.png" alt=""/><span className="sr-only">Nellai ARAS</span></span>;
}

export function AppShell({ children, page, lang, theme, w, user, error, notice, onPageChange, onToggleLanguage, onToggleTheme, onSignOut, onDismissError, onDismissNotice }: AppShellProps) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><Brand/><div><b>Nellai ARAS</b><small>SNACKS BUSINESS MANAGER</small></div></div>
      <div className="nav-label">{lang === "ta" ? "பட்டியல்" : "MENU"}</div>
      <nav aria-label={lang === "ta" ? "முதன்மை வழிசெலுத்தல்" : "Main navigation"}>{pages.map((item) => <button key={item} onClick={() => onPageChange(item)} className={page === item ? "selected" : ""} aria-current={page === item ? "page" : undefined}><NavIcon page={item}/>{w[item]}</button>)}</nav>
      <div className="sidebar-foot"><div className="help-card">{lang === "ta" ? "குறைந்த சரக்கைக் கவனித்து வாடிக்கையாளர்களை மகிழ்விக்கவும்." : "Keep an eye on low stock to keep every customer happy."}</div><div className="user-row"><span className="avatar" aria-hidden="true">👩🏽‍🍳</span><div className="user-email" title={user}>{user.slice(0, 8)}…</div><button className="signout" onClick={onSignOut}>{w.signOut}</button></div></div>
    </aside>
    <main className="main"><header className="topbar"><div className="crumb"><Brand compact/><b className="topbar-brand">Nellai ARAS</b><span className="crumb-separator">/</span><span className="current-page">{w[page]}</span></div><div className="top-actions"><InstallAppButton/><button className="theme-btn" onClick={onToggleTheme} aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"} title={theme === "light" ? "Dark theme" : "Light theme"}>{theme === "light" ? "◐" : "☀"}<span>{lang === "ta" ? (theme === "light" ? "இருள்" : "ஒளி") : (theme === "light" ? "Dark" : "Light")}</span></button><button className="lang-btn" onClick={onToggleLanguage}>{lang === "en" ? "தமிழ்" : "English"}</button><button className="signout desktop-signout" onClick={onSignOut}>{w.signOut}</button></div></header>
      <div className="content">{error && <div className="error global-error" role="alert">{error}<button onClick={onDismissError} aria-label="Dismiss error">×</button></div>}{notice && <div className="notice global-notice" role="status">{notice}<button onClick={onDismissNotice} aria-label="Dismiss notice">×</button></div>}{children}</div>
    </main>
    <nav className="mobile-bottom-nav" aria-label={lang === "ta" ? "முதன்மை வழிசெலுத்தல்" : "Main navigation"}>{pages.map((item) => <button key={item} onClick={() => onPageChange(item)} className={page === item ? "selected" : ""} aria-current={page === item ? "page" : undefined}><NavIcon page={item}/><span>{w[item]}</span></button>)}</nav>
  </div>;
}
