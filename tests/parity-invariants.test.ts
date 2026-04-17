/**
 * Architecture parity invariants — статические grep-тесты, которые падают при
 * регрессии архитектурных слоёв Similia.
 *
 * Эти тесты не проверяют рантайм — они ловят антипаттерны статически по всему
 * src/. Любое добавление IO в UI-компонент или прямой prisma-импорт в client
 * component упадёт при `npm run test:parity`.
 *
 * Правила синхронизированы с docs/ARCHITECTURE.md §14–§17.
 *
 * Если правило становится слишком строгим — добавь exception в ALLOWLIST с
 * коротким объяснением ПОЧЕМУ, не убирай правило молча.
 *
 * Дизайн взят из MiniApp/tests/parity-invariants.test.ts.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { resolve, join } from 'path'

const root = resolve(__dirname, '..')

function walk(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.next' || name === '.git') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) out.push(...walk(p, exts))
    else if (exts.some(e => p.endsWith(e))) out.push(p)
  }
  return out
}

function readAll(dirs: string[], exts: string[] = ['.ts', '.tsx']): Array<{ path: string; content: string }> {
  const files: string[] = []
  for (const d of dirs) {
    const abs = resolve(root, d)
    files.push(...walk(abs, exts))
  }
  return files.map(p => ({ path: p.replace(root + '/', ''), content: readFileSync(p, 'utf-8') }))
}

function isClientComponent(content: string): boolean {
  // Директива 'use client' должна быть в первых ~3 строках (после возможных комментов)
  const firstNonEmpty = content.split('\n').slice(0, 5).join('\n')
  return /^['"]use client['"]/m.test(firstNonEmpty)
}

function findViolations(
  files: Array<{ path: string; content: string }>,
  regex: RegExp,
  allowlistPaths: RegExp[] = [],
  predicate: (f: { path: string; content: string }) => boolean = () => true,
): Array<{ path: string; line: number; text: string }> {
  const out: Array<{ path: string; line: number; text: string }> = []
  for (const f of files) {
    if (allowlistPaths.some(a => a.test(f.path))) continue
    if (!predicate(f)) continue
    const lines = f.content.split('\n')
    lines.forEach((line, i) => {
      if (!regex.test(line)) return
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return
      out.push({ path: f.path, line: i + 1, text: line.trim().slice(0, 160) })
    })
  }
  return out
}

describe('Architecture parity invariants', () => {
  // ─── §15.1 console.log guard ─────────────────────────────────────────────
  it('Нет console.log/warn/error в src/ (кроме error boundaries, mdri/ и задокументированных exceptions)', () => {
    const files = readAll(['src'])
    const v = findViolations(
      files,
      /console\.(log|warn|error)\(/,
      [
        // Next.js error boundaries — console.error это документированный паттерн
        /^src\/app\/error\.tsx$/,
        /^src\/app\/global-error\.tsx$/,
        // MDRI engine защищён pre-commit hook и v5 замороженным контрактом
        /^src\/lib\/mdri\//,
        // TODO: переезжают в lib/infrastructure/ + lib/shared/logger после Этапа 4
        /^src\/lib\/telegram\.ts$/,
        /^src\/components\/ui\/animated-number\.tsx$/,
        /^src\/components\/ui\/response-stream\.tsx$/,
        /^src\/app\/ai-consultation\/\[patientId\]\/AIConsultationClient\.tsx$/,
      ],
    )
    expect(
      v,
      `console.* в src/ — использовать будущий lib/shared/logger, либо добавить в ALLOWLIST с причиной:\n${JSON.stringify(v, null, 2)}`,
    ).toHaveLength(0)
  })

  // ─── §15.2 Prisma не должна тянуться в client components ────────────────
  it(`'use client' компоненты НЕ импортируют @prisma/client или @/lib/prisma`, () => {
    const files = readAll(['src'])
    const v = findViolations(
      files,
      /from\s+['"](@prisma\/client|@\/lib\/prisma)['"]/,
      [],
      f => isClientComponent(f.content),
    )
    expect(
      v,
      `Prisma в 'use client' — перенести запросы в Server Action (lib/actions/) или Server Component:\n${JSON.stringify(v, null, 2)}`,
    ).toHaveLength(0)
  })

  // ─── §15.3 NextAuth server-side API не должна тянуться в client ─────────
  it(`'use client' компоненты НЕ импортируют authOptions или серверный next-auth`, () => {
    const files = readAll(['src'])
    // next-auth/react — OK для useSession/signIn/signOut
    // просто 'next-auth' или 'next-auth/jwt' или '@/lib/auth' — server-only
    const v = findViolations(
      files,
      /from\s+['"](next-auth|next-auth\/jwt|@\/lib\/auth)['"]/,
      [],
      f => isClientComponent(f.content),
    )
    expect(
      v,
      `Серверный next-auth в 'use client' — использовать next-auth/react для клиента:\n${JSON.stringify(v, null, 2)}`,
    ).toHaveLength(0)
  })

  // ─── §15.4 @supabase/* не в client (защита на будущее — если когда-нибудь
  //         вернутся браузерные supabase-клиенты, чтобы не засорять UI) ─────
  it(`'use client' компоненты НЕ импортируют @supabase/supabase-js напрямую`, () => {
    const files = readAll(['src'])
    const v = findViolations(
      files,
      /from\s+['"]@supabase\/supabase-js['"]/,
      [],
      f => isClientComponent(f.content),
    )
    expect(
      v,
      `@supabase/supabase-js в 'use client' — перенести в Server Action:\n${JSON.stringify(v, null, 2)}`,
    ).toHaveLength(0)
  })

  // ─── §15.5 shared/ = pure (активируется после Этапа 3) ───────────────────
  it('src/lib/shared/ не импортирует IO / framework (no-op пока shared/ пуст)', () => {
    const files = readAll(['src/lib/shared'])
    if (files.length === 0) return // Этап 3 ещё не выполнен — пропускаем без false negative
    const v = findViolations(
      files,
      /from\s+['"](@prisma\/client|@supabase\/.+|next\/.+|next-auth|next-auth\/.+|nodemailer)['"]/,
    )
    expect(
      v,
      `lib/shared/ должен быть pure (zero IO, zero framework):\n${JSON.stringify(v, null, 2)}`,
    ).toHaveLength(0)
  })

  // ─── §15.6 domain/ = pure (активируется после Этапа 5) ───────────────────
  it('src/lib/domain/ не импортирует IO / infrastructure / framework (no-op пока domain/ пуст)', () => {
    const files = readAll(['src/lib/domain'])
    if (files.length === 0) return
    const v = findViolations(
      files,
      /from\s+['"](@prisma\/client|@\/lib\/prisma|@supabase\/.+|next\/.+|next-auth|next-auth\/.+|@\/lib\/infrastructure\/.+|@\/lib\/actions\/.+)['"]/,
    )
    expect(
      v,
      `lib/domain/ — чистая бизнес-логика, ничего не знает про БД/framework:\n${JSON.stringify(v, null, 2)}`,
    ).toHaveLength(0)
  })

  // ─── §15.7 Файлы >1800 строк — red flag (известные god-components в whitelist) ──
  it('Нет файлов >1800 строк вне задокументированного whitelist', () => {
    const files = readAll(['src'])
    const whitelist = [
      // i18n.ts — один большой файл переводов (не код, данные)
      /^src\/lib\/i18n\.ts$/,
      // repertory-translations.ts — словарь переводов рубрик
      /^src\/lib\/repertory-translations\.ts$/,
      // known god-components (Этап 11 в плане рефакторинга)
      /^src\/app\/repertory\/RepertoryClient\.tsx$/,
      // MDRI engine — защищён pre-commit hook, заблокирован в v5-final
      /^src\/lib\/mdri\/engine\.ts$/,
      // TODO: разобрать ai-consultation.ts (1842 строки) — отдельной задачей
      /^src\/lib\/actions\/ai-consultation\.ts$/,
    ]
    const offenders = files
      .filter(f => !whitelist.some(w => w.test(f.path)))
      .filter(f => f.content.split('\n').length > 1800)
      .map(f => ({ path: f.path, lines: f.content.split('\n').length }))
    expect(
      offenders,
      `Файлы >1800 строк требуют split-plan:\n${JSON.stringify(offenders, null, 2)}`,
    ).toHaveLength(0)
  })

  // ─── §15.8 Дубликат имён: lib/utils.ts и lib/utils/ не должны сосуществовать ──
  it('Нет конфликта lib/utils.ts vs lib/utils/ — сливается в lib/shared/ (Этап 3)', () => {
    const utilsFile = existsSync(resolve(root, 'src/lib/utils.ts'))
    const utilsDir = existsSync(resolve(root, 'src/lib/utils'))
    const sharedDir = existsSync(resolve(root, 'src/lib/shared'))
    // Пока Этап 3 не сделан — оба существуют, это TODO.
    // После Этапа 3 — оба исчезают, появляется src/lib/shared/.
    if (sharedDir) {
      expect(
        utilsFile || utilsDir,
        'После создания lib/shared/ — lib/utils.ts и lib/utils/ должны быть удалены',
      ).toBe(false)
    }
  })
})
