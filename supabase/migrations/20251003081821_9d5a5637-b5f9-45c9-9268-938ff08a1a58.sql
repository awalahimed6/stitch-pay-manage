-- Remove duplicate user roles, keeping only the most recent role per user
DELETE FROM public.user_roles
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM public.user_roles
  ) t
  WHERE rn > 1
);