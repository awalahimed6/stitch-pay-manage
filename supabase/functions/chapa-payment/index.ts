import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId, amount, email, fullName, phone } = await req.json();

    console.log('Processing payment request:', { orderId, amount, email });

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Initialize Chapa payment
    const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('CHAPA_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'ETB',
        email: email,
        first_name: fullName.split(' ')[0] || fullName,
        last_name: fullName.split(' ')[1] || '',
        phone_number: phone,
        tx_ref: `${orderId}-${Date.now()}`,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/chapa-callback`,
        return_url: `${req.headers.get('origin')}/user/orders/${orderId}`,
        customization: {
          title: 'Tailor Shop Payment',
          description: `Payment for order ${order.customer_name}`,
        },
      }),
    });

    const chapaData = await chapaResponse.json();
    console.log('Chapa response:', chapaData);

    if (chapaData.status === 'success') {
      return new Response(
        JSON.stringify({ 
          checkoutUrl: chapaData.data.checkout_url,
          txRef: chapaData.data.tx_ref
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      throw new Error(chapaData.message || 'Payment initialization failed');
    }

  } catch (error) {
    console.error('Payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
