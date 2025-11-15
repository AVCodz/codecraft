/**
 * Hero - Landing page hero section component
 * Professional hero section with glassmorphism and smooth animations
 * Features: Gradient background, floating elements, professional CTA buttons, stats showcase
 * Used in: LandingPage as the first section
 */
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Sparkles, Star, TrendingUp, Users, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden pt-20">
      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="relative max-w-7xl mx-auto text-center z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-full border border-primary/20 text-primary text-sm font-medium mb-8 hover:border-primary/40 transition-all duration-300 shadow-lg shadow-primary/5 animate-fade-in">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent font-semibold">
            AI-Powered Development Platform
          </span>
          <Star className="w-4 h-4 fill-primary text-primary" />
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-foreground mb-6 animate-slide-in leading-tight">
          Build Applications{" "}
          <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-purple-600 animate-gradient">
            10x Faster with AI
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto animate-slide-in leading-relaxed font-light">
          Transform your ideas into production-ready code in minutes.
          <span className="block mt-2 text-foreground/80 font-normal">
            Let AI handle the complexity while you focus on innovation.
          </span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-in mb-12">
          <Link href="/auth?mode=signup">
            <Button
              size="lg"
              className="text-lg px-10 py-6 group cursor-pointer shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="#features">
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-10 py-6 cursor-pointer border-2 hover:bg-primary/5 backdrop-blur-sm transition-all duration-300"
            >
              Watch Demo
              <Zap className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-16 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 border-2 border-background" />
              ))}
            </div>
            <span className="font-medium text-foreground">10k+ developers</span>
          </div>
          <div className="flex items-center gap-1 text-yellow-500">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
            <span className="ml-1 text-foreground font-medium">4.9/5</span>
          </div>
        </div>

        {/* Stats Grid with Glassmorphism */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { icon: TrendingUp, value: "10x", label: "Faster Development", color: "from-blue-500 to-cyan-500" },
            { icon: Zap, value: "100+", label: "AI Templates", color: "from-purple-500 to-pink-500" },
            { icon: Star, value: "99.9%", label: "Uptime SLA", color: "from-orange-500 to-yellow-500" },
            { icon: Users, value: "24/7", label: "Expert Support", color: "from-green-500 to-emerald-500" },
          ].map((stat, index) => (
            <div
              key={index}
              className="relative group p-6 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50 hover:border-primary/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary/10"
            >
              {/* Icon with gradient */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} p-2.5 mb-4 mx-auto shadow-lg`}>
                <stat.icon className="w-full h-full text-white" />
              </div>

              {/* Stats */}
              <div className="text-4xl font-bold text-foreground mb-2 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>

              {/* Hover effect glow */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500`} />
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 rounded-full bg-muted-foreground/50 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
