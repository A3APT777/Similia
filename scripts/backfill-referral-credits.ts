/**
 * Однократная миграция: ретроактивно начислить AI-кредиты для существующих
 * реферальных приглашений, созданных ДО внедрения Варианта Б.
 *
 * Логика: для каждой ReferralInvitation где referrerBonusAiCredits=0
 * (это маркер старой логики — AI-кредиты не были выданы при регистрации):
 *   - Рефереру: +1 AI-кредит
 *   - Приглашённому: +2 AI-кредита
 *   - Поставить referrerBonusAiCredits=1 (маркер «обработано»)
 *   - bonusApplied НЕ трогаем — дни подписки начисляются отдельно при оплате
 *
 * Идемпотентный: повторный запуск не начислит повторно
 * (фильтр по referrerBonusAiCredits=0).
 *
 * Запуск: `set -a && source .env.local && set +a && npx tsx scripts/backfill-referral-credits.ts`
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('Поиск реферальных приглашений без начисленных AI-кредитов...')
  const invitations = await prisma.referralInvitation.findMany({
    where: { referrerBonusAiCredits: 0 },
    include: {
      referrer: { select: { email: true, name: true } },
      invitee: { select: { email: true, name: true } },
    },
  })
  console.log(`Найдено: ${invitations.length}\n`)

  if (invitations.length === 0) {
    console.log('Нечего ретроактивно начислять — всё чисто.')
    return
  }

  for (const inv of invitations) {
    console.log(`📝 ${inv.referrer?.name || inv.referrer?.email} → ${inv.invitee?.name || inv.invitee?.email}`)
    try {
      await prisma.$transaction(async (tx) => {
        // Рефереру +1 кредит
        await tx.doctorSettings.upsert({
          where: { doctorId: inv.referrerId },
          update: { aiCredits: { increment: 1 } },
          create: { doctorId: inv.referrerId, aiCredits: 1 },
        })
        // Приглашённому +2 кредита
        await tx.doctorSettings.upsert({
          where: { doctorId: inv.inviteeId },
          update: { aiCredits: { increment: 2 } },
          create: { doctorId: inv.inviteeId, aiCredits: 2 },
        })
        // Маркер обработки
        await tx.referralInvitation.update({
          where: { id: inv.id },
          data: { referrerBonusAiCredits: 1 },
        })
      })
      console.log(`   ✅ +1 кр рефереру, +2 кр приглашённому`)
    } catch (e) {
      console.error(`   ❌ ошибка: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  console.log(`\nГотово. Обработано ${invitations.length} приглашений.`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
