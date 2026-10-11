import type { Category } from '../lib/database.types'
import { supabase, unwrap } from '../lib/supabase'

export type CategoryInput = Pick<Category, 'name' | 'icon' | 'color'>

// Includes archived ones: old expenses still need their name and icon.
export async function fetchCategories(): Promise<Category[]> {
  return unwrap(
    await supabase
      .from('categories')
      .select('*')
      .order('is_preset', { ascending: false })
      .order('created_at'),
  )
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  return unwrap(await supabase.from('categories').insert(input).select('*').single())
}

export async function updateCategory(id: string, patch: Partial<CategoryInput>): Promise<void> {
  unwrap(await supabase.from('categories').update(patch).eq('id', id).select('id').single())
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<void> {
  unwrap(
    await supabase
      .from('categories')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', id)
      .select('id')
      .single(),
  )
}
