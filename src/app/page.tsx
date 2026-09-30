'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowRight, Zap, Clock, BarChart3, Instagram,
  CheckCircle2, Sun, Moon, ChevronDown, Star,
  TrendingUp, Shield, Repeat2, Sparkles, Users
} from 'lucide-react'

/* ── Dark-mode toggle ── */
function useDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      setDark(true)
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])
  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }
  return { dark, toggle }
}

/* ── Pricing data ── */
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

/* ── FAQ data ── */
const FAQS = [
  {
    q: 'Do I need to approve every post?',
    a: 'No — PostPilot generates and publishes automatically on your set schedule. You can optionally enable a review queue to approve before posting.',
  },
  {
    q: 'Which platforms do you support?',
    a: 'Currently Instagram (Feed, Reels, Stories) and Facebook Pages. LinkedIn and Twitter/X are coming in Q4 2026.',
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
    a: 'Absolutely. You set your brand voice, preferred topics, hashtag style, and language (English or Hindi). The AI follows your rules every time.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes — 7-day no-questions-asked refund if you\'re not satisfied after upgrading from the trial.',
  },
]

/* ── Feature cards ── */
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

/* ── Testimonials ── */
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

/* ─────────────────────────────────────────── */
export default function LandingPage() {
  const { dark, toggle } = useDarkMode()
  const [yearly, setYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Nav ── */}
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: scrolled ? 'var(--bg)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          transition: 'all 0.25s ease',
        }}
      >
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
            Post<span style={{ color: 'var(--accent)' }}>Pilot</span>
          </span>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="#pricing" style={{ fontSize: 14, color: 'var(--fg-muted)', textDecoration: 'none' }}>Pricing</Link>
            <Link href="/auth/login" style={{ fontSize: 14, color: 'var(--fg-muted)', textDecoration: 'none' }}>Sign in</Link>
            <Link href="/auth/register" className="btn-primary" style={{ fontSize: 13, padding: '8px 18px', borderRadius: 10 }}>
              Start free trial
            </Link>
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle dark mode"
              style={{
                width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--fg-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ paddingTop: 140, paddingBottom: 100, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 500, color: 'var(--accent)',
            background: 'var(--accent-light)', padding: '6px 14px', borderRadius: 999, marginBottom: 32,
          }}>
            <Zap size={11} />
            AI-powered · Posts while you sleep
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 700,
            letterSpacing: '-0.03em', lineHeight: 1.08, color: 'var(--fg)', marginBottom: 24,
          }}>
            Your business posts itself<br />
            <em style={{ fontStyle: 'italic', color: 'var(--accent)', fontWeight: 700 }}>every single day</em>
          </h1>

          {/* Sub */}
          <p style={{ fontSize: 18, color: 'var(--fg-muted)', lineHeight: 1.65, maxWidth: 520, margin: '0 auto 40px' }}>
            Connect your Instagram, describe your business, and PostPilot generates
            and publishes content on your schedule — no designer, no stress.
          </p>

          {/* CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Link href="/auth/register" className="btn-primary" style={{ padding: '14px 28px', fontSize: 15, borderRadius: 12 }}>
              Start your 7-day free trial
              <ArrowRight size={16} />
            </Link>
            <p style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>No credit card required · Cancel anytime</p>
          </div>
        </div>

        {/* Hero image placeholder — gradient mockup */}
        <div style={{
          maxWidth: 900, margin: '64px auto 0',
          borderRadius: 20, overflow: 'hidden',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            height: 420,
            background: 'linear-gradient(135deg, var(--bg-subtle) 0%, var(--bg-card) 60%, var(--accent-light) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Instagram size={28} color="white" />
            </div>
            <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Dashboard preview — posts published automatically</p>
          </div>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '32px 24px' }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(24px, 6vw, 64px)', flexWrap: 'wrap',
        }}>
          {[
            { value: '500+', label: 'Businesses' },
            { value: '12K+', label: 'Posts / month' },
            { value: '99.9%', label: 'Uptime' },
            { value: '3×', label: 'More consistency' },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)' }}>{value}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-subtle)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: '100px 24px', background: 'var(--bg-subtle)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', textAlign: 'center', marginBottom: 16 }}>
            HOW IT WORKS
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg)', textAlign: 'center', marginBottom: 12 }}>
            Up and running in <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>3 steps</em>
          </h2>
          <p style={{ color: 'var(--fg-muted)', textAlign: 'center', marginBottom: 56, fontSize: 15 }}>Takes about 5 minutes to set up</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {[
              { icon: Instagram, step: '01', title: 'Connect Instagram', desc: 'Link your Instagram Business account via secure OAuth. One click — we never ask for your password.' },
              { icon: Zap,       step: '02', title: 'Describe your business', desc: 'Tell us your industry, brand voice, and content topics. This shapes every post the AI writes for you.' },
              { icon: Clock,     step: '03', title: 'Set your schedule', desc: 'Choose when to post — daily at 9am, twice a week, or a custom time. PostPilot handles the rest.' },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="card" style={{ padding: 28 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}>
                  <Icon size={20} color="var(--accent)" />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 8 }}>{step}</div>
                <h3 style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 8, fontSize: 16 }}>{title}</h3>
                <p style={{ fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', textAlign: 'center', marginBottom: 16 }}>
            FEATURES
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg)', textAlign: 'center', marginBottom: 56 }}>
            Everything your social media needs
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card" style={{ padding: 24 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                }}>
                  <Icon size={18} color="var(--accent)" />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg)', marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ padding: '100px 24px', background: 'var(--bg-subtle)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', textAlign: 'center', marginBottom: 16 }}>
            TESTIMONIALS
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg)', textAlign: 'center', marginBottom: 56 }}>
            Loved by Indian businesses
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {TESTIMONIALS.map(({ name, handle, role, avatar, text, stars }) => (
              <div key={name} className="card" style={{ padding: 28 }}>
                {/* Stars */}
                <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={13} fill="var(--accent)" color="var(--accent)" />
                  ))}
                </div>
                <p style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.65, marginBottom: 20 }}>"{text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ padding: '100px 24px' }} id="pricing">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', textAlign: 'center', marginBottom: 16 }}>
            PRICING
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg)', textAlign: 'center', marginBottom: 12 }}>
            Simple, honest pricing
          </h2>
          <p style={{ color: 'var(--fg-muted)', textAlign: 'center', marginBottom: 36, fontSize: 15 }}>14-day free trial on all plans · Secured by Razorpay</p>

          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 48 }}>
            <span style={{ fontSize: 14, color: yearly ? 'var(--fg-muted)' : 'var(--fg)', fontWeight: yearly ? 400 : 600 }}>Monthly</span>
            <button
              onClick={() => setYearly(!yearly)}
              style={{
                width: 48, height: 26, borderRadius: 999, cursor: 'pointer',
                background: yearly ? 'var(--accent)' : 'var(--border)',
                border: 'none', position: 'relative', transition: 'background 0.2s',
              }}
              aria-label="Toggle yearly pricing"
            >
              <span style={{
                position: 'absolute', top: 3, left: yearly ? 25 : 3,
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s',
              }} />
            </button>
            <span style={{ fontSize: 14, color: yearly ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: yearly ? 600 : 400 }}>
              Yearly
            </span>
            {yearly && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'white',
                background: 'var(--accent)', padding: '3px 8px', borderRadius: 999,
              }}>
                SAVE 17%
              </span>
            )}
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20 }}>
            {PLANS.map(plan => {
              const isHighlight = plan.highlight
              return (
                <div
                  key={plan.name}
                  style={{
                    borderRadius: 20, padding: 28,
                    display: 'flex', flexDirection: 'column',
                    background: isHighlight ? 'var(--fg)' : 'var(--bg-card)',
                    border: isHighlight ? 'none' : '1px solid var(--border)',
                    boxShadow: isHighlight ? '0 20px 60px rgba(0,0,0,0.15)' : undefined,
                    transform: isHighlight ? 'scale(1.02)' : undefined,
                  }}
                >
                  {isHighlight && (
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                      background: 'var(--accent-light)', padding: '4px 10px',
                      borderRadius: 999, alignSelf: 'flex-start', marginBottom: 16,
                    }}>
                      Most popular
                    </div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 500, color: isHighlight ? '#999' : 'var(--fg-muted)', marginBottom: 4 }}>
                    {plan.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', color: isHighlight ? '#ffffff' : 'var(--fg)', lineHeight: 1 }}>
                      {yearly ? plan.yearly : plan.monthly}
                    </span>
                    <span style={{ fontSize: 14, color: isHighlight ? '#777' : 'var(--fg-muted)', marginBottom: 4 }}>
                      {yearly ? '/yr' : '/mo'}
                    </span>
                  </div>
                  {yearly && (
                    <div style={{ fontSize: 12, color: isHighlight ? '#888' : 'var(--fg-subtle)', marginBottom: 4 }}>
                      {plan.yearlyNote} billed annually
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: isHighlight ? '#888' : 'var(--fg-subtle)', marginBottom: 24 }}>
                    {plan.posts}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: isHighlight ? '#e0e0e0' : 'var(--fg)' }}>
                        <CheckCircle2 size={14} color={isHighlight ? '#FF4D4D' : '#10b981'} style={{ flexShrink: 0 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/auth/register"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                      textDecoration: 'none', transition: 'opacity 0.2s',
                      background: isHighlight ? 'var(--accent)' : 'var(--bg-subtle)',
                      color: isHighlight ? 'white' : 'var(--fg)',
                      border: isHighlight ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '100px 24px', background: 'var(--bg-subtle)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', textAlign: 'center', marginBottom: 16 }}>
            FAQ
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg)', textAlign: 'center', marginBottom: 48 }}>
            Questions? Answered.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {FAQS.map(({ q, a }, i) => (
              <div
                key={i}
                className="card"
                style={{ overflow: 'hidden', borderRadius: 14 }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', padding: '18px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    color: 'var(--fg)', fontSize: 15, fontWeight: 500,
                  }}
                >
                  {q}
                  <ChevronDown
                    size={16}
                    color="var(--fg-muted)"
                    style={{
                      flexShrink: 0,
                      transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 18px', fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.65 }}>
                    {a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Band ── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{
          maxWidth: 800, margin: '0 auto', textAlign: 'center',
          padding: '64px 40px', borderRadius: 24,
          background: 'var(--fg)',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 500, color: 'var(--accent)',
            background: 'var(--accent-light)', padding: '5px 12px', borderRadius: 999, marginBottom: 24,
          }}>
            <Users size={11} />
            Join 500+ businesses automating their social media
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', marginBottom: 20, lineHeight: 1.15 }}>
            Start posting consistently,<br />
            <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>starting today</em>
          </h2>
          <p style={{ fontSize: 16, color: '#aaaaaa', marginBottom: 36, lineHeight: 1.6 }}>
            7-day free trial. No credit card. Cancel anytime.
          </p>
          <Link href="/auth/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600,
            background: 'var(--accent)', color: 'white', textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}>
            Get started free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 24px' }}>
        <div style={{
          maxWidth: 1152, margin: '0 auto',
          display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg)' }}>
              Post<span style={{ color: 'var(--accent)' }}>Pilot</span>
            </span>
            <div style={{ display: 'flex', gap: 24 }}>
              {['Privacy', 'Terms', 'Contact'].map(item => (
                <Link key={item} href="#" style={{ fontSize: 13, color: 'var(--fg-subtle)', textDecoration: 'none' }}>{item}</Link>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--fg-subtle)', margin: 0 }}>
              © 2026 PostPilot · Built in India 🇮🇳
            </p>
            <p style={{ fontSize: 13, color: 'var(--fg-subtle)', margin: 0 }}>
              Payments secured by Razorpay
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
