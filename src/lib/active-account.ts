import { cookies } from 'next/headers'

const COOKIE = 'pp_account'

// The operator's selected channel (social_account_id), validated against the
// accounts they actually own. null = "All accounts".
export async function getActiveAccountId(validIds: string[]): Promise<string | null> {
  try {
    const store = await cookies()
    const v = store.get(COOKIE)?.value
    if (v && validIds.includes(v)) return v
  } catch { }
  return null
}
