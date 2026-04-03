'use client'
import Link from 'next/link'
import { Board } from '@podium/shared'
import { Users, TrendingUp, Globe, Lock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const categoryColors: Record<string, string> = {
  sales:   'bg-green-500/15 text-green-400 border-green-500/25',
  gaming:  'bg-purple-500/15 text-purple-400 border-purple-500/25',
  fitness: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  music:   'bg-pink-500/15 text-pink-400 border-pink-500/25',
  sports:  'bg-blue-500/15 text-blue-400 border-blue-500/25',
  custom:  'bg-podium-muted text-podium-sub border-podium-border',
}

const categoryEmoji: Record<string, string> = {
  sales: '💰', gaming: '🎮', fitness: '🏃', music: '🎵', sports: '⚽', custom: '🏆',
}

interface BoardCardProps {
  board: Board & { role?: string; inviteCode?: string }
  href?: string
}

export function BoardCard({ board, href }: BoardCardProps) {
  const link = href || `/boards/${board.id}`

  return (
    <Link href={link} className="card-hover block p-4 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={clsx('badge border', categoryColors[board.category] || categoryColors.custom)}>
            {categoryEmoji[board.category]} {board.category}
          </span>
          {board.isLive && (
            <span className="flex items-center gap-1 text-[10px] text-podium-green font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-podium-green animate-pulse" />
              live
            </span>
          )}
        </div>
        <div className="text-podium-dim">
          {board.type === 'public' ? <Globe size={14} /> : <Lock size={14} />}
        </div>
      </div>

      <div className="mb-3">
        <h3 className="font-display font-semibold text-podium-text group-hover:text-white transition-colors line-clamp-1">
          {board.name}
        </h3>
        {board.description && (
          <p className="text-xs text-podium-sub mt-0.5 line-clamp-2">{board.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-podium-dim">
        <span className="flex items-center gap-1">
          <Users size={12} />
          {board.memberCount} members
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp size={12} />
          {board.scoringType}
        </span>
      </div>

      {board.role && (
        <div className="mt-2 pt-2 border-t border-podium-border">
          <span className="text-[10px] text-podium-dim uppercase tracking-wider">{board.role}</span>
        </div>
      )}
    </Link>
  )
}
