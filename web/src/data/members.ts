import type { Member } from '../lib/database.types'
import { supabase, unwrap } from '../lib/supabase'

export async function fetchMembers(): Promise<Member[]> {
  return unwrap(await supabase.from('members').select('*').order('created_at'))
}

export async function updateMember(
  userId: string,
  patch: Partial<Pick<Member, 'display_name' | 'color'>>,
): Promise<void> {
  unwrap(await supabase.from('members').update(patch).eq('user_id', userId).select('user_id').single())
}
