'use client'

import { useState, useTransition, useEffect } from 'react'
import { deletePatient } from '@/lib/actions/patients'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

export default function DeletePatientButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const { lang } = useLanguage()
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Закрытие модалки по Escape
  useEffect(() => {
    if (!showModal) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showModal])

  function handleConfirm() {
    startTransition(async () => {
      await deletePatient(patientId)
    })
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1 text-xs transition-colors border px-2.5 py-1.5 rounded-lg"
        style={{ color: '#c0392b', borderColor: '#f5c6c6', backgroundColor: 'transparent' }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = '#fef0f0'
          e.currentTarget.style.borderColor = '#c0392b'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.borderColor = '#f5c6c6'
        }}
        title={t(lang).deletePatient.btn}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
        <span className="hidden sm:inline">{t(lang).deletePatient.delete}</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="relative rounded-2xl p-6 w-[340px] mx-4 shadow-2xl"
            style={{ backgroundColor: '#f7f3ed', border: '0.5px solid #d4c9b8' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#fef0f0' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#c0392b" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold" style={{ color: '#1a1a0a' }}>{t(lang).deletePatient.confirm}</h2>
                <p className="text-sm" style={{ color: '#9a8a6a' }}>{patientName}</p>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-5" style={{ color: '#5a5040' }}>
              {t(lang).deletePatient.warning}
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#c0392b' }}
              >
                {isPending ? t(lang).deletePatient.deleting : t(lang).deletePatient.delete}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl text-sm transition-colors hover:opacity-70"
                style={{ color: '#9a8a6a' }}
              >
                {t(lang).deletePatient.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
