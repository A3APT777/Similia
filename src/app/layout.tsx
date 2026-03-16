import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "@/styles/theme.css";
import { ToastProvider } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Similia — картотека для гомеопата",
  description: "Цифровой кабинет гомеопата: карточки пациентов, анкеты, опрос самочувствия, фото-динамика.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Similia",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <meta name="theme-color" content="#2d6a4f" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
        {/* Яндекс.Метрика — замени XXXXXXXX на свой номер счётчика */}
        {process.env.NEXT_PUBLIC_METRIKA_ID && (
          <Script
            id="yandex-metrika"
            strategy="afterInteractive"
            src="https://mc.yandex.ru/metrika/tag.js"
            onLoad={() => {
              // @ts-expect-error ym is injected by Yandex Metrika
              window.ym?.(process.env.NEXT_PUBLIC_METRIKA_ID, 'init', {
                clickmap: true, trackLinks: true, accurateTrackBounce: true,
              })
            }}
          />
        )}
      </body>
    </html>
  );
}
