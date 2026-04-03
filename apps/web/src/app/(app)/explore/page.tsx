'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { BoardCard } from '@/components/BoardCard'
import { Search, TrendingUp, Globe, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

const CATEGORIES = [
  { value: '', label: 'All', emoji: '⚡' },
  { value: 'sales', label: 'Sales', emoji: '💰' },
  { value: 'gaming', label: 'Gaming', emoji: '🎮' },
  { value: 'fitness', label: 'Fitness', emoji: '🏃' },
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'custom', label: 'Custom', emoji: '🏆' },
]

export default function ExplorePage() {
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['public-boards', category],
    queryFn: () => api.getPublicBoards({ category: category || undefined }),
  })

  const filtered = search
    ? boards.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : boards

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <Globe size={18} className="text-podium-teal" />
          <h1 className="font-display font-bold text-xl text-white">Explore</h1>
        </div>
        <p className="text-podium-sub text-sm">Discover live public leaderboards</p>
      </motion.div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-podium-dim" />
        <input
          className="input pl-10"
          placeholder="Search leaderboards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
              category === cat.value
                ? 'bg-podium-indigo/20 text-podium-indigo-glow border border-podium-indigo/30'
                : 'bg-podium-card border border-podium-border text-podium-sub hover:text-podium-text hover:border-podium-dim'
            )}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Boards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((board, i) => (
            <motion.div
              key={board.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <BoardCard board={board} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-podium-sub text-sm">
            {search ? `No boards matching "${search}"` : 'No public boards yet'}
          </p>
        </div>
      )}

      {/* Live stats banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 rounded-xl border border-podium-border bg-podium-card p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-sm font-medium text-podium-text">Platform is live</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <div className="font-display font-bold text-podium-indigo-glow">{boards.length}</div>
            <div className="text-xs text-podium-dim">Public boards</div>
          </div>
          <div className="text-center">
            <div className="font-display font-bold text-podium-amber">∞</div>
            <div className="text-xs text-podium-dim">Updates/sec</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
