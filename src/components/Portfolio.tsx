import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";

interface PortfolioItem {
  id: string;
  cryptocurrency: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  current_price?: number;
  predictions?: {
    hour: { price: number; confidence: number };
    day: { price: number; confidence: number };
    week: { price: number; confidence: number };
    month: { price: number; confidence: number };
  };
}

export const Portfolio = () => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [newCrypto, setNewCrypto] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from("portfolios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch current prices and predictions for all cryptocurrencies
      const portfolioWithPrices = await Promise.all(
        (data || []).map(async (item) => {
          const { data: cryptoData } = await supabase.functions.invoke(
            "enhanced-crypto-data",
            {
              body: { symbol: item.cryptocurrency },
            }
          );
          return {
            ...item,
            current_price: cryptoData?.currentPrice || 0,
            predictions: {
              hour: cryptoData?.predictions.hour || { price: 0, confidence: 0 },
              day: cryptoData?.predictions.day || { price: 0, confidence: 0 },
              week: cryptoData?.predictions.week || { price: 0, confidence: 0 },
              month: cryptoData?.predictions.month || { price: 0, confidence: 0 },
            },
          };
        })
      );

      setPortfolio(portfolioWithPrices);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch portfolio",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, []);

  const addToPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrypto.trim() || !quantity || !purchasePrice || !user) return;

    try {
      const { error } = await supabase.from("portfolios").insert([
        {
          cryptocurrency: newCrypto.toUpperCase(),
          quantity: Number(quantity),
          purchase_price: Number(purchasePrice),
          user_id: user.id
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cryptocurrency added to portfolio",
      });

      setNewCrypto("");
      setQuantity("");
      setPurchasePrice("");
      fetchPortfolio();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeFromPortfolio = async (id: string) => {
    try {
      const { error } = await supabase
        .from("portfolios")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cryptocurrency removed from portfolio",
      });

      fetchPortfolio();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalValue = portfolio.reduce(
    (acc, item) => acc + item.quantity * (item.current_price || 0),
    0
  );

  const totalInvestment = portfolio.reduce(
    (acc, item) => acc + item.quantity * item.purchase_price,
    0
  );

  const profitLoss = totalValue - totalInvestment;
  const profitLossPercentage = (profitLoss / totalInvestment) * 100;

  // Calculate predicted portfolio values
  const calculatePredictedValue = (timeframe: 'hour' | 'day' | 'week' | 'month') => {
    return portfolio.reduce((acc, item) => {
      const predictedPrice = item.predictions?.[timeframe]?.price || 0;
      return acc + (item.quantity * predictedPrice);
    }, 0);
  };

  const predictedValues = {
    hour: calculatePredictedValue('hour'),
    day: calculatePredictedValue('day'),
    week: calculatePredictedValue('week'),
    month: calculatePredictedValue('month'),
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Your Portfolio</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Value</p>
          <h3 className="text-2xl font-bold">${totalValue.toLocaleString()}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Investment</p>
          <h3 className="text-2xl font-bold">
            ${totalInvestment.toLocaleString()}
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Profit/Loss</p>
          <h3
            className={`text-2xl font-bold ${
              profitLoss >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {profitLoss >= 0 ? "+" : "-"}$
            {Math.abs(profitLoss).toLocaleString()} (
            {Math.abs(profitLossPercentage).toFixed(2)}%)
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">1H Prediction</p>
          <h3 className="text-2xl font-bold text-primary">
            ${predictedValues.hour.toLocaleString()}
          </h3>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(predictedValues).slice(1).map(([timeframe, value]) => (
          <Card key={timeframe} className="p-4">
            <p className="text-sm text-muted-foreground">
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Prediction
            </p>
            <h3 className="text-2xl font-bold text-primary">
              ${value.toLocaleString()}
            </h3>
          </Card>
        ))}
      </div>

      <form onSubmit={addToPortfolio} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
        <Input
          placeholder="Crypto symbol (e.g., BTC)"
          value={newCrypto}
          onChange={(e) => setNewCrypto(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Purchase price (USD)"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.target.value)}
        />
        <Button type="submit">
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </form>

      <div className="space-y-2">
        {portfolio.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-lg bg-card/50 hover:bg-card/80"
          >
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">{item.cryptocurrency}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFromPortfolio(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div>
                  Quantity: {item.quantity}
                </div>
                <div>
                  Bought: ${item.purchase_price}
                </div>
                <div>
                  Current: ${item.current_price?.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        {portfolio.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            Your portfolio is empty. Add some cryptocurrencies to track your investments!
          </p>
        )}
      </div>
    </Card>
  );
};