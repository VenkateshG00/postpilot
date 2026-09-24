import Link from 'next/link'
import { ArrowRight, Zap, Clock, BarChart3, Instagram, CheckCircle2 } from 'lucide-react'

const PLANS = [
  {
    name: 'Starter',
    price: '₹499',
    period: '/mo',
    posts: '2 posts/day',
    features: ['1 Instagram account', 'AI-generated captions', 'Basic scheduling', 'Post history'],
    cta: 'Start free trial',
    highlight: false
  },
  {
    name: 'Pro',
    price: '₹1,299',
    period: '/mo',
    posts: '5 posts/day',
    features: ['3 social accounts', 'Reels & carousels', 'Custom brand voice', 'Analytics dashboard', 'Priority support'],
    cta: 'Start free trial',
    highlight: true
  },
  {
    name: 'Agency',
    price: '₹4,999',
    period: '/mo',
    posts: 'Unlimited posts',
    features: ['20 social accounts', 'Multi-client dashboard', 'White-label reports', 'API access', 'Dedicated support'],
    cta: 'Contact us',
    highlight: false
  }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-semibold text-lg tracking-tight">
            Post<span className="text-brand-600">Pilot</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link href="/auth/register" className="btn-primary text-xs px-4 py-2">
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full mb-8">
            <Zap size={12} />
            AI-powered · Posts while you sleep
          </div>
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-gray-950 leading-[1.1] mb-6">
            Your business posts itself<br />
            <span className="text-brand-600">every single day</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Connect your Instagram, tell us about your business, and PostPilot generates and publishes
            relevant content on your custom schedule — no designer needed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/register" className="btn-primary px-6 py-3 text-base">
              Start your 7-day free trial
              <ArrowRight size={16} />
            </Link>
            <p className="text-sm text-gray-400">No credit card required</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-semibold text-gray-950 text-center mb-3">Up and running in 3 steps</h2>
          <p className="text-gray-500 text-center mb-14">Takes about 5 minutes to set up</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Instagram, step: '01', title: 'Connect Instagram', desc: 'Link your Instagram Business account via Facebook login. One click, secure OAuth.' },
              { icon: Zap,       step: '02', title: 'Describe your business', desc: 'Tell us your industry, brand voice, and content topics. This shapes every post.' },
              { icon: Clock,     step: '03', title: 'Set your schedule', desc: 'Choose when to post. Daily at 9am, twice a week, or a custom time — you decide.' }
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="card p-6">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-brand-600" />
                </div>
                <div className="text-xs font-medium text-brand-400 mb-2">{step}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6" id="pricing">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-semibold text-gray-950 text-center mb-3">Simple pricing</h2>
          <p className="text-gray-500 text-center mb-14">14-day free trial on all plans</p>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`card p-7 flex flex-col ${plan.highlight ? 'border-brand-300 ring-2 ring-brand-100' : ''}`}
              >
                {plan.highlight && (
                  <div className="text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full self-start mb-4">
                    Most popular
                  </div>
                )}
                <div className="mb-1 text-sm font-medium text-gray-500">{plan.name}</div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-semibold text-gray-950">{plan.price}</span>
                  <span className="text-gray-400 mb-1">{plan.period}</span>
                </div>
                <div className="text-xs text-gray-400 mb-6">{plan.posts}</div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/register"
                  className={plan.highlight ? 'btn-primary w-full' : 'btn-secondary w-full'}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>Post<span className="text-brand-600 font-medium">Pilot</span> © 2026</span>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-gray-600 transition-colors">Terms</Link>
            <Link href="#" className="hover:text-gray-600 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
