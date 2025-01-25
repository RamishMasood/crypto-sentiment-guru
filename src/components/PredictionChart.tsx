import { Card } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";

interface PredictionChartProps {
  data: {
    currentPrice: number;
    history: Array<{
      time: number;
      close: number;
    }>;
    predictions: Array<{
      time: number;
      price: number;
      confidence: number;
    }>;
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
    ...(data.predictions || []).map((item) => ({
      date: new Date(item.time * 1000),
      price: item.price,
      confidence: item.confidence,
      type: 'prediction'
    }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">
        {symbol} Price Prediction
      </h2>
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
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              fill="url(#colorHistorical)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};