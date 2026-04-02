'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface ChartEntry {
  name: string
  wins: number
  losses: number
  color: string
}

export function TeamPerformanceChart({ data }: { data: ChartEntry[] }) {
  if (data.length === 0) {
    return (
      <div style={{
        height: '160px', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: '13px',
      }}>
        No standings data yet.
      </div>
    )
  }

  return (
    <div style={{ height: '160px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barSize={10}
          barGap={3}
          margin={{ top: 4, right: 8, bottom: 0, left: -28 }}
        >
          <XAxis
            dataKey="name"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: "'Fira Code', monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#475569', fontSize: 10, fontFamily: "'Fira Code', monospace" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(99,102,241,0.05)' }}
            contentStyle={{
              background: '#16161d',
              border: '1px solid #1e1e32',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: "'Fira Code', monospace",
              color: '#f1f5f9',
            }}
            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
          />
          <Bar dataKey="wins" name="Wins" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`win-${index}`} fill={entry.color} fillOpacity={0.9} />
            ))}
          </Bar>
          <Bar dataKey="losses" name="Losses" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`loss-${index}`} fill="#ef4444" fillOpacity={0.35} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
