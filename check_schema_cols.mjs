import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://hoqlopndaczxvjizwabb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcWxvcG5kYWN6eHZqaXp3YWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDcwNDgsImV4cCI6MjA4ODgyMzA0OH0.m4IJyQcThZSmyC4Yj40jJiBzMARvjUCRtsEr6vIwkM8');

async function checkCols(table) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    console.log(table, "Error:", error);
  } else if (data && data.length > 0) {
    console.log(table, "Columns:", Object.keys(data[0]));
  } else {
    const { error: err2 } = await supabase.from(table).select('non_existent_column');
    console.log(table, "Columns from error:", err2?.hint || err2?.message);
  }
}

async function run() {
  await checkCols('trips');
  await checkCols('chat_rooms');
  await checkCols('chat_members');
  await checkCols('messages');
}
run();
