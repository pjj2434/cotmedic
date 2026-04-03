import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
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

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans-family",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
    <html
      lang="en"
      className={`${fontSans.variable} ${geistMono.variable}`}
      style={{ touchAction: "pan-y", overflowX: "hidden", maxWidth: "100%" }}
    >
      <body className="antialiased overflow-x-hidden" style={{ touchAction: "pan-y", maxWidth: "100%" }}>
        <PreventZoom />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
