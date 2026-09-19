import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const INDUSTRIES = [
  'Restaurant & Food', 'Retail & E-commerce', 'Health & Wellness',
  'Beauty & Salon', 'Real Estate', 'Education & Coaching',
  'Technology', 'Finance & Accounting', 'Legal Services',
  'Construction & Home Services', 'Travel & Hospitality',
  'Fitness & Sports', 'Fashion & Apparel', 'Photography & Creative',
  'Non-profit', 'Other'
]

export const BRAND_VOICES = [
  { value: 'professional', label: 'Professional', desc: 'Authoritative and trustworthy' },
  { value: 'casual', label: 'Casual', desc: 'Friendly and approachable' },
  { value: 'witty', label: 'Witty', desc: 'Clever and entertaining' },
  { value: 'inspirational', label: 'Inspirational', desc: 'Motivating and uplifting' }
] as const

export const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland'
]

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'Telugu' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ar', label: 'Arabic' }
]

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'published': return 'text-emerald-600 bg-emerald-50'
    case 'pending': return 'text-amber-600 bg-amber-50'
    case 'generating': return 'text-blue-600 bg-blue-50'
    case 'failed': return 'text-red-600 bg-red-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}
export function formatDateIST(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}