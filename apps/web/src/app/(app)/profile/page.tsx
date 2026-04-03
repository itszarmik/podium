'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { motion } from 'framer-motion'
import { TrendingUp, Trophy, Zap, Calendar, Shield, LogOut } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

const TIER_COLORS: Record<string, string> = {
  free:    'text-podium-dim    bg-podium-muted',
  pro:     'text-podium-indigo-glow bg-podium-indigo/15 border border-podium-indigo/30',
  teams:   'text-podium-amber  bg-podium-amber/15  border border-podium-amber/30',
  creator: 'text-podium-teal   bg-podium-teal/15   border border-podium-teal/30',
}

const ACHIEVEMENTS = [
  { id: 'first_board', emoji: '🏆', label: 'First board', desc: 'Created your first leaderboard' },
  { id: 'top_three',   emoji: '🥉', label: 'Podium',      desc: 'Reached top 3 on any board' },
  { id: 'number_one',  emoji: '🥇', label: 'Champion',    desc: 'Reached #1 on any board' },
  { id: 'streak_7',    emoji: '🔥', label: '7-day streak', desc: 'Competed 7 days in a row' },
]

export default function ProfilePage() {
  const { user, logout } = useAuthStore()

  const { data: myBoards = [] } = useQuery({
    queryKey: ['my-boards'],
    queryFn: () => api.getMyBoards(),
    enabled: !!user,
  })

  if (!user) return null

  const initials = user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const memberSince = new Date(user.createdAt)
  const daysActive = Math.floor((Date.now() - memberSince.getTime()) / 86400000)

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Profile hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-20 bg-indigo-glow pointer-events-none" />
        <div className="relative flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-podium-indigo/20 flex items-center justify-center text-xl font-bold text-podium-indigo-glow border border-podium-indigo/30 flex-shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display font-bold text-xl text-white leading-tight">
                  {user.displayName}
                </h1>
                <p className="text-podium-dim text-sm">@{user.username}</p>
              </div>
              <span className={clsx('badge text-xs px-2.5 py-1 rounded-full', TIER_COLORS[user.tier])}>
                {user.tier.toUpperCase()}
              </span>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-5 mt-4">
              <div>
                <p className="font-display font-bold text-lg text-white">{myBoards.length}</p>
                <p className="text-xs text-podium-dim">Boards</p>
              </div>
              <div className="w-px h-8 bg-podium-border" />
              <div>
                <p className="font-display font-bold text-lg text-podium-amber">{user.streakCount}</p>
                <p className="text-xs text-podium-dim">Day streak</p>
              </div>
              <div className="w-px h-8 bg-podium-border" />
              <div>
                <p className="font-display font-bold text-lg text-white">{daysActive}</p>
                <p className="text-xs text-podium-dim">Days active</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active boards */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-display font-semibold text-podium-text flex items-center gap-2 text-sm">
            <Zap size={15} className="text-podium-indigo" />
            Active boards
          </h2>

          {myBoards.length === 0 ? (
            <div className="card p-8 text-center">
              <Trophy size={28} className="mx-auto text-podium-dim mb-3" />
              <p className="text-podium-sub text-sm">Not competing anywhere yet</p>
              <Link href="/boards/new" className="btn-primary mt-4 text-sm">Create a board</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {myBoards.map((board, i) => (
                <motion.div
                  key={board.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/boards/${board.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-podium-border bg-podium-card hover:border-podium-dim transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-podium-muted flex items-center justify-center text-sm">
                      {board.category === 'sales' ? '💰' : board.category === 'gaming' ? '🎮' :
                       board.category === 'fitness' ? '🏃' : board.category === 'music' ? '🎵' :
                       board.category === 'sports' ? '⚽' : '🏆'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-podium-text truncate">{board.name}</p>
                      <p className="text-xs text-podium-dim">{board.memberCount} members · {board.scoringType}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="live-dot w-1.5 h-1.5" />
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-full',
                        (board as typeof board & { role?: string }).role === 'owner'
                          ? 'bg-podium-amber/15 text-podium-amber'
                          : 'bg-podium-muted text-podium-dim'
                      )}>
                        {(board as typeof board & { role?: string }).role || 'member'}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Achievements */}
          <div>
            <h2 className="font-display font-semibold text-podium-text flex items-center gap-2 text-sm mb-3">
              <Trophy size={15} className="text-podium-amber" />
              Achievements
            </h2>
            <div className="space-y-2">
              {ACHIEVEMENTS.map((a, i) => (
                <div
                  key={a.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl border',
                    i < 2
                      ? 'border-podium-amber/20 bg-podium-amber/5'
                      : 'border-podium-border bg-podium-card opacity-40'
                  )}
                >
                  <span className="text-lg">{a.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-podium-text">{a.label}</p>
                    <p className="text-[10px] text-podium-dim">{a.desc}</p>
                  </div>
                  {i < 2 && <Shield size={11} className="ml-auto text-podium-amber flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Account info */}
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-medium text-podium-sub uppercase tracking-wider">Account</h3>
            <div className="flex items-center gap-2 text-sm text-podium-sub">
              <Calendar size={13} />
              <span>Joined {memberSince.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="pt-2 border-t border-podium-border">
              {user.tier === 'free' && (
                <div className="mb-3">
                  <p className="text-xs text-podium-sub mb-2">Unlock more with Pro</p>
                  <button className="btn-primary w-full text-xs py-2">
                    Upgrade to Pro
                  </button>
                </div>
              )}
              <button
                onClick={logout}
                className="btn-ghost w-full text-podium-red text-sm justify-start"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
