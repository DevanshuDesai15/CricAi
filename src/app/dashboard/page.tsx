import { getIPLStandings, getLatestIPLSeason, listRecentMatches } from '@/lib/queries/matches'
import { TeamPerformanceChart } from '@/components/TeamPerformanceChart'
import { 
  Calendar, 
  Shield, 
  Trophy, 
  Database, 
  Activity,
  History,
  TrendingUp,
  ChevronRight
} from 'lucide-react'

// ── Team config ───────────────────────────────────────────────────────────

const TEAM_CONFIG: Record<string, { abbr: string; color: string; secondaryColor: string }> = {
  mumbai_indians:           { abbr: 'MI',  color: '#004ba0', secondaryColor: '#d4a017' },
  chennai_super_kings:      { abbr: 'CSK', color: '#fdb913', secondaryColor: '#1a5276' },
  royal_challengers_bangalore: { abbr: 'RCB', color: '#ec1c24', secondaryColor: '#1a1a1a' },
  kolkata_knight_riders:    { abbr: 'KKR', color: '#3a225d', secondaryColor: '#d4a017' },
  delhi_capitals:           { abbr: 'DC',  color: '#0078bc', secondaryColor: '#ef1c25' },
  punjab_kings:             { abbr: 'PBKS',color: '#d71920', secondaryColor: '#a7a9ac' },
  rajasthan_royals:         { abbr: 'RR',  color: '#254aa5', secondaryColor: '#ff69b4' },
  sunrisers_hyderabad:      { abbr: 'SRH', color: '#f7a721', secondaryColor: '#e8461a' },
  gujarat_titans:           { abbr: 'GT',  color: '#1c2951', secondaryColor: '#6db4e2' },
  lucknow_super_giants:     { abbr: 'LSG', color: '#a72b2a', secondaryColor: '#5bc2e7' },
}

function getTeamConfig(teamId: string) {
  const tid = teamId.toLowerCase().replace(/[\s_-]+/g, '_')
  
  if (TEAM_CONFIG[tid]) return TEAM_CONFIG[tid]
  
  const key = Object.keys(TEAM_CONFIG).find(k => {
    const prefix = k.split('_')[0]
    return tid.startsWith(prefix) || k.startsWith(tid.split('_')[0])
  })

  if (key) return TEAM_CONFIG[key]
  
  const abbrKey = Object.keys(TEAM_CONFIG).find(k => 
    TEAM_CONFIG[k].abbr.toLowerCase() === tid
  )
  if (abbrKey) return TEAM_CONFIG[abbrKey]

  return { 
    abbr: teamId.length <= 4 ? teamId.toUpperCase() : teamId.slice(0, 3).toUpperCase(), 
    color: '#6366f1', 
    secondaryColor: '#f97316' 
  }
}

