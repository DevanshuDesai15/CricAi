'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  Zap,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  Activity,
  BarChart3,
  Star,
  Users,
  Database,
  GitBranch,
} from 'lucide-react'

// ── Design tokens ─────────────────────────────────────────────────────────────
// KKR: deep purple-black bg, gold accents, violet mid-tones
const BG       = '#08010F'        // near-black with purple undertone
const GOLD     = '#FFB800'        // KKR gold
const GOLD_LT  = '#FFD15C'        // lighter gold
const GOLD_DK  = '#CC8800'        // darker gold
const PURPLE   = '#7C3AED'        // violet accent
const PURPLE_D = '#2D0A5E'        // deep purple surface
const WHITE    = '#F5F0FF'        // white with purple tint
const MUTED    = '#6B5B8A'        // muted purple-grey
const DIM      = '#3B2D5A'        // very dim purple

const BEBAS = { fontFamily: "'Bebas Neue', sans-serif" }
const DM    = { fontFamily: "'DM Sans', sans-serif" }
const MONO  = { fontFamily: "'Space Mono', monospace" }

// ── Noise texture ─────────────────────────────────────────────────────────────
const NoiseOverlay = () => (
  <svg className="pointer-events-none fixed inset-0 w-full h-full opacity-[0.04] z-[1000]" xmlns="http://www.w3.org/2000/svg">
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)"/>
  </svg>
)

// ── Cricket ball SVG (red leather) ───────────────────────────────────────────
const CricketBallIcon = ({ size = 28, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="14" fill="#c84b31" stroke="#a83828" strokeWidth="1"/>
    <path d="M6 10 Q10 16 6 22" stroke="#f5e6e0" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M7 10 Q11 16 7 22" stroke="#f5e6e0" strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
    <path d="M26 10 Q22 16 26 22" stroke="#f5e6e0" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M25 10 Q21 16 25 22" stroke="#f5e6e0" strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
    <path d="M2 16 Q16 8 30 16" stroke="#f5e6e0" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

// ── Crown motif (KKR) ─────────────────────────────────────────────────────────
const CrownIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M2 19h20M4 9l4 5 4-8 4 8 4-5v10H4V9z" stroke={GOLD} strokeWidth="1.5" strokeLinejoin="round" fill={`${GOLD}18`}/>
    <circle cx="4" cy="9" r="1.5" fill={GOLD}/>
    <circle cx="12" cy="1" r="1.5" fill={GOLD}/>
    <circle cx="20" cy="9" r="1.5" fill={GOLD}/>
  </svg>
)

// ── Prediction card ───────────────────────────────────────────────────────────
const PLAYERS = [
  { name: 'V. Kohli',   role: 'BAT', pts: 94, conf: 96, team: 'RCB', badge: 'C' },
  { name: 'J. Bumrah',  role: 'BWL', pts: 88, conf: 91, team: 'MI',  badge: 'VC' },
  { name: 'R. Jadeja',  role: 'AR',  pts: 82, conf: 87, team: 'CSK', badge: null },
]

const PredictionCard = () => {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="relative w-full max-w-[340px] rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${PURPLE_D}CC 0%, ${BG}EE 100%)`,
        border: `1px solid ${GOLD}30`,
        boxShadow: `0 0 80px ${GOLD}12, 0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 ${GOLD}20`,
      }}
    >
      {/* Gold scan line */}
      <div
        className="absolute left-0 right-0 h-px animate-scan pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}80, transparent)` }}
      />

      {/* Top crown decoration */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}60, transparent)` }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4"
           style={{ borderBottom: `1px solid ${GOLD}12` }}>
        <div>
          <p style={{ ...MONO, fontSize: 10, color: GOLD, letterSpacing: '0.15em' }}>
            CRIC<span style={{ color: MUTED }}>AI</span> ENGINE
          </p>
          <p style={{ ...DM, fontSize: 13, color: WHITE, fontWeight: 600 }}>
            IPL 2026 · Match Day 24
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: GOLD }} />
          <span style={{ ...MONO, fontSize: 10, color: GOLD }}>LIVE</span>
        </div>
      </div>

      {/* Players */}
      <div className="px-5 py-4 flex flex-col gap-3">
        {PLAYERS.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div style={{ ...BEBAS, fontSize: 20, color: `${GOLD}40`, minWidth: 24, lineHeight: 1 }}>{i + 1}</div>

            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative"
              style={{ background: `${GOLD}0E`, border: `1px solid ${GOLD}25` }}
            >
              <span style={{ ...BEBAS, fontSize: 14, color: GOLD }}>{p.name[0]}</span>
              {p.badge && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: GOLD, color: '#000', ...MONO, fontSize: 7, fontWeight: 700 }}
                >
                  {p.badge[0]}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p style={{ ...DM, fontSize: 13, fontWeight: 600, color: WHITE }}>{p.name}</p>
              <p style={{ ...MONO, fontSize: 9, color: MUTED, letterSpacing: '0.1em' }}>
                {p.role} · {p.team}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span style={{ ...MONO, fontSize: 11, color: GOLD, fontWeight: 700 }}>
                {p.pts}<span style={{ color: DIM, fontWeight: 400 }}> pts</span>
              </span>
              <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: `${PURPLE}30` }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LT})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${p.conf}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer stat */}
      <div
        className="mx-5 mb-5 px-4 py-3 rounded-xl flex items-center justify-between"
        style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}18` }}
      >
        <span style={{ ...DM, fontSize: 12, color: MUTED }}>Model confidence</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={tick}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{ ...MONO, fontSize: 13, color: GOLD, fontWeight: 700 }}
          >
            {[91, 94, 89, 93][tick % 4]}%
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Ticker ────────────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { label: 'MATCHES ANALYZED', value: '5,240+' },
  { label: 'PREDICTION ACCURACY', value: '89%' },
  { label: 'TEAMS BUILT', value: '12K+' },
  { label: 'IPL 2026 ACTIVE', value: 'LIVE' },
  { label: 'PLAYERS TRACKED', value: '650+' },
  { label: 'DATA POINTS / MATCH', value: '1,400+' },
]

