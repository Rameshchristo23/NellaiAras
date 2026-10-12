import type { FormEvent } from "react";
import type { AppCopy } from "@/lib/i18n";
import type { Language } from "@/lib/models";

type AuthScreenProps = {
  lang: Language;
  theme: "light" | "dark";
  w: AppCopy;
  busy: boolean;
  error: string;
  notice: string;
  isSignup: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleSignup: () => void;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
};

export function AuthScreen({ lang, theme, w, busy, error, notice, isSignup, onSubmit, onToggleSignup, onToggleLanguage, onToggleTheme }: AuthScreenProps) {
  return <main className="center-screen"><form className="auth-card" onSubmit={onSubmit}>
    <div className="auth-top"><div className="auth-brand"><img src="/apple-touch-icon.png" alt=""/><span>Nellai ARAS</span></div><div className="top-actions"><button type="button" className="theme-btn" onClick={onToggleTheme} aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}>{theme === "light" ? "◐" : "☀"}<span>{lang === "ta" ? (theme === "light" ? "இருள்" : "ஒளி") : (theme === "light" ? "Dark" : "Light")}</span></button><button type="button" className="lang-btn" onClick={onToggleLanguage}>{lang === "en" ? "தமிழ்" : "English"}</button></div></div>
    <h1>{isSignup ? w.signUp : w.signIn}</h1><p className="muted">{lang === "ta" ? "நெல்லை அரஸ் வணிகத்தை நிர்வகிக்க உள்நுழையவும்." : "Sign in to manage your Nellai ARAS business."}</p>
    {notice && <div className="notice" role="status">{notice}</div>}{error && <div className="error" role="alert">{error}</div>}
    <label>{w.email}<input name="email" type="email" required autoComplete="email" /></label>
    <label>{w.password}<input name="password" type="password" minLength={6} required autoComplete={isSignup ? "new-password" : "current-password"} /></label>
    <button className="primary wide" disabled={busy}>{busy ? "…" : isSignup ? w.signUp : w.signIn}</button>
    <button type="button" className="text-button" onClick={onToggleSignup}>{isSignup ? w.haveAccount : w.needAccount}</button>
  </form></main>;
}
