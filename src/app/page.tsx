'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowRight, Zap, Clock, BarChart3, Instagram,
  CheckCircle2, Sun, Moon, ChevronDown, Star,
  TrendingUp, Shield, Repeat2, Sparkles, Users
} from 'lucide-react'

/* ── Dark-mode hook ─────────────────────────────────── */
function useDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark')
  }, [])
  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }
  return { dark, toggle }
}

/* ── Pricing data ───────────────────────────────────── */
const PLANS = [
  {
    name: 'Starter',
    monthly: '₹499',
    yearly: '₹4,990',
    yearlyNote: '₹416/mo',
    posts: '2 posts / day',
    features: [
      '1 Instagram account',
      'AI-generated captions',
      'Basic scheduling',
      'Post history (30 days)',
    ],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    monthly: '₹1,299',
    yearly: '₹12,990',
    yearlyNote: '₹1,083/mo',
    posts: '5 posts / day',
    features: [
      '3 social accounts',
      'Reels & carousels',
      'Custom brand voice',
      'Analytics dashboard',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Agency',
    monthly: '₹4,999',
    yearly: '₹49,990',
    yearlyNote: '₹4,166/mo',
    posts: 'Unlimited posts',
    features: [
      '20 social accounts',
      'Multi-client dashboard',
      'White-label reports',
      'API access',
      'Dedicated manager',
    ],
    cta: 'Contact us',
    highlight: false,
  },
]

/* ── FAQ data ───────────────────────────────────────── */
const FAQS = [
  {
    q: 'Do I need to approve every post?',
    a: 'No — PostPilot generates and publishes automatically on your set schedule. You can optionally enable a review queue to approve before posting.',
  },
  {
    q: 'Which platforms do you support?',
    a: 'Currently Instagram (Feed, Reels, Stories) and Facebook Pages. LinkedIn and Twitter/X are on the roadmap.',
  },
  {
    q: 'What happens after the free trial?',
    a: 'You choose a paid plan. If you don\'t upgrade, posting pauses — your account and content history are never deleted.',
  },
  {
    q: 'Is my Instagram account safe?',
    a: 'Yes. We use the official Meta Graph API with OAuth — we never ask for your Instagram password. You can revoke access anytime from your Instagram settings.',
  },
  {
    q: 'Can I customise the AI-generated content?',
    a: 'Absolutely. You set your brand voice, preferred topics, hashtag style, and language. The AI follows your rules every time.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes — 7-day no-questions-asked refund if you\'re not satisfied after upgrading from the trial.',
  },
]

/* ── Feature cards ──────────────────────────────────── */
const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI that knows your brand',
    desc: 'Describe your business once. PostPilot writes captions, picks hashtags, and selects visuals that match your voice — consistently.',
  },
  {
    icon: Clock,
    title: 'Set-and-forget scheduling',
    desc: 'Pick your posting times. PostPilot publishes at the exact right moment, even at 2 AM on a Sunday.',
  },
  {
    icon: Repeat2,
    title: 'Reels & carousels, automated',
    desc: 'Not just static posts. Generate short Reels scripts and multi-slide carousels with one click.',
  },
  {
    icon: BarChart3,
    title: 'Analytics that matter',
    desc: 'See reach, engagement, and follower growth in a clean dashboard. Know what\'s working, effortlessly.',
  },
  {
    icon: Shield,
    title: 'Official Meta API',
    desc: 'No grey-zone bots. PostPilot uses the approved Meta Graph API — your account stays safe and compliant.',
  },
  {
    icon: TrendingUp,
    title: 'Grow while you work',
    desc: 'Businesses using PostPilot post 3× more consistently. More consistency = more reach = more customers.',
  },
]

/* ── Testimonials ───────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: 'Priya Mehta',
    handle: '@priya_sweets',
    role: 'Owner, Priya\'s Sweet House · Mumbai',
    avatar: 'PM',
    text: 'I used to spend 2 hours every Sunday planning posts. Now PostPilot does it daily. My follower count doubled in 3 months.',
    stars: 5,
  },
  {
    name: 'Rahul Verma',
    handle: '@rv_fitness',
    role: 'Personal Trainer · Delhi',
    avatar: 'RV',
    text: 'The AI actually writes in my tone. Clients ask me "who writes your captions?" — they have no idea it\'s automated.',
    stars: 5,
  },
  {
    name: 'Sneha Iyer',
    handle: '@sneha.designs',
    role: 'Freelance Designer · Bangalore',
    avatar: 'SI',
    text: 'Posting consistently was the hardest part of growing my design business. PostPilot solved it completely.',
    stars: 5,
  },
]

/* ── Section wrapper ────────────────────────────────── */
function Section({ children, className = '', bg = false, id }: {
  children: React.ReactNode; className?: string; bg?: boolean; id?: string
}) {
  return (
    <section
      id={id}
      className={`px-4 sm:px-6 ${className}`}
      style={{ background: bg ? 'var(--bg-card)' : undefined }}
    >
      <div className="max-w-[1080px] mx-auto">{children}</div>
    </section>
  )
}

