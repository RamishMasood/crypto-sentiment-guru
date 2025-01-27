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

    // Fetch comprehensive data from CryptoCompare
    const [priceData, historicalDaily, historicalHourly, orderBookData, socialStats] = await Promise.all([
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=30&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${symbol}&tsym=USD&limit=24&api_key=${cryptoCompareApiKey}`),
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

    // Process historical price data
    const dailyPrices = historicalDailyResponse.Data.Data.map((d: any) => d.close);
    const hourlyPrices = historicalHourlyResponse.Data.Data.map((d: any) => d.close);
    const volumes = historicalDailyResponse.Data.Data.map((d: any) => d.volumeto);

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

    const calculateVolatility = (prices: number[]) => {
      const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]));
      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
      return Math.sqrt(variance * 252) * 100;
    };

    // Market depth analysis
    const orderBookBids = orderBookResponse.Data?.bids || [];
    const orderBookAsks = orderBookResponse.Data?.asks || [];
    const buyPressure = orderBookBids.reduce((sum: number, [price, quantity]: number[]) => sum + price * quantity, 0);
    const sellPressure = orderBookAsks.reduce((sum: number, [price, quantity]: number[]) => sum + price * quantity, 0);
    const orderBookRatio = buyPressure / (sellPressure || 1);

    // Social metrics analysis
    const socialMetrics = socialStatsResponse.Data || {};
    const redditActiveUsers = socialMetrics.Reddit?.active_users || 0;
    const twitterFollowers = socialMetrics.Twitter?.followers || 0;
    const socialScore = (redditActiveUsers * 0.4 + twitterFollowers * 0.6) / 1000;

    // Generate predictions based on combined analysis
    const generatePrediction = (timeframe: number) => {
      const currentPrice = priceResponse.USD;
      const rsi = calculateRSI(dailyPrices);
      const volatility = calculateVolatility(dailyPrices);
      
      // Technical factors
      const momentum = (currentPrice / dailyPrices[dailyPrices.length - 7] - 1) * 100;
      const volumeTrend = volumes.slice(-7).reduce((a, b) => a + b, 0) / 7 > 
                         volumes.slice(-30, -7).reduce((a, b) => a + b, 0) / 23;
      
      // Combined prediction factors
      const technicalScore = (
        (rsi > 70 ? -0.2 : rsi < 30 ? 0.2 : 0) +
        (momentum > 0 ? 0.2 : -0.2) +
        (volumeTrend ? 0.1 : -0.1) +
        (orderBookRatio > 1 ? 0.1 : -0.1)
      );

      const socialImpact = (socialScore > 500 ? 0.1 : -0.1);
      const volatilityAdjustment = 1 - (volatility / 200);
      const trend = 1 + (technicalScore + socialImpact) * volatilityAdjustment;

      // Calculate confidence based on multiple factors
      const confidence = Math.min(0.95, Math.abs(technicalScore) * 0.4 + 
                                     (orderBookRatio > 0.8 && orderBookRatio < 1.2 ? 0.3 : 0.1) +
                                     (socialScore > 100 ? 0.2 : 0.1));

      const date = new Date();
      date.setDate(date.getDate() + timeframe);

      return {
        time: Math.floor(date.getTime() / 1000),
        price: currentPrice * Math.pow(trend, timeframe/7),
        confidence
      };
    };

    const predictions = {
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
        price: predictions.day.price,
        trend: technicalAnalysis.priceChange >= 0 ? 'up' : 'down',
        confidence: predictions.day.confidence
      },
      predictions,
      technicalAnalysis,
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