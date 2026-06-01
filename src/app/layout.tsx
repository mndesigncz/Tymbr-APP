import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Tymbr – Firemní úkolník",
  description: "Správa firemních úkolů a projektů",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="h-full">
      <body className="min-h-full bg-[#0f0f0f] text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
