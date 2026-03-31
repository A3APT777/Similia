import Link from 'next/link'
import Logo from '@/components/Logo'

export default function PublicNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: 'rgba(247,243,237,0.85)', backdropFilter: 'blur(20px) saturate(1.8)', WebkitBackdropFilter: 'blur(20px) saturate(1.8)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={28} />
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', fontWeight: 300, color: '#1a3020', letterSpacing: '0.04em' }}>Similia</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/guide" className="hidden sm:inline-flex px-4 py-2 rounded-full text-[14px] transition-colors" style={{ color: '#8a7e6c' }}>Как это работает</Link>
          <Link href="/demo" className="hidden sm:inline-flex px-4 py-2 rounded-full text-[14px] transition-colors" style={{ color: '#8a7e6c' }}>AI-демо</Link>
          <Link href="/pricing" className="hidden sm:inline-flex px-4 py-2 rounded-full text-[14px] transition-colors" style={{ color: '#8a7e6c' }}>Тарифы</Link>
          <Link href="/login" className="px-4 py-2 rounded-full text-[14px] transition-colors" style={{ color: '#8a7e6c' }}>Войти</Link>
          <Link href="/register" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[14px] font-medium text-white transition-all hover:shadow-lg hover:-translate-y-px" style={{ backgroundColor: '#2d6a4f' }}>
            Начать
          </Link>
        </nav>
      </div>
    </header>
  )
}
