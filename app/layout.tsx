import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PreventZoom } from "@/components/prevent-zoom";
import { PwaRegister } from "@/components/pwa-register";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#b91c1c",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cot/Liftmedik | Customer Portal",
  description: "Customer portal login for Cot/Liftmedik.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ touchAction: "pan-x pan-y" }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ touchAction: "pan-x pan-y" }}
      >
        <PreventZoom />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
