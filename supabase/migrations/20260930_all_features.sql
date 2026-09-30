-- ============================================================
-- PostPilot — Full Feature Migration (Steps 8–20)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. brand_kits (Step 8 — Brand Kit)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_kits (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_color   text DEFAULT '#6366f1',
  secondary_color text DEFAULT '#8b5cf6',
  accent_color    text DEFAULT '#ec4899',
  heading_font    text DEFAULT 'Inter',
  body_font       text DEFAULT 'Inter',
  logo_url        text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'brand_kits' AND policyname = 'Users can manage their own brand kit'
  ) THEN
    CREATE POLICY "Users can manage their own brand kit"
      ON brand_kits FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────
-- 2. automations (Step 9 — Automations)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automations (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      uuid REFERENCES social_accounts(id) ON DELETE SET NULL,
  name            text NOT NULL DEFAULT 'Untitled Automation',
  trigger_type    text NOT NULL CHECK (trigger_type IN ('comment_keyword', 'any_comment', 'dm_keyword')),
  trigger_keywords text[] DEFAULT '{}',
  reply_template  text NOT NULL DEFAULT '',
  reply_type      text NOT NULL CHECK (reply_type IN ('dm', 'comment')) DEFAULT 'dm',
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'automations' AND policyname = 'Users can manage their own automations'
  ) THEN
    CREATE POLICY "Users can manage their own automations"
      ON automations FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────
-- 3. conversations + messages (Step 10 — Inbox/DM)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id            uuid NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  participant_id        text NOT NULL,
  participant_name      text NOT NULL DEFAULT '',
  participant_username  text NOT NULL DEFAULT '',
  participant_avatar    text,
  last_message          text DEFAULT '',
  last_message_at       timestamptz DEFAULT now(),
  unread_count          int DEFAULT 0,
  is_archived           boolean DEFAULT false,
  is_hot_lead           boolean DEFAULT false,
  tab                   text DEFAULT 'chats' CHECK (tab IN ('chats', 'outreach', 'archived')),
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can manage their own conversations'
  ) THEN
    CREATE POLICY "Users can manage their own conversations"
      ON conversations FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS messages (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type     text NOT NULL CHECK (sender_type IN ('user', 'participant', 'automation')),
  content         text NOT NULL DEFAULT '',
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can manage messages in their conversations'
  ) THEN
    CREATE POLICY "Users can manage messages in their conversations"
      ON messages FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM conversations c
          WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM conversations c
          WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────
-- 4. business_profiles new columns (Steps 12, 13, 19)
-- ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_profiles' AND column_name = 'ai_config'
  ) THEN
    ALTER TABLE business_profiles ADD COLUMN ai_config jsonb DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_profiles' AND column_name = 'hook_photo_url'
  ) THEN
    ALTER TABLE business_profiles ADD COLUMN hook_photo_url text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_profiles' AND column_name = 'notification_prefs'
  ) THEN
    ALTER TABLE business_profiles ADD COLUMN notification_prefs jsonb DEFAULT '{}';
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────
-- 5. workspaces + team_members (Step 14 — Team Management)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT 'My Workspace',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS team_members (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email         text NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  status        text NOT NULL CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  invited_at    timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Workspace policies (must come after team_members table exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Workspace visible to owner and members'
  ) THEN
    CREATE POLICY "Workspace visible to owner and members"
      ON workspaces FOR SELECT
      USING (
        auth.uid() = owner_id
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.workspace_id = workspaces.id AND tm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Owner can manage workspace'
  ) THEN
    CREATE POLICY "Owner can manage workspace"
      ON workspaces FOR ALL
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Team members visible to workspace participants'
  ) THEN
    CREATE POLICY "Team members visible to workspace participants"
      ON team_members FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM workspaces w
          WHERE w.id = team_members.workspace_id
            AND (w.owner_id = auth.uid() OR EXISTS (
              SELECT 1 FROM team_members tm2
              WHERE tm2.workspace_id = w.id AND tm2.user_id = auth.uid()
            ))
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Workspace owner can manage team members'
  ) THEN
    CREATE POLICY "Workspace owner can manage team members"
      ON team_members FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM workspaces w
          WHERE w.id = team_members.workspace_id AND w.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM workspaces w
          WHERE w.id = team_members.workspace_id AND w.owner_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────
-- 6. post_logs new columns (Step 16 — Trial Reels)
-- ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'post_logs' AND column_name = 'is_trial'
  ) THEN
    ALTER TABLE post_logs ADD COLUMN is_trial boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'post_logs' AND column_name = 'trial_views'
  ) THEN
    ALTER TABLE post_logs ADD COLUMN trial_views int DEFAULT 0;
    ALTER TABLE post_logs ADD COLUMN trial_likes int DEFAULT 0;
    ALTER TABLE post_logs ADD COLUMN trial_comments int DEFAULT 0;
    ALTER TABLE post_logs ADD COLUMN trial_shares int DEFAULT 0;
    ALTER TABLE post_logs ADD COLUMN trial_reach int DEFAULT 0;
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────
-- 7. referrals (Step 17 — Referral Program)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email text NOT NULL,
  status        text NOT NULL CHECK (status IN ('pending', 'signed_up', 'subscribed', 'paid_out')) DEFAULT 'pending',
  payout_amount numeric DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Users can view their own referrals'
  ) THEN
    CREATE POLICY "Users can view their own referrals"
      ON referrals FOR SELECT
      USING (auth.uid() = referrer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Users can create referrals'
  ) THEN
    CREATE POLICY "Users can create referrals"
      ON referrals FOR INSERT
      WITH CHECK (auth.uid() = referrer_id);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────
-- 8. Indexes for performance
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_automations_user     ON automations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user   ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_convo       ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_team_members_ws      ON team_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer   ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_post_logs_trial      ON post_logs(user_id) WHERE is_trial = true;


-- ============================================================
-- Done! All tables and columns for Steps 8–20 are ready.
-- ============================================================
