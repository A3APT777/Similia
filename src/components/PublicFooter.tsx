export default function PublicFooter() {
  return (
    <div className="text-center py-6 space-y-2">
      <div className="flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--sim-text-hint)' }}>
        <a href="/docs/Repertory_Manual_RU.pdf" target="_blank" rel="noopener" className="hover:underline">
          Руководство по реперторию
        </a>
        <span>·</span>
        <a href="/docs/Full_Repertory_Manual_RU.pdf" target="_blank" rel="noopener" className="hover:underline">
          Полный реперторий
        </a>
      </div>
      <a
        href="https://simillia.ru"
        className="text-xs hover:underline"
        style={{ color: 'var(--sim-text-hint)' }}
        target="_blank"
        rel="noopener noreferrer"
      >
        Simillia.ru — цифровой кабинет гомеопата
      </a>
    </div>
  )
}
