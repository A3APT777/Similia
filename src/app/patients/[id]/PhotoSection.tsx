'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadPhoto, deletePhoto } from '@/lib/actions/photos'
import { createPhotoUploadToken } from '@/lib/actions/photoUpload'

type Photo = {
  id: string
  url: string
  storage_path: string
  note: string | null
  taken_at: string
}

type Props = {
  patientId: string
  photos: Photo[]
}

function formatPhotoDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('ru-RU', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function PhotoSection({ patientId, photos }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [showForm, setShowForm] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [takenAt, setTakenAt] = useState(() => new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [uploading, startUpload] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [uploadLink, setUploadLink] = useState<string | null>(null)
  const [creatingLink, startCreateLink] = useTransition()
  const [linkCopied, setLinkCopied] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setShowForm(true)
  }

  function handleCancel() {
    setShowForm(false)
    setPreview(null)
    setNote('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('patientId', patientId)

    startUpload(async () => {
      await uploadPhoto(formData)
      handleCancel()
      router.refresh()
    })
  }

  function handleCreateLink() {
    startCreateLink(async () => {
      const token = await createPhotoUploadToken(patientId)
      const url = `${window.location.origin}/upload/${token}`
      setUploadLink(url)
      setLinkCopied(false)
    })
  }

  function handleCopyLink() {
    if (!uploadLink) return
    navigator.clipboard.writeText(uploadLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function handleDelete(photo: Photo) {
    setDeleteId(photo.id)
    startDelete(async () => {
      await deletePhoto(photo.id, photo.storage_path)
      if (lightbox?.id === photo.id) setLightbox(null)
      setDeleteId(null)
      router.refresh()
    })
  }

  return (
    <div>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Фото динамики
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateLink}
            disabled={creatingLink}
            className="inline-flex items-center gap-1.5 text-xs font-medium border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 disabled:opacity-50 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            {creatingLink ? 'Создаю...' : 'Запросить фото'}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-medium border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.043 11.095" />
            </svg>
            Загрузить фото
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Ссылка для пациента */}
      {uploadLink && (
        <div className="mb-4 bg-violet-50 border border-violet-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-violet-700 mb-2">Ссылка для пациента · действительна 24 часа</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={uploadLink}
              className="flex-1 text-xs bg-white border border-violet-200 rounded-lg px-3 py-2 text-gray-700 min-w-0"
            />
            <button
              onClick={handleCopyLink}
              className="shrink-0 text-xs font-medium bg-violet-600 text-white px-3 py-2 rounded-lg hover:bg-violet-700 transition-colors"
            >
              {linkCopied ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>
          <p className="text-[10px] text-violet-500 mt-1.5">Пациент откроет ссылку на телефоне и загрузит фото прямо в карточку</p>
        </div>
      )}

      {/* Форма загрузки */}
      {showForm && preview && (
        <form onSubmit={handleSubmit} className="mb-5 bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="flex gap-4">
            {/* Превью */}
            <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-gray-200">
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Дата фото
                </label>
                <input
                  type="date"
                  name="takenAt"
                  value={takenAt}
                  onChange={e => setTakenAt(e.target.value)}
                  required
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Заметка (необязательно)
                </label>
                <input
                  type="text"
                  name="note"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Состояние кожи, динамика симптома..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              <input type="file" name="file" className="hidden" ref={fileRef} />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
            <button
              type="submit"
              disabled={uploading}
              className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Загружаю...' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm text-gray-400 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* Галерея */}
      {photos.length === 0 && !showForm ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-2xl py-10 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
        >
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <p className="text-sm text-gray-400">Нажмите чтобы загрузить первое фото</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {photos.map(photo => (
            <div key={photo.id} className="group relative">
              <button
                onClick={() => setLightbox(photo)}
                className="block w-full aspect-square rounded-xl overflow-hidden bg-gray-100 hover:ring-2 hover:ring-emerald-400 transition-all"
              >
                <img
                  src={photo.url}
                  alt={photo.note || ''}
                  className="w-full h-full object-cover"
                />
              </button>

              {/* Кнопка удаления */}
              <button
                onClick={() => handleDelete(photo)}
                disabled={deleting && deleteId === photo.id}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:bg-red-600"
              >
                {deleting && deleteId === photo.id ? (
                  <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>

              {/* Дата */}
              <p className="text-[10px] text-gray-400 text-center mt-1 leading-tight">
                {formatPhotoDate(photo.taken_at)}
              </p>
              {photo.note && (
                <p className="text-[10px] text-gray-400 text-center truncate px-1">{photo.note}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Лайтбокс */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={lightbox.url}
              alt={lightbox.note || ''}
              className="w-full rounded-2xl shadow-2xl"
            />

            {/* Мета */}
            <div className="mt-3 flex items-center justify-between px-1">
              <div>
                <p className="text-white font-medium text-sm">{formatPhotoDate(lightbox.taken_at)}</p>
                {lightbox.note && <p className="text-gray-400 text-xs mt-0.5">{lightbox.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(lightbox)}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                >
                  Удалить
                </button>
                <button
                  onClick={() => setLightbox(null)}
                  className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-all"
                >
                  Закрыть
                </button>
              </div>
            </div>

            {/* Навигация по фото */}
            {photos.length > 1 && (() => {
              const idx = photos.findIndex(p => p.id === lightbox.id)
              return (
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none px-2" style={{ top: 0, bottom: '4rem' }}>
                  {idx > 0 && (
                    <button
                      onClick={() => setLightbox(photos[idx - 1])}
                      className="pointer-events-auto w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <div className="flex-1" />
                  {idx < photos.length - 1 && (
                    <button
                      onClick={() => setLightbox(photos[idx + 1])}
                      className="pointer-events-auto w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
