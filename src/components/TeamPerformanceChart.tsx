'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
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
    <div style={{ height: '220px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barSize={14}
          barGap={4}
          margin={{ top: 10, right: 18, bottom: 8, left: -10 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="rgba(148, 163, 184, 0.12)"
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: 'rgba(99, 102, 241, 0.10)' }}
            contentStyle={{
              background: '#11131d',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              borderRadius: '8px',
              boxShadow: '0 18px 45px rgba(0, 0, 0, 0.35)',
              fontSize: '12px',
              fontFamily: "'Fira Code', monospace",
            }}
            labelStyle={{
              color: '#e2e8f0',
              fontWeight: 700,
              marginBottom: '8px',
            }}
            itemStyle={{
              color: '#cbd5e1',
              paddingTop: '4px',
            }}
            separator=": "
          />
          <Bar dataKey="wins" name="Wins" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`win-${index}`} fill={entry.color} fillOpacity={1} />
            ))}
          </Bar>
          <Bar dataKey="losses" name="Losses" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`loss-${index}`} fill="#f87171" fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
