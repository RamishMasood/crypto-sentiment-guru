import { Card } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

const cryptoData = [
  {
    name: "Bitcoin",
    price: "$45,232.67",
    change: "+5.67%",
    isPositive: true,
  },
  {
    name: "Ethereum",
    price: "$3,124.89",
    change: "-2.34%",
    isPositive: false,
  },
  {
    name: "Binance Coin",
    price: "$412.56",
    change: "+1.23%",
    isPositive: true,
  },
];

export const CryptoStats = () => {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cryptoData.map((crypto) => (
            <Card key={crypto.name} className="glass-card p-6 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-200">{crypto.name}</h3>
                  <p className="text-2xl font-bold mt-2">{crypto.price}</p>
                </div>
                <div className={`flex items-center ${
                  crypto.isPositive ? "text-crypto-success" : "text-crypto-danger"
                }`}>
                  {crypto.isPositive ? (
                    <ArrowUpIcon className="h-5 w-5" />
                  ) : (
                    <ArrowDownIcon className="h-5 w-5" />
                  )}
                  <span className="ml-1 font-medium">{crypto.change}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};