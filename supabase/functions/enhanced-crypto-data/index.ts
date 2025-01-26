import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol = 'BTC' } = await req.json();
    const cryptoCompareApiKey = Deno.env.get('CRYPTOCOMPARE_API_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    // Fetch multiple data sources in parallel
    const [priceData, historicalData, socialData] = await Promise.all([
      // Current price and OHLCV data
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${cryptoCompareApiKey}`),
      // Historical minute data for the last 24 hours
      fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${symbol}&tsym=USD&limit=1440&api_key=${cryptoCompareApiKey}`),
      // Social sentiment data using FireCrawl
      fetch(`https://api.firecrawl.xyz/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: [`https://twitter.com/search?q=${symbol}`, `https://reddit.com/r/cryptocurrency/search?q=${symbol}`],
          scrapeOptions: {
            formats: ['text'],
            selectors: ['.tweet-text', '.post-title']
          }
        })
      })
    ]);

    const [priceResponse, historicalResponse, socialResponse] = await Promise.all([
      priceData.json(),
      historicalData.json(),
      socialData.json()
    ]);

    // Calculate technical indicators
    const prices = historicalResponse.Data.Data.map((d: any) => d.close);
    const volumes = historicalResponse.Data.Data.map((d: any) => d.volumeto);
    
    // Calculate RSI
    const calculateRSI = (prices: number[], period = 14) => {
      const changes = prices.slice(1).map((price, i) => price - prices[i]);
      const gains = changes.map(change => change > 0 ? change : 0);
      const losses = changes.map(change => change < 0 ? -change : 0);
      
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      const RS = avgGain / (avgLoss || 1);
      return 100 - (100 / (1 + RS));
    };

    // Calculate Moving Averages
    const calculateMA = (data: number[], period: number) => {
      return data.slice(-period).reduce((a, b) => a + b, 0) / period;
    };

    // Calculate Bollinger Bands
    const calculateBollingerBands = (data: number[], period = 20) => {
      const ma = calculateMA(data, period);
      const stdDev = Math.sqrt(
        data.slice(-period).reduce((sum, price) => sum + Math.pow(price - ma, 2), 0) / period
      );
      return {
        upper: ma + (2 * stdDev),
        middle: ma,
        lower: ma - (2 * stdDev)
      };
    };

    // Enhanced prediction logic
    const generateEnhancedPrediction = (timeframe: number, baseConfidence: number) => {
      const date = new Date();
      date.setDate(date.getDate() + timeframe);
      
      // Technical Analysis Factors
      const rsi = calculateRSI(prices);
      const ma7 = calculateMA(prices, 7);
      const ma25 = calculateMA(prices, 25);
      const bollingerBands = calculateBollingerBands(prices);
      
      // Market Trend Analysis
      const shortTermTrend = ma7 > ma25 ? 1.15 : 0.85;
      const rsiSignal = rsi > 70 ? 0.8 : rsi < 30 ? 1.2 : 1;
      const volatility = Math.sqrt(
        prices.slice(-30).reduce((sum, price, i, arr) => {
          if (i === 0) return 0;
          const dailyReturn = Math.log(price / arr[i - 1]);
          return sum + dailyReturn * dailyReturn;
        }, 0) / 29
      ) * Math.sqrt(365) * 100;

      // Volume Analysis
      const recentVolume = calculateMA(volumes, 7);
      const historicalVolume = calculateMA(volumes, 30);
      const volumeTrend = recentVolume > historicalVolume ? 1.1 : 0.9;

      // Combine factors for final prediction
      const technicalMultiplier = (shortTermTrend + rsiSignal + volumeTrend) / 3;
      const volatilityAdjustment = Math.max(0.7, 1 - (volatility / 100));
      
      // Calculate confidence based on multiple factors
      const confidence = Math.min(0.98, 
        (baseConfidence * 0.4 + 
        Math.abs(shortTermTrend - 1) * 0.2 + 
        Math.abs(volumeTrend - 1) * 0.2 + 
        Math.abs(rsiSignal - 1) * 0.2) * 
        volatilityAdjustment
      );

      return {
        time: Math.floor(date.getTime() / 1000),
        price: priceResponse.USD * Math.pow(technicalMultiplier, timeframe/7),
        confidence,
      };
    };

    // Generate predictions for different timeframes
    const predictions = {
      day: generateEnhancedPrediction(1, 0.95),
      week: generateEnhancedPrediction(7, 0.90),
      twoWeeks: generateEnhancedPrediction(14, 0.85),
      month: generateEnhancedPrediction(30, 0.80),
      threeMonths: generateEnhancedPrediction(90, 0.75),
      sixMonths: generateEnhancedPrediction(180, 0.70),
    };

    const technicalAnalysis = {
      ma7: calculateMA(prices, 7),
      ma14: calculateMA(prices, 14),
      ma30: calculateMA(prices, 30),
      ma50: calculateMA(prices, 50),
      ma200: calculateMA(prices, 200),
      rsi: calculateRSI(prices),
      volatility: Math.sqrt(
        prices.slice(-30).reduce((sum, price, i, arr) => {
          if (i === 0) return 0;
          const dailyReturn = Math.log(price / arr[i - 1]);
          return sum + dailyReturn * dailyReturn;
        }, 0) / 29
      ) * Math.sqrt(365) * 100,
      volumeTrend: calculateMA(volumes, 7) > calculateMA(volumes, 30) ? 'increasing' : 'decreasing',
      marketSentiment: calculateRSI(prices) > 70 ? 'overbought' : calculateRSI(prices) < 30 ? 'oversold' : 'neutral'
    };

    const responseData = {
      currentPrice: priceResponse.USD,
      history: historicalResponse.Data.Data,
      predictions,
      technicalAnalysis,
    };

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in enhanced-crypto-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});