'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { BoardCard } from '@/components/BoardCard'
import api from '@/lib/api'
import Link from 'next/link'
import { Plus, Zap, TrendingUp, Globe } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: myBoards = [], isLoading: boardsLoading } = useQuery({
    queryKey: ['my-boards'],
    queryFn: () => api.getMyBoards(),
    enabled: !!user,
  })

  const { data: publicBoards = [] } = useQuery({
    queryKey: ['public-boards'],
    queryFn: () => api.getPublicBoards(),
  })

  const { data: feed = [] } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.getFeed({ limit: 10 }),
    refetchInterval: 10_000,
  })

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-2xl bg-podium-card border border-podium-border p-6">
          {/* Glow effect */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-podium-indigo/50 to-transparent" />
          <div className="absolute top-0 inset-x-0 h-24 bg-indigo-glow pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="live-dot" />
              <span className="text-xs text-podium-sub uppercase tracking-widest font-medium">Live now</span>
            </div>
            <h1 className="font-display font-bold text-2xl text-white mb-1">
              {user ? `Welcome back, ${user.displayName.split(' ')[0]}` : 'Welcome to Podium'}
            </h1>
            <p className="text-podium-sub text-sm">
              {myBoards.length > 0
                ? `You're competing on ${myBoards.length} live board${myBoards.length !== 1 ? 's' : ''}`
                : 'Create or join a leaderboard to start competing'}
            </p>
          </div>

          {!user && (
            <div className="relative mt-4 flex gap-3">
              <Link href="/register" className="btn-primary">Get started free</Link>
              <Link href="/login" className="btn-secondary">Sign in</Link>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My boards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-podium-text flex items-center gap-2">
              <Zap size={17} className="text-podium-indigo" />
              My boards
            </h2>
            {user && (
              <Link href="/boards/new" className="btn-ghost text-xs">
                <Plus size={14} /> New
              </Link>
            )}
          </div>

          {boardsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-32 rounded-xl" />
              ))}
            </div>
          ) : myBoards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myBoards.map((board, i) => (
                <motion.div
                  key={board.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <BoardCard board={board} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="text-3xl mb-3">🏆</div>
              <p className="text-podium-sub text-sm mb-4">No boards yet</p>
              {user ? (
                <Link href="/boards/new" className="btn-primary text-sm">
                  <Plus size={14} /> Create your first board
                </Link>
              ) : (
                <Link href="/login" className="btn-primary text-sm">Sign in to get started</Link>
              )}
            </div>
          )}

          {/* Public trending */}
          <div className="flex items-center justify-between mt-6">
            <h2 className="font-display font-semibold text-podium-text flex items-center gap-2">
              <Globe size={17} className="text-podium-teal" />
              Trending public boards
            </h2>
            <Link href="/explore" className="btn-ghost text-xs">See all</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicBoards.slice(0, 4).map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        </div>

        {/* Feed sidebar */}
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-podium-text flex items-center gap-2">
            <TrendingUp size={17} className="text-podium-amber" />
            Live feed
          </h2>

          <div className="card divide-y divide-podium-border">
            {feed.length === 0 && (
              <div className="p-6 text-center text-podium-dim text-xs">
                No events yet
              </div>
            )}
            {feed.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="px-4 py-3"
              >
                <div className="text-xs text-podium-text font-medium">
                  {event.actorDisplayName}
                  <span className="text-podium-dim font-normal ml-1">
                    {event.type === 'reached_number_one' && '🏆 reached #1 on'}
                    {event.type === 'rank_up' && '↑ moved up on'}
                    {event.type === 'score_submitted' && 'submitted a score on'}
                    {event.type === 'board_joined' && 'joined'}
                    {' '}
                    <Link href={`/boards/${event.boardId}`} className="text-podium-indigo-glow hover:underline">
                      {event.boardName}
                    </Link>
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
