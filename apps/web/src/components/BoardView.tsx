'use client'
import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { BoardEntry, RankUpdatePayload, ScoreSubmittedPayload, ViewerCountPayload } from '@podium/shared'
import { useBoardRealtime } from '@/lib/ws'
import { LeaderboardRow, LeaderboardSkeleton } from './LeaderboardRow'
import { LiveFeed } from './LiveFeed'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import { Users, Zap, Send, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface BoardViewProps {
  boardId: string
  boardName: string
  scoringType: string
  type: string
  inviteCode?: string
}

export function BoardView({ boardId, boardName, scoringType, type, inviteCode }: BoardViewProps) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [entries, setEntries] = useState<BoardEntry[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [viewerCount, setViewerCount] = useState(0)
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set())
  const [scoreInput, setScoreInput] = useState('')
  const [liveEvents, setLiveEvents] = useState<ScoreSubmittedPayload[]>([])
  const scoreInputRef = useRef<HTMLInputElement>(null)

  // Initial load
  const { isLoading } = useQuery({
    queryKey: ['board-entries', boardId],
    queryFn: () => api.getBoardEntries(boardId),
    onSuccess: (data) => {
      setEntries(data.entries)
      setTotalEntries(data.totalEntries)
    },
  } as Parameters<typeof useQuery>[0])

  // Real-time rank update
  const handleRankUpdate = useCallback((payload: RankUpdatePayload) => {
    setEntries(payload.entries.map((e) => ({ ...e, isCurrentUser: e.userId === user?.id })))
    setTotalEntries(payload.totalEntries)

    // Flash updated rows
    const updated = new Set(payload.entries.filter((e) => e.rankDelta !== 0).map((e) => e.userId))
    setUpdatedIds(updated)
    setTimeout(() => setUpdatedIds(new Set()), 1200)
  }, [user?.id])

  // Real-time score submitted (for live feed)
  const handleScoreSubmitted = useCallback((payload: ScoreSubmittedPayload) => {
    setLiveEvents((prev) => [payload, ...prev].slice(0, 20))

    if (payload.newRank === 1 && payload.userId !== user?.id) {
      toast(`🏆 ${payload.displayName} just took #1!`, { duration: 4000 })
    }
    if (payload.userId === user?.id) {
      const rankEmoji = payload.rankDelta > 0 ? '↑' : payload.rankDelta < 0 ? '↓' : '—'
      toast.success(`Score submitted! Rank: #${payload.newRank} ${rankEmoji}`)
    }
  }, [user?.id])

  const handleViewerCount = useCallback((payload: ViewerCountPayload) => {
    setViewerCount(payload.count)
  }, [])

  useBoardRealtime(boardId, handleRankUpdate, handleScoreSubmitted, handleViewerCount)

  // Score submission
  const submitMutation = useMutation({
    mutationFn: (value: number) => api.submitScore({ boardId, value }),
    onSuccess: (data) => {
      setScoreInput('')
      toast.success(`Rank #${data.newRank}${data.rankDelta > 0 ? ` ↑${data.rankDelta}` : ''}`)
    },
    onError: () => toast.error('Failed to submit score'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(scoreInput)
    if (isNaN(val)) return toast.error('Enter a valid number')
    submitMutation.mutate(val)
  }

  // Pin current user's entry
  const currentUserEntry = entries.find((e) => e.userId === user?.id)

  return (
    <div className="flex gap-5 h-full">
      {/* ─── Main leaderboard ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="live-dot" />
            <span className="text-podium-sub text-sm">Live</span>
            <span className="text-podium-dim text-sm">·</span>
            <span className="text-podium-sub text-sm">{totalEntries} competitors</span>
            {viewerCount > 0 && (
              <>
                <span className="text-podium-dim text-sm">·</span>
                <span className="flex items-center gap-1 text-podium-dim text-sm viewer-pulse">
                  <Users size={13} />
                  {viewerCount} watching
                </span>
              </>
            )}
          </div>

          {inviteCode && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteCode)
                toast.success('Invite code copied!')
              }}
              className="btn-ghost text-xs gap-1.5"
            >
              <span className="text-podium-sub">Code:</span>
              <span className="font-mono text-podium-indigo-glow">{inviteCode}</span>
            </button>
          )}
        </div>

        {/* Pinned current user */}
        <AnimatePresence>
          {currentUserEntry && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-podium-indigo/10 to-transparent pointer-events-none" />
              <LeaderboardRow
                entry={currentUserEntry}
                index={0}
                isUpdated={updatedIds.has(currentUserEntry.userId)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score submit */}
        {user && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={scoreInputRef}
              type="number"
              step="any"
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              placeholder={scoringType === 'cumulative' ? 'Add points...' : 'Submit score...'}
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={!scoreInput || submitMutation.isPending}
              className="btn-primary gap-2 px-4"
            >
              <Zap size={15} className={submitMutation.isPending ? 'animate-spin' : ''} />
              {submitMutation.isPending ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        )}

        {/* Board entries */}
        {isLoading ? (
          <LeaderboardSkeleton count={8} />
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {entries.map((entry, idx) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  index={idx}
                  isUpdated={updatedIds.has(entry.userId)}
                  scoringType={scoringType}
                />
              ))}
            </AnimatePresence>

            {entries.length === 0 && !isLoading && (
              <div className="text-center py-16 text-podium-dim">
                <div className="text-4xl mb-3">🏆</div>
                <div className="text-sm">No scores yet. Be the first!</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Live feed sidebar ────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 hidden lg:block">
        <LiveFeed events={liveEvents} boardId={boardId} />
      </div>
    </div>
  )
}
