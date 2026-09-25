-- Add ai_image_provider to app_settings
-- Values: 'none' (feature off), 'replicate_flux' (Flux Schnell), future: 'stability_sdxl', 'dalle3'
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS ai_image_provider TEXT NOT NULL DEFAULT 'none';

-- Start with it off — admin must explicitly enable
UPDATE public.app_settings SET ai_image_provider = 'none' WHERE id = 1;
