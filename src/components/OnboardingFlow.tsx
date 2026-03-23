'use client'

// OnboardingFlow больше не нужен — первый вход редиректит на карточку демо-пациента
export default function OnboardingFlow({ realPatientCount = 0 }: { realPatientCount?: number }) {
  void realPatientCount
  return null
}
