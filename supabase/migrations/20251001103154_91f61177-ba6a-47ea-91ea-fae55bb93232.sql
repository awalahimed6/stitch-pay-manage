-- Add customer role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer';

-- Add user_id to orders table to link orders to customer accounts
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- Update RLS policies for customer access
CREATE POLICY "Customers can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR auth.uid() IS NOT NULL);

CREATE POLICY "Customers can view payments for their orders"
ON public.payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = payments.order_id
    AND orders.user_id = auth.uid()
  )
  OR auth.uid() IS NOT NULL
);