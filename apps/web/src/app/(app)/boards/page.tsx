'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BoardCard } from '@/components/BoardCard'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Plus, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function BoardsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [joinCode, setJoinCode] = useState('')

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['my-boards'],
    queryFn: () => api.getMyBoards(),
    enabled: !!user,
  })

  const joinMutation = useMutation({
    mutationFn: (code: string) => api.joinBoard(code),
    onSuccess: () => {
      toast.success('Joined board!')
      queryClient.invalidateQueries({ queryKey: ['my-boards'] })
      setJoinCode('')
    },
    onError: () => toast.error('Invalid invite code'),
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-white">My boards</h1>
          <p className="text-podium-sub text-sm mt-0.5">{boards.length} active leaderboard{boards.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/boards/new" className="btn-primary">
          <Plus size={15} /> New board
        </Link>
      </div>

      {/* Join by code */}
      <div className="card p-4 mb-6 flex gap-3">
        <div className="flex-1">
          <input
            className="input"
            placeholder="Enter invite code (e.g. A3F7B2C1)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
        </div>
        <button
          onClick={() => joinMutation.mutate(joinCode)}
          disabled={joinCode.length < 4 || joinMutation.isPending}
          className="btn-secondary"
        >
          <LinkIcon size={15} />
          {joinMutation.isPending ? 'Joining...' : 'Join'}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton h-36 rounded-xl" />)}
        </div>
      ) : boards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {boards.map((board, i) => (
            <motion.div
              key={board.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <BoardCard board={board} />
            </motion.div>
          ))}
        </div>
      ) : user ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="font-display font-semibold text-podium-text mb-2">No boards yet</h3>
          <p className="text-podium-sub text-sm mb-5">Create a board or join one with an invite code</p>
          <Link href="/boards/new" className="btn-primary">
            <Plus size={15} /> Create your first board
          </Link>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-podium-sub mb-4">Sign in to view your boards</p>
          <Link href="/login" className="btn-primary">Sign in</Link>
        </div>
      )}
    </div>
  )
}
