import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hoqlopndaczxvjizwabb.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcWxvcG5kYWN6eHZqaXp3YWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDcwNDgsImV4cCI6MjA4ODgyMzA0OH0.m4IJyQcThZSmyC4Yj40jJiBzMARvjUCRtsEr6vIwkM8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { error } = await supabase.from('trips').select('trip_name, trip_date, trip_time, group_name').limit(1);
  console.log("Checking columns:", error?.message || "Success");
}
check();
