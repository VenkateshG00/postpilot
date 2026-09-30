-- Multi-provider AI image generation config
-- Replaces the single ai_image_provider column with a richer structure

-- 1. Active provider (which one clients see right now)
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS ai_active_provider TEXT NOT NULL DEFAULT 'none';

-- 2. Per-provider credit costs (admin-editable)
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS ai_provider_credits JSONB NOT NULL DEFAULT '{
    "replicate_flux":   4,
    "pollinations":     1,
    "huggingface_flux": 3,
    "cloudflare_sdxl":  2
  }';

-- 3. Migrate old single column → new column
UPDATE public.app_settings
  SET ai_active_provider = COALESCE(ai_image_provider, 'none')
  WHERE id = 1;

-- 4. Supabase Storage bucket for providers that return binary (HF, Cloudflare)
--    Run this separately in Storage tab if it errors here:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('ai-images', 'ai-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read ai-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'ai-images');

CREATE POLICY "Service role write ai-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ai-images');
