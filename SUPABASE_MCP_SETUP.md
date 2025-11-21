# Supabase SQL 직접 실행 방법

## 🎯 유일한 검증된 방법: Prisma Client

**다른 방법들은 모두 실패함. 이 방법만 사용!**

---

## 연결 정보

```
Host: aws-1-ap-northeast-1.pooler.supabase.com
Port: 6543 (Pooler)
Database: postgres
User: postgres.ipqhhqduppzvsqwwzjkp
Password: rhfemvps123
```

**Connection String:**
```
postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

## 실행 명령어

### SELECT 쿼리 (읽기)
```bash
node --eval "
import('@prisma/client').then(({ PrismaClient }) => {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
  });

  prisma.\$queryRaw\`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'students';
  \`.then(result => {
    console.log(JSON.stringify(result, null, 2));
    prisma.\$disconnect();
  }).catch(err => {
    console.error('에러:', err.message);
    prisma.\$disconnect();
  });
});
"
```

### DDL 쿼리 (테이블 수정)
```bash
node --eval "
import('@prisma/client').then(({ PrismaClient }) => {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
  });

  prisma.\$executeRaw\`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS new_column TEXT;
  \`.then(() => {
    console.log('✅ 완료');
    prisma.\$disconnect();
  }).catch(err => {
    console.error('에러:', err.message);
    prisma.\$disconnect();
  });
});
"
```

---

## 주의사항

- `$queryRaw`: SELECT 쿼리용 (결과 반환)
- `$executeRaw`: DDL/DML 쿼리용 (ALTER, INSERT, UPDATE, DELETE)
- 백틱 내 `$`는 `\$`로 이스케이프 필요

---

**마지막 업데이트**: 2025-11-22
