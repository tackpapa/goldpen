export const runtime = 'edge'

export async function GET() {
  return new Response(JSON.stringify({ ok: true, bypass: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

export async function POST() { return GET() }
export async function PUT() { return GET() }
export async function PATCH() { return GET() }
export async function DELETE() { return GET() }
