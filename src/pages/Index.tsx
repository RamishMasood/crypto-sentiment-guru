import { Features } from "@/components/Features";
import { CryptoStats } from "@/components/CryptoStats";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Crypto Sentiment Guru</h1>
          <Button onClick={() => navigate(user ? "/dashboard" : "/auth")}>
            {user ? "Dashboard" : "Get Started"}
          </Button>
        </nav>
      </header>

      <main>
        <section className="py-20 px-4 text-center bg-gradient-to-br from-background to-secondary/20">
          <div className="container mx-auto max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent animate-gradient">
              Predict Crypto Trends with AI
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Harness the power of artificial intelligence to analyze cryptocurrency market trends and make informed decisions.
            </p>
            <Button
              size="lg"
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
              className="animate-float"
            >
              {user ? "View Dashboard" : "Start Trading Smarter"}
            </Button>
          </div>
        </section>

        <div className="container mx-auto">
          <CryptoStats />
        </div>
        <Features />
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <p>© 2024 Crypto Sentiment Guru. All rights reserved.</p>
      </footer>
    </div>
  );
}