"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPrompt | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const ua = navigator.userAgent.toLowerCase();
    setShowIosHelp(/iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const onInstall = (event: Event) => { event.preventDefault(); setPromptEvent(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  if (!promptEvent && !showIosHelp) return null;
  async function install() {
    if (!promptEvent) { window.alert("Tap the Share button in Safari, then choose Add to Home Screen."); return; }
    await promptEvent.prompt();
    setPromptEvent(null);
  }
  return <button className="install-btn" onClick={() => void install()} aria-label="Install Nellai ARAS app">Install app</button>;
}
