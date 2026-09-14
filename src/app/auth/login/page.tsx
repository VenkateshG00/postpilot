import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}


// 'use client'

// import { useState } from 'react'
// import Link from 'next/link'
// import { useRouter, useSearchParams } from 'next/navigation'
// import { useForm } from 'react-hook-form'
// import { zodResolver } from '@hookform/resolvers/zod'
// import { z } from 'zod'
// import { Loader2 } from 'lucide-react'
// import { createClient } from '@/lib/supabase/client'

// const schema = z.object({
//   email: z.string().email('Enter a valid email'),
//   password: z.string().min(6, 'Password must be at least 6 characters')
// })
// type FormData = z.infer<typeof schema>

// export default function LoginPage() {
//   const router = useRouter()
//   const searchParams = useSearchParams()
//   const nextPath = searchParams.get('next') || '/dashboard'
//   const [serverError, setServerError] = useState('')

//   const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
//     resolver: zodResolver(schema)
//   })

//   async function onSubmit(data: FormData) {
//     setServerError('')
//     const supabase = createClient()
//     const { data: authData, error } = await supabase.auth.signInWithPassword({
//       email: data.email,
//       password: data.password
//     })

//     if (error) { setServerError(error.message); return }

//     if (authData.user) {
//       // Check if business profile exists
//       const { data: biz } = await supabase
//         .from('business_profiles')
//         .select('id')
//         .eq('user_id', authData.user.id)
//         .single()

//       if (biz) {
//         // Existing user with profile → dashboard
//         router.push('/dashboard')
//       } else {
//         // New user, no profile → onboarding
//         router.push('/auth/onboarding')
//       }
//       router.refresh()
//     }
//   }
//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
//       <Link href="/" className="text-xl font-semibold tracking-tight mb-10">
//         Post<span className="text-brand-600">Pilot</span>
//       </Link>

//       <div className="w-full max-w-sm card p-8">
//         <h1 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h1>
//         <p className="text-sm text-gray-500 mb-7">Sign in to your account</p>

//         <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//           <div>
//             <label className="label">Email</label>
//             <input
//               {...register('email')}
//               type="email"
//               placeholder="you@business.com"
//               className="input-base"
//               autoComplete="email"
//             />
//             {errors.email && <p className="error-text">{errors.email.message}</p>}
//           </div>

//           <div>
//             <div className="flex items-center justify-between mb-1.5">
//               <label className="label mb-0">Password</label>
//               <Link href="/auth/forgot-password" className="text-xs text-brand-600 hover:underline">
//                 Forgot password?
//               </Link>
//             </div>
//             <input
//               {...register('password')}
//               type="password"
//               placeholder="••••••••"
//               className="input-base"
//               autoComplete="current-password"
//             />
//             {errors.password && <p className="error-text">{errors.password.message}</p>}
//           </div>

//           {serverError && (
//             <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
//               {serverError}
//             </p>
//           )}

//           <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
//             {isSubmitting && <Loader2 size={14} className="animate-spin" />}
//             Sign in
//           </button>
//         </form>

//         <p className="text-center text-sm text-gray-500 mt-6">
//           Don't have an account?{' '}
//           <Link href="/auth/register" className="text-brand-600 font-medium hover:underline">
//             Sign up free
//           </Link>
//         </p>
//       </div>
//     </div>
//   )
// }
