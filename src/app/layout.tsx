import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'PostPilot — Automated Social Media for Your Business',
  description: 'AI-powered Instagram & Facebook posts published automatically on your schedule.',
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'PostPilot',
    description: 'AI-powered social media automation for local businesses.',
    type: 'website'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Prevent dark-mode flash by setting data-theme before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
