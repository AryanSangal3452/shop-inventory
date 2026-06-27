import { createClient } from '@supabase/supabase-api' // or @supabase/supabase-js depending on your import

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase configuration keys inside environment profiles!")
}

// 🟢 UPGRADED MULTI-DEVICE SESSION ROUTER
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

// Export your types here as you did originally
export interface Product {
  id: string | number;
  name: string;
  image_url: string | null;
  cost_price: number;
  selling_price: number;
  max_retail_price: number;
  category_id: string | null;
  created_at?: string;
}

export interface Category {
  id: string | number;
  name: string;
  created_at?: string;
}