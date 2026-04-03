'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BoardView } from '@/components/BoardView'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { ArrowLeft, Share2, Copy, X, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
const categoryEmoji: Record<string, string> = {
  sales: '💰', gaming: '🎮', fitness: '🏃', music: '🎵', sports: '⚽', custom: '🏆',
}

function ShareModal({ boardId, boardName, onClose }: { boardId: string; boardName: string; onClose: () => void }) {
  const { user } = useAuthStore()
  const cardUrl = user ? `${API_URL}/cards/${boardId}/${user.id}` : null
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="card p-5 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-white">Share your rank</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        {cardUrl && (
          <div className="mb-4 rounded-xl overflow-hidden border border-podium-border bg-podium-surface">
            <img src={cardUrl} alt="Podium Card" className="w-full" />
          </div>
        )}
        {!user && <p className="mb-4 text-podium-sub text-sm text-center">Sign in to generate your Podium Card</p>}
        <div className="space-y-2">
          {cardUrl && (
            <button onClick={() => { navigator.clipboard.writeText(cardUrl); toast.success('Card URL copied!') }}
              className="btn-primary w-full"><Share2 size={15} />Share Podium Card</button>
          )}
          <button onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/boards/${boardId}`)
            toast.success('Board link copied!')
          }} className="btn-secondary w-full"><Copy size={13} />Copy board link</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function BoardPage({ params }: { params: { id: string } }) {
  const { user } = useAuthStore()
  const [showShare, setShowShare] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const { data: board, isLoading, isError } = useQuery({
    queryKey: ['board', params.id],
    queryFn: () => api.getBoard(params.id),
  })

  const { data: trajectory } = useQuery({
    queryKey: ['trajectory', params.id],
    queryFn: () => api.getRankTrajectory(params.id),
    enabled: showStats && !!user,
  })

  if (isError) return notFound()
  if (isLoading) return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {[8, 4, 500].map((h) => <div key={h} className={`skeleton h-${h === 500 ? '[500px]' : h} rounded-xl`} />)}
    </div>
  )
  if (!board) return null

  const trajectory_arr = trajectory as Array<{ rank: number; score: number; recorded_at: string }> | undefined
  const latestRank = trajectory_arr?.at(-1)?.rank
  const firstRank  = trajectory_arr?.[0]?.rank
  const improvement = (firstRank && latestRank) ? firstRank - latestRank : 0

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href="/dashboard" className="btn-ghost text-xs mb-2 -ml-2 inline-flex">
              <ArrowLeft size={13} /> Back
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">{categoryEmoji[board.category] || '🏆'}</span>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-xl text-white truncate">{board.name}</h1>
                {board.description && <p className="text-podium-sub text-sm mt-0.5 truncate">{board.description}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-7">
            {user && (
              <button onClick={() => setShowStats(!showStats)}
                className={clsx('btn-ghost', showStats && 'text-podium-indigo-glow')} title="Your stats">
                <BarChart2 size={15} />
              </button>
            )}
            <button onClick={() => setShowShare(true)} className="btn-secondary gap-2 text-sm">
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showStats && trajectory_arr && trajectory_arr.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="card p-4">
                <h3 className="text-xs text-podium-sub font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BarChart2 size={13} /> Your trajectory
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Current rank', value: `#${latestRank}`, color: 'text-white' },
                    { label: 'Rank change',  value: improvement > 0 ? `↑${improvement}` : improvement < 0 ? `↓${Math.abs(improvement)}` : '—', color: improvement > 0 ? 'text-podium-green' : improvement < 0 ? 'text-podium-red' : 'text-podium-sub' },
                    { label: 'Submissions',  value: trajectory_arr.length, color: 'text-white' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <div className={clsx('font-display font-bold text-lg', color)}>{value}</div>
                      <div className="text-xs text-podium-dim">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <BoardView boardId={board.id} boardName={board.name}
          scoringType={board.scoringType} type={board.type}
          inviteCode={(board as typeof board & { inviteCode?: string }).inviteCode} />
      </div>

      <AnimatePresence>
        {showShare && <ShareModal boardId={board.id} boardName={board.name} onClose={() => setShowShare(false)} />}
      </AnimatePresence>
    </>
  )
}
