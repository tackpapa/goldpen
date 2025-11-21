-- Step 1: Create a function to execute raw SQL
CREATE OR REPLACE FUNCTION exec_raw_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION exec_raw_sql(text) TO service_role;
