import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nellai ARAS | Snacks business manager",
  description: "Manage snack inventory, sales, and customer history in Tamil or English.",
  applicationName: "Nellai ARAS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Nellai ARAS", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#365c41" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
