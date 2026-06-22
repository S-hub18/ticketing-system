'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (res?.error) {
        setError('Invalid email or password')
        setPassword('')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#292524] rounded-xl mb-4">
            <span className="text-white font-bold text-lg">NT</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#0c0a09]">NudgeTicket</h1>
          <p className="text-[#777169] text-sm mt-1">Internal Support Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#e7e5e4] p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0c0a09] mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#292524] mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="you@company.com"
                className="w-full px-3 py-2 border border-[#e7e5e4] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#292524] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#292524] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 border border-[#e7e5e4] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#292524] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777169] hover:text-[#292524] text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 bg-[#292524] text-white rounded-full font-medium text-sm hover:bg-[#0c0a09] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-[#777169] mt-4">
            Don&apos;t have an account? Contact your admin.
          </p>
        </div>
      </div>
    </div>
  )
}
