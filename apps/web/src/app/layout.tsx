import type { Metadata } from 'next'
import { Space_Grotesk, Syne, Space_Mono } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from './providers'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Podium — Live Leaderboards',
  description: 'The live, real-time leaderboard platform where competition never stops.',
  metadataBase: new URL('https://podium.gg'),
  openGraph: {
    title: 'Podium — Live Leaderboards',
    description: 'The live, real-time leaderboard platform where competition never stops.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${syne.variable} ${spaceMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
