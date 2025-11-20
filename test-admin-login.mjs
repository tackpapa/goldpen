import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vdxxzygqjjjptzlvgrtw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeHh6eWdxampqcHR6bHZncnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODk2NjQsImV4cCI6MjA3OTE2NTY2NH0.kcGWLo6b8NwI5o2JtvGtk6khlDtSzBYSvvDoSfjux44'
)

console.log('🔍 Testing admin login...\n')

// 로그인 테스트
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@goldpen.kr',
  password: '12345678'
})

if (error) {
  console.log('❌ Login failed:', error.message)
} else {
  console.log('✅ Login successful!')
  console.log('User ID:', data.user.id)
  console.log('Email:', data.user.email)
}

// public.users 테이블 확인
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('*')
  .or('username.eq.admin,email.eq.admin@goldpen.kr')

console.log('\n🔍 Users in database:')
if (usersError) {
  console.log('Error:', usersError)
} else {
  console.log(JSON.stringify(users, null, 2))
}
