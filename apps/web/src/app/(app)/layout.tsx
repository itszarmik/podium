import { Sidebar } from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-podium-black">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Extra bottom padding on mobile so content clears the bottom nav */}
        <div className="p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>
    </div>
  )
}
