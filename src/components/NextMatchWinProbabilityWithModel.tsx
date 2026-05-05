'use client'

import { useEffect, useState } from 'react'
import { NextMatchWinProbability } from '@/components/NextMatchWinProbability'
import type { NextMatchWinProbability as NextMatchWinProbabilityPayload } from '@/lib/team-forecasts'
import { formatTeamName, getTeamConfig } from '@/lib/team-display'

type TeamMatchForecastResponse = {
  forecast: NextMatchWinProbabilityPayload | null
}

export function NextMatchWinProbabilityWithModel({
  matchId,
  initialForecast,
}: {
  matchId: string | null
  initialForecast: NextMatchWinProbabilityPayload | null
}) {
  const [modelForecast, setModelForecast] = useState<{
    matchId: string
    forecast: NextMatchWinProbabilityPayload | null
  } | null>(null)
  const [failedMatchId, setFailedMatchId] = useState<string | null>(null)
  const forecast = modelForecast?.matchId === matchId ? modelForecast.forecast : initialForecast
  const status = !matchId
    ? 'idle'
    : failedMatchId === matchId
      ? 'error'
      : modelForecast?.matchId === matchId
        ? 'ready'
        : 'loading'

  useEffect(() => {
    if (!matchId) return

    const controller = new AbortController()

    fetch(`/api/predictions/team-match/${matchId}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Prediction request failed with status ${response.status}`)
        }
        return response.json() as Promise<TeamMatchForecastResponse>
      })
      .then(payload => {
        setModelForecast({ matchId, forecast: payload.forecast })
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setFailedMatchId(matchId)
      })

    return () => controller.abort()
  }, [matchId])

  return (
    <div className="relative">
      <NextMatchWinProbability
        forecast={forecast}
        getTeamConfig={getTeamConfig}
        formatTeamName={formatTeamName}
      />
      {status === 'loading' && (
        <div className="absolute right-4 top-4 flex items-center gap-2 rounded-lg border border-brand-blue/20 bg-surface/95 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-blue shadow-lg">
          <span className="h-2 w-2 rounded-full border border-brand-blue border-t-transparent animate-spin" />
          ML loading
        </div>
      )}
      {status === 'error' && (
        <div className="absolute right-4 top-4 rounded-lg border border-brand-orange/20 bg-surface/95 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-orange shadow-lg">
          Fallback forecast
        </div>
      )}
    </div>
  )
}