const Ticker = () => {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div
      className="relative w-full overflow-hidden py-4"
      style={{
        borderTop: `1px solid ${GOLD}18`,
        borderBottom: `1px solid ${GOLD}18`,
        background: `linear-gradient(90deg, ${PURPLE_D}40, ${BG}60, ${PURPLE_D}40)`,
      }}
    >
      <div className="flex animate-marquee whitespace-nowrap">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-3 mx-8">
            <span style={{ ...MONO, fontSize: 10, color: MUTED, letterSpacing: '0.12em' }}>
              {item.label}
            </span>
            <span style={{ ...BEBAS, fontSize: 18, color: GOLD, letterSpacing: '0.04em' }}>
              {item.value}
            </span>
            <span style={{ color: `${GOLD}35`, fontSize: 12 }}>◆</span>
          </span>
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 w-16 pointer-events-none" style={{ background: `linear-gradient(90deg, ${BG}, transparent)` }} />
      <div className="absolute inset-y-0 right-0 w-16 pointer-events-none" style={{ background: `linear-gradient(270deg, ${BG}, transparent)` }} />
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────
const Nav = () => {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] transition-all duration-500"
      style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        padding: '0 40px',
        justifyContent: 'space-between',
        background: scrolled ? `${BG}E8` : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: scrolled ? `1px solid ${GOLD}18` : '1px solid transparent',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <CricketBallIcon size={26} />
        <span style={{ ...BEBAS, fontSize: 26, color: WHITE, letterSpacing: '0.08em' }}>
          CRIC<span className="shimmer-gold">AI</span>
        </span>
      </div>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-8">
        {['Features', 'How It Works', 'Roadmap'].map(l => (
          <a
            key={l}
            href={`#${l.toLowerCase().replace(/\s/g, '-')}`}
            style={{ ...DM, fontSize: 14, color: MUTED, fontWeight: 500 }}
            className="hover:text-white transition-colors duration-200"
          >
            {l}
          </a>
        ))}
      </div>

      {/* CTA */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all hover:scale-105 active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LT} 100%)`,
          color: '#1a0a00',
          ...DM, fontWeight: 700, fontSize: 13,
          boxShadow: `0 4px 20px ${GOLD}30`,
        }}
      >
        OPEN DASHBOARD <ArrowRight className="w-4 h-4" />
      </Link>
    </nav>
  )
}

// ── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Cpu,
    num: '01',
    title: 'Predictive\nEngine',
    desc: 'ML models trained on 1,110+ IPL matches surface high-probability performers before every game.',
    tag: 'ML / XGBoost',
  },
  {
    icon: Activity,
    num: '02',
    title: 'Precision\nPicks',
    desc: 'Stop guessing. Get a ranked top-11 tailored for pitch conditions, bowling matchups, and current form.',
    tag: 'Dream11 Optimized',
  },
  {
    icon: Zap,
    num: '03',
    title: 'Live\nData Sync',
    desc: 'Real-time updates from cricketdata.org APIs ensure your squads reflect the latest injury and selection news.',
    tag: 'cricketdata.org',
  },
]

const FeatureCard = ({ feat, index }: { feat: typeof FEATURES[0]; index: number }) => {
  const Icon = feat.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
      className="group relative rounded-2xl p-8 overflow-hidden"
      style={{
        background: `linear-gradient(145deg, ${PURPLE_D}80 0%, ${BG}99 100%)`,
        border: `1px solid ${GOLD}18`,
      }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${GOLD}09, transparent 70%)` }}
      />
      {/* Top gold border on hover */}
      <div
        className="absolute top-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}60, transparent)` }}
      />

      {/* Large ghost number */}
      <div
        className="absolute right-4 top-2 select-none pointer-events-none"
        style={{ ...BEBAS, fontSize: 100, color: `${PURPLE}12`, lineHeight: 1 }}
      >
        {feat.num}
      </div>

      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-6"
        style={{
          background: `${GOLD}0E`,
          border: `1px solid ${GOLD}28`,
          boxShadow: `0 0 16px ${GOLD}10`,
        }}
      >
        <Icon className="w-5 h-5" style={{ color: GOLD }} />
      </div>

      <h3
        className="mb-3 leading-none"
        style={{ ...BEBAS, fontSize: 32, color: WHITE, letterSpacing: '0.03em', whiteSpace: 'pre-line' }}
      >
        {feat.title}
      </h3>

      <p style={{ ...DM, fontSize: 15, color: MUTED, lineHeight: 1.65 }}>{feat.desc}</p>

      <div className="mt-6">
        <span
          className="px-3 py-1 rounded-md"
          style={{ ...MONO, background: `${GOLD}08`, color: GOLD, border: `1px solid ${GOLD}20`, fontSize: 10, letterSpacing: '0.1em' }}
        >
          {feat.tag}
        </span>
      </div>
    </motion.div>
  )
}

