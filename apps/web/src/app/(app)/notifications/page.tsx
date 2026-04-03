'use client'
import { motion } from 'framer-motion'
import { Bell, TrendingUp, Trophy, Award } from 'lucide-react'

const MOCK_NOTIFICATIONS = [
  { id: '1', type: 'reached_number_one', title: '🏆 You reached #1!', body: 'You are now leading Q1 Sales Champions.', time: '2m ago', read: false },
  { id: '2', type: 'rank_up', title: '↑ You moved up 3 places', body: 'You are now #4 on FPS Weekly Kills.', time: '1h ago', read: false },
  { id: '3', type: 'board_joined', title: 'New member joined', body: 'Sarah Chen joined your Morning Run Club board.', time: '3h ago', read: true },
  { id: '4', type: 'score_submitted', title: 'New score on your board', body: 'Mike Rodriguez submitted 124,000 on Q1 Sales Champions.', time: '5h ago', read: true },
]

const iconMap: Record<string, React.ReactNode> = {
  reached_number_one: <Trophy size={15} className="text-podium-amber" />,
  rank_up:            <TrendingUp size={15} className="text-podium-green" />,
  board_joined:       <Award size={15} className="text-podium-teal" />,
  score_submitted:    <Bell size={15} className="text-podium-indigo-glow" />,
}

export default function NotificationsPage() {
  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read).length

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Bell size={20} /> Notifications
            {unread > 0 && (
              <span className="text-xs bg-podium-indigo text-white px-2 py-0.5 rounded-full">{unread}</span>
            )}
          </h1>
          <p className="text-podium-sub text-sm mt-0.5">Rank changes and activity</p>
        </div>
        <button className="btn-ghost text-xs">Mark all read</button>
      </div>

      <div className="space-y-2">
        {MOCK_NOTIFICATIONS.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
              !n.read
                ? 'bg-podium-indigo/5 border-podium-indigo/20'
                : 'bg-podium-card border-podium-border'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-podium-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              {iconMap[n.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-podium-text">{n.title}</p>
              <p className="text-xs text-podium-dim mt-0.5">{n.body}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-podium-dim">{n.time}</span>
              {!n.read && <span className="w-2 h-2 rounded-full bg-podium-indigo" />}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
