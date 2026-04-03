'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import { Trophy, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch {
      setError('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-podium-black">
      {/* Background glow */}
      <div className="absolute inset-0 bg-indigo-glow pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-podium-indigo flex items-center justify-center animate-pulse-glow">
            <Trophy size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-white tracking-tight">Podium</span>
        </div>

        <div className="card p-6">
          <h1 className="font-display font-bold text-lg text-white mb-1">Welcome back</h1>
          <p className="text-podium-sub text-sm mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-podium-dim hover:text-podium-sub"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
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

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? 'Signing in...' : (
                <><span>Sign in</span><ArrowRight size={15} /></>
              )}
            </button>
          </form>

          {/* Demo shortcut */}
          <div className="mt-4 pt-4 border-t border-podium-border">
            <p className="text-podium-dim text-xs text-center mb-3">Try the demo</p>
            <button
              onClick={() => {
                setEmail('alex@demo.com')
                setPassword('password123')
              }}
              className="btn-ghost w-full text-xs"
            >
              Fill demo credentials
            </button>
          </div>
        </div>

        <p className="text-center text-podium-dim text-sm mt-5">
          No account?{' '}
          <Link href="/register" className="text-podium-indigo-glow hover:underline">
            Get started free
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
