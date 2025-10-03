-- Extend user_role enum to include deliverer
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'deliverer';

-- Create deliverers table
CREATE TABLE IF NOT EXISTS public.deliverers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  deliverer_id UUID REFERENCES public.deliverers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'out_for_delivery', 'delivered', 'cancelled')),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS on deliverers table
ALTER TABLE public.deliverers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on deliveries table
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deliverers table
-- Admins and staff can view all deliverers
CREATE POLICY "Admins and staff can view all deliverers"
ON public.deliverers
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'staff'::user_role)
);

-- Deliverers can view their own profile
CREATE POLICY "Deliverers can view own profile"
ON public.deliverers
FOR SELECT
USING (auth.uid() = user_id);

-- Admins and staff can insert deliverers
CREATE POLICY "Admins and staff can insert deliverers"
ON public.deliverers
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'staff'::user_role)
);

-- Admins and staff can update deliverers
CREATE POLICY "Admins and staff can update deliverers"
ON public.deliverers
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'staff'::user_role)
);

-- Only admins can delete deliverers
CREATE POLICY "Only admins can delete deliverers"
ON public.deliverers
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for deliveries table
-- Admins and staff can view all deliveries
CREATE POLICY "Admins and staff can view all deliveries"
ON public.deliveries
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'staff'::user_role)
);

-- Deliverers can view their assigned deliveries
CREATE POLICY "Deliverers can view assigned deliveries"
ON public.deliveries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.deliverers
    WHERE deliverers.id = deliveries.deliverer_id
    AND deliverers.user_id = auth.uid()
  )
);

-- Admins and staff can insert deliveries
CREATE POLICY "Admins and staff can insert deliveries"
ON public.deliveries
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'staff'::user_role)
);

-- Admins and staff can update any delivery
CREATE POLICY "Admins and staff can update deliveries"
ON public.deliveries
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'staff'::user_role)
);

-- Deliverers can update their assigned deliveries (status only)
CREATE POLICY "Deliverers can update assigned deliveries"
ON public.deliveries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.deliverers
    WHERE deliverers.id = deliveries.deliverer_id
    AND deliverers.user_id = auth.uid()
  )
);

-- Only admins can delete deliveries
CREATE POLICY "Only admins can delete deliveries"
ON public.deliveries
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Trigger for deliverers updated_at
CREATE TRIGGER update_deliverers_updated_at
BEFORE UPDATE ON public.deliverers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for deliveries updated_at
CREATE TRIGGER update_deliveries_updated_at
BEFORE UPDATE ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deliveries_deliverer_id ON public.deliveries(deliverer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliverers_user_id ON public.deliverers(user_id);
CREATE INDEX IF NOT EXISTS idx_deliverers_is_active ON public.deliverers(is_active);