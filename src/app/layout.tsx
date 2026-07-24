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

export const metadata: Metadata = {
  metadataBase: new URL("https://admission.toolnestr.com"),
  title: "Ordiso — Free Admission Management for Institutes",
  description:
    "Manage applications, track admissions, and confirm enrollments in one place. Free for institutes — no setup fees, no hidden costs.",
  // App/utility pages (auth, portal, admin, per-institute apply forms) are
  // near-duplicate and thin — none should be indexed. Default everything to
  // noindex here; the marketing landing page (src/app/page.tsx) opts back in.
  robots: { index: false, follow: true },
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
