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
    
    const [priceResponse, dailyHistoryResponse, hourlyHistoryResponse] = await Promise.all([
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=30&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${symbol}&tsym=USD&limit=24&api_key=${apiKey}`)
    ]);

    const [priceData, dailyHistory, hourlyHistory] = await Promise.all([
      priceResponse.json(),
      dailyHistoryResponse.json(),
      hourlyHistoryResponse.json()
    ]);

    // Simple price prediction based on moving average
    const prices = dailyHistory.Data.Data.map((d: any) => d.close);
    const ma7 = prices.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7;
    const ma14 = prices.slice(-14).reduce((a: number, b: number) => a + b, 0) / 14;
    const trend = ma7 > ma14 ? 'up' : 'down';
    const prediction = trend === 'up' ? 
      priceData.USD * 1.1 : // 10% increase prediction
      priceData.USD * 0.9;  // 10% decrease prediction

    return new Response(
      JSON.stringify({
        currentPrice: priceData.USD,
        dailyHistory: dailyHistory.Data.Data,
        hourlyHistory: hourlyHistory.Data.Data,
        prediction: {
          price: prediction,
          trend: trend,
          confidence: 0.7 // Simplified confidence score
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})