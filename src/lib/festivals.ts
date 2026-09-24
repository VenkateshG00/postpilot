// Indian festival & occasion calendar for the Festival auto-calendar (#5).
// Dates are date-only in IST ('YYYY-MM-DD'). Lunar festivals shift every year,
// so this list is dated explicitly and must be topped up each year — add the
// next year's dates before the current list runs out (see MAINTENANCE note).
//
// `greeting` is the brief handed to the AI generator; it should read like an
// instruction ("Write warm Diwali wishes ...").

export type FestivalKind = 'festival' | 'national' | 'occasion'

export interface Festival {
  date: string        // YYYY-MM-DD (IST)
  name: string
  emoji: string
  kind: FestivalKind
  greeting: string    // brief passed to /api/posts/custom/generate
}

// MAINTENANCE: extend this list yearly. Currently covers Oct 2026 -> Dec 2027.
export const FESTIVALS: Festival[] = [
  // ---- 2026 (remainder of the year) ----
  { date: '2026-10-11', name: 'Navratri', emoji: '🪔', kind: 'festival', greeting: 'Write a warm Navratri greeting post celebrating nine nights of devotion, dance and new beginnings.' },
  { date: '2026-10-20', name: 'Dussehra', emoji: '🏹', kind: 'festival', greeting: 'Write a Dussehra (Vijayadashami) greeting post about the victory of good over evil and fresh starts.' },
  { date: '2026-10-29', name: 'Karva Chauth', emoji: '🌙', kind: 'festival', greeting: 'Write a heartfelt Karva Chauth greeting post celebrating love, devotion and togetherness.' },
  { date: '2026-11-06', name: 'Dhanteras', emoji: '🪙', kind: 'festival', greeting: 'Write a Dhanteras greeting post wishing customers wealth, health and prosperity, and inviting them to shop.' },
  { date: '2026-11-08', name: 'Diwali', emoji: '🪔', kind: 'festival', greeting: 'Write warm Diwali greetings to our customers — the festival of lights, prosperity and togetherness.' },
  { date: '2026-11-10', name: 'Govardhan Puja', emoji: '🙏', kind: 'festival', greeting: 'Write a Govardhan Puja greeting post celebrating gratitude, nature and abundance.' },
  { date: '2026-11-11', name: 'Bhai Dooj', emoji: '👫', kind: 'festival', greeting: 'Write a Bhai Dooj greeting post celebrating the bond between brothers and sisters.' },
  { date: '2026-11-15', name: 'Chhath Puja', emoji: '🌅', kind: 'festival', greeting: 'Write a Chhath Puja greeting post honouring the Sun God, purity and family devotion.' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti', emoji: '🙏', kind: 'festival', greeting: 'Write a respectful Guru Nanak Jayanti (Gurpurab) greeting post about peace, equality and service.' },
  { date: '2026-12-25', name: 'Christmas', emoji: '🎄', kind: 'festival', greeting: 'Write a warm Christmas greeting post about joy, kindness and celebration.' },
  { date: '2026-12-31', name: "New Year's Eve", emoji: '🎆', kind: 'occasion', greeting: 'Write an upbeat New Year’s Eve post thanking customers for the year and inviting them to celebrate.' },

  // ---- 2027 ----
  { date: '2027-01-01', name: "New Year's Day", emoji: '🎉', kind: 'occasion', greeting: 'Write a fresh, motivating Happy New Year post thanking customers and setting a positive tone for the year.' },
  { date: '2027-01-14', name: 'Makar Sankranti / Pongal', emoji: '🪁', kind: 'festival', greeting: 'Write a Makar Sankranti and Pongal greeting post celebrating harvest, gratitude and new energy.' },
  { date: '2027-01-26', name: 'Republic Day', emoji: '🇮🇳', kind: 'national', greeting: 'Write a respectful Republic Day post honouring India, unity and pride.' },
  { date: '2027-02-11', name: 'Vasant Panchami', emoji: '📚', kind: 'festival', greeting: 'Write a Vasant Panchami greeting post celebrating knowledge, learning and the arrival of spring.' },
  { date: '2027-02-14', name: "Valentine's Day", emoji: '❤️', kind: 'occasion', greeting: 'Write a warm Valentine’s Day post about love and appreciation, with a tie-in to our products or services.' },
  { date: '2027-03-06', name: 'Maha Shivaratri', emoji: '🕉️', kind: 'festival', greeting: 'Write a devotional Maha Shivaratri greeting post about faith, strength and inner peace.' },
  { date: '2027-03-08', name: "Women's Day", emoji: '💐', kind: 'occasion', greeting: 'Write an empowering International Women’s Day post celebrating and appreciating women.' },
  { date: '2027-03-10', name: 'Eid ul-Fitr', emoji: '🌙', kind: 'festival', greeting: 'Write a warm Eid ul-Fitr (Eid Mubarak) greeting post about gratitude, generosity and togetherness.' },
  { date: '2027-03-23', name: 'Holi', emoji: '🎨', kind: 'festival', greeting: 'Write a vibrant Holi greeting post celebrating colours, joy and new beginnings.' },
  { date: '2027-03-26', name: 'Good Friday', emoji: '✝️', kind: 'festival', greeting: 'Write a respectful, reflective Good Friday post about faith, sacrifice and hope.' },
  { date: '2027-04-07', name: 'Ugadi / Gudi Padwa', emoji: '🌸', kind: 'festival', greeting: 'Write an Ugadi and Gudi Padwa greeting post celebrating the new year, prosperity and fresh starts.' },
  { date: '2027-04-14', name: 'Baisakhi', emoji: '🌾', kind: 'festival', greeting: 'Write a joyful Baisakhi greeting post celebrating harvest, gratitude and community.' },
  { date: '2027-04-15', name: 'Ram Navami', emoji: '🙏', kind: 'festival', greeting: 'Write a devotional Ram Navami greeting post about righteousness, courage and devotion.' },
  { date: '2027-04-19', name: 'Mahavir Jayanti', emoji: '☸️', kind: 'festival', greeting: 'Write a peaceful Mahavir Jayanti greeting post about non-violence, truth and compassion.' },
  { date: '2027-05-09', name: "Mother's Day", emoji: '🌷', kind: 'occasion', greeting: 'Write a heartfelt Mother’s Day post celebrating and thanking mothers.' },
  { date: '2027-05-17', name: 'Bakrid (Eid al-Adha)', emoji: '🌙', kind: 'festival', greeting: 'Write a warm Bakrid (Eid al-Adha) greeting post about sacrifice, faith and sharing.' },
  { date: '2027-05-20', name: 'Buddha Purnima', emoji: '☸️', kind: 'festival', greeting: 'Write a serene Buddha Purnima greeting post about peace, wisdom and compassion.' },
  { date: '2027-06-20', name: "Father's Day", emoji: '👔', kind: 'occasion', greeting: 'Write a warm Father’s Day post celebrating and thanking fathers.' },
  { date: '2027-08-01', name: 'Friendship Day', emoji: '🤝', kind: 'occasion', greeting: 'Write a cheerful Friendship Day post celebrating friendship, with a tie-in to our brand.' },
  { date: '2027-08-15', name: 'Independence Day', emoji: '🇮🇳', kind: 'national', greeting: 'Write a proud Independence Day post honouring India, freedom and unity.' },
  { date: '2027-08-17', name: 'Raksha Bandhan', emoji: '🎀', kind: 'festival', greeting: 'Write a warm Raksha Bandhan greeting post celebrating the bond between brothers and sisters.' },
  { date: '2027-08-24', name: 'Janmashtami', emoji: '🦚', kind: 'festival', greeting: 'Write a joyful Krishna Janmashtami greeting post about devotion, joy and celebration.' },
  { date: '2027-09-04', name: 'Ganesh Chaturthi', emoji: '🐘', kind: 'festival', greeting: 'Write a festive Ganesh Chaturthi greeting post invoking Lord Ganesha for wisdom, success and new beginnings.' },
  { date: '2027-09-05', name: "Teachers' Day", emoji: '📖', kind: 'occasion', greeting: 'Write a grateful Teachers’ Day post honouring teachers and mentors.' },
  { date: '2027-09-12', name: 'Onam', emoji: '🌼', kind: 'festival', greeting: 'Write a warm Onam greeting post celebrating harvest, prosperity and togetherness.' },
  { date: '2027-10-02', name: 'Gandhi Jayanti', emoji: '🕊️', kind: 'national', greeting: 'Write a respectful Gandhi Jayanti post about peace, truth and non-violence.' },
  { date: '2027-10-09', name: 'Dussehra', emoji: '🏹', kind: 'festival', greeting: 'Write a Dussehra (Vijayadashami) greeting post about the victory of good over evil and fresh starts.' },
  { date: '2027-10-29', name: 'Diwali', emoji: '🪔', kind: 'festival', greeting: 'Write warm Diwali greetings to our customers — the festival of lights, prosperity and togetherness.' },
  { date: '2027-11-14', name: 'Guru Nanak Jayanti', emoji: '🙏', kind: 'festival', greeting: 'Write a respectful Guru Nanak Jayanti (Gurpurab) greeting post about peace, equality and service.' },
  { date: '2027-12-25', name: 'Christmas', emoji: '🎄', kind: 'festival', greeting: 'Write a warm Christmas greeting post about joy, kindness and celebration.' },
]

// Whole-day difference between today and a YYYY-MM-DD date, in the viewer's
// local timezone (IST for our users). 0 = today, 1 = tomorrow, negative = past.
export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const [y, m, d] = dateStr.split('-').map(Number)
  const fest = new Date(y, m - 1, d)
  return Math.round((fest.getTime() - today.getTime()) / 86400000)
}

// Festivals from today up to `withinDays` ahead, soonest first, capped at `limit`.
export function upcomingFestivals(withinDays = 45, limit = 6, now: Date = new Date()): Festival[] {
  return FESTIVALS
    .map((f) => ({ f, d: daysUntil(f.date, now) }))
    .filter((x) => x.d >= 0 && x.d <= withinDays)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.f)
}

// "Today", "Tomorrow", "in 5 days", or a short date for anything further out.
export function whenLabel(dateStr: string, now: Date = new Date()): string {
  const d = daysUntil(dateStr, now)
  if (d <= 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d <= 14) return `in ${d} days`
  const [y, mo, da] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, da).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
