import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import type { UpcomingMatch } from '@/lib/queries/matches'
import type { NextMatchWinProbability } from '@/lib/team-forecasts'

export interface TeamMatchPredictionAuditOptions {
  modelVersion: string
  predictionSource: string
  generatedAt?: string
}

export interface TeamMatchPredictionAuditRow {
  match_id: string
  model_version: string
  team1_id: string
  team2_id: string
  team1_probability: number
  team2_probability: number
  favorite_team_id: string
  confidence: number
  prediction_source: string
  generated_at: string
  updated_at: string
}

export interface UnresolvedTeamMatchPredictionAudit {
  id: number
  match_id?: string
  favorite_team_id: string
}

export interface ResolvedTeamMatchPredictionAuditRow {
  id: number
  actual_winner: string
  was_correct: boolean
  resolved_at: string
  updated_at: string
}

interface CompletedMatchWinnerRow {
  match_id: string
  winner: string | null
}

export function buildTeamMatchPredictionAuditRow(
  match: UpcomingMatch,
  forecast: NextMatchWinProbability | null,
  options: TeamMatchPredictionAuditOptions
): TeamMatchPredictionAuditRow | null {
  if (!forecast || match.winner) return null
  if (forecast.match_id !== match.match_id) return null

  const generatedAt = options.generatedAt ?? new Date().toISOString()

  return {
    match_id: match.match_id,
    model_version: options.modelVersion,
    team1_id: forecast.team1_id,
    team2_id: forecast.team2_id,
    team1_probability: forecast.team1_probability,
    team2_probability: forecast.team2_probability,
    favorite_team_id: forecast.favorite_team_id,
    confidence: forecast.confidence,
    prediction_source: options.predictionSource,
    generated_at: generatedAt,
    updated_at: generatedAt,
  }
}

export function resolveTeamMatchPredictionAuditRow(
  audit: UnresolvedTeamMatchPredictionAudit,
  actualWinner: string,
  resolvedAt = new Date().toISOString()
): ResolvedTeamMatchPredictionAuditRow {
  return {
    id: audit.id,
    actual_winner: actualWinner,
    was_correct: audit.favorite_team_id === actualWinner,
    resolved_at: resolvedAt,
    updated_at: resolvedAt,
  }
}

export async function recordTeamMatchPredictionAudit(
  match: UpcomingMatch,
  forecast: NextMatchWinProbability | null,
  options: TeamMatchPredictionAuditOptions
): Promise<void> {
  const row = buildTeamMatchPredictionAuditRow(match, forecast, options)
  if (!row) return

  const supabase = createSupabaseServiceRoleClient()
  const { error } = await supabase
    .from('team_match_prediction_audits')
    .upsert(row, { onConflict: 'match_id,model_version,prediction_source' })

  if (error) throw error
}

export async function resolveTeamMatchPredictionAudits(): Promise<number> {
  const supabase = createSupabaseServiceRoleClient()
  const { data: audits, error: auditError } = await supabase
    .from('team_match_prediction_audits')
    .select('id, match_id, favorite_team_id')
    .is('resolved_at', null)

  if (auditError) throw auditError
  if (!audits || audits.length === 0) return 0

  const matchIds = audits
    .map(audit => audit.match_id)
    .filter((matchId): matchId is string => typeof matchId === 'string' && matchId.length > 0)

  if (matchIds.length === 0) return 0

  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('match_id, winner')
    .in('match_id', matchIds)
    .not('winner', 'is', null)

  if (matchError) throw matchError

  const winners = new Map(
    ((matches ?? []) as CompletedMatchWinnerRow[])
      .filter(match => match.winner)
      .map(match => [match.match_id, match.winner as string])
  )
  const resolvedAt = new Date().toISOString()
  const updates = audits.flatMap(audit => {
    const winner = winners.get(audit.match_id)
    if (!winner) return []
    return [resolveTeamMatchPredictionAuditRow(audit, winner, resolvedAt)]
  })

  if (updates.length === 0) return 0

  const { error: updateError } = await supabase
    .from('team_match_prediction_audits')
    .upsert(updates)

  if (updateError) throw updateError
  return updates.length
}
