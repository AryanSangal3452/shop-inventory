import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase configuration keys inside environment profiles!")
}

// 🟢 FIX: Keep sessions active and enable real-time WebSocket frames
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
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
  categories?: {
    name: string;
  } | null;
}

export interface Category {
  id: string | number;
  name: string;
  created_at?: string;
}