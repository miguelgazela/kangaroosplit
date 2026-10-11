import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Project is shared with another app; all our objects live in this schema.
export const DB_SCHEMA = 'kangaroosplit'

export const supabase = createClient<Database, typeof DB_SCHEMA>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { db: { schema: DB_SCHEMA } },
)

// Unwraps a Supabase response, throwing on error so callers (and React Query)
// deal with a plain value or a rejected promise.
export function unwrap<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message)
  return result.data as NonNullable<T>
}
