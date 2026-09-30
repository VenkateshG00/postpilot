# PostPilot — Full Review & Upgrade Roadmap

2026-09-21 · @Someone

## Current State

**Live URL:** postpilot-1ia.pages.dev (Cloudflare Pages)

### Landing page

Clean single-page marketing site with three sections: a hero ("Your business posts itself every single day"), a 3-step explainer (Connect Instagram → Describe your business → Set your schedule), and a pricing table with three tiers (Starter ₹499/mo, Pro ₹1,499/mo, Agency ₹4,999/mo). Header has Sign in / Get started free. Footer has Privacy, Terms, Contact links and © 2026. Mobile-responsive — stacks cards vertically on phone widths.

### Dashboard (authenticated)

Sidebar navigation with seven pages: Overview, Schedule, Posts, Analytics, Accounts, Billing, Settings. The Overview shows four stat cards (Active schedules: 3, Posts published: 8, Accounts linked: 1, Posts failed: 0), a recent-posts feed with thumbnails and published badges, and an editable Business Profile sidebar (industry, brand voice, topics, language).

### Working features

| Feature | Status | Details |
| --- | --- | --- |
| Automated posting pipeline | Working | Cron trigger → AI generates topic/caption/hashtags → image fetched → published to Instagram + Facebook → result logged |
| Schedule management | Working | Multiple schedules with topic tags, frequency (daily/specific days), posting time, content type |
| Post history | Working | Table with image thumbnails, caption previews, topic tags, status badges, timestamps |
| Analytics | Working | Success rate, 30-day chart, delivery donut, best-posting-times histogram (IST), per-account stats, CSV export |
| Account connection | Working | Instagram Business via Meta OAuth, one account connected |
| Billing | Working | Razorpay one-time payments, usage meter (posts/day limit), 4 plan tiers |
| Settings | Working | Business profile, brand voice selector, content topics, hashtags, language, timezone |
| Auth | Working | Email/password login + registration, 14-day free trial |

# PostPilot — Upgrade Roadmap

2026-09-21 · @Someone

## Phase 1 — Fix What's Broken

Quick wins that make the site stop looking unfinished. All bugs or missing basics — no new features.

**1. Fix dead footer links.** The Privacy, Terms, and Contact links in the footer all point to `/#` (anchor to nothing). Users click them and nothing happens — it looks abandoned. Wire them to placeholder pages that say "Coming soon" until the full legal pages are ready. Update the `<a>` hrefs in `page.tsx` and create minimal `/privacy`, `/terms`, `/contact` route stubs.

**2. Fix Agency "Contact us" button.** On the landing page pricing section, the Agency tier's "Contact us" button links to `/auth/register` — that's the signup page, not a contact method. Change it to a `mailto:` link with your email, or build a simple contact form page at `/contact` (name, email, message fields that sends you an email via Cloudflare Worker or Resend).

**3. Fix dashboard greeting.** The Overview page hardcodes the greeting "Property with U" — a leftover from one test business. It should pull the logged-in user's business name from their profile in Supabase and display "Good morning, \[Business Name\]" instead. If no business name is set, fall back to the user's email or "your business".

**4. Add confirmation dialogs on destructive actions.** Clicking the trash icon on a schedule deletes it immediately with no warning. Add a modal confirmation ("Delete this schedule? This can't be undone.") before any destructive action — schedule deletion, account disconnection, and plan downgrade. Build a reusable `<ConfirmDialog>` component.

**5. Add loading and empty states across all pages.** Pages show a blank white screen while data loads from Supabase, and pages with zero items show nothing at all. Add skeleton loaders (gray pulsing rectangles that mimic the layout) during fetch, and empty states with helpful CTAs when there's no data — e.g., the Posts page with zero posts should say "No posts yet — create your first schedule to get started" with a button linking to `/dashboard/schedule`.

**6. Add form validation feedback on schedule form.** The schedule creation form in `SchedulePageClient.tsx` silently fails when required fields are empty — the submit button does nothing and the user has no idea what's wrong. Add inline error messages (red text below each field) for: missing topic, missing time, missing frequency. Use client-side validation before the API call.

## Phase 2 — Build Trust & Conversions

The features and fixes that make someone willing to pay. Without these, users won't trust the product with their brand.

