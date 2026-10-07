import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SupportChatWidget from "@/components/support-chat-widget";
import { Notifications } from "@/components/notifications";
import PresenceTracker from "@/components/presence-tracker";
import RecentActivityAlert from "@/components/recent-activity-alert";
import { PublicSiteSettingsProvider } from "@/components/public-site-settings-provider";
import ReferralTracker from "@/components/referral-tracker";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.thedulcandesign.com"),
  applicationName: "TheDulcanDesign",
  title: "TheDulcanDesign - Servicios Profesionales de Optimización",
  description: "Servicios profesionales de optimización y configuración de OBS, streaming, PC/Windows, gaming y soporte técnico.",
  keywords: [
    "TheDulcanDesign",
    "optimización de OBS",
    "configuración de streaming",
    "optimización de PC",
    "servidores de Discord",
    "soporte técnico",
  ],
  authors: [{ name: "TheDulcanDesign", url: "https://www.thedulcandesign.com" }],
  creator: "TheDulcanDesign",
  publisher: "TheDulcanDesign",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://www.thedulcandesign.com",
    siteName: "TheDulcanDesign",
    title: "TheDulcanDesign - Servicios Profesionales de Optimización",
    description: "Optimización de OBS, streaming, PC/Windows, gaming, Discord y soporte técnico profesional.",
    images: [{ url: "/icon-512.png?v=3", width: 512, height: 512, alt: "TheDulcanDesign" }],
  },
  twitter: {
    card: "summary",
    title: "TheDulcanDesign - Servicios Profesionales de Optimización",
    description: "Optimización de OBS, streaming, PC/Windows, gaming, Discord y soporte técnico profesional.",
    images: ["/icon-512.png?v=3"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png?v=3", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png?v=3", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <div className="animated-bg"></div>
        <div className="animated-bg-overlay"></div>
        <PublicSiteSettingsProvider>
          {children}
          <SupportChatWidget />
          <Notifications />
          <RecentActivityAlert />
          <PresenceTracker />
          <Suspense fallback={null}><ReferralTracker /></Suspense>
        </PublicSiteSettingsProvider>
      </body>
    </html>
  );
}
