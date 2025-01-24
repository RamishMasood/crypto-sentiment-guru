import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { CryptoStats } from "@/components/CryptoStats";
import { LogOut, Plus, Trash2 } from "lucide-react";

interface WatchlistItem {
  id: string;
  cryptocurrency: string;
}

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newCrypto, setNewCrypto] = useState("");
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch watchlist",
        variant: "destructive",
      });
    }
  };

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

        <div className="mt-8">
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
                  className="flex items-center justify-between p-3 bg-card/50 rounded-lg"
                >
                  <span className="font-medium">{item.cryptocurrency}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromWatchlist(item.id)}
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
      </main>
    </div>
  );
}