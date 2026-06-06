import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Noisium – Řiďte tým bez chaosu",
  description: "Úkoly, komunikace a soubory pro váš tým na jednom místě. Sledujte projekty, přidělujte práci a udržte tým v synchronu.",
  applicationName: "Noisium",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Noisium",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f7592f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full antialiased" style={{ background: "var(--bg-page)", color: "var(--text-1)" }}>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
