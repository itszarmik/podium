'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import {
  LayoutDashboard, Globe, Lock, Plus, User, LogOut, Zap, Trophy, Bell
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard',       label: 'Home',      icon: LayoutDashboard },
  { href: '/explore',         label: 'Explore',   icon: Globe },
  { href: '/boards',          label: 'My Boards', icon: Lock },
  { href: '/notifications',   label: 'Alerts',    icon: Bell },
  { href: '/profile',         label: 'Profile',   icon: User },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 h-screen sticky top-0 flex-col border-r border-podium-border bg-podium-surface">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-podium-border">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-podium-indigo flex items-center justify-center animate-pulse-glow">
              <Trophy size={14} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg text-podium-text tracking-tight">Podium</span>
          </Link>
        </div>

        {/* Live indicator */}
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-podium-indigo/10 border border-podium-indigo/20 flex items-center gap-2">
          <span className="live-dot flex-shrink-0" />
          <span className="text-xs text-podium-indigo-glow font-medium">All boards live</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                pathname === href || pathname.startsWith(href + '/')
                  ? 'bg-podium-indigo/15 text-podium-indigo-glow border border-podium-indigo/25'
                  : 'text-podium-sub hover:text-podium-text hover:bg-podium-muted'
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Create board CTA */}
        <div className="px-3 py-3 border-t border-podium-border space-y-3">
          <Link href="/boards/new" className="btn-primary w-full text-sm">
            <Plus size={15} />
            New board
          </Link>

          {/* User */}
          {user && (
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-7 h-7 rounded-full bg-podium-indigo/20 flex items-center justify-center text-xs font-bold text-podium-indigo-glow flex-shrink-0">
                {user.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-podium-text truncate">{user.displayName}</div>
                <div className="text-[10px] text-podium-dim truncate">@{user.username}</div>
              </div>
              <button onClick={logout} className="text-podium-dim hover:text-podium-text transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile bottom nav (visible only on mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-podium-surface border-t border-podium-border flex items-center justify-around px-2 py-2 safe-area-bottom">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150 min-w-[56px]',
                active
                  ? 'text-podium-indigo-glow'
                  : 'text-podium-dim'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
