export function debugSupabaseEnv() {
  console.log('🔍 Supabase Environment Variables Debug:')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...')
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY?.substring(0, 30) + '...')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  console.log('\n📊 Final values used:')
  console.log('URL:', url)
  console.log('KEY:', key?.substring(0, 30) + '...')
}
