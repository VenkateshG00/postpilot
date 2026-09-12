import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'PostPilot — Automated Social Media for Your Business',
  description: 'AI-powered Instagram & Facebook posts published automatically on your schedule.',
  openGraph: {
    title: 'PostPilot',
    description: 'AI-powered social media automation for local businesses.',
    type: 'website'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
