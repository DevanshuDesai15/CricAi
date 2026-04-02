import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'CricAI — Fantasy Cricket Intelligence',
  description: 'AI-powered Dream11 team predictions',
}

// ── SVG icon components ───────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3.5" />
      <path d="M2 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
      <path d="M16 3.5a3.5 3.5 0 0 1 0 7" strokeOpacity="0.6" />
      <path d="M22 20c0-3.5-2.3-5.7-6-6" strokeOpacity="0.6" />
    </svg>
  )
}

function IconActivity() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function IconCricket() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" strokeOpacity="0.3" />
      <path d="M5.6 5.6c3.6 3.6 3.6 9.2 0 12.8M18.4 5.6c-3.6 3.6-3.6 9.2 0 12.8" strokeOpacity="0.3" />
    </svg>
  )
}

// ── Nav items ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
]

// ── Sidebar ───────────────────────────────────────────────────────────────

function Sidebar() {
  return (
    <aside style={{
      width: '220px',
      height: '100vh',
      position: 'sticky',
      top: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 22px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #6366f1 0%, #f97316 100%)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <IconCricket />
          </div>
          <div>
            <div style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: '15px', fontWeight: 700,
              background: 'linear-gradient(135deg, #818cf8 0%, #fb923c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.3px',
              lineHeight: 1.1,
            }}>
              CRIC<span>AI</span>
            </div>
            <div style={{
              fontSize: '10px', color: 'var(--text-muted)',
              letterSpacing: '0.06em', marginTop: '1px',
            }}>
              FANTASY INTELLIGENCE
            </div>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{
          fontSize: '10px', fontWeight: 600,
          color: 'var(--text-dim)', letterSpacing: '0.1em',
          paddingLeft: '12px',
        }}>
          NAVIGATION
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ padding: '0 12px', flex: 1 }}>
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="nav-link">
            <Icon />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: '16px 16px 24px' }}>
        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)', marginBottom: '16px' }} />

        {/* Phase badge */}
        <div style={{
          background: 'var(--blue-dim)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '8px',
          padding: '10px 12px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '4px',
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 6px var(--green)',
            }} className="pulse" />
            <div style={{ fontSize: '10px', color: 'var(--blue-light)', fontWeight: 600, letterSpacing: '0.08em' }}>
              PHASE 2 ACTIVE
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Live Data & ML Foundation
          </div>
        </div>

        {/* Version */}
        <div style={{
          marginTop: '12px',
          fontSize: '11px', color: 'var(--text-dim)',
          display: 'flex', alignItems: 'center', gap: '6px',
          paddingLeft: '4px',
        }}>
          <IconActivity />
          <span>v0.2.0-alpha</span>
        </div>
      </div>
    </aside>
  )
}

// ── Root Layout ───────────────────────────────────────────────────────────

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
