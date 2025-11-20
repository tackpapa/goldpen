# Supabase MCP 설정 완료

**날짜**: 2025-11-20
**상태**: ✅ 설정 완료 - Claude Code 재시작 필요

---

## ✅ 설정 완료

Supabase MCP 서버가 Claude Code 설정 파일에 추가되었습니다.

**설정 파일 위치**: `~/.config/claude-code/claude_desktop_config.json`

**추가된 설정**:
```json
"supabase": {
  "url": "https://mcp.supabase.com/mcp?project_ref=vdxxzygqjjjptzlvgrtw"
}
```

---

## 🔄 Claude Code 재시작

**중요**: MCP 설정 변경사항을 적용하려면 Claude Code를 재시작해야 합니다.

### macOS 재시작 방법:

1. **Option 1: Claude Code 완전 종료 후 재시작**
   - Command + Q로 Claude Code 종료
   - Applications에서 Claude Code 다시 실행

2. **Option 2: 터미널로 강제 종료 후 재시작**
   ```bash
   # Claude Code 프로세스 종료
   pkill -f "Claude Code" || killall "Claude Code"

   # Claude Code 재실행
   open -a "Claude Code"
   ```

재시작 후, Supabase MCP 도구들이 자동으로 로드됩니다.

---

## 🎯 Supabase MCP 기능

재시작 후 다음 기능들을 사용할 수 있습니다:

### 1. 데이터베이스 조회
```
"Supabase에서 모든 테이블 목록을 보여줘"
"organizations 테이블의 모든 레코드를 조회해줘"
"users 테이블에서 owner 역할을 가진 사용자를 찾아줘"
```

### 2. SQL 쿼리 실행
```
"다음 SQL을 실행해줘: SELECT COUNT(*) FROM students WHERE org_id = '...'"
"students 테이블에 새 학생을 추가해줘"
```

### 3. 스키마 탐색
```
"users 테이블의 스키마를 보여줘"
"데이터베이스의 모든 관계(foreign keys)를 보여줘"
```

### 4. 데이터 분석
```
"각 organization별 학생 수를 집계해줘"
"최근 7일간 생성된 consultations 개수는?"
```

---

## 🔐 보안 옵션

### Read-Only 모드 (권장 - 프로덕션 보호)

프로덕션 데이터베이스를 안전하게 보호하려면 read-only 모드를 활성화하세요:

**설정 변경**:
```json
"supabase": {
  "url": "https://mcp.supabase.com/mcp?project_ref=vdxxzygqjjjptzlvgrtw&read_only=true"
}
```

**효과**:
- ✅ SELECT 쿼리 허용
- ❌ INSERT, UPDATE, DELETE 차단
- ❌ CREATE, DROP, ALTER 차단

### 로컬 Supabase 사용 (개발 환경)

로컬 Supabase Docker를 사용하려면:

**설정 변경**:
```json
"supabase-local": {
  "url": "http://localhost:54321/mcp"
}
```

**전제 조건**:
- Supabase CLI 실행 중 (`supabase start`)
- Docker 컨테이너 실행 중

---

## 📋 현재 MCP 서버 목록

Claude Code에 설정된 모든 MCP 서버:

1. **github** - GitHub 저장소 탐색
2. **sequential-thinking** - 단계적 문제 해결
3. **serena** - 코드 심볼 분석 (함수/클래스 찾기)
4. **browsermcp** - 브라우저 자동화 (콘솔/네트워크)
5. **context7** - 최신 라이브러리 문서
6. **supabase** - Supabase 데이터베이스 관리 ⭐️ (새로 추가)

---

## 🧪 테스트 방법

Claude Code 재시작 후 다음 명령어로 테스트:

```
"Supabase MCP가 연결되어 있나요?"
"Supabase에서 사용 가능한 도구를 알려줘"
"organizations 테이블을 조회해줘"
```

**예상 응답**:
- MCP 서버가 정상적으로 로드되면 Supabase 관련 도구들이 표시됩니다
- 데이터베이스 쿼리가 정상적으로 실행됩니다

---

## 🔧 트러블슈팅

### 문제: "Supabase MCP를 찾을 수 없습니다"

**원인**: Claude Code가 재시작되지 않았음

**해결**:
1. Command + Q로 Claude Code 완전 종료
2. Claude Code 다시 실행
3. 몇 초 대기 후 테스트

### 문제: "인증 에러"

**원인**: Supabase 프로젝트에 로그인 필요

**해결**:
- Supabase hosted MCP는 자동으로 로그인 프롬프트 표시
- 브라우저에서 Supabase 계정으로 로그인

### 문제: "database does not exist"

**원인**: 프로젝트 ref가 잘못됨

**확인**:
```bash
# .env.production 확인
cat .env.production | grep SUPABASE_URL
# 출력: https://vdxxzygqjjjptzlvgrtw.supabase.co

# 프로젝트 ref: vdxxzygqjjjptzlvgrtw ✅
```

---

## 📝 추가 설정 옵션

### 특정 기능만 활성화

```json
"supabase": {
  "url": "https://mcp.supabase.com/mcp?project_ref=vdxxzygqjjjptzlvgrtw&features=queries,schema"
}
```

**사용 가능한 features**:
- `queries` - SQL 쿼리 실행
- `schema` - 스키마 탐색
- `rpc` - PostgreSQL 함수 호출
- `config` - 프로젝트 설정 조회

### 여러 Supabase 프로젝트 사용

```json
{
  "mcpServers": {
    "supabase-production": {
      "url": "https://mcp.supabase.com/mcp?project_ref=vdxxzygqjjjptzlvgrtw"
    },
    "supabase-development": {
      "url": "http://localhost:54321/mcp"
    }
  }
}
```

---

## 🎯 실전 활용 예시

### 1. 마이그레이션 검증

```
"Supabase에서 다음을 확인해줘:
1. 모든 테이블이 생성되었는지
2. organizations 테이블에 데이터가 있는지
3. RLS 정책이 활성화되어 있는지"
```

### 2. 데이터 탐색

```
"students 테이블의 스키마를 보여주고,
샘플 레코드 5개를 조회해줘"
```

### 3. 관계 분석

```
"users와 organizations 테이블의 관계를 분석하고,
각 organization별 user 수를 보여줘"
```

### 4. SQL 파일 실행

```
"backups/supabase_ready.sql 파일의 내용을
Supabase에 실행해줘"
```

---

## 📚 참고 자료

**공식 문서**:
- [Supabase MCP 공식 문서](https://supabase.com/docs/guides/getting-started/mcp)
- [MCP 서버 가이드](https://supabase.com/blog/mcp-server)

**커뮤니티 패키지**:
- [supabase-mcp-server (Python)](https://pypi.org/project/supabase-mcp-server/)
- [GitHub Repository](https://github.com/supabase-community/supabase-mcp)

---

## ✅ 체크리스트

설정 완료 확인:

- [x] Supabase MCP 설정 추가 (`~/.config/claude-code/claude_desktop_config.json`)
- [ ] Claude Code 재시작
- [ ] Supabase MCP 연결 테스트
- [ ] 데이터베이스 조회 테스트
- [ ] (선택) Read-only 모드 활성화

---

**설정 완료!** 이제 Claude Code를 재시작한 후 Supabase 데이터베이스를 자연어로 관리할 수 있습니다.

**다음 단계**: Claude Code 재시작 후 `"Supabase에서 모든 테이블을 보여줘"` 명령어로 테스트하세요!
