import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    console.log('Starting enhanced prediction analysis for:', symbol);

    // Fetch comprehensive market data
    const [
      priceData,
      historicalDaily,
      historicalHourly,
      orderBookData,
      socialStats,
      newsData,
      globalMetrics
    ] = await Promise.all([
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=365&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${symbol}&tsym=USD&limit=168&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/ob/l2/snapshot?fsym=${symbol}&tsym=USD&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/social/coin/latest?fsym=${symbol}&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/news/?categories=${symbol}&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/blockchain/latest?fsym=${symbol}&api_key=${cryptoCompareApiKey}`)
    ]);

    const [
      priceResponse,
      historicalDailyResponse,
      historicalHourlyResponse,
      orderBookResponse,
      socialStatsResponse,
      newsDataResponse,
      globalMetricsResponse
    ] = await Promise.all([
      priceData.json(),
      historicalDaily.json(),
      historicalHourly.json(),
      orderBookData.json(),
      socialStats.json(),
      newsData.json(),
      globalMetrics.json()
    ]);

    // Technical Analysis
    const calculateTechnicalScore = (prices: number[], volumes: number[]) => {
      // Moving averages
      const ma7 = prices.slice(-7).reduce((a, b) => a + b, 0) / 7;
      const ma25 = prices.slice(-25).reduce((a, b) => a + b, 0) / 25;
      const ma99 = prices.slice(-99).reduce((a, b) => a + b, 0) / 99;

      // RSI calculation
      const changes = prices.slice(1).map((price, i) => price - prices[i]);
      const gains = changes.map(change => change > 0 ? change : 0);
      const losses = changes.map(change => change < 0 ? -change : 0);
      const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
      const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
      const rsi = 100 - (100 / (1 + (avgGain / (avgLoss || 1))));

      // Volume analysis
      const recentVolume = volumes.slice(-7).reduce((a, b) => a + b, 0) / 7;
      const historicalVolume = volumes.slice(-30, -7).reduce((a, b) => a + b, 0) / 23;
      const volumeTrend = recentVolume / historicalVolume;

      // MACD
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);
      const macd = ema12 - ema26;

      // Combine technical indicators
      const maScore = ((ma7 > ma25 ? 1 : -1) + (ma25 > ma99 ? 1 : -1)) / 2;
      const rsiScore = rsi > 70 ? -1 : rsi < 30 ? 1 : 0;
      const volumeScore = volumeTrend > 1.2 ? 1 : volumeTrend < 0.8 ? -1 : 0;
      const macdScore = macd > 0 ? 1 : -1;

      return {
        score: (maScore + rsiScore + volumeScore + macdScore) / 4,
        confidence: Math.min(0.95, 0.75 + Math.abs(maScore + rsiScore + volumeScore + macdScore) / 8),
        indicators: { rsi, macd, volumeTrend, ma7, ma25, ma99 }
      };
    };

    // Fundamental Analysis
    const calculateFundamentalScore = async (globalMetrics: any, newsData: any) => {
      const { Data: metrics } = globalMetricsResponse;
      const { Data: news } = newsDataResponse;

      // Network health
      const networkScore = metrics ? (
        metrics.transaction_count > metrics.average_transaction_count ? 1 :
        metrics.transaction_count < metrics.average_transaction_count * 0.8 ? -1 : 0
      ) : 0;

      // News sentiment analysis (basic)
      const newsScore = news.reduce((score: number, item: any) => {
        const sentiment = item.title.toLowerCase();
        if (sentiment.includes('surge') || sentiment.includes('bull') || sentiment.includes('rise')) return score + 1;
        if (sentiment.includes('crash') || sentiment.includes('bear') || sentiment.includes('fall')) return score - 1;
        return score;
      }, 0) / Math.max(1, news.length);

      // Market dominance
      const dominanceScore = metrics?.market_cap_dominance > 50 ? 1 : 
                            metrics?.market_cap_dominance < 30 ? -1 : 0;

      const score = (networkScore + newsScore + dominanceScore) / 3;
      return {
        score,
        confidence: Math.min(0.90, 0.70 + Math.abs(score) / 4),
        metrics: { networkScore, newsScore, dominanceScore }
      };
    };

    // Sentiment Analysis
    const calculateSentimentScore = (socialData: any, orderBook: any) => {
      const { Data: social } = socialStatsResponse;
      const { bids = [], asks = [] } = orderBookResponse.Data || {};

      // Social metrics
      const socialScore = social ? (
        (social.Reddit?.active_users || 0) * 0.3 +
        (social.Twitter?.followers || 0) * 0.3 +
        (social.Reddit?.posts_per_day || 0) * 0.2 +
        (social.Twitter?.tweets_per_day || 0) * 0.2
      ) / 1000 : 0;

      // Order book analysis
      const buyPressure = bids.reduce((sum: number, [price, quantity]: number[]) => sum + price * quantity, 0);
      const sellPressure = asks.reduce((sum: number, [price, quantity]: number[]) => sum + price * quantity, 0);
      const orderBookRatio = buyPressure / (sellPressure || 1);
      const orderBookScore = orderBookRatio > 1.2 ? 1 : orderBookRatio < 0.8 ? -1 : 0;

      const score = (socialScore + orderBookScore) / 2;
      return {
        score,
        confidence: Math.min(0.85, 0.65 + Math.abs(score) / 4),
        metrics: { socialScore, orderBookRatio }
      };
    };

    const calculateEMA = (prices: number[], period: number) => {
      const k = 2 / (period + 1);
      let ema = prices[0];
      for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
      }
      return ema;
    };

    // Process historical data
    const dailyPrices = historicalDailyResponse.Data.Data.map((d: any) => d.close);
    const volumes = historicalDailyResponse.Data.Data.map((d: any) => d.volumeto);

    // Calculate scores from all three analyses
    const technical = calculateTechnicalScore(dailyPrices, volumes);
    const fundamental = await calculateFundamentalScore(globalMetricsResponse, newsDataResponse);
    const sentiment = calculateSentimentScore(socialStatsResponse, orderBookResponse);

    // Generate enhanced predictions
    const generatePrediction = (timeframe: number) => {
      const currentPrice = priceResponse.USD;
      
      // Weight the different analyses based on timeframe
      const weights = timeframe <= 1 ? // Short-term
        { technical: 0.5, fundamental: 0.2, sentiment: 0.3 } :
        timeframe <= 7 ? // Medium-term
        { technical: 0.4, fundamental: 0.4, sentiment: 0.2 } :
        // Long-term
        { technical: 0.3, fundamental: 0.5, sentiment: 0.2 };

      const combinedScore = (
        technical.score * weights.technical +
        fundamental.score * weights.fundamental +
        sentiment.score * weights.sentiment
      );

      // Calculate weighted confidence
      const confidence = Math.min(0.95, (
        technical.confidence * weights.technical +
        fundamental.confidence * weights.fundamental +
        sentiment.confidence * weights.sentiment
      ));

      // Calculate price movement based on combined analysis
      const trend = 1 + (combinedScore * Math.min(0.15, timeframe / 100));
      
      const date = new Date();
      date.setDate(date.getDate() + timeframe);

      return {
        time: Math.floor(date.getTime() / 1000),
        price: currentPrice * Math.pow(trend, timeframe/7),
        confidence
      };
    };

    // Generate predictions for all timeframes
    const predictions = {
      hour: generatePrediction(1/24),
      day: generatePrediction(1),
      week: generatePrediction(7),
      twoWeeks: generatePrediction(14),
      month: generatePrediction(30),
      threeMonths: generatePrediction(90),
      sixMonths: generatePrediction(180),
      year: generatePrediction(365)
    };

    const technicalAnalysis = {
      ...technical.indicators,
      volumeTrend: technical.indicators.volumeTrend > 1 ? "increasing" : "decreasing",
      marketSentiment: sentiment.score > 0.2 ? "bullish" : sentiment.score < -0.2 ? "bearish" : "neutral",
      priceChange: ((priceResponse.USD - dailyPrices[0]) / dailyPrices[0]) * 100
    };

    const responseData = {
      currentPrice: priceResponse.USD,
      history: historicalDailyResponse.Data.Data,
      predictions,
      technicalAnalysis,
      analysisScores: {
        technical: technical.score,
        fundamental: fundamental.score,
        sentiment: sentiment.score
      },
      lastUpdated: new Date().toISOString()
    };

    console.log('Successfully generated enhanced predictions with combined analysis');

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