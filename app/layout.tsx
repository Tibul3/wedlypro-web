import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import ConsentManagedAnalytics from "./components/ConsentManagedAnalytics";
import CookieConsentBanner from "./components/CookieConsentBanner";
import CookiePreferencesLink from "./components/CookiePreferencesLink";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const siteUrl = "https://wedlypro.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Wedly Pro",
    template: "%s | Wedly Pro",
  },
  description: "Wedding Supplier CRM for modern wedding professionals",
  applicationName: "Wedly Pro",
  keywords: [
    "Wedding CRM",
    "Wedding supplier software",
    "Wedding business app",
    "Lead tracking",
    "Client management",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Wedly Pro",
    title: "Wedly Pro",
    description: "Wedding Supplier CRM for modern wedding professionals",
    images: [
      {
        url: "/screen1.png",
        width: 1200,
        height: 630,
        alt: "Wedly Pro app preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wedly Pro",
    description: "Wedding Supplier CRM for modern wedding professionals",
    images: ["/screen1.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} bg-zinc-50 text-zinc-900`}>
        <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="inline-flex items-center gap-3 no-underline">
              {/* If /public/logo.png is unavailable, replace this with a simple initials mark. */}
              <span className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl">
                <Image
                  src="/logo.png"
                  alt="Wedly Pro logo"
                  width={48}
                  height={48}
                  className="h-11 w-11 object-contain"
                />
              </span>
              <span className="text-base font-semibold tracking-tight text-zinc-900">Wedly Pro</span>
            </Link>

            <nav className="flex items-center gap-5 text-sm text-zinc-600">
              <Link className="hover:text-zinc-900" href="/support">
                Support
              </Link>
              <Link className="hover:text-zinc-900" href="/support">
                Contact
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">{children}</main>

        <footer className="border-t border-black/5 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col justify-between gap-4 px-4 py-8 text-sm text-zinc-600 sm:px-6 lg:flex-row lg:items-center lg:px-8">
            <p>
              © {new Date().getFullYear()} Wedly Pro. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Link className="hover:text-zinc-900" href="/support">
                Contact
              </Link>
              <Link className="hover:text-zinc-900" href="/support">
                Support
              </Link>
              <Link className="hover:text-zinc-900" href="/privacy">
                Privacy Policy
              </Link>
              <Link className="hover:text-zinc-900" href="/terms">
                Terms
              </Link>
              <CookiePreferencesLink />
            </div>
          </div>
        </footer>
        <CookieConsentBanner />
        <ConsentManagedAnalytics />
      </body>
    </html>
  );
}
