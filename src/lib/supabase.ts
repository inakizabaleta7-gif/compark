import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ilhmpjckirpzqiinkcho.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaG1wamNraXJwenFpaW5rY2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NDM0MjYsImV4cCI6MjExMDIxOTQyNn0.JifHw3HvExsnC13rw6Jm8Q04EdqmAvHhJOxNkgP48ak';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
