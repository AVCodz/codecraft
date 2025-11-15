/**
 * GuestWelcomeScreen - Landing page for non-authenticated users
 * Professional marketing page with Hero, Features, HowItWorks, Pricing, and CTA sections
 * Features: Modern glassmorphism design, smooth animations, professional layout
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background gradient effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-blue-500/5 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.08),transparent_40%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(139,92,246,0.06),transparent_40%)] pointer-events-none" />

      <div className="relative z-10">
        <Navbar />
        <main className="relative">
          <Hero />
          <Features />
          <HowItWorks />
          <Pricing />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}

