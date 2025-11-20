import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vdxxzygqjjjptzlvgrtw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeHh6eWdxampqcHR6bHZncnR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU4OTY2NCwiZXhwIjoyMDc5MTY1NjY0fQ.cNbBHQVOyqUY3VB-f6OqazpVgFHcxHPrr9kMRRoUpNw'
)

const adminUserId = 'f605cd18-179b-4c54-bf66-0289d47d3fbf'

// 1. organizations 테이블에서 첫 번째 기관 가져오기 (또는 새로 생성)
const { data: orgs } = await supabase
  .from('organizations')
  .select('id')
  .limit(1)

let orgId
if (orgs && orgs.length > 0) {
  orgId = orgs[0].id
  console.log('✅ Using existing organization:', orgId)
} else {
  // 기관이 없으면 생성
  const { data: newOrg, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: 'GoldPen 관리자',
      type: 'academy',
      phone: '010-0000-0000',
      address: 'Seoul, Korea'
    })
    .select()
    .single()

  if (orgError) {
    console.error('❌ Failed to create organization:', orgError)
    process.exit(1)
  }

  orgId = newOrg.id
  console.log('✅ Created new organization:', orgId)
}

// 2. public.users 테이블에 admin 사용자 추가
const { data: user, error } = await supabase
  .from('users')
  .insert({
    id: adminUserId,
    org_id: orgId,
    name: '관리자',
    email: 'admin@goldpen.kr',
    role: 'admin'
  })
  .select()

if (error) {
  console.error('❌ Failed to create user:', error)
} else {
  console.log('✅ Admin user created in public.users table!')
  console.log(JSON.stringify(user, null, 2))
}
