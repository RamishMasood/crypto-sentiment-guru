import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, LineChart, BrainCog, Clock } from "lucide-react";
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
  dailyHistory: Array<{
    time: number;
    close: number;
  }>;
  hourlyHistory: Array<{
    time: number;
    close: number;
  }>;
  prediction: {
    price: number;
    trend: 'up' | 'down';
    confidence: number;
  };
  predictions: {
    hour: { time: number; price: number; confidence: number };
    day: { time: number; price: number; confidence: number };
    week: { time: number; price: number; confidence: number };
    twoWeeks: { time: number; price: number; confidence: number };
    month: { time: number; price: number; confidence: number };
    threeMonths: { time: number; price: number; confidence: number };
    sixMonths: { time: number; price: number; confidence: number };
  };
  technicalAnalysis: {
    ma7: number;
    ma14: number;
    ma30: number;
    volumeTrend: string;
    priceChange: number;
    marketSentiment: string;
    rsi: number;
  };
}

export const CryptoStats = () => {
  const [btcData, setBtcData] = useState<CryptoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCryptoData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-crypto-data', {
        body: { symbol: 'BTC' }
      });

      if (error) throw error;

      if (!data || 
          typeof data.currentPrice !== 'number' || 
          !data.prediction || 
          !data.prediction.trend || 
          !data.prediction.price || 
          !data.prediction.confidence ||
          !data.predictions) {
        console.error('Invalid data structure:', data);
        throw new Error('Invalid data structure received from API');
      }

      setBtcData(data as CryptoData);
    } catch (error) {
      console.error('Error fetching crypto data:', error);
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
    const interval = setInterval(fetchCryptoData, 30000);
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

  const priceChange = btcData.technicalAnalysis?.priceChange ?? 0;
  const chartData = btcData.hourlyHistory?.map((item) => ({
    date: new Date(item.time * 1000).toLocaleDateString(),
    price: item.close,
  })) ?? [];

  const chartConfig = {
    price: {
      theme: {
        light: "hsl(var(--primary))",
        dark: "hsl(var(--primary))",
      },
    },
  };

  const formatConfidence = (confidence: number | undefined) => {
    if (typeof confidence !== 'number') return '0';
    return (confidence * 100).toFixed(0);
  };

  const formatPrice = (price: number | undefined) => {
    if (typeof price !== 'number') return '0';
    return price.toLocaleString();
  };

  const formatRSI = (rsi: number | undefined) => {
    if (typeof rsi !== 'number') return 'N/A';
    return rsi.toFixed(2);
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bitcoin Price</p>
                <h3 className="text-2xl font-bold mt-1">
                  ${formatPrice(btcData.currentPrice)}
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
                <ChartContainer config={chartConfig}>
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
                <p className="text-sm text-muted-foreground">Next Hour Prediction</p>
                <h3 className="text-2xl font-bold mt-1">
                  ${formatPrice(btcData.predictions?.hour?.price)}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatConfidence(btcData.predictions?.hour?.confidence)}% confidence
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Market Sentiment: {btcData.technicalAnalysis?.marketSentiment ?? 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">
                  RSI: {formatRSI(btcData.technicalAnalysis?.rsi)}
                </p>
              </div>
              <BrainCog className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Future Predictions</p>
                <div className="space-y-2 mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">24h</p>
                    <p className="text-sm font-medium">
                      ${formatPrice(btcData.predictions?.day?.price)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({formatConfidence(btcData.predictions?.day?.confidence)}%)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">7d</p>
                    <p className="text-sm font-medium">
                      ${formatPrice(btcData.predictions?.week?.price)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({formatConfidence(btcData.predictions?.week?.confidence)}%)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">30d</p>
                    <p className="text-sm font-medium">
                      ${formatPrice(btcData.predictions?.month?.price)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({formatConfidence(btcData.predictions?.month?.confidence)}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <LineChart className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};