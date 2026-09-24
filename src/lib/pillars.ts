// Content-pillar suggestions per industry, shown in the schedule Topic/theme field.
// Free-text is always allowed; these are starter suggestions matched to the client's
// business industry (from their business profile). Keys match lib/utils INDUSTRIES.

export const PILLARS: Record<string, string[]> = {
  'Restaurant & Food': ["Today's special", 'New menu items', 'Behind the kitchen', 'Customer favourites', 'Offers & combos', 'Food tips'],
  'Retail & E-commerce': ['New arrivals', 'Bestsellers', 'Product spotlight', 'Customer reviews', 'Sales & offers', 'Styling tips'],
  'Health & Wellness': ['Nutrition tips', 'Daily wellness', 'Myth-busting', 'Seasonal health', 'Patient stories', 'Mental wellness'],
  'Beauty & Salon': ['Before & after', 'Treatment tips', 'Seasonal looks', 'Client transformations', 'Offers & packages', 'Product picks'],
  'Real Estate': ['New listings', 'Home buying tips', 'Investment insights', 'Client success stories', 'Local market updates', 'Behind the scenes'],
  'Education & Coaching': ['Study tips', 'Exam prep', 'Student success', 'Course updates', 'Career guidance', 'Q&A'],
  'Technology': ['Product updates', 'How-to tips', 'Industry news', 'Customer stories', 'Behind the build', 'Feature spotlight'],
  'Finance & Accounting': ['Money tips', 'Tax reminders', 'Investment basics', 'Client wins', 'Myth-busting', 'Deadlines & updates'],
  'Legal Services': ['Know your rights', 'Legal tips', 'Case insights', 'FAQs', 'Policy updates', 'Client guidance'],
  'Construction & Home Services': ['Project showcase', 'Before & after', 'Maintenance tips', 'Client testimonials', 'Behind the scenes', 'Seasonal advice'],
  'Travel & Hospitality': ['Destination spotlight', 'Travel tips', 'Guest experiences', 'Offers & packages', 'Behind the scenes', 'Local guides'],
  'Fitness & Sports': ['Workout of the day', 'Nutrition tips', 'Transformations', 'Class schedule', 'Motivation', 'Recovery tips'],
  'Fashion & Apparel': ['New collection', 'Styling tips', 'Lookbook', 'Customer looks', 'Sales & drops', 'Behind the brand'],
  'Photography & Creative': ['Recent work', 'Behind the shoot', 'Client features', 'Tips & tutorials', 'Booking offers', 'Gear & process'],
  'Non-profit': ['Impact stories', 'Volunteer spotlight', 'Upcoming events', 'How to help', 'Behind the mission', 'Donor thanks'],
  'Other': ['Tips & how-tos', 'Behind the scenes', 'Customer stories', 'Offers & updates', 'Industry news', 'FAQs'],
}

const GENERIC = ['Tips & how-tos', 'Behind the scenes', 'Customer stories', 'Offers & updates', 'Industry news', 'FAQs']

export function pillarsForIndustry(industry?: string | null): string[] {
  if (!industry) return GENERIC
  return PILLARS[industry] ?? GENERIC
}
