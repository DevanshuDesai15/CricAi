import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'CricAI — Fantasy Cricket Intelligence',
  description: 'AI-powered Dream11 team predictions',
}

function Sidebar() {
  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 28px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--blue)',
          letterSpacing: '-0.5px',
        }}>
          CRIC<span style={{ color: 'var(--orange)' }}>AI</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '0.05em' }}>
          FANTASY INTELLIGENCE
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        {[
          { href: '/dashboard', label: 'Dashboard', icon: '▦' },
          { href: '/players', label: 'Players', icon: '◈' },
        ].map(({ href, label, icon }) => (
          <Link key={href} href={href} className="nav-link">
            <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      {/* Phase badge */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          background: 'var(--blue-dim)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '6px',
          padding: '10px 12px',
        }}>
          <div style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 600, letterSpacing: '0.08em' }}>
            PHASE 1 ACTIVE
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Data Foundation
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <main style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
