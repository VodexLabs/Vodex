-- Ask PostgREST to reload the schema cache (helps after creating or altering `public.profiles`
-- in environments where the API still reports "Could not find the table ... in the schema cache").
-- Safe to run repeatedly.
notify pgrst, 'reload schema';
