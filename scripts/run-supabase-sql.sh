#!/bin/bash

# Supabase SQL 실행 스크립트
# 사용법: ./scripts/run-supabase-sql.sh <SQL_FILE_PATH>
# 예시: ./scripts/run-supabase-sql.sh supabase/migrations/20251120_fix_all_schema_issues.sql

set -e  # 에러 발생 시 즉시 종료

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Supabase 연결 정보
DB_HOST="aws-1-ap-northeast-1.pooler.supabase.com"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres.ipqhhqduppzvsqwwzjkp"
DB_PASSWORD="rhfemvps123"

# 연결 문자열
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# 인자 확인
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ 에러: SQL 파일 경로가 필요합니다${NC}"
    echo ""
    echo "사용법: $0 <SQL_FILE_PATH>"
    echo ""
    echo "예시:"
    echo "  $0 supabase/migrations/20251120_fix_all_schema_issues.sql"
    echo "  $0 -c 'SELECT * FROM users LIMIT 10;'"
    exit 1
fi

# -c 옵션으로 직접 SQL 실행
if [ "$1" == "-c" ]; then
    if [ -z "$2" ]; then
        echo -e "${RED}❌ 에러: SQL 명령어가 필요합니다${NC}"
        exit 1
    fi

    echo -e "${YELLOW}🔄 SQL 명령어 실행 중...${NC}"
    echo ""

    PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}" -c "$2"

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ SQL 명령어 실행 완료!${NC}"
    else
        echo ""
        echo -e "${RED}❌ SQL 명령어 실행 실패${NC}"
        exit 1
    fi

    exit 0
fi

# SQL 파일 경로
SQL_FILE="$1"

# 파일 존재 확인
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ 에러: 파일을 찾을 수 없습니다: ${SQL_FILE}${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 Supabase SQL 실행 시작${NC}"
echo ""
echo -e "${YELLOW}📄 SQL 파일:${NC} ${SQL_FILE}"
echo -e "${YELLOW}🌐 데이터베이스:${NC} ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""
echo -e "${YELLOW}🔄 실행 중...${NC}"
echo ""

# SQL 실행
PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}" -f "${SQL_FILE}"

# 결과 확인
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SQL 마이그레이션 성공!${NC}"
    echo ""
    echo -e "${GREEN}📊 다음 단계:${NC}"
    echo "  1. 애플리케이션 재시작: pnpm dev"
    echo "  2. 브라우저에서 확인: http://localhost:8000"
else
    echo ""
    echo -e "${RED}❌ SQL 마이그레이션 실패${NC}"
    echo ""
    echo -e "${YELLOW}💡 문제 해결:${NC}"
    echo "  1. 연결 정보 확인: SUPABASE.md 참고"
    echo "  2. SQL 문법 확인: ${SQL_FILE}"
    echo "  3. 권한 확인: Supabase 대시보드에서 Owner 권한 확인"
    exit 1
fi
