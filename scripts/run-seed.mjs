import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase Direct URL (ap-northeast-1, port 5432)
const client = new pg.Client({
  connectionString: 'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  console.log('Connecting to Supabase...');
  await client.connect();
  console.log('✅ Connected!');

  const sqlFile = join(__dirname, '../supabase/migrations/20251122_seed_real_schema.sql');
  console.log(`Reading SQL file: ${sqlFile}`);
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('Executing seed SQL...');
  await client.query(sql);
  console.log('✅ Seed data created successfully!');

  // Verify counts
  console.log('\n📊 Verifying data counts:');
  const tables = [
    'class_enrollments',
    'schedules',
    'attendance',
    'attendance_records',
    'homework',
    'homework_submissions',
    'exams',
    'exam_scores'
  ];

  for (const table of tables) {
    const result = await client.query(`SELECT COUNT(*) FROM ${table} WHERE org_id = '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3'`);
    console.log(`  ${table}: ${result.rows[0].count} records`);
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