/* ── Section heading ────────────────────────────────── */
function SectionHeading({ tag, title, sub }: { tag: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center mb-10 sm:mb-14">
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4"
        style={{ color: 'var(--accent)' }}
      >
        {tag}
      </p>
      <h2
        className="text-[clamp(24px,6vw,42px)] font-bold tracking-tight leading-[1.1] mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h2>
      {sub && (
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{sub}</p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { dark, toggle } = useDarkMode()
  const [yearly, setYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Nav ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'var(--bg)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
        }}
      >
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent)' }}
            >
              <Zap size={15} className="text-white" />
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              PostPilot
            </span>
          </Link>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="#pricing"
              className="text-sm font-medium hidden sm:inline hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              Pricing
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-medium hidden sm:inline hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-[13px] sm:text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              Start free trial
            </Link>
            <button
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-muted)',
              }}
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 text-center">
        <div className="max-w-[720px] mx-auto">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8"
            style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}
          >
            <Zap size={11} />
            AI-powered · Posts while you sleep
          </div>

          {/* Headline */}
          <h1
            className="text-[clamp(32px,8vw,64px)] font-bold tracking-tight leading-[1.05] mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            Your business posts itself{' '}
            <em className="not-italic" style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
              every single day
            </em>
          </h1>

          {/* Subtitle */}
          <p
            className="text-base sm:text-lg leading-relaxed max-w-[540px] mx-auto mb-10"
            style={{ color: 'var(--text-muted)' }}
          >
            Connect your Instagram, describe your business, and PostPilot generates
            and publishes content on your schedule — no designer, no stress.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-3.5 rounded-xl text-[15px] w-full sm:w-auto max-w-[360px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              Start your 7-day free trial
              <ArrowRight size={16} />
            </Link>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              No credit card required · Cancel anytime
            </p>
          </div>
        </div>

        {/* Hero visual */}
        <div
          className="max-w-[900px] mx-auto mt-10 sm:mt-16 rounded-2xl overflow-hidden"
          style={{
            border: '1px solid var(--border)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.08)',
          }}
        >
          <div
            className="h-[240px] sm:h-[340px] md:h-[420px] flex flex-col items-center justify-center gap-4"
            style={{
              background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg) 60%, var(--accent-subtle) 100%)',
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--accent)' }}
            >
              <Instagram size={28} color="white" />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Dashboard preview — posts published automatically
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section
        className="py-8 px-4 sm:px-6"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-[900px] mx-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-6 sm:gap-[clamp(28px,6vw,72px)]">
          {[
            { value: '500+', label: 'Businesses' },
            { value: '12K+', label: 'Posts / month' },
            { value: '99.9%', label: 'Uptime' },
            { value: '3×', label: 'More consistency' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div
                className="text-2xl sm:text-[28px] font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {value}
              </div>
              <div className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <Section className="py-16 md:py-24" bg>
        <SectionHeading
          tag="HOW IT WORKS"
          title={<>Up and running in <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>3 steps</em></>}
          sub="Takes about 5 minutes to set up"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Instagram, step: '01', title: 'Connect Instagram', desc: 'Link your Instagram Business account via secure OAuth. One click — we never ask for your password.' },
            { icon: Zap,       step: '02', title: 'Describe your business', desc: 'Tell us your industry, brand voice, and content topics. This shapes every post the AI writes for you.' },
            { icon: Clock,     step: '03', title: 'Set your schedule', desc: 'Choose when to post — daily at 9am, twice a week, or a custom time. PostPilot handles the rest.' },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div
              key={step}
              className="rounded-2xl p-5 sm:p-7"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Icon size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div
                className="text-[11px] font-semibold tracking-wide mb-2"
                style={{ color: 'var(--accent)' }}
              >
                {step}
              </div>
              <h3
                className="font-semibold text-[15px] mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Features grid ── */}
      <Section className="py-16 md:py-24">
        <SectionHeading
          tag="FEATURES"
          title="Everything your social media needs"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Icon size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <h3
                className="font-semibold text-[15px] mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Testimonials ── */}
      <Section className="py-16 md:py-24" bg>
        <SectionHeading
          tag="TESTIMONIALS"
          title="Loved by Indian businesses"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map(({ name, role, avatar, text, stars }) => (
            <div
              key={name}
              className="rounded-2xl p-5 sm:p-7"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} size={13} fill="var(--accent)" color="var(--accent)" />
                ))}
              </div>
              <p
                className="text-[14px] leading-relaxed mb-5"
                style={{ color: 'var(--text-primary)' }}
              >
                &ldquo;{text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                  style={{ background: 'var(--accent)' }}
                >
                  {avatar}
                </div>
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {name}
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Pricing ── */}
      <Section className="py-16 md:py-24" id="pricing">
        <SectionHeading
          tag="PRICING"
          title="Simple, honest pricing"
          sub="14-day free trial on all plans · Secured by Razorpay"
        />

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12 flex-wrap">
          <span
            className="text-sm"
            style={{
              color: yearly ? 'var(--text-muted)' : 'var(--text-primary)',
              fontWeight: yearly ? 400 : 600,
            }}
          >
            Monthly
          </span>
          <button
            onClick={() => setYearly(!yearly)}
            className="relative shrink-0"
            aria-label="Toggle yearly pricing"
            style={{
              width: 48, height: 26, borderRadius: 999,
              background: yearly ? 'var(--accent)' : 'var(--border)',
              border: 'none', cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            <span
              className="absolute top-[3px] rounded-full bg-white"
              style={{
                width: 20, height: 20,
                left: yearly ? 25 : 3,
                transition: 'left 0.2s',
              }}
            />
          </button>
          <span
            className="text-sm"
            style={{
              color: yearly ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: yearly ? 600 : 400,
            }}
          >
            Yearly
          </span>
          {yearly && (
            <span
              className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent)' }}
            >
              SAVE 17%
            </span>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => {
            const hl = plan.highlight
            return (
              <div
                key={plan.name}
                className={`rounded-2xl p-5 sm:p-7 flex flex-col ${hl ? "md:scale-[1.02]" : ""}`}
                style={{
                  background: hl ? 'var(--text-primary)' : 'var(--bg-card)',
                  border: hl ? 'none' : '1px solid var(--border)',
                  boxShadow: hl ? '0 20px 60px rgba(0,0,0,0.15)' : undefined,
                  transform: undefined, // scale handled via className below
                }}
              >
                {hl && (
                  <div
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full self-start mb-4"
                    style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}
                  >
                    Most popular
                  </div>
                )}
                <div
                  className="text-[13px] font-medium mb-1"
                  style={{ color: hl ? '#999' : 'var(--text-muted)' }}
                >
                  {plan.name}
                </div>
                <div className="flex items-end gap-1.5 mb-1">
                  <span
                    className="text-[34px] sm:text-[42px] font-bold tracking-tight leading-none"
                    style={{ color: hl ? '#ffffff' : 'var(--text-primary)' }}
                  >
                    {yearly ? plan.yearly : plan.monthly}
                  </span>
                  <span
                    className="text-sm mb-1"
                    style={{ color: hl ? '#777' : 'var(--text-muted)' }}
                  >
                    {yearly ? '/yr' : '/mo'}
                  </span>
                </div>
                {yearly && (
                  <div className="text-[12px] mb-1" style={{ color: hl ? '#888' : 'var(--text-muted)' }}>
                    {plan.yearlyNote} billed annually
                  </div>
                )}
                <div className="text-[12px] mb-6" style={{ color: hl ? '#888' : 'var(--text-muted)' }}>
                  {plan.posts}
                </div>
                <ul className="space-y-2.5 flex-1 mb-7">
                  {plan.features.map(f => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-[14px]"
                      style={{ color: hl ? '#e0e0e0' : 'var(--text-primary)' }}
                    >
                      <CheckCircle2
                        size={14}
                        color={hl ? '#FF4D4D' : '#10b981'}
                        className="shrink-0"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/register"
                  className="flex items-center justify-center py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background: hl ? 'var(--accent)' : 'var(--bg)',
                    color: hl ? 'white' : 'var(--text-primary)',
                    border: hl ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section className="py-16 md:py-24" bg>
        <div className="max-w-[680px] mx-auto">
          <SectionHeading tag="FAQ" title="Questions? Answered." />
          <div className="space-y-2">
            {FAQS.map(({ q, a }, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  {q}
                  <ChevronDown
                    size={16}
                    className="shrink-0 transition-transform duration-200"
                    style={{
                      color: 'var(--text-muted)',
                      transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>
                {openFaq === i && (
                  <div
                    className="px-5 pb-4 text-[14px] leading-relaxed"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA Band ── */}
      <Section className="py-16 md:py-24">
        <div
          className="rounded-3xl px-5 py-12 sm:px-8 md:px-16 sm:py-16 text-center"
          style={{ background: 'var(--text-primary)' }}
        >
          <div
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full mb-6 max-w-full text-center"
            style={{ color: 'var(--accent)', background: 'rgba(255,77,77,0.15)' }}
          >
            <Users size={11} />
            Join 500+ businesses automating their social media
          </div>
          <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-tight leading-[1.1] mb-5 text-white">
            Start posting consistently,<br className="hidden sm:block" />
            <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>starting today</em>
          </h2>
          <p className="text-[16px] leading-relaxed mb-9" style={{ color: '#aaaaaa' }}>
            7-day free trial. No credit card. Cancel anytime.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-3.5 rounded-xl text-[15px] w-full sm:w-auto max-w-[360px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            Get started free
            <ArrowRight size={16} />
          </Link>
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer className="px-4 sm:px-6 py-10" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-[1080px] mx-auto space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <Zap size={12} className="text-white" />
              </div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                PostPilot
              </span>
            </Link>
            <div className="flex gap-6">
              {['Privacy', 'Terms', 'Contact'].map(item => (
                <Link
                  key={item}
                  href="#"
                  className="text-[13px] hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              &copy; 2026 PostPilot &middot; Built in India
            </p>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Payments secured by Razorpay
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
