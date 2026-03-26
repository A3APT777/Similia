import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { email, password, name, referralCode } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
      },
    })

    // Create default subscription (free plan active until end of beta)
    await prisma.subscription.create({
      data: {
        doctorId: user.id,
        planId: 'standard',
        status: 'active',
        billingPeriod: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date('2026-05-31T23:59:59Z'),
      },
    })

    // Create default doctor settings
    await prisma.doctorSettings.create({
      data: {
        doctorId: user.id,
      },
    }).catch(() => null) // Ignore if already exists

    // Handle referral code if provided
    if (referralCode) {
      try {
        const refCode = await prisma.referralCode.findUnique({
          where: { code: referralCode },
        })
        if (refCode) {
          await prisma.referralInvitation.create({
            data: {
              referrerId: refCode.doctorId,
              inviteeId: user.id,
            },
          })
        }
      } catch {
        // Non-critical — don't fail registration
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[register] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
