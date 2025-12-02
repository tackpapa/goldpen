import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-gray-600">페이지를 찾을 수 없습니다</p>
      <Link
        href="/"
        className="mt-4 rounded-lg bg-[#D4A574] px-4 py-2 text-white hover:bg-[#C49464]"
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
