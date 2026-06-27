import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  image_url: string | null
  cost_price: number
  selling_price: number
  max_retail_price: number
  category_id: string | null
  user_email?: string | null // 🟢 ADDED: Tracking field for user accounts
  created_at: string
  updated_at: string
  categories?: Category
}