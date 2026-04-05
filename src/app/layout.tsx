import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import './globals.css'
import CricAiLayout from './CricAiLayout'

export const metadata: Metadata = {
  title: 'CricAI — Fantasy Cricket Intelligence',
  description: 'AI-powered Dream11 team predictions',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <CricAiLayout>
            {children}
          </CricAiLayout>
        </body>
      </html>
    </ClerkProvider>
  )
}
