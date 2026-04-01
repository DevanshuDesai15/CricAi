import { getIPLStandings, getLatestIPLSeason, listRecentMatches } from '@/lib/queries/matches'

function StatCard({ label, value, sub, accent = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean
}) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, var(--blue), var(--orange))',
        }} />
      )}
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Fira Code', monospace",
        fontSize: '32px', fontWeight: 700,
        color: accent ? 'var(--blue)' : 'var(--text-primary)',
        lineHeight: 1.2, marginTop: '6px',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function SectionHeader({ title, tag }: { title: string; tag?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <h2 style={{
        fontFamily: "'Fira Code', monospace",
        fontSize: '13px', fontWeight: 600,
        color: 'var(--text-primary)', letterSpacing: '0.06em',
        margin: 0,
      }}>
        {title}
      </h2>
      {tag && (
        <span style={{
          fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
          color: 'var(--blue)', background: 'var(--blue-dim)',
          border: '1px solid rgba(59,130,246,0.2)',
          padding: '2px 8px', borderRadius: '4px',
        }}>
          {tag}
        </span>
      )}
      <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
    </div>
  )
}

function TeamBadge({ teamId }: { teamId: string }) {
  const name = teamId.replace(/_/g, ' ').toUpperCase()
  const abbr = name.split(' ').map(w => w[0]).join('').slice(0, 3)
  const colors: Record<string, string> = {
    'mumbai': '#004ba0', 'chennai': '#fdb913', 'bangalore': '#ec1c24',
    'kolkata': '#3a225d', 'delhi': '#0078bc', 'punjab': '#d71920',
    'rajasthan': '#254aa5', 'hyderabad': '#f7a721', 'gujarat': '#1c1c1c',
    'lucknow': '#a72b2a',
  }
  const colorKey = Object.keys(colors).find(k => teamId.includes(k))
  const color = colorKey ? colors[colorKey] : 'var(--border)'

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '6px',
        background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '9px', fontWeight: 700, color: '#fff', fontFamily: 'monospace',
        flexShrink: 0,
      }}>
        {abbr}
      </div>
      <span style={{ fontSize: '13px', fontWeight: 500 }}>{name}</span>
    </div>
  )
}

export default async function DashboardPage() {
  const [season, standings, recentMatches] = await Promise.all([
    getLatestIPLSeason(),
    getIPLStandings(),
    listRecentMatches('ipl', 10),
  ])

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1100px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '6px' }}>
          INDIAN PREMIER LEAGUE · {season}
        </div>
        <h1 style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: '26px', fontWeight: 700,
          color: 'var(--text-primary)', margin: 0, lineHeight: 1.2,
        }}>
          Match Intelligence
          <span style={{ color: 'var(--orange)' }}>.</span>
        </h1>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '36px',
      }}>
        <StatCard label="MATCHES THIS SEASON" value={recentMatches.length > 0 ? standings.reduce((s, t) => s + t.played, 0) / 2 | 0 : 0} sub={`IPL ${season}`} accent />
        <StatCard label="TEAMS" value={standings.length || 10} sub="Active franchises" />
        <StatCard label="DATA COVERAGE" value="6" sub="T20 leagues loaded" />
      </div>

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>

        {/* Recent matches */}
        <div>
          <SectionHeader title="RECENT MATCHES" tag="LIVE DATA" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentMatches.length === 0 ? (
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '32px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '13px',
              }}>
                No match data yet.
              </div>
            ) : recentMatches.map(m => (
              <div key={m.match_id} style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '12px',
                transition: 'border-color 0.15s',
              }}>
                {/* Team 1 */}
                <div>
                  <TeamBadge teamId={m.team1_id ?? ''} />
                </div>

                {/* Center: date + result */}
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  <div style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '10px', color: 'var(--text-muted)',
                    letterSpacing: '0.05em',
                  }}>
                    {new Date(m.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  {m.winner && (
                    <div style={{
                      marginTop: '4px', fontSize: '9px', fontWeight: 600,
                      letterSpacing: '0.08em',
                      color: m.winner === m.team1_id ? 'var(--green)' : m.winner === m.team2_id ? 'var(--green)' : 'var(--text-muted)',
                    }}>
                      ● RESULT
                    </div>
                  )}
                </div>

                {/* Team 2 */}
                <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end' }}>
                  <TeamBadge teamId={m.team2_id ?? ''} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standings */}
        <div>
          <SectionHeader title="POINTS TABLE" tag={season} />
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '28px 1fr 36px 36px 36px',
              gap: '8px', padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: '10px', color: 'var(--text-muted)',
              fontWeight: 600, letterSpacing: '0.08em',
            }}>
              <span>#</span><span>TEAM</span><span style={{ textAlign: 'center' }}>W</span>
              <span style={{ textAlign: 'center' }}>L</span>
              <span style={{ textAlign: 'center' }}>PTS</span>
            </div>

            {standings.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No standings data for {season}.
              </div>
            ) : standings.map((team, i) => (
              <div key={team.team_id} style={{
                display: 'grid', gridTemplateColumns: '28px 1fr 36px 36px 36px',
                gap: '8px', padding: '11px 16px',
                borderBottom: i < standings.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                alignItems: 'center',
                background: i < 4 ? 'rgba(59,130,246,0.02)' : 'transparent',
              }}>
                <span style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: '12px',
                  color: i < 4 ? 'var(--blue)' : 'var(--text-muted)',
                  fontWeight: i < 4 ? 600 : 400,
                }}>
                  {i + 1}
                </span>
                <span style={{
                  fontSize: '12px', fontWeight: 500,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {team.team_id.replace(/_/g, ' ')}
                </span>
                <span style={{
                  textAlign: 'center', fontFamily: "'Fira Code', monospace",
                  fontSize: '13px', fontWeight: 600, color: 'var(--green)',
                }}>
                  {team.wins}
                </span>
                <span style={{
                  textAlign: 'center', fontFamily: "'Fira Code', monospace",
                  fontSize: '13px', color: 'var(--text-muted)',
                }}>
                  {team.losses}
                </span>
                <span style={{
                  textAlign: 'center', fontFamily: "'Fira Code', monospace",
                  fontSize: '13px', fontWeight: 700,
                  color: i < 4 ? 'var(--blue)' : 'var(--text-primary)',
                }}>
                  {team.wins * 2}
                </span>
              </div>
            ))}
          </div>

          {standings.length > 0 && (
            <div style={{
              marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ color: 'var(--blue)', fontWeight: 600 }}>●</span>
              Top 4 qualify for playoffs
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
