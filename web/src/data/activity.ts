import type { Activity } from '../lib/database.types'
import { supabase, unwrap } from '../lib/supabase'

// Newest first, across all lists.
export async function fetchActivity(limit = 200): Promise<Activity[]> {
  return unwrap(
    await supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(limit),
  )
}
