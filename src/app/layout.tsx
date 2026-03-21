import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import "@/styles/theme.css";
import { ToastProvider } from "@/components/ui/toast";
import CookieConsent from "@/components/CookieConsent";
import Script from "next/script";
import InteractiveTour from "@/components/InteractiveTour";


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
  metadataBase: new URL("https://simillia.ru"),
  alternates: { canonical: 'https://simillia.ru' },
  title: "Similia — цифровой кабинет гомеопата",
  description: "Ведите пациентов, ищите рубрики в реперториуме и отслеживайте динамику — всё в одном месте. Бесплатно во время бета-теста. Данные хранятся в России.",
  manifest: "/manifest.json",
  keywords: ["гомеопат", "гомеопатия", "реперторий", "карточки пациентов", "программа для гомеопата", "цифровой кабинет"],
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
  openGraph: {
    title: "Similia — думайте о пациенте, не о бумагах",
    description: "Карточки пациентов, реперторий (74 000+ рубрик), анкеты до приёма и опросы самочувствия. Бесплатно для практикующих гомеопатов.",
    url: "https://simillia.ru",
    siteName: "Similia",
    type: "website",
    locale: "ru_RU",
    images: [{
      url: 'https://simillia.ru/opengraph-image',
      width: 1200,
      height: 630,
      type: 'image/png',
      alt: 'Similia — думайте о пациенте, не о бумагах',
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Similia — думайте о пациенте, не о бумагах",
    description: "Карточки пациентов, реперторий (74 000+ рубрик), анкеты до приёма и опросы самочувствия. Бесплатно.",
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
        <CookieConsent />
        <InteractiveTour />

        {/* Яндекс.Метрика — код с сайта metrika.yandex.ru */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=108156570','ym');
          ym(108156570,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`}
        </Script>
        <noscript>
          <div><img src="https://mc.yandex.ru/watch/108156570" style={{position:'absolute',left:'-9999px'}} alt="" /></div>
        </noscript>
      </body>
    </html>
  );
}
