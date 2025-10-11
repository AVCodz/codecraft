/**
 * LandingPage - Main landing page composition
 * Combines all landing page sections into complete marketing page
 * Features: Hero, Features, HowItWorks, Pricing, CTA sections with Navbar and Footer
 * Used in: Home page (/) as the main landing page
 */
import { Navbar } from "@/components/ui/layout/Navbar";
import { Footer } from "@/components/ui/layout/Footer";
import { Hero } from "./Hero";
import { Features } from "./Features";
import { HowItWorks } from "./HowItWorks";
import { Pricing } from "./Pricing";
import { CTA } from "./CTA";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