// ── Pipeline steps ────────────────────────────────────────────────────────────
const STEPS = [
  { icon: Database,   num: '01', title: 'Data Ingestion',      desc: 'Raw match data from IPL archives and live APIs — granular ball-by-ball stats at player level.' },
  { icon: GitBranch,  num: '02', title: 'Feature Engineering', desc: 'Strike rates vs specific bowlers, venue stats, recent form windows, head-to-head records.' },
  { icon: BarChart3,  num: '03', title: 'Model Training',      desc: 'XGBoost + ensemble learners trained on historical Dream11 fantasy scores per position.' },
  { icon: Star,       num: '04', title: 'Team Generation',     desc: 'Constraint-aware optimizer picks your best 11 respecting captain rules and credit limits.' },
]

const StepCard = ({ step, index }: { step: typeof STEPS[0]; index: number }) => {
  const Icon = step.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="relative flex flex-col gap-4"
    >
      {/* Connector */}
      {index < STEPS.length - 1 && (
        <div
          className="hidden lg:block absolute top-5 left-full w-full h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, ${GOLD}30, transparent)`, zIndex: 0 }}
        />
      )}

      <div
        className="relative z-10 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${GOLD}0E`, border: `1px solid ${GOLD}30`, boxShadow: `0 0 16px ${GOLD}10` }}
      >
        <Icon className="w-4 h-4" style={{ color: GOLD }} />
      </div>

      <div style={{ ...MONO, fontSize: 11, color: `${GOLD}60`, letterSpacing: '0.15em' }}>
        STEP {step.num}
      </div>

      <h4 style={{ ...BEBAS, fontSize: 24, color: WHITE, letterSpacing: '0.04em', lineHeight: 1 }}>
        {step.title}
      </h4>

      <p style={{ ...DM, fontSize: 14, color: MUTED, lineHeight: 1.7 }}>{step.desc}</p>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60])

  return (
    <div style={{ background: BG, color: WHITE, overflowX: 'hidden', ...DM }}>
      <NoiseOverlay />
      <Nav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center" style={{ padding: '80px 40px 0' }}>

        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(ellipse 70% 60% at 65% 35%, ${GOLD}07 0%, transparent 65%),
            radial-gradient(ellipse 50% 70% at 15% 70%, ${PURPLE}12 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 80% 80%, ${PURPLE_D}80 0%, transparent 60%)
          `,
        }} />

        {/* Subtle grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.018]" style={{
          backgroundImage: `linear-gradient(${GOLD} 1px, transparent 1px), linear-gradient(90deg, ${GOLD} 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }} />

        {/* KKR diagonal stripe decoration */}
        <div
          className="absolute right-0 top-0 bottom-0 w-[45%] pointer-events-none overflow-hidden"
          style={{ opacity: 0.025 }}
        >
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: `${i * 9}%`,
                background: `linear-gradient(180deg, transparent, ${GOLD}, transparent)`,
                transform: 'skewX(-15deg)',
              }}
            />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-[1fr_auto] gap-16 items-center min-h-[85vh]">

            {/* Left */}
            <motion.div style={{ y: heroY }} className="flex flex-col">

              {/* KKR badge */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2.5 mb-8 self-start px-4 py-1.5 rounded-full"
                style={{
                  background: `${GOLD}0E`,
                  border: `1px solid ${GOLD}28`,
                }}
              >
                <CrownIcon size={14} />
                <span style={{ ...MONO, fontSize: 10, color: GOLD, letterSpacing: '0.18em' }}>
                  IPL 2026 INTELLIGENCE · ACTIVE
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="leading-none mb-6"
                style={{ ...BEBAS, fontSize: 'clamp(72px, 9vw, 140px)', letterSpacing: '0.02em' }}
              >
                <span style={{ color: WHITE }}>WINNING IS</span>
                <br />
                <span className="shimmer-gold">A SCIENCE.</span>
                <br />
                <span style={{ color: `${WHITE}30` }}>NOT LUCK.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="max-w-xl mb-10"
                style={{ ...DM, fontSize: 17, color: MUTED, lineHeight: 1.7 }}
              >
                CricAI uses ML pipelines trained on 1,110+ IPL matches to predict top
                performers, generate Dream11 squads, and give you an edge every match day.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.38 }}
                className="flex flex-wrap gap-4"
              >
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LT} 100%)`,
                    color: '#1a0800',
                    ...DM, fontWeight: 700, fontSize: 15,
                    boxShadow: `0 8px 32px ${GOLD}28`,
                  }}
                >
                  GET STARTED FREE <Zap className="w-4 h-4" style={{ fill: '#1a0800' }} />
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5 px-8 py-4 rounded-xl transition-all hover:scale-105 active:scale-95"
                  style={{
                    ...DM, fontSize: 15, color: MUTED,
                    border: `1px solid ${GOLD}20`,
                    background: `${GOLD}05`,
                    fontWeight: 500,
                  }}
                >
                  VIEW PREDICTIONS <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />
                </Link>
              </motion.div>

              {/* Social proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.55 }}
                className="flex items-center gap-4 mt-10"
              >
                <div className="flex -space-x-2">
                  {[PURPLE, GOLD, '#c84b31', `${GOLD_LT}`].map((c, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
                      style={{ background: c, borderColor: BG, color: i === 1 || i === 3 ? '#1a0800' : '#fff' }}
                    >
                      {['V','R','J','S'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3" style={{ fill: GOLD, color: GOLD }} />
                    ))}
                  </div>
                  <p style={{ ...DM, fontSize: 12, color: DIM }}>Trusted by 12K+ analysts</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Prediction card */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
              className="animate-float hidden lg:block"
            >
              <PredictionCard />
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
        >
          <span style={{ ...MONO, fontSize: 9, color: DIM, letterSpacing: '0.2em' }}>SCROLL</span>
          <div className="w-px h-8" style={{ background: `linear-gradient(180deg, ${GOLD}50, transparent)` }} />
        </motion.div>
      </section>

      {/* ── Ticker ───────────────────────────────────────────────────────── */}
      <Ticker />

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-32 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ ...MONO, fontSize: 11, color: GOLD, letterSpacing: '0.2em' }}
            className="mb-3"
          >
            CAPABILITIES
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="leading-none"
            style={{ ...BEBAS, fontSize: 'clamp(48px, 6vw, 88px)', color: WHITE, letterSpacing: '0.02em' }}
          >
            BUILT FOR
            <span className="shimmer-gold"> WINNERS</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => <FeatureCard key={f.num} feat={f} index={i} />)}
        </div>

        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="mt-16 h-px origin-left"
          style={{ background: `linear-gradient(90deg, ${GOLD}40, transparent)` }}
        />
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-32 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ ...MONO, fontSize: 11, color: GOLD, letterSpacing: '0.2em' }}
            className="mb-3"
          >
            THE PIPELINE
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="leading-none"
            style={{ ...BEBAS, fontSize: 'clamp(48px, 6vw, 88px)', color: WHITE, letterSpacing: '0.02em' }}
          >
            HOW THE
            <span className="shimmer-gold"> MACHINE THINKS</span>
          </motion.h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 relative">
          {STEPS.map((s, i) => <StepCard key={s.num} step={s} index={i} />)}
        </div>
      </section>

      {/* ── Roadmap ──────────────────────────────────────────────────────── */}
      <section
        id="roadmap"
        className="py-20 px-6 md:px-10"
        style={{ borderTop: `1px solid ${GOLD}10`, borderBottom: `1px solid ${GOLD}10` }}
      >
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x"
             style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
          {[
            { phase: 'PHASE 1', label: 'DONE',   title: 'Data Ingestion & Live Sync',       color: GOLD },
            { phase: 'PHASE 2', label: 'ACTIVE',  title: 'ML Model Training & Predictions', color: PURPLE },
            { phase: 'PHASE 3', label: 'NEXT',    title: 'Team Optimizer & Auto-Draft',     color: MUTED },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="px-8 py-6"
              style={{ borderColor: `${GOLD}12` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span style={{ ...MONO, fontSize: 10, color: MUTED, letterSpacing: '0.15em' }}>{item.phase}</span>
                <span
                  className="px-2 py-0.5 rounded text-[9px]"
                  style={{ ...MONO, background: `${item.color}18`, color: item.color, border: `1px solid ${item.color}30`, letterSpacing: '0.1em' }}
                >
                  {item.label}
                </span>
              </div>
              <p style={{ ...BEBAS, fontSize: 22, color: WHITE, letterSpacing: '0.03em', lineHeight: 1.2 }}>
                {item.title}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative py-40 px-6 overflow-hidden">
        {/* Radial gold bloom */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${GOLD}08 0%, transparent 70%)`,
        }} />
        {/* Subtle pitch lines */}
        <div className="absolute inset-x-0 top-1/2 h-px pointer-events-none"
             style={{ background: `linear-gradient(90deg, transparent, ${GOLD}15, transparent)` }} />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px pointer-events-none"
             style={{ background: `linear-gradient(180deg, transparent, ${GOLD}10, transparent)` }} />

        {/* KKR crown watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none opacity-[0.025]">
          <CrownIcon size={280} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative max-w-4xl mx-auto text-center"
        >
          <p style={{ ...MONO, fontSize: 11, color: GOLD, letterSpacing: '0.2em' }} className="mb-6">
            START TODAY
          </p>
          <h2
            className="leading-none mb-8"
            style={{ ...BEBAS, fontSize: 'clamp(56px, 8vw, 120px)', color: WHITE, letterSpacing: '0.02em' }}
          >
            READY TO<br />
            <span className="shimmer-gold">DOMINATE</span> YOUR LEAGUE?
          </h2>
          <p className="mb-12 max-w-lg mx-auto"
             style={{ ...DM, fontSize: 17, color: MUTED, lineHeight: 1.7 }}>
            Join thousands of analysts who use CricAI to build winning Dream11 teams with
            ML-powered predictions every match day.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 px-12 py-5 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LT} 50%, ${GOLD} 100%)`,
              color: '#1a0800',
              ...DM, fontWeight: 700, fontSize: 17,
              boxShadow: `0 8px 48px ${GOLD}30, 0 0 0 1px ${GOLD}30`,
              backgroundSize: '200% auto',
            }}
          >
            ACCESS DASHBOARD <ChevronRight className="w-5 h-5" />
          </Link>

          {/* Trust row */}
          <div className="flex items-center justify-center gap-10 mt-14 flex-wrap">
            {[
              { icon: Users,    label: '12K+ Users' },
              { icon: Activity, label: '89% Accuracy' },
              { icon: Zap,      label: 'Real-time Data' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color: GOLD }} />
                <span style={{ ...DM, fontSize: 13, color: MUTED }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-12 px-10" style={{ borderTop: `1px solid ${GOLD}10` }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-2.5">
              <CricketBallIcon size={22} />
              <span style={{ ...BEBAS, fontSize: 22, color: WHITE, letterSpacing: '0.1em' }}>
                CRIC<span className="shimmer-gold">AI</span>
              </span>
            </div>
            <p style={{ ...DM, fontSize: 12, color: DIM }}>&copy; 2026 CricAI Fantasy Intelligence</p>
          </div>

          <div className="flex gap-8 items-center">
            {['Features', 'How It Works', 'Privacy'].map(l => (
              <Link key={l} href="#" style={{ ...DM, fontSize: 13, color: MUTED }} className="hover:text-white transition-colors">
                {l}
              </Link>
            ))}
          </div>

          <div
            className="px-4 py-2 rounded-lg"
            style={{ background: `${GOLD}06`, border: `1px solid ${GOLD}14` }}
          >
            <span style={{ ...MONO, fontSize: 10, color: DIM, letterSpacing: '0.1em' }}>
              NEXT.JS · SUPABASE · XGBOOST
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
