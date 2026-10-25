import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://ygbtrapskuguoagegftn.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYnRyYXBza3VndW9hZ2VnZnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQ0NDYsImV4cCI6MjEwMzk5MDQ0Nn0.lcQ-_NTto0QTFHqf5J4z8waxvi_DLWEhNMRxUyacW6c";

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
  supabaseUrl = DEFAULT_SUPABASE_URL;
}
if (!supabaseKey || supabaseKey.includes("placeholder")) {
  supabaseKey = DEFAULT_SUPABASE_ANON_KEY;
}

export const supabase = createClient(supabaseUrl, supabaseKey);
