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

    console.log('Starting enhanced crypto data analysis for:', symbol);

    // Fetch multiple data sources in parallel
    const [priceData, historicalData, minuteData, socialData] = await Promise.all([
      // Current price and market data
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${cryptoCompareApiKey}`),
      // Historical daily data for long-term trends (60 days)
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=60&api_key=${cryptoCompareApiKey}`),
      // Minute-level data for short-term analysis (120 minutes)
      fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${symbol}&tsym=USD&limit=120&api_key=${cryptoCompareApiKey}`),
      // Social sentiment analysis using FireCrawl
      fetch(`https://api.firecrawl.xyz/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: [
            `https://twitter.com/search?q=${symbol}%20crypto`,
            `https://reddit.com/r/cryptocurrency/search?q=${symbol}`
          ],
          scrapeOptions: {
            formats: ['text'],
            selectors: ['.tweet-text', '.post-title', '.post-content']
          }
        })
      })
    ]);

    console.log('Successfully fetched all data sources');

    const [priceResponse, historicalResponse, minuteResponse, socialResponse] = await Promise.all([
      priceData.json(),
      historicalData.json(),
      minuteData.json(),
      socialData.json()
    ]);

    // Process historical price data
    const prices = historicalResponse.Data.Data.map((d: any) => d.close);
    const volumes = historicalResponse.Data.Data.map((d: any) => d.volumeto);
    const minutePrices = minuteResponse.Data.Data.map((d: any) => d.close);

    // Calculate technical indicators
    const calculateRSI = (prices: number[], period = 14) => {
      const changes = prices.slice(1).map((price, i) => price - prices[i]);
      const gains = changes.map(change => change > 0 ? change : 0);
      const losses = changes.map(change => change < 0 ? -change : 0);
      
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      const RS = avgGain / (avgLoss || 1);
      return 100 - (100 / (1 + RS));
    };

    const calculateBollingerBands = (prices: number[], period = 20, stdDev = 2) => {
      const sma = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
      const squaredDiffs = prices.slice(-period).map(price => Math.pow(price - sma, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      const std = Math.sqrt(variance);
      
      return {
        upper: sma + (stdDev * std),
        middle: sma,
        lower: sma - (stdDev * std)
      };
    };

    // Analyze social sentiment with enhanced accuracy
    const analyzeSentiment = (data: any[]): SentimentData => {
      const sentimentKeywords = {
        positive: ['bullish', 'buy', 'moon', 'pump', 'growth', 'potential', 'undervalued', 'accumulate', 'hodl', 'strong'],
        negative: ['bearish', 'sell', 'dump', 'crash', 'overvalued', 'scam', 'weak', 'correction', 'bubble']
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

      return {
        score,
        mentions: totalMentions,
        positiveCount,
        negativeCount,
        keywords
      };
    };

    // Enhanced prediction model
    const generateEnhancedPrediction = (timeframe: number, baseConfidence: number) => {
      console.log(`Generating prediction for timeframe: ${timeframe} days`);
      
      const date = new Date();
      date.setDate(date.getDate() + timeframe);
      
      // Technical Analysis Factors
      const rsi = calculateRSI(prices);
      const bollingerBands = calculateBollingerBands(prices);
      const currentPrice = prices[prices.length - 1];
      const pricePosition = (currentPrice - bollingerBands.lower) / (bollingerBands.upper - bollingerBands.lower);
      
      // Volume Analysis
      const recentVolume = volumes.slice(-7).reduce((a, b) => a + b, 0) / 7;
      const historicalVolume = volumes.slice(-30, -7).reduce((a, b) => a + b, 0) / 23;
      const volumeRatio = recentVolume / historicalVolume;
      
      // Sentiment Impact
      const sentiment = analyzeSentiment(socialResponse.data || []);
      const sentimentMultiplier = 1 + (sentiment.score * 0.3);
      
      // Volatility Calculation
      const volatility = Math.sqrt(
        prices.slice(-30).reduce((sum, price, i, arr) => {
          if (i === 0) return 0;
          const dailyReturn = Math.log(price / arr[i - 1]);
          return sum + dailyReturn * dailyReturn;
        }, 0) / 29
      ) * Math.sqrt(365) * 100;
      
      // Combined Analysis
      const technicalStrength = (
        (rsi > 70 ? -0.2 : rsi < 30 ? 0.2 : 0) +
        (pricePosition > 0.8 ? -0.15 : pricePosition < 0.2 ? 0.15 : 0) +
        (volumeRatio > 1.5 ? 0.15 : volumeRatio < 0.5 ? -0.15 : 0)
      );
      
      // Enhanced Confidence Calculation
      const confidence = Math.min(0.95, 
        (baseConfidence * 0.4 + 
        Math.abs(technicalStrength) * 0.3 + 
        Math.abs(sentiment.score) * 0.3) * 
        (1 - volatility / 200)
      );

      // Price Prediction with Multiple Factors
      const trend = 1 + (
        technicalStrength +
        (sentiment.score * 0.2) +
        ((volumeRatio - 1) * 0.1)
      ) * sentimentMultiplier;

      console.log(`Prediction details for ${timeframe} days:`, {
        technicalStrength,
        sentimentScore: sentiment.score,
        volumeRatio,
        confidence
      });

      return {
        time: Math.floor(date.getTime() / 1000),
        price: currentPrice * Math.pow(trend, timeframe/7),
        confidence,
      };
    };

    // Generate predictions for different timeframes
    const predictions = {
      hour: generateEnhancedPrediction(1/24, 0.95),
      day: generateEnhancedPrediction(1, 0.93),
      week: generateEnhancedPrediction(7, 0.91),
      twoWeeks: generateEnhancedPrediction(14, 0.90),
      month: generateEnhancedPrediction(30, 0.90),
      threeMonths: generateEnhancedPrediction(90, 0.90),
    };

    const technicalAnalysis = {
      rsi: calculateRSI(prices),
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
      dailyHistory: historicalResponse.Data.Data,
      hourlyHistory: minuteResponse.Data.Data,
      prediction: {
        price: predictions.day.price,
        trend: predictions.day.price > priceResponse.USD ? 'up' : 'down',
        confidence: predictions.day.confidence
      },
      predictions,
      technicalAnalysis,
      sentiment: analyzeSentiment(socialResponse.data || []),
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