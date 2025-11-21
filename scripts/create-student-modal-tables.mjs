import pg from 'pg'

const client = new pg.Client({
  connectionString: 'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function createTables() {
  await client.connect()
  console.log('Connected to database')

  try {
    // 1. student_subscriptions
    console.log('Creating student_subscriptions...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL,
        student_id UUID NOT NULL,
        subscription_type VARCHAR(50) NOT NULL DEFAULT 'days',
        total_days INTEGER,
        remaining_days INTEGER,
        total_hours INTEGER,
        remaining_hours INTEGER,
        start_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        payment_id UUID,
        price INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('✅ student_subscriptions created')

    // 2. student_services
    console.log('Creating student_services...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL,
        student_id UUID NOT NULL,
        service_type VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    // Try to add unique constraint
    try {
      await client.query(`
        ALTER TABLE student_services ADD CONSTRAINT student_services_unique
        UNIQUE(org_id, student_id, service_type)
      `)
    } catch(e) {
      console.log('  Unique constraint already exists or error:', e.message)
    }
    console.log('✅ student_services created')

    // 3. enrollments
    console.log('Creating enrollments...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL,
        student_id UUID NOT NULL,
        class_id UUID NOT NULL,
        enrolled_at TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        teacher_id UUID,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    // Try to add unique constraint
    try {
      await client.query(`
        ALTER TABLE enrollments ADD CONSTRAINT enrollments_unique
        UNIQUE(org_id, student_id, class_id)
      `)
    } catch(e) {
      console.log('  Unique constraint already exists or error:', e.message)
    }
    console.log('✅ enrollments created')

    // 4. Enable RLS
    console.log('Enabling RLS...')
    await client.query('ALTER TABLE student_subscriptions ENABLE ROW LEVEL SECURITY')
    await client.query('ALTER TABLE student_services ENABLE ROW LEVEL SECURITY')
    await client.query('ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY')
    console.log('✅ RLS enabled')

    // 5. Create RLS policies
    console.log('Creating RLS policies...')
    const policies = [
      `DROP POLICY IF EXISTS sub_auth ON student_subscriptions`,
      `CREATE POLICY sub_auth ON student_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true)`,
      `DROP POLICY IF EXISTS svc_auth ON student_services`,
      `CREATE POLICY svc_auth ON student_services FOR ALL TO authenticated USING (true) WITH CHECK (true)`,
      `DROP POLICY IF EXISTS enr_auth ON enrollments`,
      `CREATE POLICY enr_auth ON enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true)`,
    ]
    for (const p of policies) {
      try {
        await client.query(p)
      } catch(e) {
        console.log('  Policy error:', e.message)
      }
    }
    console.log('✅ RLS policies created')

    // 6. Create indexes
    console.log('Creating indexes...')
    await client.query('CREATE INDEX IF NOT EXISTS idx_student_subscriptions_student ON student_subscriptions(student_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_student_services_student ON student_services(student_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id)')
    console.log('✅ Indexes created')

    console.log('\n🎉 Migration complete!')

  } catch (err) {
    console.error('Error:', err.message)
  }

  await client.end()
}

createTables()
