-- Add is_online column to deliverers table
ALTER TABLE public.deliverers ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_deliverers_is_online ON public.deliverers(is_online);
CREATE INDEX IF NOT EXISTS idx_deliverers_active_online ON public.deliverers(is_active, is_online);