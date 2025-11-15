/**
 * CTA - Call-to-action section component
 * Striking final conversion section with modern design
 * Features: Animated gradient background, glassmorphism, compelling CTA
 * Used in: LandingPage as the final conversion section
 */
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Sparkles, Star, Zap, TrendingUp } from "lucide-react";

export function CTA() {
  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/95 via-blue-600/95 to-purple-600/95 p-1">
          {/* Animated border gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-blue-500 to-purple-500 animate-gradient" />

          <div className="relative bg-gradient-to-br from-primary via-blue-600 to-purple-600 rounded-3xl p-12 md:p-16 lg:p-20">
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            {/* Floating decorative icons */}
            <div className="absolute top-10 left-10 w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center animate-float">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="absolute top-20 right-20 w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center animate-float delay-300">
              <Star className="w-10 h-10 text-white fill-white" />
            </div>
            <div className="absolute bottom-20 left-20 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center animate-float delay-700">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div className="absolute bottom-10 right-10 w-18 h-18 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center animate-float delay-500">
              <TrendingUp className="w-9 h-9 text-white" />
            </div>

            <div className="relative z-10 text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-semibold mb-8 border border-white/30 shadow-lg">
                <Sparkles className="w-4 h-4" />
                <span>Join 10,000+ Developers</span>
                <Star className="w-4 h-4 fill-white" />
              </div>

              {/* Headline */}
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Ready to Transform
                <span className="block mt-2">Your Development Workflow?</span>
              </h2>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-white/95 mb-10 max-w-3xl mx-auto leading-relaxed font-light">
                Join thousands of developers who are already building faster, smarter, and better with VibeIt.
                <span className="block mt-2 font-normal">
                  Start your free trial today — no credit card required.
                </span>
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
                <Link href="/auth?mode=signup">
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-white/95 text-lg px-10 py-6 group cursor-pointer shadow-2xl shadow-black/20 font-semibold transition-all duration-300 hover:scale-105"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/auth?mode=login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white/20 text-lg px-10 py-6 cursor-pointer backdrop-blur-sm font-semibold transition-all duration-300 hover:scale-105"
                  >
                    Sign In
                    <Zap className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-8 text-white/90 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-5 h-5 fill-white text-white" />
                    ))}
                  </div>
                  <span className="font-medium">4.9/5 rating</span>
                </div>
                <div className="w-px h-4 bg-white/30" />
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-medium">14-day free trial</span>
                </div>
                <div className="w-px h-4 bg-white/30" />
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  <span className="font-medium">No credit card needed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { value: "10k+", label: "Active Users" },
            { value: "50k+", label: "Projects Created" },
            { value: "99.9%", label: "Uptime" },
            { value: "4.9/5", label: "User Rating" },
          ].map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-card/60 to-card/30 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105"
            >
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
