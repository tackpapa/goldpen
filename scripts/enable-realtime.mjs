import pg from 'pg'

const client = new pg.Client({
  connectionString: 'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres'
})

async function enableRealtime() {
  await client.connect()
  console.log('Connected to database')
  
  // Enable realtime for tables
  const sql = `
    -- Add tables to realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE sleep_records;
    ALTER PUBLICATION supabase_realtime ADD TABLE outing_records;
    ALTER PUBLICATION supabase_realtime ADD TABLE livescreen_state;
  `
  
  try {
    await client.query(sql)
    console.log('✅ Realtime enabled for sleep_records, outing_records, livescreen_state')
  } catch (err) {
    // Tables might already be in publication
    console.log('Note:', err.message)
    
    // Try one by one
    for (const table of ['sleep_records', 'outing_records', 'livescreen_state']) {
      try {
        await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE ${table};`)
        console.log(`✅ ${table} added to realtime`)
      } catch (e) {
        if (e.message.includes('already member')) {
          console.log(`ℹ️ ${table} already in realtime publication`)
        } else {
          console.log(`⚠️ ${table}: ${e.message}`)
        }
      }
    }
  }
  
  // Verify
  const result = await client.query(`
    SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
  `)
  console.log('\nTables in supabase_realtime publication:')
  result.rows.forEach(r => console.log(' -', r.tablename))
  
  await client.end()
}

enableRealtime().catch(console.error)
