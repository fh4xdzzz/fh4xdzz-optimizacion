import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SupportChatWidget from "@/components/support-chat-widget";
import { Notifications } from "@/components/notifications";
import PresenceTracker from "@/components/presence-tracker";
import RecentActivityAlert from "@/components/recent-activity-alert";
import { PublicSiteSettingsProvider } from "@/components/public-site-settings-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TheDulcanDesign - Servicios Profesionales de Optimización",
  description: "Servicios profesionales de optimización y configuración de OBS, streaming, PC/Windows, gaming y soporte técnico.",
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
        </PublicSiteSettingsProvider>
      </body>
    </html>
  );
}
