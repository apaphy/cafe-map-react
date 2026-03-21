import { createClient } from "@supabase/supabase-js";
import { createContext } from "react";

export const createSupabaseClient = () =>
{
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    return client
}

const supabaseClient = createSupabaseClient();
export const AuthContext = createContext(supabaseClient);
