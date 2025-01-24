import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LineChart, Brain, TrendingUp } from "lucide-react";
import { CryptoStats } from "@/components/CryptoStats";
import { Features } from "@/components/Features";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-violet-500/10" />
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold gradient-text mb-6">
              Empowering Your Crypto Decisions with AI Precision
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Make informed decisions with real-time cryptocurrency analysis, powered by advanced AI and market sentiment tracking.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <CryptoStats />

      {/* Features Section */}
      <Features />
    </div>
  );
};

export default Index;