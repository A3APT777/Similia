import { describe, it, expect } from 'vitest'
import { getAge, formatDate, preview, ALLOWED_IMAGE_EXTENSIONS, MAX_PHOTO_SIZE_BYTES } from '../utils'

// ═══════════════════════════════════════════════════════════
// getAge — вычисление возраста с правильным склонением
// ═══════════════════════════════════════════════════════════
describe('getAge', () => {
  // Мокаем текущую дату для стабильных тестов
  const realNow = Date.now
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-21'))
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  it('41 год (1985) → "41 год"', () => {
    // 2026 - 1985 = 41, но если день рождения ещё не прошёл...
    expect(getAge('1985-06-15')).toBe('40 лет') // ещё не было ДР в 2026
  })

  it('день рождения уже прошёл → полные годы', () => {
    expect(getAge('1985-01-15')).toBe('41 год')
  })

  it('1 год → "1 год"', () => {
    expect(getAge('2025-01-01')).toBe('1 год')
  })

  it('2 года → "2 года"', () => {
    expect(getAge('2024-01-01')).toBe('2 года')
  })

  it('5 лет → "5 лет"', () => {
    expect(getAge('2021-01-01')).toBe('5 лет')
  })

  it('11 лет → "11 лет" (исключение)', () => {
    expect(getAge('2015-01-01')).toBe('11 лет')
  })

  it('21 год → "21 год"', () => {
    expect(getAge('2005-01-01')).toBe('21 год')
  })

  it('22 года → "22 года"', () => {
    expect(getAge('2004-01-01')).toBe('22 года')
  })

  it('111 лет → "111 лет"', () => {
    expect(getAge('1915-01-01')).toBe('111 лет')
  })
})

// ═══════════════════════════════════════════════════════════
// preview — обрезка текста
// ═══════════════════════════════════════════════════════════
describe('preview', () => {
  it('короткий текст → без обрезки', () => {
    expect(preview('Привет')).toBe('Привет')
  })

  it('длинный текст → обрезается с …', () => {
    const long = 'А'.repeat(200)
    const result = preview(long, 100)
    expect(result.length).toBe(101) // 100 + …
    expect(result.endsWith('…')).toBe(true)
  })

  it('пустой текст → "—"', () => {
    expect(preview('')).toBe('—')
  })

  it('переносы строк заменяются пробелами', () => {
    expect(preview('строка1\nстрока2')).toBe('строка1 строка2')
  })

  it('текст с пробелами обрезается', () => {
    expect(preview('  привет  ')).toBe('привет')
  })

  it('кастомная длина', () => {
    expect(preview('Длинный текст здесь', 5)).toBe('Длинн…')
  })
})

// ═══════════════════════════════════════════════════════════
// Константы
// ═══════════════════════════════════════════════════════════
describe('Константы изображений', () => {
  it('ALLOWED_IMAGE_EXTENSIONS содержит jpg, png, webp', () => {
    expect(ALLOWED_IMAGE_EXTENSIONS).toContain('jpg')
    expect(ALLOWED_IMAGE_EXTENSIONS).toContain('png')
    expect(ALLOWED_IMAGE_EXTENSIONS).toContain('webp')
  })

  it('MAX_PHOTO_SIZE_BYTES = 10MB', () => {
    expect(MAX_PHOTO_SIZE_BYTES).toBe(10 * 1024 * 1024)
  })
})

// ═══════════════════════════════════════════════════════════
// formatDate
// ═══════════════════════════════════════════════════════════
describe('formatDate', () => {
  it('форматирует ISO дату в русский формат', () => {
    const result = formatDate('2026-03-21T14:30:00Z')
    expect(result).toContain('2026')
    expect(result).toContain('21')
  })
})
