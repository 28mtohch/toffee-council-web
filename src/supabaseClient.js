import { createClient } from '@supabase/supabase-js'

// ใส่ URL และ Key ตรงๆ แบบนี้เลย
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
