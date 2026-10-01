'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  full_name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string()
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm']
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

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } }
    })
    if (error) { setServerError(error.message); return }
    /* If referred, record the referral */
    if (refCode) {
      const { data: { user: newUser } } = await supabase.auth.getUser()
      if (newUser) {
        await supabase.from('referrals').insert({
          referrer_id: refCode,
          referred_email: data.email,
          referred_user_id: newUser.id,
          status: 'signed_up',
        })
      }
    }
    router.push('/auth/onboarding')
    router.refresh()
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div
          className="w-full max-w-sm rounded-2xl p-6 sm:p-10 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(34,197,94,0.1)' }}
          >
            <CheckCircle2 size={24} color="#22c55e" />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Check your email</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            We sent a confirmation link to your inbox. Click it to activate your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--bg)' }}>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>PostPilot</span>
      </Link>

      <div
        className="w-full max-w-sm rounded-2xl p-6 sm:p-8"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Create your account</h1>
        <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>Free to get started, no credit card needed</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: 'full_name', label: 'Your name', type: 'text', placeholder: 'Jane Smith', autoComplete: 'name' },
            { name: 'email', label: 'Work email', type: 'email', placeholder: 'you@business.com', autoComplete: 'email' },
            { name: 'password', label: 'Password', type: 'password', placeholder: 'At least 8 characters', autoComplete: 'new-password' },
            { name: 'confirm', label: 'Confirm password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
          ].map(field => (
            <div key={field.name}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                {field.label}
              </label>
              <input
                {...register(field.name as any)}
                type={field.type}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                style={inputStyle}
              />
              {errors[field.name as keyof typeof errors] && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                  {errors[field.name as keyof typeof errors]?.message as string}
                </p>
              )}
            </div>
          ))}

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
            Create account
          </button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          By signing up you agree to our{' '}
          <Link href="#" className="underline">Terms</Link> and{' '}
          <Link href="#" className="underline">Privacy Policy</Link>
        </p>

        <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}


export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
