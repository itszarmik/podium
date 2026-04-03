'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import { Trophy, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useAuthStore()
  const [form, setForm] = useState({ username: '', displayName: '', email: '', password: '' })
  const [error, setError] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    try {
      await register(form.username, form.displayName, form.email, form.password)
      router.push('/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-podium-black">
      <div className="absolute inset-0 bg-indigo-glow pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-podium-indigo flex items-center justify-center animate-pulse-glow">
            <Trophy size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-white tracking-tight">Podium</span>
        </div>

        <div className="card p-6">
          <h1 className="font-display font-bold text-lg text-white mb-1">Join the competition</h1>
          <p className="text-podium-sub text-sm mb-6">Create your free account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Username</label>
                <input
                  className="input"
                  placeholder="alex99"
                  value={form.username}
                  onChange={set('username')}
                  pattern="[a-zA-Z0-9_]+"
                  minLength={3}
                  maxLength={32}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Display name</label>
                <input
                  className="input"
                  placeholder="Alex Smith"
                  value={form.displayName}
                  onChange={set('displayName')}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={set('password')}
                minLength={8}
                required
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-podium-red text-sm"
              >
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
              {isLoading ? 'Creating account...' : (
                <><span>Create account</span><ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-podium-dim text-xs text-center mt-4">
            Free forever. No credit card needed.
          </p>
        </div>

        <p className="text-center text-podium-dim text-sm mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-podium-indigo-glow hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
