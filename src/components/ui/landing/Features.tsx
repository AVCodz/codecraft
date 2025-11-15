/**
 * Features - Product features showcase section
 * Professional grid display with glassmorphism cards and hover effects
 * Features: Animated cards, gradient icons, professional layout
 * Used in: LandingPage to highlight product capabilities
 */
"use client";

import { Code2, Zap, Shield, Layers, GitBranch, Rocket, Sparkles, Lock } from "lucide-react";

const features = [
  {
    icon: Code2,
    title: "AI Code Generation",
    description: "Generate production-ready code with advanced AI models. Just describe what you need, and watch the magic happen.",
    gradient: "from-blue-500 to-cyan-500",
    delay: "0",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Build applications in minutes, not months. Our AI understands context and generates optimized code instantly.",
    gradient: "from-yellow-500 to-orange-500",
    delay: "100",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Enterprise-grade security with built-in best practices. Your code and data are always protected.",
    gradient: "from-green-500 to-emerald-500",
    delay: "200",
  },
  {
    icon: Layers,
    title: "Full Stack Support",
    description: "From frontend to backend, databases to APIs. Build complete applications with a single platform.",
    gradient: "from-purple-500 to-pink-500",
    delay: "300",
  },
  {
    icon: GitBranch,
    title: "Version Control",
    description: "Integrated Git support with automatic commits, branches, and deployment workflows.",
    gradient: "from-indigo-500 to-blue-500",
    delay: "400",
  },
  {
    icon: Rocket,
    title: "One-Click Deploy",
    description: "Deploy your applications instantly to production with our seamless deployment pipeline.",
    gradient: "from-red-500 to-pink-500",
    delay: "500",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full text-primary text-sm font-medium mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span>Powerful Features</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Everything You Need to
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-purple-600">
              Build Better, Faster
            </span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Powerful features designed to accelerate your development workflow and help you ship high-quality applications
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50 hover:border-primary/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10"
              style={{
                animationDelay: `${feature.delay}ms`,
              }}
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

              {/* Icon container with gradient */}
              <div className="relative mb-6">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} p-3 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                  <feature.icon className="w-full h-full text-white" />
                </div>

                {/* Decorative glow */}
                <div className={`absolute inset-0 w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
              </div>

              {/* Content */}
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>

              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover arrow indicator */}
              <div className="mt-4 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-sm font-medium">Learn more</span>
                <Sparkles className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </div>

              {/* Decorative corner accent */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>

        {/* Bottom CTA hint */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Want to see these features in action?
          </p>
          <div className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all cursor-pointer">
            <Lock className="w-4 h-4" />
            <span>Start your free trial</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>
    </section>
  );
}
