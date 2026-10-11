import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { generateRecurring } from '../data/recurring'
import { useOnline } from '../lib/online'
import { DB_SCHEMA, supabase } from '../lib/supabase'
import { useCurrentMember } from './hooks'
import { keysByTable, queryKeys, realtimeTables } from './keys'

// Refreshes cached data when the other phone changes something.
export function useRealtimeSync(): void {
  const queryClient = useQueryClient()
  const userId = useAuth().session?.user.id

  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel('kangaroosplit-db')
    for (const table of realtimeTables) {
      channel.on('postgres_changes', { event: '*', schema: DB_SCHEMA, table }, () => {
        for (const queryKey of keysByTable[table] ?? []) {
          void queryClient.invalidateQueries({ queryKey })
        }
      })
    }

    // Database changes start flowing only after this acknowledgement, which
    // comes slightly after the channel joins. Anything that changed before it
    // (first load, or while the socket was down) was missed, so refetch.
    channel.on('system', {}, (message: { extension?: string; status?: string }) => {
      if (message.extension === 'postgres_changes' && message.status === 'ok') {
        void queryClient.invalidateQueries()
      }
    })
    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, userId])
}

// Creates recurring expenses that fell due since the app was last opened.
export function useRecurringGeneration(): void {
  const queryClient = useQueryClient()
  const online = useOnline()
  const isMember = useCurrentMember().status === 'ready'

  useEffect(() => {
    if (!online || !isMember) return

    let cancelled = false
    generateRecurring()
      .then((created) => {
        if (cancelled || created === 0) return
        for (const queryKey of [queryKeys.expenses, queryKeys.balances, queryKeys.recurring, queryKeys.activity]) {
          void queryClient.invalidateQueries({ queryKey })
        }
      })
      // Not worth surfacing: runs again next time the app opens.
      .catch((error: unknown) => console.warn('Recurring generation failed', error))

    return () => {
      cancelled = true
    }
  }, [queryClient, online, isMember])
}
