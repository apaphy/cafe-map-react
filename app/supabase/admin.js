import { createClient } from '@supabase/supabase-js';

export const createSupabaseAdmin = () =>
    createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE,
        {
            auth: {
                autoRefreshToken: true,
                persistSession: true
            }
        }
    );

export const supabaseAdmin = createSupabaseAdmin();
