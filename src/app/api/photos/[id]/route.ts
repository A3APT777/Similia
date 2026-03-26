import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

// Приватная отдача фото через auth — файлы хранятся вне public/
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { id } = await params

  // Проверяем что фото принадлежит врачу
  const photo = await prisma.patientPhoto.findFirst({
    where: { id, doctorId: session.user.id },
    select: { fileName: true, patientId: true },
  })

  if (!photo) {
    return NextResponse.json({ error: 'Фото не найдено' }, { status: 404 })
  }

  // Читаем файл из приватной директории
  const filePath = path.join(process.cwd(), 'private-uploads', photo.patientId, photo.fileName)

  try {
    const buffer = await readFile(filePath)

    // Определяем Content-Type по расширению
    const ext = photo.fileName.split('.').pop()?.toLowerCase() || ''
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
  }
}
