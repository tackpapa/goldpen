export const runtime = 'edge'

import { Header } from '@/components/shared/Header'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto p-6">
        {children}
      </main>
    </div>
  )
}
