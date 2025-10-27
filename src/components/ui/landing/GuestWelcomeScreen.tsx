/**
 * GuestWelcomeScreen - Landing page for non-authenticated users
 * Marketing page with Hero, Features, HowItWorks, Pricing, and CTA sections
 * Features: Full marketing experience for visitors
 * Used in: Home page (/) when user is not authenticated
 */
import { Navbar } from "@/components/ui/layout/Navbar";
import { Footer } from "@/components/ui/layout/Footer";
import { Hero } from "./Hero";
import { Features } from "./Features";
import { HowItWorks } from "./HowItWorks";
import { Pricing } from "./Pricing";
import { CTA } from "./CTA";

export function GuestWelcomeScreen() {
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

