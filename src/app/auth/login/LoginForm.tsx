'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})
type FormData = z.infer<typeof schema>

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 12,
  fontSize: 14,
  outline: 'none',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    const supabase = createClient()
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    })

    if (error) { setServerError(error.message); return }

    if (authData.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, is_suspended')
        .eq('id', authData.user.id)
        .single()

      if (profile?.is_suspended) {
        await supabase.auth.signOut()
        setServerError('This account has been suspended. Please contact support.')
        return
      }

      if (profile?.is_admin) {
        router.push('/admin/dashboard')
      } else {
        const { data: biz } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('user_id', authData.user.id)
          .single()
        router.push(biz ? '/dashboard' : '/auth/onboarding')
      }
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent)' }}
        >
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>PostPilot</span>
      </Link>

      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
        <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@business.com"
              style={inputStyle}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Password</label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: 'var(--accent)' }}
              >
                Forgot password?
              </Link>
            </div>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              style={inputStyle}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div
              className="rounded-xl px-3 py-2 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
            >
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white mt-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: 'var(--accent)' }}
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Sign in
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link
            href="/auth/register"
            className="font-semibold hover:opacity-70 transition-opacity"
            style={{ color: 'var(--accent)' }}
          >
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  )
}
