import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://hoqlopndaczxvjizwabb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcWxvcG5kYWN6eHZqaXp3YWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDcwNDgsImV4cCI6MjA4ODgyMzA0OH0.m4IJyQcThZSmyC4Yj40jJiBzMARvjUCRtsEr6vIwkM8');

async function check() {
  const { data, error } = await supabase.from('posts').select('*').limit(1);
  console.log("Error:", error);
  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    console.log("No data, but table exists. Trying to get columns via an intentional error...");
    const { error: err2 } = await supabase.from('posts').select('non_existent_column');
    console.log("Error getting columns:", err2);
  }
}
check();
