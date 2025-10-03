-- Add delivery-related fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_address jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivery_fee numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'not_applicable';

-- Create index for delivery queries
CREATE INDEX IF NOT EXISTS idx_orders_delivery_required ON public.orders(delivery_required);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON public.orders(delivery_status);

-- Update existing orders to have proper delivery status
UPDATE public.orders
SET delivery_status = 'not_applicable'
WHERE delivery_required = false OR delivery_required IS NULL;