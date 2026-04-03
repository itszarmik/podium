'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { CreateBoardRequest, BoardCategory, ScoringType, BoardType } from '@podium/shared'
import toast from 'react-hot-toast'
import { ArrowLeft, Trophy } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const categories: { value: BoardCategory; label: string; emoji: string }[] = [
  { value: 'sales',   label: 'Sales',   emoji: '💰' },
  { value: 'gaming',  label: 'Gaming',  emoji: '🎮' },
  { value: 'fitness', label: 'Fitness', emoji: '🏃' },
  { value: 'music',   label: 'Music',   emoji: '🎵' },
  { value: 'sports',  label: 'Sports',  emoji: '⚽' },
  { value: 'custom',  label: 'Custom',  emoji: '🏆' },
]

const scoringTypes: { value: ScoringType; label: string; description: string }[] = [
  { value: 'highest',      label: 'Highest score',  description: 'Best single score wins' },
  { value: 'lowest',       label: 'Lowest score',   description: 'Lowest score wins (e.g. golf)' },
  { value: 'cumulative',   label: 'Cumulative',     description: 'All scores added together' },
  { value: 'streak',       label: 'Streak',         description: 'Longest streak wins' },
]

export default function NewBoardPage() {
  const router = useRouter()
  const [form, setForm] = useState<Partial<CreateBoardRequest>>({
    type: 'private',
    category: 'custom',
    scoringType: 'highest',
    timePeriod: 'all_time',
  })

  const mutation = useMutation({
    mutationFn: (data: CreateBoardRequest) => api.createBoard(data),
    onSuccess: (board) => {
      toast.success('Board created!')
      router.push(`/boards/${board.id}`)
    },
    onError: () => toast.error('Failed to create board'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) return toast.error('Board name is required')
    mutation.mutate(form as CreateBoardRequest)
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="btn-ghost text-xs mb-2 -ml-2 inline-flex">
          <ArrowLeft size={13} /> Back
        </Link>
        <h1 className="font-display font-bold text-xl text-white">Create a board</h1>
        <p className="text-podium-sub text-sm mt-1">Live leaderboard, up in seconds</p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5 space-y-5"
      >
        {/* Name */}
        <div>
          <label className="label">Board name *</label>
          <input
            className="input"
            placeholder="e.g. Q2 Sales Champions"
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none h-20"
            placeholder="What are you competing on?"
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Type */}
        <div>
          <label className="label">Visibility</label>
          <div className="flex gap-2">
            {(['private', 'public'] as BoardType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  form.type === t
                    ? 'bg-podium-indigo/15 border-podium-indigo/40 text-podium-indigo-glow'
                    : 'bg-podium-surface border-podium-border text-podium-sub hover:border-podium-dim'
                }`}
              >
                {t === 'private' ? '🔒 Private' : '🌐 Public'}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="label">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm({ ...form, category: cat.value })}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  form.category === cat.value
                    ? 'bg-podium-indigo/15 border-podium-indigo/40 text-podium-indigo-glow'
                    : 'bg-podium-surface border-podium-border text-podium-sub hover:border-podium-dim'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scoring */}
        <div>
          <label className="label">Scoring type</label>
          <div className="space-y-2">
            {scoringTypes.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm({ ...form, scoringType: s.value })}
                className={`w-full flex items-start gap-3 p-3 rounded-lg text-left border transition-all ${
                  form.scoringType === s.value
                    ? 'bg-podium-indigo/15 border-podium-indigo/40'
                    : 'bg-podium-surface border-podium-border hover:border-podium-dim'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border mt-0.5 flex-shrink-0 flex items-center justify-center ${
                  form.scoringType === s.value ? 'border-podium-indigo bg-podium-indigo' : 'border-podium-dim'
                }`}>
                  {form.scoringType === s.value && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className={`text-sm font-medium ${form.scoringType === s.value ? 'text-podium-indigo-glow' : 'text-podium-text'}`}>
                    {s.label}
                  </div>
                  <div className="text-xs text-podium-dim">{s.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary w-full"
        >
          <Trophy size={16} />
          {mutation.isPending ? 'Creating...' : 'Create live board'}
        </button>
      </motion.form>
    </div>
  )
}
