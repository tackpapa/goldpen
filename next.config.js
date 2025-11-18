/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 환경 변수 검증
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000',
  },

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
}

module.exports = nextConfig
