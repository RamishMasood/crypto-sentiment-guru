import { Card } from "@/components/ui/card";
import { Brain, LineChart, TrendingUp } from "lucide-react";

export const Features = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Platform Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our platform combines advanced AI technology with real-time market data to provide you with the most accurate cryptocurrency predictions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 bg-card hover:bg-card/80 transition-colors">
            <div className="mb-4">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Predictions</h3>
            <p className="text-muted-foreground">
              Advanced machine learning algorithms analyze market trends and patterns to provide accurate predictions.
            </p>
          </Card>

          <Card className="p-6 bg-card hover:bg-card/80 transition-colors">
            <div className="mb-4">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <LineChart className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Real-Time Analytics</h3>
            <p className="text-muted-foreground">
              Stay updated with real-time market data, price movements, and trading volumes.
            </p>
          </Card>

          <Card className="p-6 bg-card hover:bg-card/80 transition-colors">
            <div className="mb-4">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Market Sentiment</h3>
            <p className="text-muted-foreground">
              Track market sentiment through social media analysis and on-chain metrics.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};