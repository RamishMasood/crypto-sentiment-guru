import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SentimentData {
  score: number;
  mentions: number;
  positiveCount: number;
  negativeCount: number;
  keywords: Record<string, number>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol = 'BTC' } = await req.json();
    const cryptoCompareApiKey = Deno.env.get('CRYPTOCOMPARE_API_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    console.log('Starting enhanced prediction analysis for:', symbol);

    // Fetch multiple data sources in parallel
    const [priceData, historicalData, minuteData, hourData, orderBookData, socialData] = await Promise.all([
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=60&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${symbol}&tsym=USD&limit=240&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${symbol}&tsym=USD&limit=168&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/ob/l2/snapshot?fsym=${symbol}&tsym=USD&api_key=${cryptoCompareApiKey}`),
      fetch(`https://api.firecrawl.xyz/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: [
            `https://twitter.com/search?q=${symbol}%20crypto`,
            `https://reddit.com/r/cryptocurrency/search?q=${symbol}`,
            `https://www.tradingview.com/symbols/${symbol}USD/`
          ],
          scrapeOptions: {
            formats: ['text'],
            selectors: ['.tweet-text', '.post-title', '.post-content', '.tv-symbol-price-quote__value']
          }
        })
      })
    ]);

    console.log('Successfully fetched all data sources');

    const [priceResponse, historicalResponse, minuteResponse, hourResponse, orderBookResponse, socialResponse] = await Promise.all([
      priceData.json(),
      historicalData.json(),
      minuteData.json(),
      hourData.json(),
      orderBookData.json(),
      socialData.json()
    ]);

    // Process historical price data
    const prices = historicalResponse.Data.Data.map((d: any) => d.close);
    const volumes = historicalResponse.Data.Data.map((d: any) => d.volumeto);

    // Technical Analysis Functions
    const calculateRSI = (prices: number[], period = 14) => {
      const changes = prices.slice(1).map((price, i) => price - prices[i]);
      const gains = changes.map(change => change > 0 ? change : 0);
      const losses = changes.map(change => change < 0 ? -change : 0);
      
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      const RS = avgGain / (avgLoss || 1);
      return 100 - (100 / (1 + RS));
    };

    const calculateVolatility = (prices: number[], period = 20) => {
      const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      return Math.sqrt(variance * 252) * 100; // Annualized volatility
    };

    // Enhanced sentiment analysis
    const analyzeSentiment = (data: any[]): SentimentData => {
      const sentimentKeywords = {
        positive: ['bullish', 'buy', 'moon', 'pump', 'growth', 'potential', 'undervalued'],
        negative: ['bearish', 'sell', 'dump', 'crash', 'overvalued', 'scam', 'weak']
      };

      let positiveCount = 0;
      let negativeCount = 0;
      const keywords: Record<string, number> = {};

      const content = (data || []).join(' ').toLowerCase();
      
      sentimentKeywords.positive.forEach(keyword => {
        const count = (content.match(new RegExp(keyword, 'g')) || []).length;
        positiveCount += count;
        keywords[keyword] = count;
      });

      sentimentKeywords.negative.forEach(keyword => {
        const count = (content.match(new RegExp(keyword, 'g')) || []).length;
        negativeCount += count;
        keywords[keyword] = count;
      });

      const totalMentions = positiveCount + negativeCount;
      const score = totalMentions > 0 ? (positiveCount - negativeCount) / totalMentions : 0;

      return { score, mentions: totalMentions, positiveCount, negativeCount, keywords };
    };

    // Generate prediction for different timeframes
    const generatePrediction = (timeframe: number) => {
      const date = new Date();
      date.setDate(date.getDate() + timeframe);
      
      // Technical Analysis
      const rsi = calculateRSI(prices);
      const volatility = calculateVolatility(prices);
      const currentPrice = prices[prices.length - 1];
      
      // Volume Analysis
      const recentVolume = volumes.slice(-7).reduce((a, b) => a + b, 0) / 7;
      const historicalVolume = volumes.slice(-30, -7).reduce((a, b) => a + b, 0) / 23;
      const volumeRatio = recentVolume / historicalVolume;
      
      // Market Depth Analysis
      const orderBookBids = orderBookResponse.Data?.bids || [];
      const orderBookAsks = orderBookResponse.Data?.asks || [];
      const buyPressure = orderBookBids.reduce((sum: number, [price, quantity]: number[]) => sum + price * quantity, 0);
      const sellPressure = orderBookAsks.reduce((sum: number, [price, quantity]: number[]) => sum + price * quantity, 0);
      const orderBookRatio = buyPressure / (sellPressure || 1);
      
      // Sentiment Impact
      const sentiment = analyzeSentiment(socialResponse.data || []);
      const sentimentMultiplier = 1 + (sentiment.score * 0.3);
      
      // Market Momentum
      const momentum = (currentPrice / prices[prices.length - 7] - 1) * 100;
      const momentumFactor = momentum > 0 ? 1 + (momentum / 100) : 1 - (Math.abs(momentum) / 100);
      
      // Combined Technical Strength
      const technicalStrength = (
        (rsi > 70 ? -0.2 : rsi < 30 ? 0.2 : 0) +
        (momentum > 0 ? 0.2 : -0.2) +
        (volumeRatio > 1.5 ? 0.15 : volumeRatio < 0.5 ? -0.15 : 0) +
        (orderBookRatio > 1.2 ? 0.1 : orderBookRatio < 0.8 ? -0.1 : 0)
      );
      
      // Enhanced Confidence Calculation
      const confidence = Math.min(0.95,
        Math.abs(technicalStrength) * 0.4 +
        (volumeRatio > 0.8 && volumeRatio < 1.2 ? 0.3 : 0.1) +
        Math.abs(sentiment.score) * 0.3
      );

      // Price Prediction
      const trend = 1 + (
        technicalStrength * 0.3 +
        (orderBookRatio - 1) * 0.2 +
        (sentiment.score * 0.2) +
        ((volumeRatio - 1) * 0.1) +
        ((momentumFactor - 1) * 0.2)
      ) * sentimentMultiplier;

      return {
        time: Math.floor(date.getTime() / 1000),
        price: currentPrice * Math.pow(trend, timeframe/7),
        confidence: confidence * 100,
      };
    };

    const predictions = {
      hour: generatePrediction(1/24),
      day: generatePrediction(1),
      week: generatePrediction(7),
      twoWeeks: generatePrediction(14),
      month: generatePrediction(30),
      threeMonths: generatePrediction(90),
    };

    const technicalAnalysis = {
      rsi: calculateRSI(prices),
      volatility: calculateVolatility(prices),
      ma7: prices.slice(-7).reduce((a, b) => a + b, 0) / 7,
      ma14: prices.slice(-14).reduce((a, b) => a + b, 0) / 14,
      ma30: prices.slice(-30).reduce((a, b) => a + b, 0) / 30,
      volumeTrend: volumes.slice(-7).reduce((a, b) => a + b, 0) / 7 > 
                  volumes.slice(-30, -7).reduce((a, b) => a + b, 0) / 23 
                  ? "increasing" : "decreasing",
      priceChange: ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100
    };

    const responseData = {
      currentPrice: priceResponse.USD,
      history: historicalResponse.Data.Data,
      predictions,
      technicalAnalysis,
      sentiment: analyzeSentiment(socialResponse.data || []),
      orderBookAnalysis: {
        buyPressure: orderBookResponse.Data?.bids?.length || 0,
        sellPressure: orderBookResponse.Data?.asks?.length || 0
      },
      lastUpdated: new Date().toISOString()
    };

    console.log('Successfully generated enhanced predictions');

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