import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Chapa sends data either in body or query params
    let tx_ref;
    const url = new URL(req.url);
    
    // Try to get tx_ref from query params first (GET request)
    if (req.method === 'GET') {
      tx_ref = url.searchParams.get('trx_ref') || url.searchParams.get('tx_ref');
    } else {
      // Try to get from body (POST request)
      const body = await req.json();
      tx_ref = body.trx_ref || body.tx_ref;
    }

    if (!tx_ref) {
      console.error('No transaction reference provided');
      return new Response(
        JSON.stringify({ error: 'No transaction reference provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Payment callback received:', tx_ref);

    // Verify payment with Chapa
    const chapaKey = Deno.env.get('CHAPA_SECRET_KEY');
    const verifyResponse = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${chapaKey}`,
      },
    });

    if (!verifyResponse.ok) {
      console.error('Chapa verification failed:', await verifyResponse.text());
      throw new Error('Payment verification failed');
    }

    const verifyData = await verifyResponse.json();
    console.log('Verification response:', verifyData);

    if (verifyData.status === 'success' && verifyData.data?.status === 'success') {
      // Extract order ID from tx_ref (format: uuid-timestamp)
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-timestamp
      // We need to get everything before the last hyphen (which is the timestamp)
      const lastHyphenIndex = tx_ref.lastIndexOf('-');
      const orderId = tx_ref.substring(0, lastHyphenIndex);
      
      // Get order details
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Order not found:', orderError);
        throw new Error('Order not found');
      }

      if (order) {
        // Check if payment already recorded
        const { data: existingPayment } = await supabaseClient
          .from('payments')
          .select('id')
          .eq('notes', `Chapa payment - ${tx_ref}`)
          .single();

        if (!existingPayment) {
          // Record payment
          const { error: paymentError } = await supabaseClient
            .from('payments')
            .insert({
              order_id: orderId,
              payer_name: `${verifyData.data.first_name || ''} ${verifyData.data.last_name || ''}`.trim() || 'Chapa Payment',
              amount: verifyData.data.amount,
              payment_method: 'chapa',
              payment_date: new Date().toISOString(),
              recorded_by: order.user_id || order.created_by,
              notes: `Chapa payment - ${tx_ref}`,
            });

          if (paymentError) {
            console.error('Failed to record payment:', paymentError);
            throw new Error('Failed to record payment');
          }

          console.log('Payment recorded successfully for order:', orderId);
        } else {
          console.log('Payment already recorded:', tx_ref);
        }
      }
    } else {
      console.log('Payment not successful:', verifyData);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Payment processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
