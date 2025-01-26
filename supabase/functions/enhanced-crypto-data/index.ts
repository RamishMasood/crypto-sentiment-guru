import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  volatility: number;
  volumeTrend: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol = 'BTC' } = await req.json();
    const cryptoCompareApiKey = Deno.env.get('CRYPTOCOMPARE_API_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    // Fetch multiple data sources in parallel
    const [priceData, historicalData, minuteData, socialData] = await Promise.all([
      // Current price data
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${cryptoCompareApiKey}`),
      // Historical daily data for long-term trends
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=60&api_key=${cryptoCompareApiKey}`),
      // Minute-level data for short-term analysis
      fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${symbol}&tsym=USD&limit=120&api_key=${cryptoCompareApiKey}`),
      // Social sentiment data using FireCrawl
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

    const calculateMACD = (prices: number[]) => {
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);
      const macd = ema12 - ema26;
      const signal = calculateEMA([...Array(17).fill(macd), macd], 9);
      return {
        value: macd,
        signal,
        histogram: macd - signal
      };
    };

    const calculateEMA = (prices: number[], period: number) => {
      const multiplier = 2 / (period + 1);
      let ema = prices[0];
      
      for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
      }
      
      return ema;
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

    // Analyze social sentiment
    const analyzeSentiment = (data: any[]): SentimentData => {
      const sentimentKeywords = {
        positive: ['bullish', 'buy', 'moon', 'pump', 'growth', 'potential', 'undervalued'],
        negative: ['bearish', 'sell', 'dump', 'crash', 'overvalued', 'scam']
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

    // Calculate technical indicators
    const technicalIndicators: TechnicalIndicators = {
      rsi: calculateRSI(prices),
      macd: calculateMACD(prices),
      bollingerBands: calculateBollingerBands(prices),
      volatility: Math.sqrt(
        prices.slice(-30).reduce((sum, price, i, arr) => {
          if (i === 0) return 0;
          const dailyReturn = Math.log(price / arr[i - 1]);
          return sum + dailyReturn * dailyReturn;
        }, 0) / 29
      ) * Math.sqrt(365) * 100,
      volumeTrend: calculateMA(volumes, 7) > calculateMA(volumes, 30) ? 'increasing' : 'decreasing'
    };

    // Generate enhanced predictions
    const generatePrediction = (timeframe: number, baseConfidence: number) => {
      const date = new Date();
      date.setDate(date.getDate() + timeframe);
      
      // Technical Analysis Factors
      const trendStrength = Math.abs(technicalIndicators.macd.histogram) / technicalIndicators.macd.value;
      const volatilityImpact = Math.max(0.7, 1 - (technicalIndicators.volatility / 100));
      const rsiSignal = technicalIndicators.rsi > 70 ? -0.2 : technicalIndicators.rsi < 30 ? 0.2 : 0;
      
      // Volume Analysis
      const volumeStrength = volumes.slice(-7).reduce((a, b) => a + b, 0) / 
                            (volumes.slice(-30, -7).reduce((a, b) => a + b, 0) / 23);
      
      // Sentiment Impact
      const sentiment = analyzeSentiment(socialResponse.data || []);
      const sentimentMultiplier = 1 + (sentiment.score * 0.2);
      
      // Combined Confidence Calculation
      const technicalConfidence = (
        (trendStrength * 0.3) +
        (Math.abs(rsiSignal) * 0.3) +
        (volumeStrength * 0.4)
      ) * volatilityImpact;
      
      const confidence = Math.min(0.98, 
        (baseConfidence * 0.4 + 
        technicalConfidence * 0.4 + 
        Math.abs(sentiment.score) * 0.2) * 
        volatilityImpact
      );

      // Price Prediction
      const trend = 1 + (
        (technicalIndicators.macd.histogram > 0 ? 0.1 : -0.1) +
        rsiSignal +
        (volumeStrength > 1 ? 0.1 : -0.1)
      ) * sentimentMultiplier;

      return {
        time: Math.floor(date.getTime() / 1000),
        price: priceResponse.USD * Math.pow(trend, timeframe/7),
        confidence,
      };
    };

    // Generate predictions for different timeframes
    const predictions = {
      hour: generatePrediction(1/24, 0.95),
      day: generatePrediction(1, 0.90),
      week: generatePrediction(7, 0.85),
      month: generatePrediction(30, 0.80),
      threeMonths: generatePrediction(90, 0.75),
      sixMonths: generatePrediction(180, 0.70),
    };

    const responseData = {
      currentPrice: priceResponse.USD,
      history: historicalResponse.Data.Data,
      minuteData: minuteResponse.Data.Data,
      predictions,
      technicalIndicators,
      sentiment: analyzeSentiment(socialResponse.data || []),
      lastUpdated: new Date().toISOString()
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

function calculateMA(data: number[], period: number): number {
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
}