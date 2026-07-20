import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function createClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Supabase no está configurado. Copia .env.example a .env.local y completa las variables públicas.",
    );
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
