import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vdxxzygqjjjptzlvgrtw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeHh6eWdxampqcHR6bHZncnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODk2NjQsImV4cCI6MjA3OTE2NTY2NH0.kcGWLo6b8NwI5o2JtvGtk6khlDtSzBYSvvDoSfjux44'
)

// admin 사용자 조회
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', 'f605cd18-179b-4c54-bf66-0289d47d3fbf')

console.log('Admin user in users table:')
if (error) {
  console.log('Error:', error)
} else {
  console.log(JSON.stringify(data, null, 2))
}
