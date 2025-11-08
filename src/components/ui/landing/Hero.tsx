/**
 * Hero - Landing page hero section component
 * Main call-to-action section with headline and primary CTAs
 * Features: Gradient background, animated elements, CTA buttons
 * Used in: LandingPage as the first section
 */
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.05),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto text-center z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Development Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-in">
          Build Applications with
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
            AI-Powered Code Generation
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-slide-in">
          Transform your ideas into production-ready code in minutes. Let AI
          handle the complexity while you focus on creativity.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-in">
          <Link href="/auth?mode=signup">
            <Button size="lg" className="text-lg px-8 group cursor-pointer">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="#features">
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 cursor-pointer"
            >
              Learn More
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">10x</div>
            <div className="text-muted-foreground">Faster Development</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">100+</div>
            <div className="text-muted-foreground">Templates</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">99.9%</div>
            <div className="text-muted-foreground">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">24/7</div>
            <div className="text-muted-foreground">Support</div>
          </div>
        </div>
      </div>
    </section>
  );
}
