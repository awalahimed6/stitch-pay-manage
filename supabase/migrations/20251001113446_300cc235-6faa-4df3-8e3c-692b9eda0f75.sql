-- Fix infinite recursion in user_roles RLS policy by using has_role function
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create new policy using the has_role security definer function
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));