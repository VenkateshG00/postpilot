export type Plan = 'free' | 'starter' | 'pro' | 'agency'
export type Platform = 'instagram' | 'facebook'
export type PostStatus = 'pending' | 'generating' | 'published' | 'failed'
export type ContentType = 'post' | 'reel' | 'story' | 'carousel'
export type BrandVoice = 'professional' | 'casual' | 'witty' | 'inspirational'
export type Frequency = 'daily' | 'weekly' | 'custom'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: Plan
  plan_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface BusinessProfile {
  id: string
  user_id: string
  business_name: string
  industry: string
  description: string | null
  target_audience: string | null
  brand_voice: BrandVoice
  topics: string[]
  hashtags: string[]
  language: string
  timezone: string
  created_at: string
  updated_at: string
}

export interface SocialAccount {
  id: string
  user_id: string
  platform: Platform
  account_id: string
  account_name: string | null
  account_picture_url: string | null
  access_token: string
  token_expires_at: string | null
  page_id: string | null
  ig_business_id: string | null
  is_active: boolean
  connected_at: string
}

export interface Schedule {
  id: string
  user_id: string
  social_account_id: string
  name: string
  is_active: boolean
  frequency: Frequency
  post_times: string[]
  days_of_week: number[] | null
  content_type: ContentType
  custom_topics: string[] | null
  created_at: string
  updated_at: string
}

export interface PostLog {
  id: string
  user_id: string
  schedule_id: string | null
  social_account_id: string | null
  platform: Platform
  status: PostStatus
  caption: string | null
  image_url: string | null
  ig_media_id: string | null
  ig_permalink: string | null
  error_message: string | null
  topic_used: string | null
  scheduled_for: string | null
  published_at: string | null
  created_at: string
}

// Form types
export interface OnboardingFormData {
  business_name: string
  industry: string
  description: string
  target_audience: string
  brand_voice: BrandVoice
  topics: string[]
  hashtags: string[]
  language: string
  timezone: string
}
