import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { CryptoStats } from "@/components/CryptoStats";
import { Portfolio } from "@/components/Portfolio";
import { LogOut, Plus, Trash2 } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface WatchlistItem {
  id: string;
  cryptocurrency: string;
}

interface CryptoData {
  currentPrice: number;
  history: Array<{
    time: number;
    close: number;
  }>;
}

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newCrypto, setNewCrypto] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchWatchlist();
  }, [user, navigate]);

  const fetchWatchlist = async () => {
    try {
      const { data, error } = await supabase
        .from("watchlists")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWatchlist(data || []);
      
      // Select first crypto in watchlist by default
      if (data && data.length > 0 && !selectedCrypto) {
        setSelectedCrypto(data[0].cryptocurrency);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch watchlist",
        variant: "destructive",
      });
    }
  };

  const fetchCryptoData = async (symbol: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('crypto-data', {
        body: { symbol }
      });

      if (error) throw error;
      setCryptoData(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch crypto data",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedCrypto) {
      fetchCryptoData(selectedCrypto);
      const interval = setInterval(() => fetchCryptoData(selectedCrypto), 30000);
      return () => clearInterval(interval);
    }
  }, [selectedCrypto]);

  const addToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrypto.trim() || !user) return;

    try {
      const { error } = await supabase.from("watchlists").insert([
        {
          cryptocurrency: newCrypto.toUpperCase(),
          user_id: user.id
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cryptocurrency added to watchlist",
      });

      setNewCrypto("");
      fetchWatchlist();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeFromWatchlist = async (id: string) => {
    try {
      const { error } = await supabase
        .from("watchlists")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cryptocurrency removed from watchlist",
      });

      fetchWatchlist();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const chartData = cryptoData?.history.map((item) => ({
    date: new Date(item.time * 1000).toLocaleDateString(),
    price: item.close,
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Crypto Dashboard</h1>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <CryptoStats />
        
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Portfolio />
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Watchlist</h2>
            
            <form onSubmit={addToWatchlist} className="flex gap-2 mb-4">
              <Input
                placeholder="Enter cryptocurrency symbol (e.g., BTC)"
                value={newCrypto}
                onChange={(e) => setNewCrypto(e.target.value)}
              />
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </form>

            <div className="space-y-2">
              {watchlist.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${
                    selectedCrypto === item.cryptocurrency
                      ? "bg-primary/10"
                      : "bg-card/50 hover:bg-card/80"
                  }`}
                  onClick={() => setSelectedCrypto(item.cryptocurrency)}
                >
                  <span className="font-medium">{item.cryptocurrency}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWatchlist(item.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {watchlist.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Your watchlist is empty. Add some cryptocurrencies to track!
                </p>
              )}
            </div>
          </Card>
        </div>

        {selectedCrypto && cryptoData && (
          <Card className="mt-6 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedCrypto} Price Chart
            </h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Price
                              </span>
                              <span className="font-bold text-muted-foreground">
                                ${payload[0].value.toLocaleString()}
                              </span>
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
                    fill="url(#colorPrice)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
