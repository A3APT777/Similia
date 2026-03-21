import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Публичная оферта — Similia',
  description: 'Условия оказания услуг сервиса Similia для гомеопатов',
  alternates: { canonical: 'https://simillia.ru/terms' },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ebe3' }}>

      {/* Skip to content */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm" style={{ color: 'var(--sim-green)' }}>
        Перейти к содержимому
      </a>

      {/* Навбар */}
      <header className="border-b" style={{ backgroundColor: 'rgba(247,243,237,0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/" aria-label="На главную" className="flex items-center gap-2">
            <svg width={24} height={24} viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#2d6a4f" opacity="0.9" />
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#1a3020" opacity="0.65" />
              <path d="M18 8 Q18 18 18 28" stroke="#1a3020" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '18px', fontWeight: 500, color: 'var(--sim-forest)' }}>Similia</span>
          </Link>
          <span className="text-gray-300" aria-hidden="true">/</span>
          <span className="text-sm text-gray-700">Публичная оферта</span>
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-light text-gray-900 mb-2" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
          Публичная оферта
        </h1>
        <p className="text-sm text-gray-600 mb-10">Редакция от 19 марта 2026 г.</p>

        <div className="prose prose-sm max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Общие положения</h2>
            <p className="leading-relaxed">
              Настоящий документ является публичной офертой (далее — «Оферта») и адресован любому физическому лицу, желающему использовать сервис Similia (далее — «Сервис»).
            </p>
            <p className="leading-relaxed mt-3">
              Акцептом оферты считается регистрация в Сервисе и/или начало использования любых его функций. С момента акцепта Пользователь считается ознакомленным и согласившимся с условиями настоящей Оферты.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Исполнитель</h2>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm space-y-1.5">
              <p><span className="text-gray-600">Исполнитель:</span> Назаретян Кнарик Давидовна, плательщик налога на профессиональный доход (422-ФЗ)</p>
              <p><span className="text-gray-600">ИНН:</span> 500717175199</p>
              <p><span className="text-gray-600">Сайт:</span> <a href="https://simillia.ru" className="text-emerald-700 hover:underline">simillia.ru</a></p>
              <p><span className="text-gray-600">Контакт:</span> <a href="mailto:simillia@mail.ru" className="text-emerald-700 hover:underline">simillia@mail.ru</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Предмет договора</h2>
            <p className="leading-relaxed">
              Исполнитель предоставляет Пользователю доступ к веб-сервису Similia — цифровому кабинету для специалистов в области гомеопатии. Сервис включает:
            </p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside text-sm">
              <li>Ведение картотеки пациентов</li>
              <li>Запись и хранение консультаций</li>
              <li>Онлайн-анкетирование пациентов</li>
              <li>Инструменты реперторизации (Repertorium Publicum)</li>
              <li>Функцию онлайн-записи пациентов</li>
              <li>Прочие инструменты, описанные в интерфейсе Сервиса</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Стоимость и оплата</h2>
            <p className="leading-relaxed">
              Сервис работает по модели подписки (Freemium). Доступны следующие тарифы:
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#f0ebe3' }}>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-700"></th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-700">Бесплатный</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-700">Стандарт</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Стоимость</td>
                    <td className="px-4 py-2 text-center font-medium">0 ₽</td>
                    <td className="px-4 py-2 text-center font-medium">290 ₽/мес</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Годовая оплата</td>
                    <td className="px-4 py-2 text-center">—</td>
                    <td className="px-4 py-2 text-center">2 900 ₽/год</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Пациенты</td>
                    <td className="px-4 py-2 text-center">до 5</td>
                    <td className="px-4 py-2 text-center">без ограничений</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Реперторий</td>
                    <td className="px-4 py-2 text-center">✓</td>
                    <td className="px-4 py-2 text-center">✓</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Онлайн-запись</td>
                    <td className="px-4 py-2 text-center">—</td>
                    <td className="px-4 py-2 text-center">✓</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Экспорт в PDF</td>
                    <td className="px-4 py-2 text-center">—</td>
                    <td className="px-4 py-2 text-center">✓</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Напоминания о визитах</td>
                    <td className="px-4 py-2 text-center">—</td>
                    <td className="px-4 py-2 text-center">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="leading-relaxed mt-4">
              Оплата принимается в рублях Российской Федерации через платёжные сервисы-агрегаторы. Актуальные тарифы также указаны на странице{' '}
              <a href="/pricing" className="text-emerald-700 underline">simillia.ru/pricing</a>.
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-2">4.1. Автопродление</h3>
            <p className="leading-relaxed">
              Подписка продлевается автоматически по окончании оплаченного периода, если Пользователь не отменил её не менее чем за 24 часа до окончания текущего периода. Отменить подписку можно в разделе «Биллинг» в личном кабинете.
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-2">4.2. Изменение тарифа</h3>
            <p className="leading-relaxed">
              При переходе с платного тарифа на бесплатный доступ к Сервису сохраняется до конца оплаченного периода. После окончания периода действуют ограничения бесплатного тарифа. Данные пациентов не удаляются.
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-2">4.3. Промо-период</h3>
            <p className="leading-relaxed">
              Пользователи, зарегистрировавшиеся до 31 мая 2026 г., получают бесплатный доступ к тарифу «Стандарт» до указанной даты. Исполнитель оставляет за собой право изменять условия промо-периода, уведомив Пользователей не менее чем за 14 дней.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Порядок возврата</h2>
            <p className="leading-relaxed">
              Пользователь вправе запросить возврат средств в течение 3 (трёх) рабочих дней с момента оплаты, если за оплаченный период было проведено менее 5 (пяти) действий в Сервисе (создание пациента, консультация, экспорт). Для возврата необходимо направить запрос на{' '}
              <a href="mailto:simillia@mail.ru" className="text-emerald-700 hover:underline">simillia@mail.ru</a> с указанием причины.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Персональные данные</h2>
            <p className="leading-relaxed">
              Обработка персональных данных осуществляется в соответствии с Федеральным законом №152-ФЗ «О персональных данных» и{' '}
              <Link href="/privacy" className="text-emerald-700 underline">
                Политикой конфиденциальности
              </Link>.
            </p>
            <p className="leading-relaxed mt-3">
              Данные пациентов, которые Пользователь вносит в Сервис, являются ответственностью самого Пользователя. Исполнитель обеспечивает техническую защиту данных, но не несёт ответственности за законность их сбора и хранения.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Ограничение ответственности</h2>
            <p className="leading-relaxed">
              Сервис предоставляется «как есть». Исполнитель не гарантирует бесперебойную работу, но прилагает все разумные усилия для обеспечения стабильности.
            </p>
            <p className="leading-relaxed mt-3">
              Сервис является инструментом для врачей и не заменяет медицинскую документацию. Ответственность за медицинские решения несёт исключительно Пользователь-специалист.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Изменение условий</h2>
            <p className="leading-relaxed">
              Исполнитель вправе в одностороннем порядке изменять условия настоящей Оферты. Изменения вступают в силу с момента публикации новой редакции на данной странице.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Применимое право</h2>
            <p className="leading-relaxed">
              Настоящая Оферта регулируется законодательством Российской Федерации. Споры разрешаются путём переговоров, при невозможности — в суде по месту нахождения Исполнителя.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Контакты</h2>
            <p className="leading-relaxed">
              По всем вопросам, связанным с Офертой и использованием Сервиса:{' '}
              <a href="mailto:simillia@mail.ru" className="text-emerald-700">simillia@mail.ru</a>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t py-6 mt-6" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="text-sm py-2 text-gray-600 hover:text-gray-900 transition-colors">← На главную</Link>
          <Link href="/privacy" className="text-sm py-2 text-gray-600 hover:text-gray-900 transition-colors">Политика конфиденциальности</Link>
          <p className="text-sm text-gray-600">© 2026 Similia</p>
        </div>
      </footer>
    </div>
  )
}
