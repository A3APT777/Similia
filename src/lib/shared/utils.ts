import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Константы валидации загружаемых изображений ────────────────────────────
// Используются в photos.ts и photoUpload.ts — один источник истины
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] as const
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024 // 10 МБ

export function getAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return pluralAge(age)
}

function pluralAge(age: number): string {
  if (age % 100 >= 11 && age % 100 <= 19) return `${age} лет`
  const last = age % 10
  if (last === 1) return `${age} год`
  if (last >= 2 && last <= 4) return `${age} года`
  return `${age} лет`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function preview(text: string, length = 100): string {
  if (!text) return '—'
  const clean = text.replace(/\n/g, ' ').trim()
  return clean.length > length ? clean.slice(0, length) + '…' : clean
}

