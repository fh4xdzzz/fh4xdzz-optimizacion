import type { Metadata } from "next";
import { SITE_URL, socialMetadata } from "@/lib/seo";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SupportChatWidget from "@/components/support-chat-widget";
import { Notifications } from "@/components/notifications";
import PresenceTracker from "@/components/presence-tracker";
import RecentActivityAlert from "@/components/recent-activity-alert";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "TheDulcanDesign - Servicios Profesionales de Optimización", template: "%s | TheDulcanDesign" },
  ...socialMetadata("TheDulcanDesign", "Optimización de OBS, Windows y streaming con atención personalizada.", "/"),
  description: "Servicios profesionales de optimización y configuración de OBS, streaming, PC/Windows, gaming y soporte técnico.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
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
        {children}
        <SupportChatWidget />
        <Notifications />
        <RecentActivityAlert />
        <PresenceTracker />
      </body>
    </html>
  );
}
