#!/usr/bin/env node

/**
 * 프로덕션 마이그레이션 즉시 실행 스크립트
 * audit_logs 테이블을 프로덕션 Supabase에 생성합니다.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://ipqhhqduppzvsqwwzjkp.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcWhocWR1cHB6dnNxd3d6amtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYzNjYzOCwiZXhwIjoyMDc5MjEyNjM4fQ.bedodvDtJ9WkJblh7wITNTkSXk8DyjCjIkjAIxSl8qc'

console.log('🚀 프로덕션 마이그레이션 시작...\n')
console.log('Target:', SUPABASE_URL)
console.log('Migration: audit_logs 테이블 생성\n')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function executeMigration() {
  try {
    // SQL 파일 읽기
    const sql = readFileSync('supabase/migrations/20251120_create_audit_logs.sql', 'utf-8')

    // SQL을 개별 문장으로 분리 (세미콜론 기준)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 총 ${statements.length}개의 SQL 문장 실행 예정\n`)

    // PostgreSQL 직접 연결이 필요하므로, RPC 함수 사용
    // 전체 SQL을 한번에 실행
    console.log('🔧 SQL 실행 중...\n')

    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    })

    if (error) {
      // exec_sql RPC가 없을 경우를 대비한 대체 방법
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('⚠️  exec_sql RPC 함수가 없습니다.')
        console.log('📋 수동 실행이 필요합니다.\n')
        console.log('다음 링크로 이동하여 SQL을 실행하세요:')
        console.log(`https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql/new\n`)
        console.log('실행할 SQL:')
        console.log('─'.repeat(80))
        console.log(sql)
        console.log('─'.repeat(80))
        process.exit(1)
      }

      throw error
    }

    console.log('✅ 마이그레이션 성공!\n')

    // 검증
    console.log('🔍 테이블 생성 확인 중...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(1)

    if (verifyError && !verifyError.message.includes('0 rows')) {
      throw new Error(`검증 실패: ${verifyError.message}`)
    }

    console.log('✅ audit_logs 테이블 생성 완료!\n')
    console.log('📊 다음 단계:')
    console.log('  1. Supabase Dashboard에서 테이블 확인')
    console.log('  2. https://goldpen.kr/admin/audit-logs 페이지 확인')
    console.log('  3. RLS 정책 및 인덱스 확인\n')

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message)
    console.error('\n상세 정보:')
    console.error(error)
    process.exit(1)
  }
}

executeMigration()
