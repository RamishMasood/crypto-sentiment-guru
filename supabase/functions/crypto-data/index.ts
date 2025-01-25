import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbol = 'BTC' } = await req.json()
    const apiKey = Deno.env.get('CRYPTOCOMPARE_API_KEY')
    
    // Fetch multiple timeframes of historical data
    const [priceResponse, dailyHistoryResponse, hourlyHistoryResponse, weeklyHistoryResponse, monthlyHistoryResponse] = await Promise.all([
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=365&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${symbol}&tsym=USD&limit=168&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=30&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=90&api_key=${apiKey}`)
    ]);

    const [priceData, dailyHistory, hourlyHistory, weeklyHistory, monthlyHistory] = await Promise.all([
      priceResponse.json(),
      dailyHistoryResponse.json(),
      hourlyHistoryResponse.json(),
      weeklyHistoryResponse.json(),
      monthlyHistoryResponse.json()
    ]);

    if (!priceData || !dailyHistory?.Data?.Data || !hourlyHistory?.Data?.Data || !weeklyHistory?.Data?.Data) {
      throw new Error('Invalid data received from CryptoCompare API');
    }

    // Calculate various technical indicators
    const prices = dailyHistory.Data.Data.map((d: any) => d.close);
    const volumes = dailyHistory.Data.Data.map((d: any) => d.volumeto);
    const highs = dailyHistory.Data.Data.map((d: any) => d.high);
    const lows = dailyHistory.Data.Data.map((d: any) => d.low);
    
    // Enhanced technical analysis
    const ma7 = prices.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7;
    const ma14 = prices.slice(-14).reduce((a: number, b: number) => a + b, 0) / 14;
    const ma30 = prices.slice(-30).reduce((a: number, b: number) => a + b, 0) / 30;
    const ma50 = prices.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50;
    const ma200 = prices.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200;

    // RSI calculation
    const calculateRSI = (prices: number[], period: number = 14) => {
      const changes = prices.slice(1).map((price, i) => price - prices[i]);
      const gains = changes.map(change => change > 0 ? change : 0);
      const losses = changes.map(change => change < 0 ? -change : 0);
      
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      const RS = avgGain / (avgLoss || 1);
      return 100 - (100 / (1 + RS));
    };

    // Volume analysis
    const avgVolume = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;
    const recentVolume = volumes.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7;
    const volumeTrend = recentVolume > avgVolume ? 1.1 : 0.9;

    // Enhanced trend analysis
    const shortTrend = ma7 > ma14 ? 1.15 : 0.85;
    const mediumTrend = ma14 > ma30 ? 1.1 : 0.9;
    const longTrend = ma50 > ma200 ? 1.05 : 0.95;
    const overallTrend = (shortTrend + mediumTrend + longTrend) / 3;

    // Volatility calculation
    const volatility = Math.sqrt(
      prices.slice(-30).reduce((sum, price, i, arr) => {
        if (i === 0) return 0;
        const dailyReturn = Math.log(price / arr[i - 1]);
        return sum + dailyReturn * dailyReturn;
      }, 0) / 29
    ) * Math.sqrt(365) * 100;

    // Price momentum and market sentiment
    const rsi = calculateRSI(prices);
    const momentum = 1 + ((rsi - 50) / 100);
    const marketSentiment = rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral';

    // Generate predictions with enhanced confidence calculation
    const generatePrediction = (days: number, baseConfidence: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      
      // Enhanced confidence calculation based on multiple factors
      const trendConfidence = Math.abs(overallTrend - 1) * 0.4;
      const volumeConfidence = Math.abs(volumeTrend - 1) * 0.3;
      const momentumConfidence = Math.abs(momentum - 1) * 0.3;
      const volatilityAdjustment = Math.max(0.7, 1 - (volatility / 100));
      
      const confidence = Math.min(0.95, 
        (baseConfidence * 0.4 + 
        trendConfidence * 0.3 + 
        volumeConfidence * 0.15 + 
        momentumConfidence * 0.15) * 
        volatilityAdjustment
      );

      // Enhanced price prediction using multiple factors
      const trend = overallTrend * volumeTrend * momentum;
      const volatilityAdjustedTrend = trend * (1 - (volatility / 200));
      
      return {
        time: Math.floor(date.getTime() / 1000),
        price: priceData.USD * Math.pow(volatilityAdjustedTrend, days/7),
        confidence,
      };
    };

    // Generate predictions for different timeframes
    const predictions = {
      day: generatePrediction(1, 0.95),
      week: generatePrediction(7, 0.90),
      twoWeeks: generatePrediction(15, 0.85),
      month: generatePrediction(30, 0.80),
      threeMonths: generatePrediction(90, 0.75),
      sixMonths: generatePrediction(180, 0.70),
    };

    const responseData = {
      currentPrice: priceData.USD,
      dailyHistory: dailyHistory.Data.Data,
      hourlyHistory: hourlyHistory.Data.Data,
      weeklyHistory: weeklyHistory.Data.Data,
      monthlyHistory: monthlyHistory.Data.Data,
      prediction: {
        price: predictions.month.price,
        trend: overallTrend > 1 ? 'up' : 'down',
        confidence: predictions.month.confidence,
      },
      predictions,
      technicalAnalysis: {
        ma7,
        ma14,
        ma30,
        ma50,
        ma200,
        rsi,
        volatility,
        volumeTrend: volumeTrend > 1 ? 'increasing' : 'decreasing',
        marketSentiment,
      }
    };

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in crypto-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})