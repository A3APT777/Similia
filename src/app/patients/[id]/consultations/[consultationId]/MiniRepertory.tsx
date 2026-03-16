'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { searchRepertory, RepertoryRubric } from '@/lib/actions/repertory'
import { CHAPTER_NAMES, translateRubric } from '@/lib/repertory-translations'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

const CHAPTERS_SHORT = [
  'Mind', 'Head', 'Eye', 'Ear', 'Nose', 'Face', 'Mouth', 'Throat',
  'Stomach', 'Abdomen', 'Rectum', 'Chest', 'Back', 'Extremities',
  'Sleep', 'Fever', 'Skin', 'Generalities',
]

type Props = {
  onSelectRubric: (rubricPath: string) => void
  onClose: () => void
}

export default function MiniRepertory({ onSelectRubric, onClose }: Props) {
  const { lang } = useLanguage()
  const [query, setQuery] = useState('')
  const [chapter, setChapter] = useState('Mind')
  const [rubrics, setRubrics] = useState<RepertoryRubric[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (q: string, ch: string, p: number) => {
    setLoading(true)
    try {
      const result = await searchRepertory(q, ch, 'publicum', p)
      setRubrics(result.rubrics)
      setTotal(result.total)
    } catch {
      setRubrics([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(0)
      load(query, chapter, 0)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, chapter, load])

  useEffect(() => {
    load(query, chapter, page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSelectRubric(r: RepertoryRubric) {
    onSelectRubric(r.fullpath)
  }

  const PAGE_SIZE = 30
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col h-full">

      {/* Шапка */}
      <div className="px-4 py-3 border-b border-gray-100 bg-[#ede7dd] flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t(lang).miniRepertory.title}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">{t(lang).miniRepertory.hint}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Поиск */}
      <div className="px-3 py-2.5 border-b border-gray-100 bg-[#ede7dd] shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t(lang).miniRepertory.search}
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/20 placeholder-gray-300 transition-all"
          />
        </div>
      </div>

      {/* Главы */}
      <div className="px-3 py-2 border-b border-gray-100 bg-[#ede7dd] shrink-0 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {CHAPTERS_SHORT.map(ch => (
            <button
              key={ch}
              onClick={() => { setChapter(ch); setPage(0) }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all ${
                chapter === ch
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              style={chapter === ch ? { backgroundColor: 'var(--color-primary)' } : undefined}
            >
              {CHAPTER_NAMES[ch] || ch}
            </button>
          ))}
        </div>
      </div>

      {/* Результаты */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rubrics.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-gray-300">
            {t(lang).miniRepertory.notFound}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rubrics.map(r => (
              <button
                key={r.id}
                onClick={() => handleSelectRubric(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/60 transition-colors group"
              >
                <p className="text-xs text-gray-700 group-hover:text-emerald-800 leading-snug">{translateRubric(r.fullpath, r.chapter)}</p>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {r.remedies.slice(0, 8).map((rem, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-medium"
                      style={{
                        color: rem.grade >= 3 ? '#2d6a4f' : rem.grade === 2 ? '#1c1a14' : '#9a9a8a',
                        fontWeight: rem.grade >= 3 ? 700 : rem.grade === 2 ? 500 : 400,
                        fontSize: rem.grade >= 3 ? '10px' : rem.grade === 2 ? '10px' : '9px',
                      }}
                    >
                      {rem.abbrev}
                    </span>
                  ))}
                  {r.remedy_count > 8 && (
                    <span className="text-[9px] text-gray-300">+{r.remedy_count - 8}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-[#ede7dd] flex items-center justify-between shrink-0">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← {t(lang).miniRepertory.prev}
          </button>
          <span className="text-[10px] text-gray-300">{page + 1} / {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t(lang).miniRepertory.next} →
          </button>
        </div>
      )}
    </div>
  )
}
