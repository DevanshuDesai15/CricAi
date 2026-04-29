import { NextResponse } from 'next/server'
import { getTransferState, saveTransferState, updateUserSquadName } from '@/lib/queries/user-squad'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { normalizeTransferSetupInput } from '@/lib/transfer-setup'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = normalizeTransferSetupInput(await request.json())
  if (!payload.ok) {
    return NextResponse.json({ error: payload.error }, { status: 400 })
  }

  const transferState = await getTransferState(user.id)

  await updateUserSquadName(user.id, payload.squadName)
  await saveTransferState(user.id, {
    transfers_used: payload.transfersUsed,
    total_points: payload.totalPoints,
    boosters_used: transferState.boosters_used,
  })

  return NextResponse.json({ ok: true })
}
