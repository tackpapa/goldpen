/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 환경 변수 검증
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000',
  },

  // TypeScript 엄격 모드
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint 엄격 모드
  eslint: {
    ignoreDuringBuilds: false,
  },

  // 실험적 기능
  experimental: {
    typedRoutes: true, // 타입 안전한 라우팅
  },
}

module.exports = nextConfig
