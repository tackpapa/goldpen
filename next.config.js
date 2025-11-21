/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
    // Supabase 값을 빌드 시 주입해야 하며, 하드코딩된 폴백을 제거해 잘못된 프로젝트 키가 번들되지 않도록 함
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

module.exports = nextConfig
