import type { Metadata } from "next";
import { loadCompany } from "@/lib/config";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const company = await loadCompany();
  return { title: company.name };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const company = await loadCompany();
  return (
    <html lang="en">
      <body
        style={{ "--primary-color": company.primaryColor } as React.CSSProperties}
        className="min-h-screen bg-background antialiased"
      >
        {children}
      </body>
    </html>
  );
}
