import Link from 'next/link'
import { ModeToggle } from '@/components/mode-toggle'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link 
            href="/" 
            className="flex items-center gap-2 font-sans text-lg font-semibold transition-colors hover:text-primary"
          >
            Grok Chatbot
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
} 