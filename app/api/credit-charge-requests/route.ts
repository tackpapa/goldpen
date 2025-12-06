import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Workers API URL
const WORKERS_API_URL = process.env.WORKERS_API_URL || 'https://goldpen-api.hello-51f.workers.dev'

// Telegram notification via Workers API
async function sendTelegramNotification(message: string): Promise<void> {
  try {
    const response = await fetch(`${WORKERS_API_URL}/api/telegram/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    if (response.ok) {
      console.log('[Telegram] Deposit request notification sent via Workers API')
    } else {
      const result = await response.json() as { error?: string }
      console.error('[Telegram] Workers API error:', result.error)
    }
  } catch (error) {
    console.error('[Telegram] Error sending notification:', error)
  }
}

// POST: Submit a new deposit request
export async function POST(request: Request) {
  try {
    const service = getServiceClient()
    if (!service) {
      return Response.json({ error: 'Service unavailable' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('orgSlug')

    if (!orgSlug) {
      return Response.json({ error: 'orgSlug is required' }, { status: 400 })
    }

    // Get org_id and name from slug
    const { data: org, error: orgError } = await service
      .from('organizations')
      .select('id, name, credit_balance')
      .eq('slug', orgSlug)
      .maybeSingle()

    if (orgError || !org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json() as { message: string }
    const { message } = body

    if (!message || message.trim().length === 0) {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    // Insert deposit request
    const { data, error } = await service
      .from('credit_charge_requests')
      .insert({
        org_id: org.id,
        message: message.trim(),
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating deposit request:', error)
      return Response.json({ error: 'Failed to create deposit request' }, { status: 500 })
    }

    // Send Telegram notification
    const now = new Date()
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const telegramMessage = `💰 <b>입금 신청</b>

🏢 조직: ${org.name} (${orgSlug})
💳 현재 잔액: ${(org.credit_balance || 0).toLocaleString()}원
📝 메시지: ${message.trim()}
🕐 시간: ${timeStr}

👉 관리자 페이지에서 확인하세요`

    // Send telegram notification (await to ensure it completes before response)
    await sendTelegramNotification(telegramMessage)

    return Response.json({ success: true, request: data })
  } catch (error) {
    console.error('Error in POST /api/credit-charge-requests:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
