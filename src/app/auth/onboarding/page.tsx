'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, X, ArrowRight, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { INDUSTRIES, BRAND_VOICES, TIMEZONES, LANGUAGES } from '@/lib/utils'
import type { OnboardingFormData } from '@/types'
import { cn } from '@/lib/utils'

const schema = z.object({
  business_name: z.string().min(2, 'Enter your business name'),
  industry: z.string().min(1, 'Select your industry'),
  description: z.string().min(20, 'Describe your business in at least 20 characters'),
  target_audience: z.string().min(5, 'Describe your target audience'),
  brand_voice: z.enum(['professional', 'casual', 'witty', 'inspirational']),
  topics: z.array(z.string()).min(1, 'Add at least one content topic'),
  hashtags: z.array(z.string()),
  language: z.string(),
  timezone: z.string()
})

const STEPS = ['Business details', 'Brand voice', 'Content setup']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [topicInput, setTopicInput] = useState('')
  const [hashtagInput, setHashtagInput] = useState('')
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, watch, setValue, getValues, trigger,
    formState: { errors, isSubmitting } } = useForm<OnboardingFormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        brand_voice: 'professional',
        topics: [],
        hashtags: [],
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      }
    })

  const topics = watch('topics')
  const hashtags = watch('hashtags')
  const voice = watch('brand_voice')

  function addTopic() {
    const t = topicInput.trim()
    if (t && !topics.includes(t)) { setValue('topics', [...topics, t]); setTopicInput('') }
  }

  const [suggesting, setSuggesting] = useState(false)
  async function suggestTopics() {
    const v = getValues()
    if (!v.business_name || !v.industry) { setServerError('Add your business name & industry first (step 1).'); return }
    setServerError('')
    setSuggesting(true)
    try {
      const res = await fetch('/api/pillars/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: v.business_name, industry: v.industry,
          description: v.description, target_audience: v.target_audience, brand_voice: v.brand_voice,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (Array.isArray(data.topics) && data.topics.length) {
        const merged = Array.from(new Set([...(getValues('topics') || []), ...data.topics]))
        setValue('topics', merged, { shouldValidate: true })
      }
    } catch (e: any) { setServerError(e.message) } finally { setSuggesting(false) }
  }

  function addHashtag() {
    const h = hashtagInput.trim().replace(/^#/, '')
    if (h && !hashtags.includes(h)) { setValue('hashtags', [...hashtags, h]); setHashtagInput('') }
  }

  async function nextStep() {
    const fields: Record<number, (keyof OnboardingFormData)[]> = {
      0: ['business_name', 'industry', 'description', 'target_audience'],
      1: ['brand_voice'],
      2: ['topics']
    }
    const valid = await trigger(fields[step])
    if (valid) setStep(s => s + 1)
  }

  async function onSubmit(data: OnboardingFormData) {
    setServerError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error } = await supabase.from('business_profiles').upsert({
      user_id: user.id,
      business_name: data.business_name,
      industry: data.industry,
      description: data.description,
      target_audience: data.target_audience,
      brand_voice: data.brand_voice,
      topics: data.topics,
      hashtags: data.hashtags,
      language: data.language,
      timezone: data.timezone
    }, { onConflict: 'user_id' })

    if (error) { setServerError(error.message); return }
    router.push('/dashboard?onboarded=1')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-xl font-semibold tracking-tight mb-10">
        Post<span className="text-brand-600">Pilot</span>
      </div>

      {/* Progress */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center gap-2 mb-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                i < step ? 'bg-brand-600 text-white' :
                  i === step ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
                    'bg-gray-200 text-gray-500'
              )}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={cn('text-xs hidden sm:block', i === step ? 'text-brand-600 font-medium' : 'text-gray-400')}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className={cn('h-0.5 flex-1 rounded', i < step ? 'bg-brand-400' : 'bg-gray-200')} />}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-lg">
        <div className="card p-8">

          {/* Step 0: Business details */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Tell us about your business</h2>
                <p className="text-sm text-gray-500">This shapes everything PostPilot writes for you.</p>
              </div>

              <div>
                <label className="label">Business name</label>
                <input {...register('business_name')} type="text" placeholder="Sunrise Bakery" className="input-base" />
                {errors.business_name && <p className="error-text">{errors.business_name.message}</p>}
              </div>

              <div>
                <label className="label">Industry</label>
                <select {...register('industry')} className="input-base">
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                {errors.industry && <p className="error-text">{errors.industry.message}</p>}
              </div>

              <div>
                <label className="label">What does your business do?</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="We're a family-owned bakery specializing in artisan breads and custom cakes, serving downtown Austin since 2018."
                  className="input-base resize-none"
                />
                {errors.description && <p className="error-text">{errors.description.message}</p>}
              </div>

              <div>
                <label className="label">Who are your customers?</label>
                <input
                  {...register('target_audience')}
                  type="text"
                  placeholder="Local families, young professionals, coffee lovers"
                  className="input-base"
                />
                {errors.target_audience && <p className="error-text">{errors.target_audience.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Language</label>
                  <select {...register('language')} className="input-base">
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select {...register('timezone')} className="input-base">
                    {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Brand voice */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Choose your brand voice</h2>
                <p className="text-sm text-gray-500">How should PostPilot sound when it writes for you?</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {BRAND_VOICES.map(v => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setValue('brand_voice', v.value)}
                    className={cn(
                      'text-left p-4 rounded-xl border-2 transition-all',
                      voice === v.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="font-medium text-sm text-gray-900">{v.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Content topics + hashtags */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Set up your content</h2>
                <p className="text-sm text-gray-500">What topics should your posts cover?</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Content topics</label>
                  <button type="button" onClick={suggestTopics} disabled={suggesting}
                    className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50">
                    {suggesting ? 'Generating…' : '✨ Suggest topics for me'}
                  </button>
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={topicInput}
                    onChange={e => setTopicInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                    placeholder="e.g. Daily specials, Behind the scenes"
                    className="input-base flex-1"
                  />
                  <button type="button" onClick={addTopic} className="btn-secondary px-3">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topics.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs px-2.5 py-1 rounded-lg">
                      {t}
                      <button type="button" onClick={() => setValue('topics', topics.filter(x => x !== t))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                {errors.topics && <p className="error-text">{errors.topics.message}</p>}
              </div>

              <div>
                <label className="label">Default hashtags <span className="text-gray-400 font-normal">(optional)</span></label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={e => setHashtagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                    placeholder="e.g. austinfood (no #)"
                    className="input-base flex-1"
                  />
                  <button type="button" onClick={addHashtag} className="btn-secondary px-3">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map(h => (
                    <span key={h} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-lg">
                      #{h}
                      <button type="button" onClick={() => setValue('hashtags', hashtags.filter(x => x !== h))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {serverError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
              {serverError}
            </p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary">
                <ArrowLeft size={14} /> Back
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button type="button" onClick={nextStep} className="btn-primary">
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Set up my account <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
