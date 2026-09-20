import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fcocnayalhnrdxylzyfr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjb2NuYXlhbGhucmR4eWx6eWZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg0ODYxNCwiZXhwIjoyMTA1NDI0NjE0fQ.Kpb34XLBQ6veQ47hcHo0fWiEJZl12BdzOQSPh23ncK0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);