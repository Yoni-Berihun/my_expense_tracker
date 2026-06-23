-- ============================================================
-- VIP Expense Tracker — User Access Control (Updated for Admin Panel)
-- Run this entire script in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create the user_access table
CREATE TABLE IF NOT EXISTS public.user_access (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email        text,
  granted_at   timestamptz DEFAULT now(),
  is_owner     boolean DEFAULT false
);

-- 2. Enable Row Level Security
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

-- 3. Policy: users can only read their own row (Drop first if exists to prevent duplication)
DROP POLICY IF EXISTS "read_own_access" ON public.user_access;
CREATE POLICY "read_own_access" ON public.user_access
  FOR SELECT USING (auth.uid() = user_id);

-- 4. Policy: users can insert their own row (enforced by function)
DROP POLICY IF EXISTS "insert_own_access" ON public.user_access;
CREATE POLICY "insert_own_access" ON public.user_access
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Policy: Admin (yonatanberihun1998@gmail.com) can SELECT all rows
DROP POLICY IF EXISTS "admin_select_all" ON public.user_access;
CREATE POLICY "admin_select_all" ON public.user_access
  FOR SELECT USING (auth.jwt() ->> 'email' = 'yonatanberihun1998@gmail.com');

-- 6. Policy: Admin (yonatanberihun1998@gmail.com) can DELETE any row
DROP POLICY IF EXISTS "admin_delete_all" ON public.user_access;
CREATE POLICY "admin_delete_all" ON public.user_access
  FOR DELETE USING (auth.jwt() ->> 'email' = 'yonatanberihun1998@gmail.com');

-- 7. Secure function: check access and auto-grant to first 5 non-owners
--    Automatically marks 'yonatanberihun1998@gmail.com' as owner/admin.
CREATE OR REPLACE FUNCTION public.check_and_grant_access(p_user_id uuid, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_count integer;
  v_has_access boolean;
BEGIN
  -- If it is the admin email, automatically grant and set is_owner = true
  IF p_email = 'yonatanberihun1998@gmail.com' THEN
    INSERT INTO public.user_access (user_id, email, is_owner)
    VALUES (p_user_id, p_email, true)
    ON CONFLICT (user_id) DO UPDATE SET is_owner = true, email = p_email;
    RETURN true;
  END IF;

  -- Already has access? → allow immediately
  SELECT EXISTS(
    SELECT 1 FROM public.user_access WHERE user_id = p_user_id
  ) INTO v_has_access;

  IF v_has_access THEN
    RETURN true;
  END IF;

  -- Count how many non-owner slots are taken
  SELECT COUNT(*) INTO v_slot_count
  FROM public.user_access
  WHERE is_owner = false;

  -- 5-user cap: if under limit, grant access
  IF v_slot_count < 5 THEN
    INSERT INTO public.user_access (user_id, email, is_owner)
    VALUES (p_user_id, p_email, false);
    RETURN true;
  END IF;

  -- Slots full → deny
  RETURN false;
END;
$$;

-- 8. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_and_grant_access TO authenticated;

-- 9. Insert the owner (YOU) — always has access, never counts against the 5-user cap.
--    Replace the values below if your user_id is different (the function will auto-upgrade it on sign-in anyway)
INSERT INTO public.user_access (user_id, email, is_owner)
VALUES (
  'f649d0d8-3cc7-4ddb-a497-5cf618cc2936',  -- Your Supabase user_id
  'yonatanberihun1998@gmail.com',            -- Your email
  true
)
ON CONFLICT (user_id) DO UPDATE SET is_owner = true, email = 'yonatanberihun1998@gmail.com';
