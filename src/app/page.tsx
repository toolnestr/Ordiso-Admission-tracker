import Comparison from "@/components/landing/Comparison";
import FAQ from "@/components/landing/FAQ";
import Features from "@/components/landing/Features";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Nav from "@/components/landing/Nav";
import Pricing from "@/components/landing/Pricing";
import type { Metadata } from "next";

// The only indexable page — overrides the root layout's noindex default and
// declares a self-referencing canonical to clear the duplicate-content flag.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <Comparison />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
