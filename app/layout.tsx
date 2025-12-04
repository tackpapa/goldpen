import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '골드펜 - 학원/러닝센터 통합 운영 시스템',
  description: '상담부터 정산까지, 교육 기관 운영을 자동화하는 올인원 플랫폼',
  icons: {
    icon: 'https://ipqhhqduppzvsqwwzjkp.supabase.co/storage/v1/object/public/assets/branding/goldpen-icon.png',
    shortcut: 'https://ipqhhqduppzvsqwwzjkp.supabase.co/storage/v1/object/public/assets/branding/goldpen-icon.png',
    apple: 'https://ipqhhqduppzvsqwwzjkp.supabase.co/storage/v1/object/public/assets/branding/goldpen-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Suppress Recharts defaultProps warnings
            if (typeof window !== 'undefined') {
              const originalError = console.error;
              console.error = (...args) => {
                if (
                  typeof args[0] === 'string' &&
                  args[0].includes('Support for defaultProps will be removed')
                ) {
                  return;
                }
                originalError.apply(console, args);
              };
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
