const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

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
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
    ],
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

module.exports = withBundleAnalyzer(nextConfig)
