'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, X, ArrowRight, ArrowLeft, Sparkles, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { INDUSTRIES, BRAND_VOICES, TIMEZONES, LANGUAGES } from '@/lib/utils'
import type { OnboardingFormData } from '@/types'

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

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [topicInput, setTopicInput] = useState('')
  const [hashtagInput, setHashtagInput] = useState('')
  const [serverError, setServerError] = useState('')
  const [suggesting, setSuggesting] = useState(false)

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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>PostPilot</span>
      </div>

      {/* Progress */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0"
                style={{
                  background: i <= step ? 'var(--accent)' : 'var(--bg-card)',
                  color: i <= step ? '#fff' : 'var(--text-muted)',
                  border: i <= step ? 'none' : '1px solid var(--border)',
                  boxShadow: i === step ? '0 0 0 4px rgba(255,77,77,0.15)' : 'none',
                }}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className="text-xs hidden sm:block"
                style={{ color: i === step ? 'var(--accent)' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400 }}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className="h-0.5 flex-1 rounded"
                  style={{ background: i < step ? 'var(--accent)' : 'var(--border)' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-lg">
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >

          {/* Step 0: Business details */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Tell us about your business
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  This shapes everything PostPilot writes for you.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Business name</label>
                <input {...register('business_name')} type="text" placeholder="Sunrise Bakery" style={inputStyle} />
                {errors.business_name && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.business_name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Industry</label>
                <select {...register('industry')} style={{ ...inputStyle, appearance: 'none' }}>
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                {errors.industry && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.industry.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>What does your business do?</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="We're a family-owned bakery specializing in artisan breads and custom cakes..."
                  style={{ ...inputStyle, resize: 'none' }}
                />
                {errors.description && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.description.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Who are your customers?</label>
                <input
                  {...register('target_audience')}
                  type="text"
                  placeholder="Local families, young professionals, coffee lovers"
                  style={inputStyle}
                />
                {errors.target_audience && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.target_audience.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Language</label>
                  <select {...register('language')} style={{ ...inputStyle, appearance: 'none' }}>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Timezone</label>
                  <select {...register('timezone')} style={{ ...inputStyle, appearance: 'none' }}>
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
                <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Choose your brand voice</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>How should PostPilot sound when it writes for you?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BRAND_VOICES.map(v => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setValue('brand_voice', v.value)}
                    className="text-left p-4 rounded-xl transition-all"
                    style={{
                      border: `2px solid ${voice === v.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: voice === v.value ? 'rgba(255,77,77,0.06)' : 'var(--bg)',
                    }}
                  >
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{v.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Content topics + hashtags */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Set up your content</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>What topics should your posts cover?</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Content topics</label>
                  <button
                    type="button"
                    onClick={suggestTopics}
                    disabled={suggesting}
                    className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity disabled:opacity-40"
                    style={{ color: 'var(--accent)' }}
                  >
                    <Sparkles size={11} />
                    {suggesting ? 'Generating…' : 'Suggest with AI'}
                  </button>
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={topicInput}
                    onChange={e => setTopicInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                    placeholder="e.g. Daily specials, Behind the scenes"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={addTopic}
                    className="px-3 py-2 rounded-xl font-bold transition-opacity hover:opacity-80"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topics.map(t => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(255,77,77,0.1)', color: 'var(--accent)' }}
                    >
                      {t}
                      <button type="button" onClick={() => setValue('topics', topics.filter(x => x !== t))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                {errors.topics && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.topics.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Default hashtags <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={e => setHashtagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                    placeholder="e.g. austinfood (no #)"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={addHashtag}
                    className="px-3 py-2 rounded-xl font-bold transition-opacity hover:opacity-80"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map(h => (
                    <span
                      key={h}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    >
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
            <div
              className="rounded-xl px-3 py-2 text-sm mt-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
            >
              {serverError}
            </div>
          )}

          {/* Navigation */}
          <div
            className="flex items-center justify-between mt-8 pt-6"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <ArrowLeft size={14} /> Back
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: 'var(--accent)' }}
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ background: 'var(--accent)' }}
              >
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
