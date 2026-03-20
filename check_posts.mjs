import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://hoqlopndaczxvjizwabb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcWxvcG5kYWN6eHZqaXp3YWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDcwNDgsImV4cCI6MjA4ODgyMzA0OH0.m4IJyQcThZSmyC4Yj40jJiBzMARvjUCRtsEr6vIwkM8');

async function check() {
  const { data, error } = await supabase.from('posts').select('*').limit(5);
  console.log("Posts anon query:");
  console.log("Data:", data);
  console.log("Error:", error);
}
check();
