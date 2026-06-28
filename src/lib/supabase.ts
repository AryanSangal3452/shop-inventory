import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase configuration keys inside environment profiles!")
}

// 🟢 FIXED CONFIGURATION: MULTI-DEVICE SESSION ROUTER
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,      // Changed from false to true
    autoRefreshToken: true,    // Changed from false to true
    detectSessionInUrl: true   // Changed from false to true
  }
})

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