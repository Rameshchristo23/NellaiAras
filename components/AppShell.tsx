"use client";

import { useState, type ReactNode } from "react";
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

const pageIcons = ["◫", "▦", "↗", "♙", "✓"];

export function AppShell({ children, page, lang, theme, w, user, error, notice, onPageChange, onToggleLanguage, onToggleTheme, onSignOut, onDismissError, onDismissNotice }: AppShellProps) {
  const [mobileNav, setMobileNav] = useState(false);
  const pages: AppPage[] = ["dashboard", "inventory", "sales", "customers", "attendance"];
  return <div className="app-shell">Nellai ARAS
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><div className="logo">🥨</div><div><b>Nellai ARAS</b><small>SNACKS BUSINESS MANAGER</small></div></div>
      <div className="nav-label">{lang === "ta" ? "பட்டியல்" : "MENU"}</div>
      <nav>{pages.map((item, index) => <button key={item} onClick={() => { onPageChange(item); setMobileNav(false); }} className={page === item ? "selected" : ""}><span>{pageIcons[index]}</span>{w[item]}</button>)}</nav>
      <div className="sidebar-foot"><div className="help-card">{lang === "ta" ? "குறைந்த சரக்கைக் கவனித்து வாடிக்கையாளர்களை மகிழ்விக்கவும்." : "Keep an eye on low stock to keep every customer happy."}</div><div className="user-row"><span className="avatar">👩🏽‍🍳</span><div className="user-email">{user.slice(0, 8)}…</div><button className="signout" onClick={onSignOut}>{w.signOut}</button></div></div>
    </aside>Nellai ARAS
    {mobileNav && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}
    <main className="main"><header className="topbar"><div className="crumb"><button className="hamburger" onClick={() => setMobileNav(true)}>☰</button><b>Nellai ARAS</b><span>/</span>{w[page]}</div><div className="top-actions"><InstallAppButton/><button className="theme-btn" onClick={onToggleTheme} aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"} title={theme === "light" ? "Dark theme" : "Light theme"}>{theme === "light" ? "☾" : "☀"}<span>{lang === "ta" ? (theme === "light" ? "இருள்" : "ஒளி") : (theme === "light" ? "Dark" : "Light")}</span></button><button className="lang-btn" onClick={onToggleLanguage}>{lang === "en" ? "தமிழ்" : "English"}</button><button className="signout desktop-signout" onClick={onSignOut}>{w.signOut}</button></div></header>
      <div className="content">{error && <div className="error global-error">{error}<button onClick={onDismissError}>×</button></div>}{notice && <div className="notice global-notice">{notice}<button onClick={onDismissNotice}>×</button></div>}{children}</div>
    </main>
  </div>;
}
