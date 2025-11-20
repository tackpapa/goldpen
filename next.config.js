/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Cloudflare Pages 배포 설정
  output: 'export', // Static HTML export

  // TypeScript 엄격 모드 (프레젠테이션용 빌드 시 임시 비활성화)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint 엄격 모드 (프레젠테이션용 빌드 시 임시 비활성화)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 실험적 기능
  experimental: {
    typedRoutes: true, // 타입 안전한 라우팅
  },

  // Cloudflare Pages 최적화
  images: {
    unoptimized: true, // Cloudflare Images 또는 Loader 사용
  },

  // 환경 변수 명시적 설정 (Production DB 연결)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vdxxzygqjjjptzlvgrtw.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeHh6eWdxampqcHR6bHZncnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODk2NjQsImV4cCI6MjA3OTE2NTY2NH0.kcGWLo6b8NwI5o2JtvGtk6khlDtSzBYSvvDoSfjux44',
  },
}

module.exports = nextConfig
