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

    const { orderId, amount, email, fullName, phone, returnUrl } = await req.json();

    console.log('Processing payment request:', { orderId, amount, email });

    // Build a safe return URL (same-origin only)
    const originHeader = req.headers.get('origin') || '';
    const refererHeader = req.headers.get('referer') || '';
    let origin = originHeader;
    if (!origin) {
      try {
        origin = refererHeader ? new URL(refererHeader).origin : '';
      } catch {
        origin = '';
      }
    }

    let safeReturnUrl: string | undefined = origin ? `${origin}/user/dashboard` : undefined;
    if (returnUrl) {
      try {
        const ru = new URL(returnUrl);
        if ((!origin || ru.origin === origin) && ru.href.length <= 2048) {
          safeReturnUrl = ru.toString();
        }
      } catch {
        // ignore invalid returnUrl
      }
    }

    // Validate input
    if (!amount || amount <= 0) {
      throw new Error('Invalid payment amount. Amount must be greater than 0.');
    }

    if (!email || !fullName || !phone) {
      throw new Error('Missing required fields: email, fullName, or phone.');
    }

    // Format phone number for Chapa (Ethiopian format: 09XXXXXXXX or 07XXXXXXXX - 10 digits)
    let formattedPhone = phone.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parentheses
    
    // Remove country code prefix if present
    if (formattedPhone.startsWith('+251')) {
      formattedPhone = '0' + formattedPhone.substring(4);
    } else if (formattedPhone.startsWith('251')) {
      formattedPhone = '0' + formattedPhone.substring(3);
    }
    
    // Ensure it starts with 0
    if (!formattedPhone.startsWith('0')) {
      formattedPhone = '0' + formattedPhone;
    }
    
    // Validate it's 10 digits and starts with 09 or 07
    if (!/^0[79]\d{8}$/.test(formattedPhone)) {
      throw new Error(`Invalid phone number format. Phone must be in format 09XXXXXXXX or 07XXXXXXXX. Received: ${formattedPhone}`);
    }

    console.log('Formatted phone number for Chapa:', formattedPhone);

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Validate order has a price set
    if (!order.total_price || order.total_price <= 0) {
      throw new Error('Order price has not been set yet. Please wait for staff to set the price.');
    }

    // Validate payment amount doesn't exceed remaining balance
    if (amount > order.remaining_balance) {
      throw new Error(`Payment amount (${amount} ETB) exceeds remaining balance (${order.remaining_balance} ETB).`);
    }

    // Validate Chapa API key is configured
    const chapaKey = Deno.env.get('CHAPA_SECRET_KEY');
    if (!chapaKey) {
      throw new Error('Payment system is not configured. Please contact support.');
    }

    // Initialize Chapa payment
    const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chapaKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'ETB',
        email: email,
        first_name: fullName.split(' ')[0] || fullName,
        last_name: fullName.split(' ')[1] || '',
        phone_number: formattedPhone,
        tx_ref: `${orderId}-${Date.now()}`,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/chapa-callback`,
        return_url: safeReturnUrl,
        customization: {
          title: 'Tailor Payment', // Max 16 characters per Chapa requirements
          description: `Order for ${order.customer_name.replace(/[^a-zA-Z0-9\s\-_.]/g, '')}`.slice(0, 255), // Only letters, numbers, hyphens, underscores, spaces, and dots
        },
      }),
    });

    if (!chapaResponse.ok) {
      const errorText = await chapaResponse.text();
      console.error('Chapa API error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      console.error('Chapa API error:', errorData);
      throw new Error(errorData.message || `Chapa API error: ${chapaResponse.status}`);
    }

    const chapaData = await chapaResponse.json();
    console.log('Chapa response:', chapaData);

    if (chapaData.status === 'success' && chapaData.data?.checkout_url) {
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
      throw new Error(chapaData.message || 'Payment initialization failed - no checkout URL returned');
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
