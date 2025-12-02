import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// GET: Get current user profile
export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Get user profile from users table
    const db = service || supabase
    const { data: userData, error: userError } = await db
      .from('users')
      .select('id, name, email, role, org_id')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('[me GET] User query error:', userError)
      // Return minimal info if users table query fails
      return Response.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: null,
          org_id: null,
        }
      })
    }

    return Response.json({
      user: {
        id: user.id,
        email: user.email || userData?.email,
        name: userData?.name || user.user_metadata?.name || 'User',
        role: userData?.role || null,
        org_id: userData?.org_id || null,
      }
    })
  } catch (error: any) {
    console.error('[me GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
