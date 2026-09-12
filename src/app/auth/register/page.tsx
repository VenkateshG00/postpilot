'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2 } from 'lucide-react'
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

export default function RegisterPage() {
  const router = useRouter()
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
      options: {
        data: { full_name: data.full_name }
      }
    })
    if (error) { setServerError(error.message); return }
    router.push('/auth/onboarding')
    router.refresh()
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm card p-10 text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} className="text-emerald-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
          <p className="text-sm text-gray-500">
            We sent a confirmation link to your inbox. Click it to activate your account and continue setup.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <Link href="/" className="text-xl font-semibold tracking-tight mb-10">
        Post<span className="text-brand-600">Pilot</span>
      </Link>

      <div className="w-full max-w-sm card p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h1>
        <p className="text-sm text-gray-500 mb-7">Free for 14 days, no credit card needed</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Your name</label>
            <input
              {...register('full_name')}
              type="text"
              placeholder="Jane Smith"
              className="input-base"
              autoComplete="name"
            />
            {errors.full_name && <p className="error-text">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="label">Work email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@business.com"
              className="input-base"
              autoComplete="email"
            />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="At least 8 characters"
              className="input-base"
              autoComplete="new-password"
            />
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label">Confirm password</label>
            <input
              {...register('confirm')}
              type="password"
              placeholder="••••••••"
              className="input-base"
              autoComplete="new-password"
            />
            {errors.confirm && <p className="error-text">{errors.confirm.message}</p>}
          </div>

          {serverError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Create account
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          By signing up you agree to our{' '}
          <Link href="#" className="underline">Terms</Link> and{' '}
          <Link href="#" className="underline">Privacy Policy</Link>
        </p>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
