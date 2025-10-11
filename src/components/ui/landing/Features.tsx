/**
 * Features - Product features showcase section
 * Grid display of key product features with icons and descriptions
 * Features: Icon grid layout, feature cards, responsive design
 * Used in: LandingPage to highlight product capabilities
 */
import { Code2, Zap, Shield, Layers, GitBranch, Rocket } from "lucide-react";

const features = [
  {
    icon: Code2,
    title: "AI Code Generation",
    description: "Generate production-ready code with advanced AI models. Just describe what you need, and watch the magic happen.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Build applications in minutes, not months. Our AI understands context and generates optimized code instantly.",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Enterprise-grade security with built-in best practices. Your code and data are always protected.",
  },
  {
    icon: Layers,
    title: "Full Stack Support",
    description: "From frontend to backend, databases to APIs. Build complete applications with a single platform.",
  },
  {
    icon: GitBranch,
    title: "Version Control",
    description: "Integrated Git support with automatic commits, branches, and deployment workflows.",
  },
  {
    icon: Rocket,
    title: "One-Click Deploy",
    description: "Deploy your applications instantly to production with our seamless deployment pipeline.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Everything You Need to Build Better
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features that help you ship faster and build better applications
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
