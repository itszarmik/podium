'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BoardEntry } from '@podium/shared'
import { TrendingUp, TrendingDown, Minus, Shield } from 'lucide-react'
import clsx from 'clsx'

interface LeaderboardRowProps {
  entry: BoardEntry
  index: number
  isUpdated?: boolean
  scoringType?: string
}

function formatScore(score: number): string {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`
  if (score >= 1_000) return `${(score / 1_000).toFixed(1)}K`
  if (score % 1 !== 0) return score.toFixed(2)
  return score.toLocaleString()
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <span className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-sm font-bold font-display">
      1
    </span>
  )
  if (rank === 2) return (
    <span className="w-8 h-8 rounded-lg bg-zinc-400/10 border border-zinc-400/20 flex items-center justify-center text-zinc-400 text-sm font-bold font-display">
      2
    </span>
  )
  if (rank === 3) return (
    <span className="w-8 h-8 rounded-lg bg-orange-700/20 border border-orange-700/30 flex items-center justify-center text-orange-600 text-sm font-bold font-display">
      3
    </span>
  )
  return (
    <span className="w-8 h-8 flex items-center justify-center text-podium-dim text-sm font-mono">
      {rank}
    </span>
  )
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) return (
    <span className="flex items-center gap-0.5 text-xs text-podium-green font-medium">
      <TrendingUp size={12} />
      {delta}
    </span>
  )
  if (delta < 0) return (
    <span className="flex items-center gap-0.5 text-xs text-podium-red font-medium">
      <TrendingDown size={12} />
      {Math.abs(delta)}
    </span>
  )
  return <Minus size={12} className="text-podium-dim" />
}

export function LeaderboardRow({ entry, index, isUpdated, scoringType }: LeaderboardRowProps) {
  const [scoreFlash, setScoreFlash] = useState(false)
  const prevScoreRef = useRef(entry.score)

  useEffect(() => {
    if (entry.score !== prevScoreRef.current) {
      setScoreFlash(true)
      const t = setTimeout(() => setScoreFlash(false), 600)
      prevScoreRef.current = entry.score
      return () => clearTimeout(t)
    }
  }, [entry.score])

  const initials = entry.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <motion.div
      layout
      layoutId={`row-${entry.userId}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03, type: 'spring', stiffness: 400, damping: 30 }}
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors duration-300',
        entry.isCurrentUser
          ? 'bg-podium-indigo/8 border-podium-indigo/30'
          : 'bg-podium-card border-podium-border hover:border-podium-dim',
        isUpdated && 'rank-row-updated'
      )}
    >
      {/* Rank */}
      <RankBadge rank={entry.rank} />

      {/* Delta */}
      <div className="w-8 flex justify-center">
        <DeltaIndicator delta={entry.rankDelta} />
      </div>

      {/* Avatar */}
      <div className={clsx(
        'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
        entry.rank === 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-podium-muted text-podium-sub'
      )}>
        {entry.avatarUrl ? (
          <img src={entry.avatarUrl} alt={entry.displayName} className="w-full h-full rounded-full object-cover" />
        ) : initials}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={clsx(
            'text-sm font-medium truncate',
            entry.isCurrentUser ? 'text-podium-indigo-glow' : 'text-podium-text'
          )}>
            {entry.displayName}
          </span>
          {entry.isCurrentUser && (
            <span className="badge bg-podium-indigo/20 text-podium-indigo-glow border border-podium-indigo/30 text-[10px]">
              you
            </span>
          )}
          {entry.verificationStatus === 'verified' && (
            <Shield size={11} className="text-podium-indigo/60 flex-shrink-0" />
          )}
        </div>
        <div className="text-xs text-podium-dim">@{entry.username}</div>
      </div>

      {/* Score */}
      <div className="text-right flex-shrink-0">
        <div className={clsx(
          'text-sm font-bold font-mono tabular-nums transition-colors',
          scoreFlash && 'score-updated text-podium-amber'
        )}>
          {formatScore(entry.score)}
        </div>
        {entry.scoreDelta !== undefined && entry.scoreDelta > 0 && (
          <div className="text-xs text-podium-green">+{formatScore(entry.scoreDelta)}</div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────
export function LeaderboardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-podium-card border border-podium-border">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="skeleton w-8 h-4 rounded" />
          <div className="skeleton w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton h-5 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}
