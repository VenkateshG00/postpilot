'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Zap, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})
type FormData = z.infer<typeof schema>

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Subtle radial gradient accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none opacity-[0.07]"
        style={{ background: 'var(--accent)' }}
      />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10 relative z-10">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: 'var(--accent)' }}
        >
          <Zap size={17} className="text-white" fill="currentColor" />
        </div>
        <span className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          PostPilot
        </span>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-[400px] rounded-2xl p-8 relative z-10"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        }}
      >
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Welcome back
        </h1>
        <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>
          Sign in to your PostPilot account
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Email
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                <Mail size={14} />
              </div>
              <input
                {...register('email')}
                type="email"
                placeholder="you@business.com"
                autoComplete="email"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  // @ts-ignore
                  '--tw-ring-color': 'var(--accent)',
                }}
              />
            </div>
            {errors.email && (
              <p className="text-xs mt-1.5 font-medium" style={{ color: '#ef4444' }}>{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
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
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                <Lock size={14} />
              </div>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  // @ts-ignore
                  '--tw-ring-color': 'var(--accent)',
                }}
              />
            </div>
            {errors.password && (
              <p className="text-xs mt-1.5 font-medium" style={{ color: '#ef4444' }}>{errors.password.message}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                color: '#ef4444',
              }}
            >
              {serverError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white mt-2 disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ background: 'var(--accent)' }}
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Sign in
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/register"
            className="font-bold hover:opacity-70 transition-opacity"
            style={{ color: 'var(--accent)' }}
          >
            Sign up free
          </Link>
        </p>
      </div>

      {/* Trust line */}
      <p className="mt-8 text-[11px] text-center relative z-10" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
        Trusted by 500+ businesses across India
      </p>
    </div>
  )
}
