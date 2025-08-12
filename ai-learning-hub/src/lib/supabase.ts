import { createClient } from '@supabase/supabase-js';

// Single shared Supabase client instance
export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to check if we're in demo mode
export const isDemoUser = (userId: string) => {
    return userId === "demo-user";
}; 