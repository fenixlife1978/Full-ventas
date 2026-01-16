'use client'

import Link from 'next/link'
import { Hand } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/firebase'
import { useEffect } from 'react'

export default function WelcomePage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/')
    }
  }, [user, isUserLoading, router])

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-gray-900 text-white p-4">
      <div className="flex-1 flex flex-col items-center justify-center">
        <svg
          role="img"
          aria-label="Full-Ventas Logo"
          className="w-48 h-48 mb-12"
          viewBox="0 0 64 64"
        >
          <defs>
            <linearGradient id="logo-gold" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0" stopColor="#f4d03f" />
              <stop offset="1" stopColor="#b5830d" />
            </linearGradient>
            <linearGradient id="shield-gradient" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0" stopColor="#1faa8d" />
              <stop offset="1" stopColor="#226482" />
            </linearGradient>
          </defs>
          <path
            d="M32 2C52 8 62 26 62 38 62 52 48 62 32 62 16 62 2 52 2 38 2 26 12 8 32 2z"
            fill="url(#shield-gradient)"
            stroke="url(#logo-gold)"
            strokeWidth="4"
          />
          <text x="32" y="58" fill="#f4d03f" fontSize="16" fontWeight="bold" textAnchor="middle">$</text>
          <g transform="translate(1 0)" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 24 H 15 L 19 40 H 45 L 49 28 H 17" />
            <circle cx="22" cy="43" r="3" />
            <circle cx="39" cy="43" r="3" />
            <path d="M23 39 V 31" />
            <path d="M29 39 V 25" />
            <path d="M35 39 V 33" />
            <path d="M41 39 V 22" />
            <path d="M23 31 L 29 25 L 35 33 L 41 22 L 48 16" />
            <path d="M45 15 L 48 16 L 47 19" />
          </g>
        </svg>

        <Link href="/login" passHref>
          <button className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center animate-pulse border-2 border-primary/50 hover:bg-primary/40 hover:animate-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
            <Hand className="w-10 h-10 text-primary" />
          </button>
        </Link>
      </div>
       <footer className="text-center text-xs text-gray-500 py-4">
        &copy; {new Date().getFullYear()} Full-Ventas. Todos los derechos reservados.
      </footer>
    </div>
  )
}
