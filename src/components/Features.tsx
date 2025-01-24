import { Card } from "@/components/ui/card";
import { LineChart, Brain, TrendingUp } from "lucide-react";

const features = [
  {
    title: "Real-Time Analytics",
    description: "Track cryptocurrency prices and market trends as they happen with our advanced real-time analytics.",
    icon: LineChart,
  },
  {
    title: "AI-Powered Predictions",
    description: "Leverage the power of artificial intelligence to get accurate price predictions and market insights.",
    icon: Brain,
  },
  {
    title: "Sentiment Analysis",
    description: "Understand market sentiment through our advanced social media and news analysis tools.",
    icon: TrendingUp,
  },
];

export const Features = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 gradient-text">
          Why Choose Our Platform
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="glass-card p-6 hover:bg-white/10 transition-colors">
              <div className="flex flex-col items-center text-center">
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};