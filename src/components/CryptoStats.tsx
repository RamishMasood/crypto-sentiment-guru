import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, LineChart, BrainCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

interface CryptoData {
  currentPrice: number;
  history: Array<{
    time: number;
    close: number;
  }>;
}

export const CryptoStats = () => {
  const [btcData, setBtcData] = useState<CryptoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCryptoData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('crypto-data', {
        body: { symbol: 'BTC' }
      });

      if (error) throw error;
      setBtcData(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch crypto data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !btcData) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 bg-card/50 backdrop-blur-sm border-muted animate-pulse">
                <div className="h-20"></div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const priceChange = btcData.history.length > 1
    ? ((btcData.currentPrice - btcData.history[0].close) / btcData.history[0].close) * 100
    : 0;

  const chartData = btcData.history.map((item) => ({
    date: new Date(item.time * 1000).toLocaleDateString(),
    price: item.close,
  }));

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bitcoin Price</p>
                <h3 className="text-2xl font-bold mt-1">
                  ${btcData.currentPrice.toLocaleString()}
                </h3>
                <p className={`text-sm flex items-center mt-1 ${
                  priceChange >= 0 ? "text-emerald-500" : "text-red-500"
                }`}>
                  {priceChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(priceChange).toFixed(2)}%
                </p>
              </div>
              <div className="h-16 w-24">
                <ChartContainer
                  config={{
                    price: {
                      theme: {
                        light: "hsl(var(--primary))",
                        dark: "hsl(var(--primary))",
                      },
                    },
                  }}
                >
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="hsl(var(--primary))"
                      fill="url(#gradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Market Sentiment</p>
                <h3 className="text-2xl font-bold mt-1">
                  {priceChange >= 0 ? "Bullish" : "Bearish"}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center mt-1">
                  Based on 30-day trend
                </p>
              </div>
              <BrainCog className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Price Prediction</p>
                <h3 className="text-2xl font-bold mt-1">
                  ${(btcData.currentPrice * 1.1).toLocaleString()}
                </h3>
                <p className="text-sm text-emerald-500 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Potential +10%
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