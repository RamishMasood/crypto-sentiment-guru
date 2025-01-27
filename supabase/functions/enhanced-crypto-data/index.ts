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
    const [priceData, historicalDaily, historicalHourly, orderBookData, socialStats] = await Promise.all([
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=30&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${symbol}&tsym=USD&limit=168&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/ob/l2/snapshot?fsym=${symbol}&tsym=USD&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/social/coin/latest?coinId=${symbol}&api_key=${cryptoCompareApiKey}`)
    ]);

    const [priceResponse, historicalDailyResponse, historicalHourlyResponse, orderBookResponse, socialStatsResponse] = await Promise.all([
      priceData.json(),
      historicalDaily.json(),
      historicalHourly.json(),
      orderBookData.json(),
      socialStats.json()
    ]);

    console.log('Successfully fetched market data');

    // Process historical data
    const dailyPrices = historicalDailyResponse.Data.Data.map((d: any) => d.close);
    const hourlyPrices = historicalHourlyResponse.Data.Data.map((d: any) => d.close);
    const volumes = historicalDailyResponse.Data.Data.map((d: any) => d.volumeto);

    // Enhanced technical indicators
    const calculateRSI = (prices: number[], period = 14) => {
      const changes = prices.slice(1).map((price, i) => price - prices[i]);
      const gains = changes.map(change => change > 0 ? change : 0);
      const losses = changes.map(change => change < 0 ? -change : 0);
      
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      const RS = avgGain / (avgLoss || 1);
      return 100 - (100 / (1 + RS));
    };

    const calculateVolatility = (prices: number[]) => {
      const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]));
      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
      return Math.sqrt(variance * 252) * 100;
    };

    // Calculate MACD
    const calculateMACD = (prices: number[]) => {
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);
      return ema12 - ema26;
    };

    const calculateEMA = (prices: number[], period: number) => {
      const k = 2 / (period + 1);
      let ema = prices[0];
      for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
      }
      return ema;
    };

    // Enhanced market depth analysis with weighted factors
    const orderBookBids = orderBookResponse.Data?.bids || [];
    const orderBookAsks = orderBookResponse.Data?.asks || [];
    const buyPressure = orderBookBids.reduce((sum: number, [price, quantity]: number[]) => sum + price * quantity, 0);
    const sellPressure = orderBookAsks.reduce((sum: number, [price, quantity]: number[]) => sum + price * quantity, 0);
    const orderBookRatio = buyPressure / (sellPressure || 1);

    // Enhanced social metrics analysis with weighted impact
    const socialMetrics = socialStatsResponse.Data || {};
    const redditActiveUsers = socialMetrics.Reddit?.active_users || 0;
    const twitterFollowers = socialMetrics.Twitter?.followers || 0;
    const redditPosts = socialMetrics.Reddit?.posts_per_day || 0;
    const twitterPosts = socialMetrics.Twitter?.tweets_per_day || 0;
    
    const socialScore = (
      (redditActiveUsers * 0.3) + 
      (twitterFollowers * 0.3) + 
      (redditPosts * 0.2) + 
      (twitterPosts * 0.2)
    ) / 1000;

    // Enhanced prediction model with improved confidence calculation
    const generatePrediction = (timeframe: number) => {
      const currentPrice = priceResponse.USD;
      const rsi = calculateRSI(dailyPrices);
      const volatility = calculateVolatility(dailyPrices);
      const macd = calculateMACD(dailyPrices);
      
      // Technical factors with optimized weights
      const rsiSignal = rsi > 70 ? -0.3 : rsi < 30 ? 0.3 : 0;
      const macdSignal = macd > 0 ? 0.25 : -0.25;
      const volatilityImpact = 1 - (volatility / 150); // Adjusted scale
      
      // Enhanced market depth analysis
      const orderBookSignal = orderBookRatio > 1.2 ? 0.3 : orderBookRatio < 0.8 ? -0.3 : 0;
      
      // Volume trend analysis
      const recentVolume = volumes.slice(-7).reduce((a, b) => a + b, 0) / 7;
      const historicalVolume = volumes.slice(-30, -7).reduce((a, b) => a + b, 0) / 23;
      const volumeSignal = (recentVolume > historicalVolume * 1.2) ? 0.2 : -0.2;
      
      // Price momentum with increased weight
      const priceChange = ((currentPrice - dailyPrices[0]) / dailyPrices[0]);
      const momentumSignal = priceChange > 0 ? 0.15 : -0.15;

      // Combined technical score with optimized weights
      const technicalScore = (
        (rsiSignal * 0.35) +
        (macdSignal * 0.25) +
        (orderBookSignal * 0.2) +
        (volumeSignal * 0.1) +
        (momentumSignal * 0.1)
      ) * volatilityImpact;

      // Enhanced social sentiment impact
      const socialImpact = (socialScore > 750 ? 0.2 : socialScore > 250 ? 0.1 : -0.1);

      // Calculate trend with improved weighting
      const trend = 1 + (technicalScore * 0.7 + socialImpact * 0.3);
      
      // Enhanced confidence calculation with multiple factors
      const technicalConfidence = Math.min(0.95, Math.abs(technicalScore) * 0.7);
      const marketDepthConfidence = (orderBookRatio > 0.8 && orderBookRatio < 1.2) ? 0.15 : 0.1;
      const socialConfidence = (socialScore > 250) ? 0.15 : 0.1;
      
      // Base confidence with improved weighting
      const baseConfidence = (
        technicalConfidence * 0.6 +
        marketDepthConfidence * 0.25 +
        socialConfidence * 0.15
      );
      
      // Time-adjusted confidence with slower decay
      const timeAdjustedConfidence = baseConfidence * Math.exp(-timeframe / 500);
      
      // Final confidence score with minimum threshold
      const confidence = Math.max(0.65, Math.min(0.95, timeAdjustedConfidence));

      const date = new Date();
      date.setDate(date.getDate() + timeframe);

      return {
        time: Math.floor(date.getTime() / 1000),
        price: currentPrice * Math.pow(trend, timeframe/7),
        confidence
      };
    };

    // Generate predictions for different timeframes including hourly
    const predictions = {
      hour: generatePrediction(1/24),
      day: generatePrediction(1),
      week: generatePrediction(7),
      twoWeeks: generatePrediction(14),
      month: generatePrediction(30),
      threeMonths: generatePrediction(90),
      sixMonths: generatePrediction(180)
    };

    const technicalAnalysis = {
      rsi: calculateRSI(dailyPrices),
      volatility: calculateVolatility(dailyPrices),
      macd: calculateMACD(dailyPrices),
      ma7: dailyPrices.slice(-7).reduce((a, b) => a + b, 0) / 7,
      ma14: dailyPrices.slice(-14).reduce((a, b) => a + b, 0) / 14,
      ma30: dailyPrices.slice(-30).reduce((a, b) => a + b, 0) / 30,
      ma50: dailyPrices.slice(-50).reduce((a, b) => a + b, 0) / 50,
      ma200: dailyPrices.slice(-200).reduce((a, b) => a + b, 0) / 200,
      volumeTrend: volumes.slice(-7).reduce((a, b) => a + b, 0) / 7 > 
                  volumes.slice(-30, -7).reduce((a, b) => a + b, 0) / 23 
                  ? "increasing" : "decreasing",
      marketSentiment: orderBookRatio > 1.1 ? "bullish" : orderBookRatio < 0.9 ? "bearish" : "neutral",
      priceChange: ((priceResponse.USD - dailyPrices[0]) / dailyPrices[0]) * 100
    };

    const responseData = {
      currentPrice: priceResponse.USD,
      dailyHistory: historicalDailyResponse.Data.Data,
      hourlyHistory: historicalHourlyResponse.Data.Data,
      prediction: {
        price: predictions.hour.price,
        trend: technicalAnalysis.priceChange >= 0 ? 'up' : 'down',
        confidence: predictions.hour.confidence
      },
      predictions,
      technicalAnalysis,
      lastUpdated: new Date().toISOString()
    };

    console.log('Successfully generated enhanced predictions with confidence:', predictions.hour.confidence);

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