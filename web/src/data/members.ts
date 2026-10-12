import type { Member } from '../lib/database.types'
import { supabase, unwrap } from '../lib/supabase'

export async function fetchMembers(): Promise<Member[]> {
  // Second key keeps the order fixed when both rows share a creation time;
  // the order decides how ratios read ("68 / 32"), so it must never flip.
  return unwrap(await supabase.from('members').select('*').order('created_at').order('user_id'))
}

export async function updateMember(
  userId: string,
  patch: Partial<Pick<Member, 'display_name' | 'color'>>,
): Promise<void> {
  unwrap(await supabase.from('members').update(patch).eq('user_id', userId).select('user_id').single())
}
