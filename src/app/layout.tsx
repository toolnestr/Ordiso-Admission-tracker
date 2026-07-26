import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "Ordiso";
const SITE_URL = "https://admission.toolnestr.com";
const DEFAULT_TITLE = "Ordiso — Free Admission Management for Institutes";
const DEFAULT_DESCRIPTION =
  "Manage applications, track admissions, and confirm enrollments in one place. Free for institutes — no setup fees, no hidden costs.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    // Inner pages set just their name; this appends the brand automatically.
    template: "%s — Ordiso",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "admission management software",
    "admissions tracking",
    "student application management",
    "institute admission system",
    "enrollment management",
    "application tracking system",
    "coaching institute software",
    "school admission software",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // Stop mobile browsers auto-linking numbers/addresses in marketing copy.
  formatDetection: { telephone: false, address: false, email: false },
  // App/utility pages (auth, portal, admin, per-institute apply forms) are
  // near-duplicate and thin — none should be indexed. Default everything to
  // noindex here; the marketing landing page (src/app/page.tsx) opts back in.
  robots: { index: false, follow: true },
  // Sensible sharing defaults; indexable pages override url/title as needed.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
