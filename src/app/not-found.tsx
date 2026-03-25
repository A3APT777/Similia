import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--sim-bg, #f7f3ed)' }}>
      <div className="text-center max-w-md">
        <p className="text-6xl font-light mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-green, #2d6a4f)' }}>
          404
        </p>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--sim-text, #1a1a0a)' }}>
          Страница не найдена
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--sim-text-muted, #6b5f4f)' }}>
          Возможно, ссылка устарела или вы ввели неправильный адрес.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--sim-green, #2d6a4f)' }}
        >
          На главную
        </Link>
      </div>
    </div>
  )
}
