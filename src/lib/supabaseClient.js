import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zpyenhismruedryefbkv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWVuaGlzbXJ1ZWRyeWVmYmt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MzEzNjMsImV4cCI6MjA2MzUwNzM2M30.xKIUUJq6QClna87_T1Cd5GGbLXjRjshVKq_pAvOxIpQ";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
