import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DeferredSpeedInsights } from "@/components/analytics/deferred-speed-insights";
import {
  DREAMOS_THEME_STORAGE_KEY,
  ThemeProvider,
} from "@/components/providers/theme-provider";
import { OAuthCodeLandingRedirect } from "@/components/auth/oauth-code-landing-redirect";
import "./globals.css";
import { getMetadataBaseUrl, getSiteUrl } from "@/lib/app-url";
import { LEGAL_COMPANY_NAME } from "@/lib/brand/brand-config";
import {
  BRAND_ICON_VERSION,
  BRAND_KEYWORDS,
  BRAND_NAME,
  BRAND_TAGLINE,
  VODEX_BRAND_ICON_SRC,
  VODEX_ICON_192,
} from "@/lib/branding/brand-assets";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const SITE_URL = getMetadataBaseUrl();
const CANONICAL_SITE_URL = getSiteUrl();
const ICON_V = BRAND_ICON_VERSION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_TAGLINE,
  applicationName: BRAND_NAME,
  keywords: [...BRAND_KEYWORDS],
  authors: [{ name: BRAND_NAME }],
  creator: BRAND_NAME,
  publisher: LEGAL_COMPANY_NAME,
  manifest: `/manifest.webmanifest?v=${ICON_V}`,
  icons: {
    icon: [
      { url: `/favicon.ico?v=${ICON_V}` },
      { url: VODEX_BRAND_ICON_SRC, sizes: "512x512", type: "image/png" },
      { url: `/favicon-48x48.png?v=${ICON_V}`, sizes: "48x48", type: "image/png" },
      { url: `/favicon-64x64.png?v=${ICON_V}`, sizes: "64x64", type: "image/png" },
      { url: `/favicon-96x96.png?v=${ICON_V}`, sizes: "96x96", type: "image/png" },
      { url: `/favicon-32x32.png?v=${ICON_V}`, sizes: "32x32", type: "image/png" },
      { url: `/favicon-192x192.png?v=${ICON_V}`, sizes: "192x192", type: "image/png" },
      { url: `/icon.png?v=${ICON_V}`, sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: `/apple-touch-icon.png?v=${ICON_V}`, sizes: "180x180", type: "image/png" }],
    shortcut: [`/favicon.ico?v=${ICON_V}`],
  },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: BRAND_NAME,
    title: BRAND_NAME,
    description: `Describe the app you want. ${BRAND_NAME} uses frontier AI to architect, build, and deploy it in minutes.`,
    images: [{ url: VODEX_ICON_192, width: 192, height: 192, alt: BRAND_NAME }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: `Describe the app you want. ${BRAND_NAME} uses frontier AI to architect, build, and deploy it in minutes.`,
    images: [VODEX_ICON_192],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: { canonical: CANONICAL_SITE_URL },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7fd" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c10" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k=${JSON.stringify(DREAMOS_THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var r=document.documentElement;if(t==="dark")r.classList.add("dark");else r.classList.remove("dark")}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <OAuthCodeLandingRedirect />
          <DeferredSpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
