'use client'

import { useRef, useState, useTransition } from 'react'
import { submitPhotoUpload } from '@/lib/actions/photoUpload'

type Props = {
  token: string
}

export default function PhotoUploadForm({ token }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [takenAt, setTakenAt] = useState(() => new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('Файл слишком большой (максимум 10 МБ)')
      e.target.value = ''
      return
    }
    setPreview(URL.createObjectURL(file))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const result = await submitPhotoUpload(token, formData)
      if (result.success) {
        setDone(true)
      } else {
        setError(result.error || 'Ошибка при загрузке')
      }
    })
  }

  if (done) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Фото отправлено!</h2>
        <p className="text-sm text-gray-500 mt-1">Врач получит его в карточке пациента</p>
        <button
          onClick={() => {
            setDone(false)
            setPreview(null)
            setNote('')
            if (fileRef.current) fileRef.current.value = ''
          }}
          className="mt-5 text-sm text-emerald-700 hover:text-emerald-900 border border-emerald-200 hover:border-emerald-400 px-4 py-2 rounded-2xl transition-all"
        >
          Загрузить ещё одно фото
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Выбор файла */}
      <div>
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
          required
        />
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="preview"
              className="w-full rounded-2xl object-cover max-h-72"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/80 transition-all"
            >
              Изменить
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-12 flex flex-col items-center gap-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
          >
            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <span className="text-sm font-medium text-gray-500">Выбрать фото из галереи</span>
            <span className="text-xs text-gray-400">или сфотографировать</span>
          </button>
        )}
      </div>

      {/* Дата */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Дата фото
        </label>
        <input
          type="date"
          name="takenAt"
          value={takenAt}
          onChange={e => setTakenAt(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-[#2d6a4f]/30/10 transition-all"
        />
      </div>

      {/* Заметка */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Заметка (необязательно)
        </label>
        <input
          type="text"
          name="note"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Состояние кожи, что изменилось..."
          className="w-full border border-gray-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-[#2d6a4f]/30/10 transition-all"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !preview}
        className="w-full bg-[#2d6a4f] text-white font-medium py-3 rounded-2xl hover:bg-[#1a3020] disabled:opacity-50 transition-colors text-sm"
      >
        {pending ? 'Отправляю...' : 'Отправить фото'}
      </button>
    </form>
  )
}
