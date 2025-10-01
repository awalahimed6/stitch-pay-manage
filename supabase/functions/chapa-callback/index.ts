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

    const { tx_ref } = await req.json();
    console.log('Payment callback received:', tx_ref);

    // Verify payment with Chapa
    const verifyResponse = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('CHAPA_SECRET_KEY')}`,
      },
    });

    const verifyData = await verifyResponse.json();
    console.log('Verification response:', verifyData);

    if (verifyData.status === 'success' && verifyData.data.status === 'success') {
      // Extract order ID from tx_ref
      const orderId = tx_ref.split('-')[0];
      
      // Get order details
      const { data: order } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (order) {
        // Record payment
        await supabaseClient
          .from('payments')
          .insert({
            order_id: orderId,
            payer_name: verifyData.data.first_name + ' ' + verifyData.data.last_name,
            amount: verifyData.data.amount,
            payment_method: 'chapa',
            payment_date: new Date().toISOString(),
            recorded_by: order.user_id || order.created_by,
            notes: `Chapa payment - ${tx_ref}`,
          });

        console.log('Payment recorded successfully');
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
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
