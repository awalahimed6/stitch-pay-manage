-- Fix the handle_new_user trigger to not insert duplicate roles
-- The Auth.tsx signup flow already handles role insertion based on the selected tab
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create the profile, don't insert role (Auth.tsx handles that)
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone'
  );
  
  RETURN NEW;
END;
$function$;