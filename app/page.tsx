export const runtime = 'edge'
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          GoldPen
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          학원/러닝센터/스터디카페 통합 운영 시스템
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            로그인
          </a>
          <a
            href="/consultation/new"
            className="rounded-md bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/90"
          >
            상담 신청
          </a>
        </div>
      </div>
    </main>
  )
}
