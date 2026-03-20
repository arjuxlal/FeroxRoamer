import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://hoqlopndaczxvjizwabb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcWxvcG5kYWN6eHZqaXp3YWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDcwNDgsImV4cCI6MjA4ODgyMzA0OH0.m4IJyQcThZSmyC4Yj40jJiBzMARvjUCRtsEr6vIwkM8');

async function check() {
  const tables = ["followers", "likes", "comments", "notifications"];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id').limit(1);
    console.log(`Table ${t}:`, error ? `Not found or error: ${error.message}` : "Exists");
  }
}
check();
