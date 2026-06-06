const SUPABASE_URL = "https://helcoktbuyjjygldkcks.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlbGNva3RidXlqanlnbGRrY2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDIwNjIsImV4cCI6MjA5NjMxODA2Mn0.1Mb8GKOHrFklBZ2RGYa304ECIhTtbwBuafDHbJfbtd0";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);