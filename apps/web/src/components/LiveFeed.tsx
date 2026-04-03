'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { ScoreSubmittedPayload } from '@podium/shared'
import { TrendingUp, TrendingDown, Award } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

interface LiveFeedProps {
  events: ScoreSubmittedPayload[]
  boardId: string
}

function EventIcon({ rankDelta, newRank }: { rankDelta: number; newRank: number }) {
  if (newRank === 1) return <Award size={13} className="text-podium-amber" />
  if (rankDelta > 0) return <TrendingUp size={13} className="text-podium-green" />
  if (rankDelta < 0) return <TrendingDown size={13} className="text-podium-red" />
  return <span className="text-podium-dim text-xs">—</span>
}

export function LiveFeed({ events }: LiveFeedProps) {
  return (
    <div className="card h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-podium-border flex-shrink-0">
        <span className="text-sm font-medium text-podium-text">Live activity</span>
        <span className="live-dot" />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {events.length === 0 && (
            <div className="text-center py-8 text-podium-dim text-xs">
              Waiting for activity...
            </div>
          )}

          {events.map((event, i) => (
            <motion.div
              key={`${event.userId}-${event.score}-${i}`}
              layout
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 400, damping: 30 }}
              className={clsx(
                'flex items-start gap-2.5 p-2.5 rounded-lg border text-xs',
                event.newRank === 1
                  ? 'bg-amber-500/8 border-amber-500/20'
                  : 'bg-podium-surface border-podium-border'
              )}
            >
              <div className="mt-0.5">
                <EventIcon rankDelta={event.rankDelta} newRank={event.newRank} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-podium-text truncate">{event.displayName}</div>
                <div className="text-podium-dim mt-0.5">
                  {event.rankDelta > 0
                    ? `↑${event.rankDelta} to #${event.newRank}`
                    : event.rankDelta < 0
                    ? `↓${Math.abs(event.rankDelta)} to #${event.newRank}`
                    : `Submitted at #${event.newRank}`}
                </div>
              </div>
              <div className="font-mono text-podium-dim text-[10px] flex-shrink-0">
                {event.score >= 1000 ? `${(event.score / 1000).toFixed(1)}K` : event.score}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
