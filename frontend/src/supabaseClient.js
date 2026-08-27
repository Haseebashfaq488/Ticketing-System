import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://iienitxqciznoqbpzlih.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpZW5pdHhxY2l6bm9xYnB6bGloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY2MTkyMywiZXhwIjoyMTAzMjM3OTIzfQ.l2hv69lPhCuhvhHxmWE0ibH6OsdVu_WOL0zWVYbFsDs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
