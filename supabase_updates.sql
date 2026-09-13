-- 1. Modify the amount constraint to allow 0-value expenses (Zero Spend Days)
-- The exact constraint name might vary depending on how Supabase auto-named it,
-- but typically it is 'expenses_amount_check' or similar.
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_amount_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_check CHECK (amount >= 0);

-- 2. Create the RPC function for daily aggregation
-- This aggregates the amount by day and category, drastically reducing the payload size.
CREATE OR REPLACE FUNCTION get_daily_aggregates(p_user_id uuid, start_date date, end_date date)
RETURNS TABLE (
  day date,
  category_id uuid,
  total_amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('day', date)::date AS day,
    e.category_id,
    SUM(e.amount)::numeric AS total_amount
  FROM public.expenses e
  WHERE e.user_id = p_user_id 
    AND e.date >= start_date 
    AND e.date <= end_date 
    AND e.is_deleted = false
  GROUP BY 1, 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
