-- Allow customers to create their own orders
CREATE POLICY "Customers can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);