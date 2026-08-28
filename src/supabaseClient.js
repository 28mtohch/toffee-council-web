import { createClient } from '@supabase/supabase-js'

// ใส่ URL และ Key ตรงๆ แบบนี้เลย
const supabaseUrl = 'https://vdkyemtnzjsqwxozthoz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZka3llbXRuempzcXd4b3p0aG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTExMjAsImV4cCI6MjEwMzQyNzEyMH0.9qY4GBd0MCGqlsfhNjJ9L4AteiC-5PyGCo2JeEjuz7A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
