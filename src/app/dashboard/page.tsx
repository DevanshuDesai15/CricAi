import { getIPLStandings, getLatestIPLSeason, listRecentMatches } from '@/lib/queries/matches'
import { TeamPerformanceChart } from '@/components/TeamPerformanceChart'

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
  const key = Object.keys(TEAM_CONFIG).find(k => teamId.toLowerCase().includes(k.split('_')[0]))
    ?? teamId
  return TEAM_CONFIG[key] ?? { abbr: teamId.slice(0, 3).toUpperCase(), color: '#6366f1', secondaryColor: '#f97316' }
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
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.28,
      background: cfg.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.28, fontWeight: 700, color: '#fff',
      fontFamily: "'Fira Code', monospace",
      letterSpacing: '-0.5px',
      flexShrink: 0,
      boxShadow: `0 2px 8px ${cfg.color}55`,
    }}>
      {cfg.abbr.slice(0, 3)}
    </div>
  )
}

function SectionHeader({ title, tag, right }: { title: string; tag?: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      marginBottom: '14px',
    }}>
      <h2 style={{
        fontFamily: "'Fira Code', monospace",
        fontSize: '11px', fontWeight: 600,
        color: 'var(--text-secondary)', letterSpacing: '0.1em',
        margin: 0, textTransform: 'uppercase',
      }}>
        {title}
      </h2>
      {tag && <span className="badge badge-blue">{tag}</span>}
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      {right}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, accent, gradientColor,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  accent?: boolean
  gradientColor?: string
}) {
  const gColor = gradientColor ?? '#6366f1'
  return (
    <div className="stat-card" style={{ cursor: 'default' }}>
      {/* Top gradient bar */}
      <div className="stat-card-top-bar" style={{
        background: accent
          ? `linear-gradient(90deg, ${gColor}, transparent)`
          : 'transparent',
      }} />

      {/* Faint bg glow */}
      {accent && (
        <div style={{
          position: 'absolute', top: '-20px', left: '-20px',
          width: '120px', height: '120px',
          background: `radial-gradient(circle, ${gColor}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          fontSize: '10px', color: 'var(--text-muted)',
          letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase',
        }}>
          {label}
        </div>
        <div style={{
          width: '32px', height: '32px',
          background: accent ? `${gColor}18` : 'var(--border)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent ? gColor : 'var(--text-muted)',
        }}>
          {icon}
        </div>
      </div>

      <div style={{
        fontFamily: "'Fira Code', monospace",
        fontSize: '30px', fontWeight: 700,
        color: accent ? gColor : 'var(--text-primary)',
        lineHeight: 1.15, marginTop: '12px',
        letterSpacing: '-1px',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Icon SVGs (inline, no emoji) ──────────────────────────────────────────

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" />
  </svg>
)

const IconTrophy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
  </svg>
)

const IconDatabase = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
)

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
    <div className="match-card" style={{
      display: 'grid',
      gridTemplateColumns: '1fr 68px 1fr',
      alignItems: 'center',
      gap: '10px',
    }}>
      {/* Team 1 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        opacity: winner && !isT1Winner ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}>
        <TeamAvatar teamId={t1} size={32} />
        <div>
          <div style={{
            fontSize: '12px', fontWeight: 600,
            color: isT1Winner ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}>
            {getTeamConfig(t1).abbr}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {formatTeamName(t1).split(' ')[0]}
          </div>
        </div>
        {isT1Winner && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>WON</span>}
      </div>

      {/* Center */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: '11px', fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
        }}>
          VS
        </div>
        <div style={{
          fontSize: '10px', color: 'var(--text-dim)',
          marginTop: '3px', letterSpacing: '0.03em',
        }}>
          {dateStr}
        </div>
      </div>

      {/* Team 2 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        justifyContent: 'flex-end',
        opacity: winner && !isT2Winner ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}>
        {isT2Winner && <span className="badge badge-green">WON</span>}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '12px', fontWeight: 600,
            color: isT2Winner ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}>
            {getTeamConfig(t2).abbr}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
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
  const winPct = team.played > 0 ? (team.wins / team.played) * 100 : 0
  const isPlayoff = rank <= 4

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '26px 28px 1fr 34px 34px 42px',
      gap: '6px',
      padding: '10px 16px',
      alignItems: 'center',
      borderBottom: '1px solid var(--border-subtle)',
      background: isPlayoff ? 'rgba(99,102,241,0.02)' : 'transparent',
      transition: 'background 0.15s',
    }}>
      {/* Rank */}
      <span style={{
        fontFamily: "'Fira Code', monospace",
        fontSize: '11px',
        color: isPlayoff ? 'var(--blue-light)' : 'var(--text-dim)',
        fontWeight: isPlayoff ? 700 : 400,
      }}>
        {rank}
      </span>

      {/* Team avatar */}
      <TeamAvatar teamId={team.team_id} size={24} />

      {/* Team name + bar */}
      <div style={{ overflow: 'hidden', minWidth: 0 }}>
        <div style={{
          fontSize: '12px', fontWeight: 500,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {cfg.abbr}
        </div>
        <div className="win-bar-track" style={{ width: '100%' }}>
          <div
            className="win-bar-fill"
            style={{
              width: `${maxWins > 0 ? (team.wins / maxWins) * 100 : 0}%`,
              background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color}66)`,
            }}
          />
        </div>
      </div>

      {/* W */}
      <span style={{
        textAlign: 'center',
        fontFamily: "'Fira Code', monospace",
        fontSize: '13px', fontWeight: 600,
        color: 'var(--green)',
      }}>
        {team.wins}
      </span>

      {/* L */}
      <span style={{
        textAlign: 'center',
        fontFamily: "'Fira Code', monospace",
        fontSize: '13px',
        color: 'var(--text-muted)',
      }}>
        {team.losses}
      </span>

      {/* PTS */}
      <span style={{
        textAlign: 'center',
        fontFamily: "'Fira Code', monospace",
        fontSize: '13px', fontWeight: 700,
        color: isPlayoff ? 'var(--blue-light)' : 'var(--text-primary)',
        background: isPlayoff ? 'var(--blue-dim)' : 'transparent',
        borderRadius: '4px', padding: '2px 4px',
      }}>
        {team.wins * 2}
      </span>
    </div>
  )
}

// ── Win/Loss bar chart (client-rendered) ──────────────────────────────────
// Because recharts uses browser APIs, wrap in a server-safe component.
// For App Router we render this directly (recharts is compatible with RSC
// output as long as we mark the parent or use 'use client').

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

  // Chart data — top 8 teams
  const chartData = standings.slice(0, 8).map(t => ({
    name: getTeamConfig(t.team_id).abbr,
    wins: t.wins,
    losses: t.losses,
    color: getTeamConfig(t.team_id).color,
  }))

  return (
    <div style={{
      padding: '32px 36px',
      maxWidth: '1160px',
      minHeight: '100vh',
    }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '8px',
        }}>
          <span className="badge badge-orange" style={{ fontSize: '9px' }}>
            IPL {season}
          </span>
          <span style={{
            fontSize: '11px', color: 'var(--text-dim)',
            letterSpacing: '0.05em',
          }}>
            INDIAN PREMIER LEAGUE
          </span>
        </div>
        <h1 style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: '28px', fontWeight: 700, margin: 0,
          lineHeight: 1.15, letterSpacing: '-0.5px',
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Match Intelligence
          </span>
          <span style={{ color: 'var(--orange)', WebkitTextFillColor: 'var(--orange)' }}>.</span>
        </h1>
        <p style={{
          margin: '6px 0 0',
          fontSize: '13px', color: 'var(--text-muted)',
        }}>
          Real-time IPL data · Fantasy cricket analytics
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '14px',
        marginBottom: '32px',
      }}>
        <StatCard
          label="Matches Played"
          value={totalMatches}
          sub={`IPL ${season} season`}
          icon={<IconCalendar />}
          accent
          gradientColor="#6366f1"
        />
        <StatCard
          label="Active Teams"
          value={standings.length || 10}
          sub="IPL franchises"
          icon={<IconShield />}
          accent
          gradientColor="#f97316"
        />
        <StatCard
          label="Top Team"
          value={topTeam ? getTeamConfig(topTeam.team_id).abbr : '—'}
          sub={topTeam ? `${topTeam.wins}W · ${topTeam.wins * 2} pts` : 'No data'}
          icon={<IconTrophy />}
          accent
          gradientColor={topTeamCfg?.color ?? '#10b981'}
        />
        <StatCard
          label="Data Coverage"
          value="6"
          sub="T20 leagues loaded"
          icon={<IconDatabase />}
          gradientColor="#6366f1"
        />
      </div>

      {/* ── Main two-column layout ───────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        gap: '24px',
        alignItems: 'start',
      }}>

        {/* ── Left column ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* Win / Loss chart */}
          <div>
            <SectionHeader title="Team Performance" tag="W / L" />
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px 16px 12px',
            }}>
              <TeamPerformanceChart data={chartData} />

              {/* Legend */}
              <div style={{
                display: 'flex', gap: '16px', justifyContent: 'flex-end',
                marginTop: '8px', paddingRight: '8px',
              }}>
                {[
                  { label: 'Wins', color: '#6366f1' },
                  { label: 'Losses', color: '#ef444455' },
                ].map(({ label, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</span>
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
              right={
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Last {recentMatches.length} games
                </span>
              }
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentMatches.length === 0 ? (
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '32px', textAlign: 'center',
                  color: 'var(--text-muted)', fontSize: '13px',
                }}>
                  No match data yet.
                </div>
              ) : recentMatches.map(m => (
                <MatchCard key={m.match_id} match={m} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: Points table ───────────────────────────────── */}
        <div>
          <SectionHeader title="Points Table" tag={season} />
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '26px 28px 1fr 34px 34px 42px',
              gap: '6px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: '10px', color: 'var(--text-dim)',
              fontWeight: 600, letterSpacing: '0.09em',
            }}>
              <span>#</span>
              <span />
              <span>TEAM</span>
              <span style={{ textAlign: 'center' }}>W</span>
              <span style={{ textAlign: 'center' }}>L</span>
              <span style={{ textAlign: 'center' }}>PTS</span>
            </div>

            {standings.length === 0 ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '12px',
              }}>
                No standings for {season} yet.
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
            <div style={{
              marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '6px',
              paddingLeft: '4px',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '2px',
                background: 'var(--blue-dim)',
                border: '1px solid rgba(99,102,241,0.3)',
                flexShrink: 0,
              }} />
              Top 4 qualify for playoffs
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
