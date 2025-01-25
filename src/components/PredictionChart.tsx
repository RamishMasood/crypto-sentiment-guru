import { Card } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { format } from "date-fns";

interface PredictionChartProps {
  data: {
    currentPrice: number;
    history: Array<{
      time: number;
      close: number;
    }>;
    predictions: {
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
      ma50: number;
      ma200: number;
      rsi: number;
      volatility: number;
      volumeTrend: string;
      marketSentiment: string;
    };
  } | null;
  symbol: string;
}

export const PredictionChart = ({ data, symbol }: PredictionChartProps) => {
  if (!data) return null;

  // Combine historical and prediction data
  const chartData = [
    ...(data.history || []).map((item) => ({
      date: new Date(item.time * 1000),
      price: item.close,
      type: 'historical'
    })),
    ...Object.values(data.predictions || {}).map((prediction) => ({
      date: new Date(prediction.time * 1000),
      price: prediction.price,
      confidence: prediction.confidence,
      type: 'prediction'
    }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const technicalData = data.technicalAnalysis;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {symbol} Price Prediction
        </h2>
        <div className="text-sm text-muted-foreground">
          <div>RSI: {technicalData.rsi.toFixed(2)}</div>
          <div>Volatility: {technicalData.volatility.toFixed(2)}%</div>
          <div>Sentiment: {technicalData.marketSentiment}</div>
        </div>
      </div>
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          {format(new Date(data.date), 'MMM dd, yyyy')}
                        </span>
                        <span className="font-bold text-foreground">
                          ${data.price.toLocaleString()}
                        </span>
                        {data.type === 'prediction' && (
                          <span className="text-xs text-muted-foreground">
                            Confidence: {(data.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              fill="url(#colorHistorical)"
              strokeWidth={2}
              name="Historical Price"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        {Object.entries(data.predictions).map(([timeframe, prediction]) => (
          <div key={timeframe} className="p-3 rounded-lg bg-card/50">
            <div className="text-sm font-medium mb-1">
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Prediction
            </div>
            <div className="text-lg font-bold">
              ${prediction.price.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Confidence: {(prediction.confidence * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};