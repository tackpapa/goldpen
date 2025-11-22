import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// GET /api/organizations/[slug] - 기관 정보 조회 (공개)
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient()
    const slug = params.slug

    // slug 컬럼이 없을 수 있으므로 name/id 기준으로 조회
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url')
      .or(`name.eq.${slug},id.eq.${slug}`)
      .single()

    if (error || !organization) {
      return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ organization })
  } catch (error: any) {
    console.error('[Organizations GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