**1. Post preview and approval before publishing.** Right now the cron trigger generates a post (topic + caption + hashtags + image) and publishes it directly to Instagram/Facebook with zero user input. Users can't see what the AI wrote before it goes live — that's the #1 trust barrier. Build a preview screen: before a scheduled post publishes, show the generated image, caption, and hashtags in a card. The user can approve it (publishes as-is), edit it (modify caption/hashtags inline), or skip it (post is discarded, slot freed). This preview is the foundation for the credit system below.

**2. Credit-based regeneration system.** When a user sees the preview and doesn't like the generated image or caption, they can hit "Regenerate" to get a new AI-generated version. Each regeneration costs one credit. Free regenerations per day are included in each plan: Starter gets 3/day, Pro gets 10/day, Agency gets unlimited. Beyond the daily free limit, users spend credits from purchased credit packs. This is the secondary income stream — users who care about quality will buy credits. Track credit balance in Supabase, deduct on each regen call, and show remaining credits in the dashboard header.

**3. Remove Free plan, implement 7-day trial.** The Free plan (1 post/day, no revenue) attracts users who will never convert and costs you API calls. Remove it entirely from the billing page. Instead, every new signup gets a 7-day free trial on Starter — full access to 2 posts/day and 3 regenerations/day. After 7 days, they either pay or lose access. The trial creates urgency and lets users experience the real product. Store trial start date and expiry in Supabase, check on each API call.

**4. New pricing tiers.** Starter at ₹499/month (2 posts/day = 60/month, Pexels images, 3 free regenerations/day, 1 Instagram account). Pro at ₹1,299/month (5 posts/day = 150/month, Pexels + DALL-E images, 10 free regenerations/day, 3 accounts, analytics access). Agency at ₹4,999/month (unlimited posts, Pexels + DALL-E images, unlimited regenerations, 10 accounts, white-label, priority support). These prices sit below hiring a social media manager (₹15,000–25,000/month) while covering your per-post API costs with healthy margins — Starter is \~99% margin on Pexels + GPT-4o-mini.

**5. Align pricing across landing page and billing page.** The current landing page and billing page disagree on feature lists per tier — Starter shows different post limits, Pro lists different feature counts. Pick one source of truth (the new tiers above) and make both pages match exactly: same plan names, same prices, same feature bullets, same limits. Update both `page.tsx` (landing) and `BillingClient.tsx` (dashboard).

**6. Credit pack purchasing.** Beyond daily free regenerations, users can buy credit packs: ₹79 for 10 credits, ₹149 for 25 credits, ₹499 for 100 credits. Credits never expire. Build a simple purchase flow in the billing page — select a pack, pay via Razorpay, credits added to balance instantly. Show credit balance in the dashboard navbar so users always know where they stand.

**7. Add product screenshots to landing page.** The landing page has zero visuals of the actual product. No screenshots, no demo GIF, no sample posts. Users are asked to trust a tool they can't see. Take 3–4 screenshots: the dashboard overview, a sample generated post with caption, the schedule management view, and the analytics chart. Place them in the hero section or as a scrollable gallery below the 3-step explainer. A 15-second GIF showing the full flow (schedule created → post generated → published to Instagram) is even more effective.

