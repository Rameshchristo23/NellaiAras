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
    <div className="auth-top"><div className="logo">🥨</div><div className="top-actions"><button type="button" className="theme-btn" onClick={onToggleTheme}>{theme === "light" ? "☾" : "☀"}<span>{lang === "ta" ? (theme === "light" ? "இருள்" : "ஒளி") : (theme === "light" ? "Dark" : "Light")}</span></button><button type="button" className="lang-btn" onClick={onToggleLanguage}>{lang === "en" ? "தமிழ்" : "English"}</button></div></div>
    <h1>Nellai ARAS</h1><p className="muted">{w.configTitle}</p>
    {notice && <div className="notice">{notice}</div>}{error && <div className="error">{error}</div>}
    <label>{w.email}<input name="email" type="email" required autoComplete="email" /></label>
    <label>{w.password}<input name="password" type="password" minLength={6} required autoComplete={isSignup ? "new-password" : "current-password"} /></label>
    <button className="primary wide" disabled={busy}>{busy ? "…" : isSignup ? w.signUp : w.signIn}</button>
    <button type="button" className="text-button" onClick={onToggleSignup}>{isSignup ? w.haveAccount : w.needAccount}</button>
  </form></main>;
}
