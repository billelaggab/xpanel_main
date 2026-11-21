import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "XPanel — لوحة إدارة البث",
  description: "واجهة عربية لإدارة القنوات والمشتركين والخوادم.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-950 text-slate-100 min-h-screen selection:bg-emerald-500 selection:text-slate-950 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
