import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const getAnonClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const updateSettingsSchema = z.object({
  name: z.string().optional(),
  owner_name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  logo_url: z.string().optional(),
  settings: z.record(z.any()).optional(),
})

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('orgSlug') || searchParams.get('slug')
    const excludeBilling = searchParams.get('excludeBilling') === 'true'
    const billingOnly = searchParams.get('billingOnly') === 'true'

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null
    let db: any = service || supabase

    // slug가 제공된 경우 (프로덕션 대시보드 지원)
    if (slug && service) {
      const { data: orgBySlug } = await service
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (orgBySlug?.id) {
        orgId = orgBySlug.id
        db = service
      } else {
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
    } else if (!authError && user) {
      // 인증된 사용자
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      if (!userProfile?.org_id) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    if (!orgId) {
      return Response.json({ error: 'org_id가 필요합니다' }, { status: 400 })
    }

    // ensure org_settings row exists for this org
    try {
      await db.rpc('ensure_org_settings', { org: orgId })
    } catch (_) {
      /* ignore */
    }

    const { data: organization, error: orgError } = await db
      .from('organizations')
      .select('id, name, slug, logo_url, credit_balance')
      .eq('id', orgId)
      .single()

    const { data: orgSettings, error: settingsError } = await db
      .from('org_settings')
      .select('name, owner_name, address, phone, email, logo_url, settings')
      .eq('org_id', orgId)
      .maybeSingle()

    // owner_name은 항상 users 테이블에서 가져옴 (가입 시 입력, 변경 불가)
    const { data: ownerUser } = await db
      .from('users')
      .select('name')
      .eq('org_id', orgId)
      .eq('role', 'owner')
      .maybeSingle()
    const ownerName = ownerUser?.name || ''

    // Signed logo URL (path -> signed url) for private bucket
    const toSignedLogo = async (logo?: string | null) => {
      if (!logo) return undefined
      if (logo.startsWith('http')) return logo
      const service = getServiceClient()
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      if (service) {
        const { data: signed, error: signedErr } = await service.storage
          .from('org-files')
          .createSignedUrl(logo, 60 * 60 * 24 * 7)
        if (!signedErr && signed?.signedUrl) return signed.signedUrl
      }
      if (baseUrl) {
        // fallback to public object URL to avoid 상대 경로 404
        return `${baseUrl}/storage/v1/object/public/org-files/${logo}`
      }
      return `/${logo}`
    }

    const logoUrl = await toSignedLogo(orgSettings?.logo_url || organization?.logo_url)

    if (orgError || settingsError) {
      console.error('[Settings GET] Error:', orgError || settingsError)
      return Response.json({ error: '설정 조회 실패', details: (orgError || settingsError)?.message }, { status: 500 })
    }

    if (!organization) {
      return Response.json({ error: '조직을 찾을 수 없습니다' }, { status: 404 })
    }

    // billingOnly인 경우 billing 데이터만 반환 (병렬 쿼리로 최적화)
    if (billingOnly) {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

      // 6개 쿼리 병렬 실행 (순차 실행 대비 ~75% 시간 단축)
      const [alimtalkResult, smsResult, serviceResult, thisMonthAlimtalkResult, thisMonthSmsResult, txResult] = await Promise.all([
        // 알림톡 이용내역 (최근 100건)
        db.from('message_logs')
          .select('id, message_type, recipient_count, total_price, status, description, created_at')
          .eq('org_id', orgId)
          .eq('message_type', 'kakao_alimtalk')
          .order('created_at', { ascending: false })
          .limit(100),
        // SMS 이용내역 (최근 100건)
        db.from('message_logs')
          .select('id, message_type, recipient_count, total_price, status, description, created_at')
          .eq('org_id', orgId)
          .eq('message_type', 'sms')
          .order('created_at', { ascending: false })
          .limit(100),
        // 기타 서비스 이용내역 (알림톡/SMS 제외, 최근 100건)
        db.from('message_logs')
          .select('id, message_type, recipient_count, total_price, status, description, created_at')
          .eq('org_id', orgId)
          .not('message_type', 'in', '("kakao_alimtalk","sms")')
          .order('created_at', { ascending: false })
          .limit(100),
        // 이번 달 알림톡 유형별 집계
        db.from('message_logs')
          .select('description, total_price')
          .eq('org_id', orgId)
          .eq('message_type', 'kakao_alimtalk')
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd),
        // 이번 달 SMS 유형별 집계
        db.from('message_logs')
          .select('description, total_price')
          .eq('org_id', orgId)
          .eq('message_type', 'sms')
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd),
        // 충전 내역만 (최근 50건) - charge 타입만 필터링
        db.from('credit_transactions')
          .select('id, type, amount, balance_after, description, created_at')
          .eq('org_id', orgId)
          .eq('type', 'charge')
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      const alimtalkLogs = alimtalkResult.data
      const smsLogs = smsResult.data
      const serviceLogs = serviceResult.data
      const thisMonthAlimtalkLogs = thisMonthAlimtalkResult.data
      const thisMonthSmsLogs = thisMonthSmsResult.data
      const txLogs = txResult.data

      // 알림톡 데이터 변환
      const kakaoTalkUsages = (alimtalkLogs || []).map((r: any) => {
        let dateStr = '-'
        if (r.created_at) {
          const date = new Date(r.created_at)
          const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
          dateStr = `${kstDate.getUTCFullYear()}-${String(kstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(kstDate.getUTCDate()).padStart(2, '0')} ${String(kstDate.getUTCHours()).padStart(2, '0')}:${String(kstDate.getUTCMinutes()).padStart(2, '0')}`
        }
        return {
          id: r.id,
          date: dateStr,
          type: r.description?.split(':')[0] || '알림톡',
          recipient: r.description?.split(':')[1]?.trim() || '-',
          count: r.recipient_count || 1,
          cost: r.total_price || 0,
          status: r.status === 'sent' ? 'success' : r.status === 'error' ? 'error' : 'failed',
        }
      })

      // SMS 데이터 변환 (알림톡과 동일한 형식)
      const smsUsages = (smsLogs || []).map((r: any) => {
        let dateStr = '-'
        if (r.created_at) {
          const date = new Date(r.created_at)
          const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
          dateStr = `${kstDate.getUTCFullYear()}-${String(kstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(kstDate.getUTCDate()).padStart(2, '0')} ${String(kstDate.getUTCHours()).padStart(2, '0')}:${String(kstDate.getUTCMinutes()).padStart(2, '0')}`
        }
        return {
          id: r.id,
          date: dateStr,
          type: r.description?.split(':')[0] || 'SMS',
          recipient: r.description?.split(':')[1]?.trim() || '-',
          count: r.recipient_count || 1,
          cost: r.total_price || 0,
          status: r.status === 'sent' ? 'success' : r.status === 'error' ? 'error' : 'failed',
        }
      })

      // 기타 서비스 데이터 변환
      const serviceUsages = (serviceLogs || []).map((r: any) => {
        let dateStr = '-'
        if (r.created_at) {
          const date = new Date(r.created_at)
          const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
          dateStr = `${kstDate.getUTCFullYear()}-${String(kstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(kstDate.getUTCDate()).padStart(2, '0')} ${String(kstDate.getUTCHours()).padStart(2, '0')}:${String(kstDate.getUTCMinutes()).padStart(2, '0')}`
        }
        return {
          id: r.id,
          date: dateStr,
          type: r.message_type,
          description: r.description || '-',
          count: r.recipient_count || 1,
          cost: r.total_price || 0,
        }
      })

      // 이번 달 알림톡 집계 (TEMPLATE_LABELS와 동일한 이름 사용)
      const summaryMap: Record<string, { count: number; cost: number }> = {}
      for (const log of (thisMonthAlimtalkLogs || [])) {
        const desc = log.description || ''
        let notificationType: string | null = null
        if (desc.startsWith('late:') || desc.includes('_late:')) notificationType = '지각 알림'
        else if (desc.startsWith('absent:') || desc.includes('_absent:')) notificationType = '결석 알림'
        else if (desc.startsWith('checkin:')) notificationType = '입실/등원 알림'
        else if (desc.startsWith('checkout:')) notificationType = '퇴실/하원 알림'
        else if (desc.startsWith('out:') || desc.startsWith('study_out:')) notificationType = '외출 알림'
        else if (desc.startsWith('return:') || desc.startsWith('study_return:')) notificationType = '복귀 알림'
        else if (desc.startsWith('daily_report:') || desc.startsWith('study_report:')) notificationType = '당일 학습 진행 결과'
        else if (desc.startsWith('lesson_report:')) notificationType = '수업일지 전송'
        else if (desc.startsWith('exam_result:')) notificationType = '시험 결과 전송'
        else if (desc.startsWith('assignment_new:') || desc.startsWith('assignment:')) notificationType = '과제 알림'
        if (!notificationType) continue
        if (!summaryMap[notificationType]) {
          summaryMap[notificationType] = { count: 0, cost: 0 }
        }
        summaryMap[notificationType].count += 1
        summaryMap[notificationType].cost += log.total_price || 0
      }

      const usageSummary = Object.entries(summaryMap).map(([type, data]) => ({
        type,
        count: data.count,
        cost: data.cost,
      })).sort((a, b) => b.count - a.count)

      // 이번 달 SMS 집계 (TEMPLATE_LABELS와 동일한 이름 사용)
      const smsSummaryMap: Record<string, { count: number; cost: number }> = {}
      for (const log of (thisMonthSmsLogs || [])) {
        const desc = log.description || ''
        let notificationType: string | null = null
        if (desc.startsWith('late:') || desc.includes('_late:')) notificationType = '지각 알림'
        else if (desc.startsWith('absent:') || desc.includes('_absent:')) notificationType = '결석 알림'
        else if (desc.startsWith('checkin:')) notificationType = '입실/등원 알림'
        else if (desc.startsWith('checkout:')) notificationType = '퇴실/하원 알림'
        else if (desc.startsWith('out:') || desc.startsWith('study_out:')) notificationType = '외출 알림'
        else if (desc.startsWith('return:') || desc.startsWith('study_return:')) notificationType = '복귀 알림'
        else if (desc.startsWith('daily_report:') || desc.startsWith('study_report:')) notificationType = '당일 학습 진행 결과'
        else if (desc.startsWith('lesson_report:')) notificationType = '수업일지 전송'
        else if (desc.startsWith('exam_result:')) notificationType = '시험 결과 전송'
        else if (desc.startsWith('assignment_new:') || desc.startsWith('assignment:')) notificationType = '과제 알림'
        if (!notificationType) continue
        if (!smsSummaryMap[notificationType]) {
          smsSummaryMap[notificationType] = { count: 0, cost: 0 }
        }
        smsSummaryMap[notificationType].count += 1
        smsSummaryMap[notificationType].cost += log.total_price || 0
      }

      const smsSummary = Object.entries(smsSummaryMap).map(([type, data]) => ({
        type,
        count: data.count,
        cost: data.cost,
      })).sort((a, b) => b.count - a.count)

      // 이번 달 총합 계산 (요약 카드용)
      const totalAlimtalkCount = usageSummary.reduce((sum, s) => sum + s.count, 0)
      const totalAlimtalkCost = usageSummary.reduce((sum, s) => sum + s.cost, 0)
      const totalSmsCount = smsSummary.reduce((sum, s) => sum + s.count, 0)
      const totalSmsCost = smsSummary.reduce((sum, s) => sum + s.cost, 0)

      // 전체 건수 및 합계 (무한 스크롤용) - 알림톡 전체
      const [alimtalkCountResult, alimtalkSumResult, smsCountResult, smsSumResult] = await Promise.all([
        db.from('message_logs')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('message_type', 'kakao_alimtalk'),
        db.from('message_logs')
          .select('total_price')
          .eq('org_id', orgId)
          .eq('message_type', 'kakao_alimtalk'),
        db.from('message_logs')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('message_type', 'sms'),
        db.from('message_logs')
          .select('total_price')
          .eq('org_id', orgId)
          .eq('message_type', 'sms'),
      ])

      const kakaoTalkUsagesTotal = alimtalkCountResult.count || kakaoTalkUsages.length
      const kakaoTalkUsagesTotalCost = (alimtalkSumResult.data || []).reduce((sum: number, r: any) => sum + (r.total_price || 0), 0)
      const smsUsagesTotal = smsCountResult.count || smsUsages.length
      const smsUsagesTotalCost = (smsSumResult.data || []).reduce((sum: number, r: any) => sum + (r.total_price || 0), 0)

      // 충전 내역 변환
      const creditTransactions = (txLogs || []).map((r: any) => ({
        id: r.id,
        date: r.created_at ? new Date(r.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-',
        type: r.type,
        amount: r.amount,
        balanceAfter: r.balance_after,
        description: r.description || '-',
      }))

      return Response.json({
        kakaoTalkUsages,
        kakaoTalkUsagesTotal,
        kakaoTalkUsagesTotalCost,
        smsUsages,
        smsUsagesTotal,
        smsUsagesTotalCost,
        smsSummary,
        serviceUsages,
        usageSummary,
        creditCharges: creditTransactions,
        creditChargesTotal: creditTransactions.length,
        // 이번 달 총합 (요약 카드용)
        totalAlimtalkCount,
        totalAlimtalkCost,
        totalSmsCount,
        totalSmsCost,
        // 이번 달 통계 (요약 카드용)
        alimtalkMonthStats: {
          totalCount: totalAlimtalkCount,
          totalRecipients: totalAlimtalkCount,
          totalCost: totalAlimtalkCost,
        },
        smsMonthStats: {
          totalCount: totalSmsCount,
          totalRecipients: totalSmsCount,
          totalCost: totalSmsCost,
        },
      })
    }

    // excludeBilling이거나 기본 요청인 경우 (billing 제외)
    // 알림톡 이용내역 (message_logs) - excludeBilling이 아닌 경우에만
    let kakaoTalkUsages: any[] = []
    let serviceUsages: any[] = []
    let usageSummary: any[] = []
    let creditCharges: any[] = []
    let branches: any[] = []
    let rooms: any[] = []

    // excludeBilling이 false인 경우 billing 데이터도 로드 (하위 호환성)
    // 주로 excludeBilling=true로 호출되므로 이 블록은 거의 실행되지 않음

    return Response.json({
      organization: {
        id: organization.id,
        name: orgSettings?.name || organization.name,
        slug: organization.slug,
        logo_url: logoUrl,
        owner_name: ownerName,
        address: orgSettings?.address,
        phone: orgSettings?.phone,
        email: orgSettings?.email,
        credit_balance: organization.credit_balance || 0,
        settings: orgSettings?.settings || {},
      },
      branches,
      rooms,
      // billing 데이터는 billingOnly=true로 별도 요청
      kakaoTalkUsages,
      serviceUsages,
      usageSummary,
      creditCharges,
    })
  } catch (error: any) {
    console.error('[Settings GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('orgSlug') || searchParams.get('slug')

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let orgId: string | null = null
    let role: string | null = null
    let db: any = service || supabase

    // slug가 제공된 경우 (프로덕션 대시보드 지원)
    if (slug && service) {
      const { data: orgBySlug } = await service
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (orgBySlug?.id) {
        orgId = orgBySlug.id
        role = 'owner' // slug로 접근한 경우 owner 권한 부여
        db = service
      } else {
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
    } else if (!authError && user) {
      // 인증된 사용자
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('org_id, role')
        .eq('id', user.id)
        .single()
      if (profileError || !userProfile) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = userProfile.org_id
      role = userProfile.role
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    if (!orgId) {
      return Response.json({ error: 'org_id가 필요합니다' }, { status: 400 })
    }

    // Only owner and manager can update settings (테스트 모드에서는 허용)
    if (!['owner', 'manager'].includes(role || '')) {
      return Response.json({ error: '설정을 수정할 권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateSettingsSchema.parse(body)

    try {
      await db.rpc('ensure_org_settings', { org: orgId })
    } catch (_) {
      /* ignore */
    }

    // organizations: name/slug remain, logo_url optional sync
    if (validated.name || validated.logo_url) {
      const { error: orgUpErr } = await db
        .from('organizations')
        .update({
          name: validated.name,
          logo_url: validated.logo_url,
        })
        .eq('id', orgId)
      if (orgUpErr) {
        console.error('[Settings PUT] org update error', orgUpErr)
        return Response.json({ error: '설정 수정 실패', details: orgUpErr.message }, { status: 500 })
      }
    }

    const { data: orgSettings, error: settingsUpErr } = await db
      .from('org_settings')
      .update({
        name: validated.name,
        owner_name: validated.owner_name,
        address: validated.address,
        phone: validated.phone,
        email: validated.email,
        logo_url: validated.logo_url,
        settings: validated.settings,
      })
      .eq('org_id', orgId)
      .select('name, owner_name, address, phone, email, logo_url, settings')
      .maybeSingle()

    if (settingsUpErr) {
      console.error('[Settings PUT] settings update error', settingsUpErr)
      return Response.json({ error: '설정 수정 실패', details: settingsUpErr.message }, { status: 500 })
    }

    // fetch slug for response
    const { data: orgMeta } = await db
      .from('organizations')
      .select('id, slug')
      .eq('id', orgId)
      .single()

    return Response.json({
      organization: {
        id: orgId,
        name: orgSettings?.name,
        slug: orgMeta?.slug,
        logo_url: orgSettings?.logo_url,
        owner_name: orgSettings?.owner_name,
        address: orgSettings?.address,
        phone: orgSettings?.phone,
        email: orgSettings?.email,
        settings: orgSettings?.settings || {},
      },
      message: '설정이 수정되었습니다'
    })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Settings PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
