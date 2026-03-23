'use client'

import { useConsultation } from '../context/ConsultationContext'
import { useLanguage } from '@/hooks/useLanguage'

export default function CaseFormulation() {
  const { state } = useConsultation()
  const { lang } = useLanguage()

  const { complaints, observations, notes, recommendations } = state

  // Не показываем, если нет данных
  if (!complaints.trim() && !notes.trim()) return null

  const filledCount = [complaints.trim(), observations.trim(), notes.trim(), recommendations.trim()].filter(Boolean).length

  return (
    <div className="ml-8 rounded-2xl p-4" style={{ backgroundColor: '#e8f0e8', border: '1px solid rgba(45,106,79,0.2)' }}>
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4" style={{ color: 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--sim-green)' }}>
          {lang === 'ru' ? 'Формулировка случая' : 'Case formulation'}
        </span>
        <span className="text-xs ml-auto" style={{ color: '#6a9a6a' }}>
          {filledCount}/4
        </span>
      </div>
      <div className="text-[13px] leading-[1.7] space-y-1.5" style={{ color: '#2a3a20' }}>
        {complaints.trim() && (
          <p><span className="font-bold">{lang === 'ru' ? 'Случай' : 'Case'}:</span> {complaints.trim().split('\n')[0].substring(0, 150)}</p>
        )}
        {observations.trim() && (
          <p><span className="font-bold">{lang === 'ru' ? 'Ключевое' : 'Key'}:</span> {observations.trim().split('\n').slice(0, 2).join('; ').substring(0, 150)}</p>
        )}
        {notes.trim() && (
          <p><span className="font-bold">{lang === 'ru' ? 'Анализ' : 'Analysis'}:</span> {notes.trim().split('\n')[0].substring(0, 150)}</p>
        )}
        {recommendations.trim() && (
          <p><span className="font-bold" style={{ color: 'var(--sim-green)' }}>{lang === 'ru' ? 'Цель' : 'Goal'}:</span> {recommendations.trim().split('\n')[0].substring(0, 150)}</p>
        )}
      </div>
    </div>
  )
}
