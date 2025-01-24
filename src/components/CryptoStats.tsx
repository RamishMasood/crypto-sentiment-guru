import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, LineChart } from "lucide-react";

export const CryptoStats = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bitcoin Price</p>
                <h3 className="text-2xl font-bold mt-1">$45,231.89</h3>
                <p className="text-sm text-emerald-500 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +2.5%
                </p>
              </div>
              <LineChart className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Market Sentiment</p>
                <h3 className="text-2xl font-bold mt-1">Bullish</h3>
                <p className="text-sm text-emerald-500 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  75% Confidence
                </p>
              </div>
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trading Volume</p>
                <h3 className="text-2xl font-bold mt-1">$2.1B</h3>
                <p className="text-sm text-red-500 flex items-center mt-1">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  -1.2%
                </p>
              </div>
              <LineChart className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};