**8. Add FAQ section to landing page.** Common questions go unanswered, which kills conversions. Add a collapsible FAQ section below pricing covering: Do I need an Instagram Business account? (Yes, required by Meta API.) What kind of content does AI generate? (Captions, hashtags, and paired stock/AI images based on your topic and brand voice.) Can I edit posts before they go live? (Yes, every post shows a preview — approve, edit, or skip.) What happens if a post fails? (It's logged with the error; your next scheduled post retries.) How does the free trial work? (7 days of full Starter access, no card required, cancel anytime.) How does billing work? (Monthly auto-renewal via Razorpay; cancel from the billing page.)

## Phase 3 — Polish & Growth

Makes the product feel professional and sets up the infrastructure for scaling to real paying users.

**1. Improve onboarding flow.** You already have `/auth/onboarding` (`onboarding/page.tsx` — 12.7 KB). Review whether it actually walks new users through the three steps promised on the landing page: connect Instagram account → set up business profile (industry, brand voice, topics) → create first schedule. If any step is missing or skippable without warning, fix it. The onboarding should end with the user's first post scheduled and a success message ("Your first post will go live at \[time\]!"). Users who complete onboarding convert to paid at 3–5× the rate of those who don't.

**2. Add favicon and Open Graph meta tags.** When someone shares the PostPilot link on WhatsApp, LinkedIn, or Twitter, it shows a blank preview with no title, no image, and no description — looks like a scam link. Add a favicon (a small logo or icon in `/public/favicon.ico`) and Open Graph meta tags in `layout.tsx`: `og:title` ("PostPilot — Your business posts itself every single day"), `og:description` ("AI-powered Instagram & Facebook posting on autopilot"), `og:image` (a 1200×630 preview card showing the dashboard or a sample post). Also add `twitter:card`, `twitter:title`, `twitter:image` for Twitter previews.

**3. Verify and fix password reset flow.** The login page has a "Forgot password?" link but it's unclear if the flow actually works end-to-end. Test it: click forgot password → enter email → receive reset email → click link → set new password → login with new password. Supabase Auth has built-in password reset via `supabase.auth.resetPasswordForEmail()` but it needs a redirect URL configured in the Supabase dashboard and a `/auth/reset-password` page to handle the callback. If any step is broken or missing, build it. A user who can't reset their password is a lost customer.

**4. Switch Razorpay to recurring subscriptions.** Currently billing uses one-time Razorpay payments — users pay once and that's it. They won't remember to pay again next month, so they churn. Switch to Razorpay Subscriptions API: create a Plan object for each tier (Starter/Pro/Agency), use `razorpay.subscriptions.create()` to start a subscription when the user pays, and handle the `subscription.charged` webhook for successful renewals and `subscription.halted` for failed payments. Store subscription ID and status in Supabase. Show active/expiring/failed status on the billing page. This is critical for predictable revenue.

**5. Usage alerts.** Users should know when they're approaching their daily post limit or when their trial is about to expire — before it's too late. Build two alert types: (a) Trial expiry — show a banner in the dashboard 3 days before and 1 day before trial ends ("Your trial ends in 3 days — upgrade to keep posting") with an upgrade button. (b) Post limit — when a user has used 80% of their daily posts, show a notification ("You've used 2 of 2 posts today — upgrade to Pro for 5/day"). These are in-app banners, not emails. Store alert dismissal state so the same alert doesn't show every page load.

**6. Super Admin Dashboard.** You need a way to manage the entire platform without querying Supabase directly. Build an admin panel at `/admin` (protected by a superadmin role check) with these sections:

- **Users** — List all registered users with: email, business name, plan, trial status (active/expired), signup date, last login, posts published count. Search by email or name. Ability to suspend/unsuspend a user account, extend a trial, or manually change their plan.
- **Plans & Billing** — View all plan configurations (name, price, limits). See total revenue this month, active subscriptions count, and churn rate. View payment history across all users. Manage credit pack pricing.
- **Posts** — View all posts across all users with: user email, caption preview, image thumbnail, status (published/failed/pending/skipped), platform (Instagram/Facebook), timestamp. Filter by status and date range. View failure logs with error messages for debugging.
- **Accounts** — All connected Instagram/Facebook accounts across all users with: account name, connected user, connection status (active/expired/revoked), token expiry date. Flag accounts with expiring tokens so you can notify users.
- **System Health** — Cron job status (last run time, success/fail), API error rates (Meta API failures, OpenAI failures), image generation costs this month, total API calls this month. A simple status page showing green/yellow/red for each service.
- **Settings** — Global platform settings: default trial length (currently 7 days), default image provider, cron frequency, maintenance mode toggle, announcement banner text (shows on all user dashboards).
- **Staff** (future) — Placeholder for adding other admin users with role-based access (admin, support, viewer). Not needed now but reserve the route.

## Phase 4 — Revenue Features

Features that justify the pricing and turn free-trial users into paying customers by showing real value.

**1. Engagement tracking via Meta Insights API.** When you publish a post through Meta's API, you get back a `post_id`. Using that same ID, you can call Meta's Insights API (`GET /{post_id}/insights`) to pull metrics — impressions, reach, likes, comments, saves, shares. You don't need any new permissions beyond what you already have for publishing. Build a daily cron job that loops through all published posts from the last 30 days, calls the Insights API for each, and stores the metrics in a new `post_insights` table in Supabase (post\_id, impressions, reach, likes, comments, saves, shares, fetched\_at). Display these metrics on each post card in the post history and aggregate them in the analytics page.

**2. Enhanced analytics dashboard.** Upgrade the existing analytics page (`AnalyticsClient.tsx`) from basic success/failure metrics to actual engagement intelligence. Add: top-performing posts ranked by engagement (likes + comments + saves), best posting times heatmap based on real engagement data (not just delivery times), content type performance breakdown (which topics get the most engagement), engagement trend over 30/60/90 days, and average engagement rate per post. All data comes from the `post_insights` table above — no emails, everything visible on the analytics page inside the dashboard.

**3. Content calendar view.** Add a visual month/week calendar page at `/dashboard/calendar` showing all scheduled and published posts on a timeline. Each day cell shows: post thumbnails for published posts (green border), pending/scheduled posts (yellow border), and failed posts (red border). Clicking a day opens that day's posts in detail. Clicking an empty day lets the user create a new schedule for that date. Use a library like `react-big-calendar` or build a simple custom grid. This lets users see their posting pattern at a glance and spot gaps in their content schedule.

**4. Post editor with AI assist.** Currently, AI generates posts and they're either published or not — there's no in-between. Build a post editor where users can: write their own caption from scratch, use AI to generate a draft and then edit it manually, click "Rewrite" to get an AI-rewritten version of their text (costs a regeneration credit), swap the image (browse Pexels stock or generate a new DALL-E image for Pro/Agency), and adjust hashtags (add, remove, or regenerate). This editor is accessible from the post preview screen (Phase 2) and from the content calendar.

**5. Content pillars and themes.** Let users define 3–5 rotating content themes (called "pillars") like: Tips & Education, Behind the Scenes, Customer Testimonials, Promotions & Offers, Industry News. When creating a schedule, the user assigns pillars to it. The AI then auto-rotates through pillars across the week so the feed stays varied instead of posting the same type of content every day. Store pillars in Supabase linked to the user's profile, and pass the current pillar as context to the AI caption generator so it adjusts tone and structure accordingly.

**6. Hashtag research tool.** Add a tool at `/dashboard/hashtags` (or as a panel in the post editor) that suggests trending and niche hashtags based on the user's industry, location, and content topic. Pull hashtag suggestions from a combination of: the user's own top-performing hashtags (from post\_insights data), curated industry hashtag lists stored in Supabase, and AI-generated suggestions based on the caption text. Show each hashtag with an estimated reach category (low/medium/high) and a one-click "Add to post" button. Recommend a mix of 20–30 hashtags per post: 5 broad, 10 mid-range, 10–15 niche.

## Phase 5 — Agency & Scale

Features that unlock the Agency tier's full value and justify the ₹4,999/month price.

**1. Client approval workflow.** Agency users manage posting for their clients' accounts. Before a post goes live on a client's account, the client should be able to review and approve it. Build a shareable review link: when a post is scheduled for a client account, generate a unique URL (e.g., `postpilot-1ia.pages.dev/review/[token]`) that shows the post preview (image, caption, hashtags) with Approve, Request Changes, and Reject buttons. No login required for the client — the link is the authentication. Changes requested go back to the agency user's dashboard as a notification. Store approval status (pending/approved/rejected/changes-requested) and client comments in Supabase. Posts only publish after client approval when this workflow is enabled for an account.

**2. Team roles and permissions.** Agency accounts need multiple people working on the same set of client accounts. Build three roles: Admin (full access — billing, settings, all accounts, user management), Editor (can create/edit schedules and posts, view analytics, but can't change billing or account connections), Viewer (read-only access to posts, analytics, and schedules — useful for clients who want to see their dashboard). Roles are per-organization, stored in a `team_members` table in Supabase with user\_id, org\_id, and role. Add an "Invite team member" flow: enter email → select role → send invite link → they register/login and join the org.

**3. White-label dashboard.** Let Agency users remove PostPilot branding and replace it with their own agency's logo, colors, and custom domain. Build a white-label settings page under the Agency plan: upload logo (replaces PostPilot logo in sidebar and header), set primary brand color (applies to buttons, links, accents via CSS variables), set custom dashboard title. Custom domain support (agency.example.com pointing to their PostPilot dashboard) is a stretch goal here — it requires Cloudflare custom hostname setup but is a strong differentiator.

**4. Carousel and Reel generation.** Single-image posts are the baseline, but Instagram carousels get 3× more engagement on average and Reels dominate the algorithm. Build carousel support: the AI generates 3–5 slides per carousel post (each slide = an image + a short text overlay), the user previews and reorders slides, and it publishes as a carousel via Meta's carousel publishing API (`POST /{ig-user-id}/media` with `media_type=CAROUSEL`). For Reels: generate a short script (3–5 talking points) and a cover image. The user records or uploads the video themselves (AI video generation is not practical yet), but the AI handles the caption, hashtags, and cover image. This positions PostPilot ahead of most competitors who only do single-image posts.

## Future Dues (Parked)

Items deferred until the core product has paying users and proven demand. Revisit after Phase 3 is live.

**AI provider decision.** Which AI generates captions (GPT-4o-mini vs GPT-4o vs Claude) and which generates images (Pexels stock vs DALL-E vs Stable Diffusion). Currently using Pexels + GPT-4o-mini which is near-zero cost. Decide based on quality feedback from real users — if users complain captions are generic, test GPT-4o; if they want unique images, price out DALL-E per-post cost against the credit revenue it generates.

**Privacy Policy and Terms of Service.** Full legal pages at `/privacy` and `/terms` customized for PostPilot's data handling (Meta tokens, user content, Razorpay payments, AI-generated content ownership). Required before Meta app review for production API access. Use a template generator, then have it reviewed. Hard blocker for going fully public.

**Meta Business Verification.** Needed for production-level API access (higher rate limits, more permissions). Requires: a registered business entity, a working website with Privacy Policy and Terms of Service, business documentation (GST certificate or equivalent), and passing Meta's verification review. Depends on Privacy/Terms being live first.

**Social proof on landing page.** Add testimonials, a "posts published" counter, or sample before/after engagement results. Can't do this authentically until you have real paying users — fake testimonials hurt more than no testimonials. When you reach 3–5 paying users, ask each for a one-line quote and permission to show their account name or results.

**LinkedIn posting.** Extend the posting pipeline to LinkedIn company pages and personal profiles via LinkedIn's Marketing API. Requires a separate OAuth flow and app approval from LinkedIn. Captions need to be adapted: longer form, more professional tone, no hashtag overload. Second most-requested platform for business posting after Instagram.

**Twitter/X posting.** Auto-publish adapted versions to X via the X API v2. Adaptations needed: shorter text (280 char limit), fewer hashtags (2–3 max), no image carousel support. X API pricing may apply depending on the access tier.

**Google Business Profile posting.** Post updates to GBP for local businesses via the Google Business Profile API. High value for the construction and home services audience already on the platform. Posts on GBP include a CTA button (Learn More, Call Now, Book) which none of the social platforms have.

**Bulk content import.** Let users upload a CSV or spreadsheet of pre-written posts (columns: date, caption, hashtags, image URL) to schedule in batch. Useful for users migrating from another tool or agencies planning a month's content in advance. Parse the CSV, validate each row, show a preview table, and create schedules in bulk.

**Annual billing discount.** Offer 2 months free on annual plans (₹4,990/year for Starter instead of ₹5,988, ₹12,990/year for Pro instead of ₹15,588). Makes sense only after recurring billing is stable and you have enough monthly subscribers to test conversion rates.

**Referral program.** "Invite a friend, get 1 month free" with a shareable referral link. Each successful referral (friend signs up and stays past trial) credits the referrer's account with one free month. Low-cost acquisition channel — build after you have 50+ active users who would actually refer.

**Competitor benchmarking.** Track 2–3 competitor accounts' posting frequency and engagement using publicly available data (profile info, post counts, engagement rates). Show a comparison dashboard: your posting frequency vs theirs, your engagement rate vs theirs. Useful context but not critical for core product value.

**AI performance auto-tuning.** Analyze which topics, posting times, and caption styles get the best engagement from the `post_insights` data, then automatically adjust the AI's generation parameters. For example: if "Tips" posts at 6 PM get 2× more likes than "Promotions" at 10 AM, the system learns to schedule more tips posts at 6 PM. Requires enough engagement data to be statistically meaningful — at least 100+ published posts per account with insights.

### Summary

The prototype is solid — the end-to-end posting pipeline works, billing is live, and the dashboard is clean. The critical gap is trust: users need to see and approve content before it publishes, and Meta needs Privacy/Terms pages before granting production API access. Phase 1 closes those gaps. Phase 2 builds the engagement and retention features that justify the pricing. Phase 3 unlocks the agency tier and multi-platform expansion that take PostPilot from a solo tool to a scalable SaaS.