function formatTeamName(teamId: string): string {
  return teamId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// ── Sub-components ────────────────────────────────────────────────────────

function TeamAvatar({ teamId, size = 36 }: { teamId: string; size?: number }) {
  const cfg = getTeamConfig(teamId)
  return (
    <div 
      className="rounded-lg flex items-center justify-center font-fira-code font-bold text-white shrink-0 shadow-lg"
      style={{
        width: size, height: size,
        background: cfg.color,
        fontSize: size * 0.28,
        boxShadow: `0 2px 8px ${cfg.color}55`,
      }}
    >
      {cfg.abbr.slice(0, 3)}
    </div>
  )
}

function SectionHeader({ title, tag, right, icon: Icon }: { title: string; tag?: string; right?: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-text-muted" />}
      <h2 className="font-fira-code text-[11px] font-semibold text-text-secondary tracking-widest uppercase m-0">
        {title}
      </h2>
      {tag && (
        <span className="px-2 py-0.5 rounded bg-brand-blue-dim text-brand-blue border border-brand-blue-dim/20 text-[10px] font-bold tracking-widest uppercase">
          {tag}
        </span>
      )}
      <div className="flex-1 h-px bg-border" />
      {right}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent, gradientColor,
}: {
  label: string
  value: string | number
  sub?: string
  icon: any
  accent?: boolean
  gradientColor?: string
}) {
  const gColor = gradientColor ?? '#6366f1'
  return (
    <div className="stat-card p-5 pb-5 rounded-xl bg-card border border-border transition-all hover:border-brand-blue/20 hover:shadow-[0_0_24px_rgba(99,102,241,0.1)] group relative overflow-hidden">
      {/* Top gradient bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: accent ? `linear-gradient(90deg, ${gColor}, transparent)` : 'transparent',
        }} 
      />

      {/* Faint bg glow */}
      {accent && (
        <div 
          className="absolute -top-5 -left-5 w-30 h-30 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${gColor}18 0%, transparent 70%)` }} 
        />
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="text-[10px] text-text-muted tracking-widest font-bold uppercase">
          {label}
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? '' : 'bg-border text-text-muted'}`}
             style={{ background: accent ? `${gColor}18` : undefined, color: accent ? gColor : undefined }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div 
        className="font-fira-code text-[30px] font-bold leading-[1.15] tracking-tighter"
        style={{ color: accent ? gColor : 'var(--text-primary)' }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs text-text-muted mt-1">
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Match card ────────────────────────────────────────────────────────────

function MatchCard({ match }: {
  match: {
    match_id: string
    match_date: string
    team1_id: string | null
    team2_id: string | null
    winner: string | null
    venue_id: string | null
    season: string
  }
}) {
  const t1 = match.team1_id ?? ''
  const t2 = match.team2_id ?? ''
  const winner = match.winner
  const dateStr = new Date(match.match_date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: '2-digit',
  })
  const isT1Winner = winner === t1
  const isT2Winner = winner === t2

  return (
    <div className="match-card grid grid-cols-[1fr_68px_1fr] items-center gap-2.5 p-3.5 px-4.5 bg-card border border-border rounded-xl hover:bg-card-hover hover:border-brand-blue/20 transition-all cursor-pointer">
      {/* Team 1 */}
      <div className={`flex items-center gap-2.5 transition-opacity duration-150 ${winner && !isT1Winner ? 'opacity-50' : 'opacity-100'}`}>
        <TeamAvatar teamId={t1} size={32} />
        <div>
          <div className={`text-xs font-bold ${isT1Winner ? 'text-text-primary' : 'text-text-secondary'}`}>
            {getTeamConfig(t1).abbr}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            {formatTeamName(t1).split(' ')[0]}
          </div>
        </div>
        {isT1Winner && (
          <span className="ml-auto px-2 py-0.5 rounded bg-brand-green-dim text-brand-green border border-brand-green-dim/20 text-[9px] font-bold tracking-widest">
            WON
          </span>
        )}
      </div>

      {/* Center */}
      <div className="text-center">
        <div className="font-fira-code text-[11px] font-bold text-text-muted tracking-widest">
          VS
        </div>
        <div className="text-[10px] text-text-dim mt-0.5 tracking-tight">
          {dateStr}
        </div>
      </div>

      {/* Team 2 */}
      <div className={`flex items-center gap-2.5 justify-end transition-opacity duration-150 ${winner && !isT2Winner ? 'opacity-50' : 'opacity-100'}`}>
        {isT2Winner && (
          <span className="px-2 py-0.5 rounded bg-brand-green-dim text-brand-green border border-brand-green-dim/20 text-[9px] font-bold tracking-widest">
            WON
          </span>
        )}
        <div className="text-right">
          <div className={`text-xs font-bold ${isT2Winner ? 'text-text-primary' : 'text-text-secondary'}`}>
            {getTeamConfig(t2).abbr}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            {formatTeamName(t2).split(' ')[0]}
          </div>
        </div>
        <TeamAvatar teamId={t2} size={32} />
      </div>
    </div>
  )
}

// ── Standings table ───────────────────────────────────────────────────────

function StandingsRow({
  team, rank, maxWins,
}: {
  team: { team_id: string; wins: number; losses: number; played: number }
  rank: number
  maxWins: number
}) {
  const cfg = getTeamConfig(team.team_id)
  const isPlayoff = rank <= 4

  return (
    <div className={`grid grid-cols-[26px_28px_1fr_34px_34px_42px] gap-1.5 px-4 py-2.5 items-center border-b border-border-subtle transition-colors ${isPlayoff ? 'bg-brand-blue-dim/20' : 'hover:bg-white/[0.01]'}`}>
      {/* Rank */}
      <span className={`font-fira-code text-[11px] ${isPlayoff ? 'text-brand-blue font-bold' : 'text-text-dim font-normal'}`}>
        {rank}
      </span>

      {/* Team avatar */}
      <TeamAvatar teamId={team.team_id} size={24} />

      {/* Team name + bar */}
      <div className="overflow-hidden min-w-0">
        <div className="text-xs font-medium text-text-primary truncate">
          {cfg.abbr}
        </div>
        <div className="h-1 bg-border rounded-full overflow-hidden mt-1 w-full">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${maxWins > 0 ? (team.wins / maxWins) * 100 : 0}%`,
              background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color}66)`,
            }}
          />
        </div>
      </div>

      {/* W */}
      <span className="text-center font-fira-code text-[13px] font-bold text-brand-green">
        {team.wins}
      </span>

      {/* L */}
      <span className="text-center font-fira-code text-[13px] text-text-muted">
        {team.losses}
      </span>

      {/* PTS */}
      <span className={`text-center font-fira-code text-[13px] font-bold rounded px-1 min-w-[28px] ${isPlayoff ? 'text-brand-blue bg-brand-blue-dim' : 'text-text-primary'}`}>
        {team.wins * 2}
      </span>
    </div>
  )
}

// ── Dashboard page ────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [season, standings, recentMatches] = await Promise.all([
    getLatestIPLSeason(),
    getIPLStandings(),
    listRecentMatches('ipl', 12),
  ])

  const totalMatches = standings.reduce((s, t) => s + t.played, 0) / 2 | 0
  const topTeam = standings[0]
  const topTeamCfg = topTeam ? getTeamConfig(topTeam.team_id) : null
  const maxWins = standings[0]?.wins ?? 1

  const chartData = standings.slice(0, 8).map(t => ({
    name: getTeamConfig(t.team_id).abbr,
    wins: t.wins,
    losses: t.losses,
    color: getTeamConfig(t.team_id).color,
  }))

  return (
    <div className="p-8 pb-12 max-w-7xl min-h-screen">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-7">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="px-2 py-0.5 rounded bg-brand-orange-dim text-brand-orange border border-brand-orange-dim/20 text-[9px] font-bold tracking-widest uppercase">
            IPL {season ?? '2026'}
          </span>
          <span className="text-[11px] text-text-dim tracking-wider font-semibold">
            INDIAN PREMIER LEAGUE
          </span>
        </div>
        <h1 className="font-fira-code text-3xl font-bold leading-tight tracking-tight m-0">
          <span className="bg-gradient-to-br from-white to-text-secondary bg-clip-text text-transparent italic">
            Match Intelligence
          </span>
          <span className="text-brand-orange">.</span>
        </h1>
        <p className="mt-1.5 text-[13px] text-text-muted flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-brand-blue" />
          Real-time IPL data &middot; Fantasy cricket analytics
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
        <StatCard
          label="Matches Played"
          value={totalMatches}
          sub={`IPL ${season ?? '2026'} season`}
          icon={Calendar}
          accent
          gradientColor="#6366f1"
        />
        <StatCard
          label="Active Teams"
          value={standings.length || 10}
          sub="IPL franchises"
          icon={Shield}
          accent
          gradientColor="#f97316"
        />
        <StatCard
          label="Top Team"
          value={topTeam ? getTeamConfig(topTeam.team_id).abbr : '—'}
          sub={topTeam ? `${topTeam.wins}W · ${topTeam.wins * 2} pts` : 'No data'}
          icon={Trophy}
          accent
          gradientColor={topTeamCfg?.color ?? '#10b981'}
        />
        <StatCard
          label="Data Coverage"
          value="6"
          sub="T20 leagues loaded"
          icon={Database}
          gradientColor="#6366f1"
        />
      </div>

      {/* ── Main two-column layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">

        {/* ── Left column ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-7">

          {/* Win / Loss chart */}
          <div>
            <SectionHeader title="Team Performance" tag="W / L" icon={TrendingUp} />
            <div className="bg-card border border-border rounded-xl p-5 pt-5 pb-3">
              <TeamPerformanceChart data={chartData} />

              {/* Legend */}
              <div className="flex gap-4 justify-end mt-2 pr-2">
                {[
                  { label: 'Wins', color: '#6366f1' },
                  { label: 'Losses', color: 'rgba(239, 68, 68, 0.3)' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
                    <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent matches */}
          <div>
            <SectionHeader
              title="Recent Matches"
              tag="LIVE"
              icon={History}
              right={
                <span className="text-[11px] text-text-dim font-bold tracking-wider">
                  LAST {recentMatches.length} GAMES
                </span>
              }
            />
            <div className="flex flex-col gap-1.5">
              {recentMatches.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 py-12 text-center text-text-muted text-sm italic">
                  No match data currently available.
                </div>
              ) : recentMatches.map(m => (
                <MatchCard key={m.match_id} match={m} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: Points table ───────────────────────────────── */}
        <div className="sticky top-8">
          <SectionHeader title="Points Table" tag={season ?? '2026'} icon={Trophy} />
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[26px_28px_1fr_34px_34px_42px] gap-1.5 px-4 py-3 border-b border-border text-[10px] text-text-dim font-bold tracking-widest uppercase">
              <span>#</span>
              <span />
              <span>Team</span>
              <span className="text-center">W</span>
              <span className="text-center">L</span>
              <span className="text-center">Pts</span>
            </div>

            {standings.length === 0 ? (
              <div className="p-8 py-12 text-center text-text-muted text-xs italic">
                Standings data unavailable for {season ?? '2026'}.
              </div>
            ) : standings.map((team, i) => (
              <StandingsRow
                key={team.team_id}
                team={team}
                rank={i + 1}
                maxWins={maxWins}
              />
            ))}
          </div>

          {standings.length > 0 && (
            <div className="mt-3 text-[11px] text-text-muted flex items-center gap-2 px-1">
              <div className="w-2 h-2 rounded-sm bg-brand-blue-dim border border-brand-blue/30 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.2)]" />
              <span className="font-medium">Top 4 teams qualify for playoffs</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
