/**
 * HowItWorks - Step-by-step process explanation section
 * Professional animated timeline showing 3-step process
 * Features: Animated connectors, glassmorphism cards, gradient accents
 * Used in: LandingPage to explain user workflow
 */
"use client";

import { MessageSquare, Wand2, Rocket, Sparkles, ArrowRight, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    title: "Describe Your Idea",
    description: "Simply tell the AI what you want to build in plain English. No technical jargon required. Our intelligent system understands your vision.",
    step: "01",
    gradient: "from-blue-500 to-cyan-500",
    features: ["Natural language input", "Context awareness", "Smart suggestions"],
  },
  {
    icon: Wand2,
    title: "AI Generates Code",
    description: "Our advanced AI analyzes your requirements and generates clean, production-ready code in seconds with best practices built-in.",
    step: "02",
    gradient: "from-purple-500 to-pink-500",
    features: ["Clean architecture", "Best practices", "Optimized code"],
  },
  {
    icon: Rocket,
    title: "Deploy & Ship",
    description: "Review, customize, and deploy your application with a single click. Go from idea to production in minutes, not days.",
    step: "03",
    gradient: "from-orange-500 to-red-500",
    features: ["One-click deploy", "Auto scaling", "Zero downtime"],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-background via-card/30 to-background">
      {/* Animated background elements */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full text-primary text-sm font-medium mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span>Simple Process</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            From Idea to Production in
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-purple-600">
              Three Simple Steps
            </span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Our streamlined workflow makes it incredibly easy to build and deploy professional applications
          </p>
        </div>

        {/* Steps Timeline */}
        <div className="relative">
          {/* Connection line - desktop only */}
          <div className="hidden lg:block absolute top-24 left-[16.67%] right-[16.67%] h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative group"
              >
                {/* Step Card */}
                <div className="relative p-8 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50 hover:border-primary/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary/10">
                  {/* Step number badge */}
                  <div className="absolute -top-6 left-8">
                    <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-bold text-lg">{step.step}</span>

                      {/* Glow effect */}
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${step.gradient} blur-xl opacity-50`} />
                    </div>
                  </div>

                  {/* Icon container */}
                  <div className="relative mb-6 mt-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} p-4 shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                      <step.icon className="w-full h-full text-white" />
                    </div>

                    {/* Icon glow */}
                    <div className={`absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                    {step.title}
                  </h3>

                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {step.description}
                  </p>

                  {/* Feature list */}
                  <div className="space-y-2">
                    {step.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`} />
                </div>

                {/* Arrow connector - desktop only */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-24 -right-3 z-20 items-center justify-center w-6 h-6 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/40">
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                )}

                {/* Mobile connector */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center my-6">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-1 h-8 bg-gradient-to-b from-primary/40 to-primary/20" />
                      <ArrowRight className="w-5 h-5 text-primary rotate-90" />
                      <div className="w-1 h-8 bg-gradient-to-b from-primary/20 to-primary/40" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-blue-500/10 backdrop-blur-sm border border-primary/20">
            <p className="text-lg text-foreground font-medium">
              Ready to experience the future of development?
            </p>
            <div className="flex items-center gap-2 text-primary font-semibold cursor-pointer group">
              <span>Start building now</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
