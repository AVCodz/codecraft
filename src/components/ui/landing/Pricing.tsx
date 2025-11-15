/**
 * Pricing - Pricing plans display section
 * Professional pricing cards with glassmorphism and animations
 * Features: Modern cards, gradient accents, popular badge, smooth hover effects
 * Used in: LandingPage to display pricing options
 */
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Check, Sparkles, Crown, Building2, Zap, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for trying out VibeIt",
    icon: Zap,
    features: [
      "5 projects per month",
      "Basic AI model",
      "Community support",
      "Public repositories",
      "Basic templates",
    ],
    cta: "Get Started",
    popular: false,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For professional developers",
    icon: Crown,
    features: [
      "Unlimited projects",
      "Advanced AI models",
      "Priority support",
      "Private repositories",
      "Premium templates",
      "Custom deployments",
      "Team collaboration",
    ],
    cta: "Start Free Trial",
    popular: true,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large teams and organizations",
    icon: Building2,
    features: [
      "Everything in Pro",
      "Dedicated support",
      "Custom AI training",
      "SLA guarantee",
      "Advanced security",
      "Custom integrations",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    popular: false,
    gradient: "from-orange-500 to-red-500",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full text-primary text-sm font-medium mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span>Flexible Pricing</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Choose Your Perfect Plan
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-purple-600">
              Start Free, Scale Anytime
            </span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            All plans include a 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6 mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative group ${
                plan.popular ? "md:scale-110 z-10" : ""
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                  <div className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-primary to-blue-600 text-white text-sm font-bold rounded-full shadow-lg shadow-primary/30">
                    <Crown className="w-4 h-4 fill-white" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              {/* Card */}
              <div
                className={`relative h-full p-8 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl ${
                  plan.popular
                    ? "border-primary/50 shadow-xl shadow-primary/10"
                    : "border-border/50 hover:border-primary/30 hover:shadow-primary/5"
                }`}
              >
                {/* Icon */}
                <div className="mb-6">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.gradient} p-3 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    <plan.icon className="w-full h-full text-white" />
                  </div>

                  {/* Icon glow */}
                  <div className={`absolute top-8 left-8 w-14 h-14 rounded-xl bg-gradient-to-br ${plan.gradient} blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
                </div>

                {/* Plan Name & Description */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-bold bg-gradient-to-br ${plan.gradient} bg-clip-text text-transparent`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground text-lg">{plan.period}</span>
                    )}
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Check className="w-3 h-3 text-white font-bold" />
                      </div>
                      <span className="text-muted-foreground text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link href="/auth?mode=signup" className="block">
                  <Button
                    className={`w-full cursor-pointer group/btn transition-all duration-300 ${
                      plan.popular
                        ? `bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white shadow-lg shadow-primary/20`
                        : "border-2"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>

                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${plan.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`} />

                {/* Decorative corner */}
                {plan.popular && (
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-primary/20 to-transparent rounded-2xl pointer-events-none" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: Check, text: "No credit card required" },
            { icon: Sparkles, text: "14-day free trial" },
            { icon: Zap, text: "Cancel anytime" },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-center gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
            >
              <item.icon className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground font-medium">{item.text}</span>
            </div>
          ))}
        </div>

        {/* FAQ Link */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Have questions?{" "}
            <span className="text-primary font-medium cursor-pointer hover:underline">
              View our pricing FAQ
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
