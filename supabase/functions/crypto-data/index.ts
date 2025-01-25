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
    const [priceResponse, dailyHistoryResponse, hourlyHistoryResponse, weeklyHistoryResponse] = await Promise.all([
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=30&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${symbol}&tsym=USD&limit=24&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=7&api_key=${apiKey}`)
    ]);

    const [priceData, dailyHistory, hourlyHistory, weeklyHistory] = await Promise.all([
      priceResponse.json(),
      dailyHistoryResponse.json(),
      hourlyHistoryResponse.json(),
      weeklyHistoryResponse.json()
    ]);

    if (!priceData || !dailyHistory?.Data?.Data || !hourlyHistory?.Data?.Data || !weeklyHistory?.Data?.Data) {
      throw new Error('Invalid data received from CryptoCompare API');
    }

    // Calculate various technical indicators
    const prices = dailyHistory.Data.Data.map((d: any) => d.close);
    const volumes = dailyHistory.Data.Data.map((d: any) => d.volumeto);
    
    // Moving averages
    const ma7 = prices.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7;
    const ma14 = prices.slice(-14).reduce((a: number, b: number) => a + b, 0) / 14;
    const ma30 = prices.slice(-30).reduce((a: number, b: number) => a + b, 0) / 30;

    // Volume analysis
    const avgVolume = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;
    const recentVolume = volumes.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7;
    const volumeTrend = recentVolume > avgVolume ? 1.05 : 0.95;

    // Trend analysis
    const shortTrend = ma7 > ma14 ? 1.1 : 0.9;
    const longTrend = ma14 > ma30 ? 1.05 : 0.95;
    const overallTrend = (shortTrend + longTrend) / 2;

    // Price momentum
    const priceChange = (prices[prices.length - 1] - prices[0]) / prices[0];
    const momentum = 1 + (priceChange * 0.5);

    // Generate predictions for different timeframes
    const generatePrediction = (days: number, baseConfidence: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      const confidence = Math.max(0.4, baseConfidence - (days * 0.01));
      const trend = overallTrend * volumeTrend * momentum;
      return {
        time: Math.floor(date.getTime() / 1000),
        price: priceData.USD * Math.pow(trend, days/7),
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

    const trend = overallTrend > 1 ? 'up' : 'down';
    const confidence = Math.min(0.95, (Math.abs(overallTrend - 1) * 5 + Math.abs(volumeTrend - 1) * 3) / 8);

    const responseData = {
      currentPrice: priceData.USD,
      dailyHistory: dailyHistory.Data.Data,
      hourlyHistory: hourlyHistory.Data.Data,
      weeklyHistory: weeklyHistory.Data.Data,
      prediction: {
        price: predictions.month.price,
        trend,
        confidence,
      },
      predictions,
      technicalAnalysis: {
        ma7,
        ma14,
        ma30,
        volumeTrend: volumeTrend > 1 ? 'increasing' : 'decreasing',
        priceChange: priceChange * 100,
      }
    };

    console.log('Crypto data response:', JSON.stringify(responseData));

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