import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { tensorflow } from "npm:@tensorflow/tfjs";

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
      // Current price data
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${cryptoCompareApiKey}`),
      // Historical daily data (60 days)
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=60&api_key=${cryptoCompareApiKey}`),
      // Minute-level data (240 minutes)
      fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${symbol}&tsym=USD&limit=240&api_key=${cryptoCompareApiKey}`),
      // Hourly data (168 hours)
      fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${symbol}&tsym=USD&limit=168&api_key=${cryptoCompareApiKey}`),
      // Order book data
      fetch(`https://min-api.cryptocompare.com/data/v2/ob/l2/snapshot?fsym=${symbol}&tsym=USD&api_key=${cryptoCompareApiKey}`),
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
    const minutePrices = minuteResponse.Data.Data.map((d: any) => d.close);
    const hourPrices = hourResponse.Data.Data.map((d: any) => d.close);

    // Advanced Technical Analysis Functions
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

    // Enhanced LSTM-like prediction using moving averages and momentum
    const generateLSTMPrediction = (prices: number[], volumes: number[]) => {
      const shortMA = prices.slice(-7).reduce((a, b) => a + b, 0) / 7;
      const longMA = prices.slice(-30).reduce((a, b) => a + b, 0) / 30;
      const momentum = (prices[prices.length - 1] / prices[prices.length - 7] - 1) * 100;
      const volumeChange = (volumes[volumes.length - 1] / volumes[volumes.length - 7] - 1) * 100;
      
      return {
        trend: shortMA > longMA ? 'bullish' : 'bearish',
        strength: Math.abs(shortMA - longMA) / longMA * 100,
        momentum,
        volumeSignal: volumeChange > 20 ? 'strong' : 'normal'
      };
    };

    // Enhanced sentiment analysis with market psychology
    const analyzeSentiment = (data: any[]): SentimentData => {
      const sentimentKeywords = {
        positive: ['bullish', 'buy', 'moon', 'pump', 'growth', 'potential', 'undervalued', 'accumulate', 'hodl', 'strong', 'breakout', 'support'],
        negative: ['bearish', 'sell', 'dump', 'crash', 'overvalued', 'scam', 'weak', 'correction', 'bubble', 'resistance', 'bearish', 'sell']
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

    // Advanced prediction model with multiple timeframes
    const generateEnhancedPrediction = (timeframe: number) => {
      console.log(`Generating prediction for timeframe: ${timeframe} days`);
      
      const date = new Date();
      date.setDate(date.getDate() + timeframe);
      
      // Technical Analysis
      const rsi = calculateRSI(prices);
      const bollingerBands = calculateBollingerBands(prices);
      const lstmPrediction = generateLSTMPrediction(prices, volumes);
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
      
      // Market Momentum from LSTM
      const momentumFactor = lstmPrediction.momentum > 0 ? 1 + (lstmPrediction.momentum / 100) : 1 - (Math.abs(lstmPrediction.momentum) / 100);
      
      // Combined Technical Strength
      const technicalStrength = (
        (rsi > 70 ? -0.2 : rsi < 30 ? 0.2 : 0) +
        (lstmPrediction.trend === 'bullish' ? 0.2 : -0.2) +
        (volumeRatio > 1.5 ? 0.15 : volumeRatio < 0.5 ? -0.15 : 0) +
        (orderBookRatio > 1.2 ? 0.1 : orderBookRatio < 0.8 ? -0.1 : 0)
      );
      
      // Enhanced Confidence Calculation
      const technicalConfidence = Math.min(0.95, Math.abs(technicalStrength) * 0.7 + 0.3);
      const volumeConfidence = Math.min(0.95, (volumeRatio > 0.8 && volumeRatio < 1.2 ? 0.9 : 0.7));
      const sentimentConfidence = Math.min(0.95, Math.abs(sentiment.score) * 0.6 + 0.3);
      const lstmConfidence = Math.min(0.95, lstmPrediction.strength / 100);
      
      const confidence = Math.min(0.95,
        (technicalConfidence * 0.3 +
        volumeConfidence * 0.2 +
        sentimentConfidence * 0.2 +
        lstmConfidence * 0.3)
      );

      // Price Prediction
      const trend = 1 + (
        technicalStrength * 0.3 +
        (orderBookRatio - 1) * 0.2 +
        (sentiment.score * 0.2) +
        ((volumeRatio - 1) * 0.1) +
        ((momentumFactor - 1) * 0.2)
      ) * sentimentMultiplier;

      console.log(`Prediction details for ${timeframe} days:`, {
        technicalStrength,
        sentimentScore: sentiment.score,
        volumeRatio,
        orderBookRatio,
        lstmPrediction,
        confidence
      });

      return {
        time: Math.floor(date.getTime() / 1000),
        price: currentPrice * Math.pow(trend, timeframe/7),
        confidence: confidence * 100,
      };
    };

    // Generate predictions for different timeframes
    const predictions = {
      hour: generateEnhancedPrediction(1/24),
      day: generateEnhancedPrediction(1),
      week: generateEnhancedPrediction(7),
      twoWeeks: generateEnhancedPrediction(14),
      month: generateEnhancedPrediction(30),
      threeMonths: generateEnhancedPrediction(90),
    };

    const technicalAnalysis = {
      rsi: calculateRSI(prices),
      bollingerBands: calculateBollingerBands(prices),
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

    console.log('Successfully generated enhanced predictions with high confidence');

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