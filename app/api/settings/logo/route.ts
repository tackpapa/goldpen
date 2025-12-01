import { createClient } from '@supabase/supabase-js'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const BUCKET = 'org-files'

export async function POST(request: Request) {
  try {
    const { orgId } = await getSupabaseWithOrg(request)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: '스토리지 설정이 없습니다' }, { status: 500 })
    }
    const service = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const form = await request.formData()
    const file = form.get('file')
    console.log('[Logo Upload] form keys', Array.from(form.keys()))
    console.log('[Logo Upload] file type', file && (file as any).constructor?.name)
    if (!file || typeof (file as any).arrayBuffer !== 'function') {
      return Response.json({ error: '파일이 필요합니다' }, { status: 400 })
    }

    const fileObj = file as File
    const path = `logos/${orgId}/${Date.now()}-${fileObj.name}`
    const { error: uploadError } = await service.storage.from(BUCKET).upload(path, fileObj, {
      upsert: true,
      contentType: fileObj.type || 'application/octet-stream',
    })
    if (uploadError) {
      console.error('[Logo Upload] upload error', uploadError)
      return Response.json({ error: '업로드 실패', details: uploadError.message }, { status: 500 })
    }

    const { data: signed, error: signedError } = await service.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7)
    const publicUrl = signed?.signedUrl || null
    if (signedError) {
      console.warn('[Logo Upload] signed url error', signedError)
    }

    // organizations.logo_url에도 저장 (path 유지, 보여줄 땐 publicUrl)
    const logoValue = publicUrl || path
    const { error: orgUpdateError } = await service
      .from('organizations')
      .update({ logo_url: logoValue })
      .eq('id', orgId)
    if (orgUpdateError) {
      console.warn('[Logo Upload] organization update error', orgUpdateError)
    }

    // org_settings에도 저장해 UI 로딩 일관성 유지
    const { error: orgSettingsUpdateError } = await service
      .from('org_settings')
      .update({ logo_url: logoValue })
      .eq('org_id', orgId)
    if (orgSettingsUpdateError) {
      console.warn('[Logo Upload] org_settings update error', orgSettingsUpdateError)
    }

    return Response.json({ url: publicUrl, path })
  } catch (e: any) {
    const msg = e?.message || '서버 오류'
    const code = msg === 'AUTH' ? 401 : 500
    return Response.json({ error: msg }, { status: code })
  }
}

export async function OPTIONS() {
  return Response.json({}, { status: 200 })
}
