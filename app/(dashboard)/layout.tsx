import { Header } from '@/components/shared/Header'
import { Sidebar } from '@/components/shared/Sidebar'
import { Breadcrumb } from '@/components/shared/Breadcrumb'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-3 md:p-4 lg:p-6 max-w-full overflow-x-hidden">
          <div className="mb-4 md:mb-6">
            <Breadcrumb />
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
