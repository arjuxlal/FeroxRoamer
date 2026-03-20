import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://hoqlopndaczxvjizwabb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcWxvcG5kYWN6eHZqaXp3YWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDcwNDgsImV4cCI6MjA4ODgyMzA0OH0.m4IJyQcThZSmyC4Yj40jJiBzMARvjUCRtsEr6vIwkM8');

async function check() {
  const { data, error } = await supabase.from('posts').insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    content: "test",
    location: "test"
  });
  console.log("Insert Error:", error);
}
check();
