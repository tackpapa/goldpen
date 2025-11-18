# 데이터베이스 설정 가이드

## 개요

ClassFlow OS는 로컬 개발 환경에서 Docker PostgreSQL을 사용합니다.

## 기술 스택

- **데이터베이스**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **마이그레이션 도구**: Drizzle Kit
- **관리 도구**: pgAdmin 4

---

## 1. Docker 설치 (필수)

Docker가 설치되어 있지 않다면 먼저 설치하세요:

- **Windows/Mac**: [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: Docker Engine 설치

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose-plugin

# 설치 확인
docker --version
docker compose version
```

---

## 2. 환경 변수 설정

`.env.local` 파일이 이미 생성되어 있습니다. 필요시 수정하세요:

```bash
# 데이터베이스 연결 정보
DATABASE_URL=postgresql://classflow:classflow_dev_2024@localhost:5432/classflow_db
```

---

## 3. PostgreSQL 시작

### Docker Compose로 시작

```bash
# PostgreSQL + pgAdmin 시작
npm run docker:up

# 또는 직접 명령어
docker compose up -d
```

### 컨테이너 상태 확인

```bash
# 컨테이너 목록
docker compose ps

# 로그 확인
npm run docker:logs
```

---

## 4. 마이그레이션 실행

### 마이그레이션 파일 생성 (이미 완료됨)

```bash
npm run db:generate
```

### 데이터베이스에 스키마 적용

```bash
npm run db:push
```

---

## 5. 데이터베이스 접근

### 명령줄 (psql)

```bash
docker compose exec postgres psql -U classflow -d classflow_db
```

### pgAdmin (웹 UI)

1. 브라우저에서 http://localhost:5050 열기
2. 로그인 정보:
   - Email: `admin@classflow.local`
   - Password: `admin`

3. 서버 추가:
   - Host: `postgres` (또는 `host.docker.internal`)
   - Port: `5432`
   - Database: `classflow_db`
   - Username: `classflow`
   - Password: `classflow_dev_2024`

### Drizzle Studio (추천)

```bash
npm run db:studio
```

브라우저에서 https://local.drizzle.studio 열림

---

## 6. 데이터베이스 스키마

### 생성된 테이블 (10개)

1. **organizations** - 기관/학원 정보
2. **branches** - 지점 정보
3. **users** - 사용자 (owner, manager, teacher, staff, student, parent)
4. **students** - 학생 정보
5. **guardians** - 학부모/보호자 정보
6. **teachers** - 강사 정보
7. **classes** - 반/수업 정보
8. **enrollments** - 수강 정보
9. **attendance** - 출결 기록
10. **consultations** - 상담 기록

### ERD (Entity Relationship Diagram)

```
organizations
  ├─ branches
  ├─ users
  └─ students
       ├─ guardians
       ├─ enrollments → classes → teachers
       ├─ attendance
       └─ consultations
```

---

## 7. 유용한 명령어

### npm 스크립트

```bash
# 데이터베이스 마이그레이션 생성
npm run db:generate

# 마이그레이션 실행
npm run db:push

# Drizzle Studio 실행
npm run db:studio

# Docker 컨테이너 시작
npm run docker:up

# Docker 컨테이너 중지
npm run docker:down

# PostgreSQL 로그 확인
npm run docker:logs
```

### Docker 명령어

```bash
# 모든 컨테이너 중지 및 삭제
docker compose down

# 볼륨까지 삭제 (데이터 완전 초기화)
docker compose down -v

# 컨테이너 재시작
docker compose restart postgres
```

---

## 8. 트러블슈팅

### 포트 충돌 (5432 already in use)

```bash
# 기존 PostgreSQL 중지 (Mac/Linux)
sudo service postgresql stop

# 또는 docker-compose.yml에서 포트 변경
ports:
  - '5433:5432'  # 5433으로 변경
```

그리고 `.env.local`도 수정:

```bash
DATABASE_URL=postgresql://classflow:classflow_dev_2024@localhost:5433/classflow_db
```

### 마이그레이션 실패

```bash
# Docker 컨테이너 재시작
docker compose restart postgres

# 데이터베이스 완전 초기화
docker compose down -v
docker compose up -d

# 다시 마이그레이션
npm run db:push
```

### pgAdmin 접속 안됨

```bash
# pgAdmin 컨테이너 재시작
docker compose restart pgadmin

# 로그 확인
docker compose logs pgadmin
```

---

## 9. 프로덕션 환경

프로덕션에서는 다음 옵션 중 하나를 사용하세요:

1. **Supabase** (추천)
   - PostgreSQL + Auth + Storage + Realtime
   - 무료 티어 제공
   - https://supabase.com

2. **Neon** (서버리스 PostgreSQL)
   - Cloudflare Workers와 호환성 우수
   - https://neon.tech

3. **Vercel Postgres**
   - Vercel 통합
   - https://vercel.com/storage/postgres

---

## 10. 다음 단계

데이터베이스 설정이 완료되었습니다! 이제 다음을 진행하세요:

1. [ ] 초기 데이터 시드 (관리자 계정 등)
2. [ ] API 라우트에서 Drizzle ORM 사용
3. [ ] 인증 시스템 연동
4. [ ] CRUD 작업 구현

---

**작성일**: 2025-11-18
**버전**: 0.1.0
