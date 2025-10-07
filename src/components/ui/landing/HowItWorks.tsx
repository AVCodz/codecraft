import { MessageSquare, Wand2, Download } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    title: "Describe Your Idea",
    description: "Simply tell the AI what you want to build in plain English. No technical jargon required.",
    step: "01",
  },
  {
    icon: Wand2,
    title: "AI Generates Code",
    description: "Our advanced AI analyzes your requirements and generates clean, production-ready code in seconds.",
    step: "02",
  },
  {
    icon: Download,
    title: "Deploy & Ship",
    description: "Review, customize, and deploy your application with a single click. It's that simple.",
    step: "03",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-card/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From idea to production in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                  <step.icon className="w-10 h-10 text-primary" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {step.step}
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>

              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
