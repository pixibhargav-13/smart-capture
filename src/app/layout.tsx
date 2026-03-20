import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import AppShell from "@/components/AppShell";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "4BitX Smart Capture - CNC ERP",
  description: "Smart Machine Capture - CNC Production Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
