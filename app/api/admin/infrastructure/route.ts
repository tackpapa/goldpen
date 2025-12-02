import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Pro 플랜 기준 한계값
const LIMITS = {
  // Supabase Pro
  dbConnections: 500,        // Pooler 동시 연결
  dbStorage: 8 * 1024,       // 8GB in MB
  fileStorage: 100 * 1024,   // 100GB in MB

  // Cloudflare Workers Pro
  workersRequests: 10_000_000, // 10M/월

  // 계산된 tenant 한계
  tenantsWithCron: 80,       // Cron 사용 시
  tenantsWithQueue: 200,     // Queue 전환 시
}

export async function GET() {
  try {
    const service = getServiceClient()
    if (!service) {
      return Response.json({ error: 'Service client not available' }, { status: 500 })
    }

    // 1. Tenant (Organization) 수
    const { count: tenantCount } = await service
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    // 2. 전체 사용자 수
    const { count: userCount } = await service
      .from('users')
      .select('*', { count: 'exact', head: true })

    // 3. 전체 학생 수
    const { count: studentCount } = await service
      .from('students')
      .select('*', { count: 'exact', head: true })

    // 4. DB 테이블별 대략적 레코드 수 (주요 테이블만)
    const [
      { count: attendanceCount },
      { count: lessonsCount },
      { count: paymentsCount },
      { count: consultationsCount },
    ] = await Promise.all([
      service.from('attendance').select('*', { count: 'exact', head: true }),
      service.from('lessons').select('*', { count: 'exact', head: true }),
      service.from('payment_records').select('*', { count: 'exact', head: true }),
      service.from('consultations').select('*', { count: 'exact', head: true }),
    ])

    // 5. Storage 사용량 (버킷별)
    // Note: Supabase API로 직접 조회 어려움, 대략적 추정
    const storageEstimate = (consultationsCount || 0) * 0.5 // 상담당 0.5MB 이미지 가정

    // 6. 예상 동시 접속자 (tenant당 평균 3명 가정)
    const estimatedConcurrentUsers = (tenantCount || 0) * 3

    // 계산
    const totalRecords = (attendanceCount || 0) + (lessonsCount || 0) + (paymentsCount || 0) + (consultationsCount || 0)
    const estimatedDbSizeMB = totalRecords * 0.001 // 레코드당 약 1KB 가정

    const metrics = {
      // 현재 사용량
      current: {
        tenants: tenantCount || 0,
        users: userCount || 0,
        students: studentCount || 0,
        totalRecords,
        estimatedDbSizeMB: Math.round(estimatedDbSizeMB),
        estimatedStorageMB: Math.round(storageEstimate),
        estimatedConcurrentUsers,
      },

      // 한계값
      limits: LIMITS,

      // 사용률 (%)
      usage: {
        tenantsCron: Math.round(((tenantCount || 0) / LIMITS.tenantsWithCron) * 100),
        tenantsQueue: Math.round(((tenantCount || 0) / LIMITS.tenantsWithQueue) * 100),
        dbConnections: Math.round((estimatedConcurrentUsers / LIMITS.dbConnections) * 100),
        dbStorage: Math.round((estimatedDbSizeMB / LIMITS.dbStorage) * 100),
        fileStorage: Math.round((storageEstimate / LIMITS.fileStorage) * 100),
      },

      // 경고 수준
      alerts: {
        tenantsCron: getAlertLevel((tenantCount || 0) / LIMITS.tenantsWithCron),
        tenantsQueue: getAlertLevel((tenantCount || 0) / LIMITS.tenantsWithQueue),
        dbConnections: getAlertLevel(estimatedConcurrentUsers / LIMITS.dbConnections),
        dbStorage: getAlertLevel(estimatedDbSizeMB / LIMITS.dbStorage),
        fileStorage: getAlertLevel(storageEstimate / LIMITS.fileStorage),
      },

      // 권장 사항
      recommendations: generateRecommendations(tenantCount || 0, estimatedDbSizeMB, storageEstimate),
    }

    return Response.json(metrics)
  } catch (error: any) {
    console.error('[infrastructure] Error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

function getAlertLevel(ratio: number): 'safe' | 'warning' | 'danger' | 'critical' {
  if (ratio < 0.5) return 'safe'
  if (ratio < 0.7) return 'warning'
  if (ratio < 0.9) return 'danger'
  return 'critical'
}

function generateRecommendations(tenants: number, dbSizeMB: number, storageMB: number): string[] {
  const recommendations: string[] = []

  if (tenants > 50) {
    recommendations.push('Cron → Queue 전환 권장: tenant 50개 초과')
  }
  if (tenants > 150) {
    recommendations.push('DB 인스턴스 업그레이드 검토 필요')
  }
  if (dbSizeMB > 6000) {
    recommendations.push('DB 용량 75% 초과: 데이터 아카이빙 검토')
  }
  if (storageMB > 75000) {
    recommendations.push('Storage 75% 초과: 이미지 압축 또는 업그레이드 검토')
  }

  if (recommendations.length === 0) {
    recommendations.push('현재 인프라 상태 양호')
  }

  return recommendations
}
