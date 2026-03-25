import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — Similia',
  description: 'Политика обработки персональных данных сервиса Similia для гомеопатов',
  alternates: { canonical: 'https://simillia.ru/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--sim-bg, #faf8f5)' }}>

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
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="var(--sim-forest)" opacity="0.65" />
              <path d="M18 8 Q18 18 18 28" stroke="var(--sim-forest)" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '18px', fontWeight: 500, color: 'var(--sim-forest)' }}>Similia</span>
          </Link>
          <span className="text-gray-300" aria-hidden="true">/</span>
          <span className="text-sm text-gray-700">Политика конфиденциальности</span>
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-light text-gray-900 mb-2" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
          Политика конфиденциальности
        </h1>
        <p className="text-sm text-gray-600 mb-10">Редакция от 19 марта 2026 г.</p>

        <div className="prose prose-sm max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Общие положения</h2>
            <p className="leading-relaxed">
              Настоящая Политика конфиденциальности регулирует порядок обработки персональных данных пользователей сервиса Similia (далее — «Сервис»), доступного по адресу simillia.ru, в соответствии с требованиями Федерального закона № 152-ФЗ «О персональных данных».
            </p>
            <p className="leading-relaxed mt-3">
              Используя Сервис, вы соглашаетесь с условиями настоящей Политики. Если вы не согласны с её условиями — прекратите использование Сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Оператор персональных данных</h2>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm space-y-1.5">
              <p><span className="text-gray-600">Сервис:</span> Similia</p>
              <p><span className="text-gray-600">Сайт:</span> simillia.ru</p>
              <p><span className="text-gray-600">Оператор:</span> Назаретян Кнарик Давидовна, плательщик налога на профессиональный доход (422-ФЗ)</p>
              <p><span className="text-gray-600">ИНН:</span> 500717175199</p>
              <p><span className="text-gray-600">Контакт:</span> <a href="mailto:simillia@mail.ru" className="text-emerald-700 hover:underline">simillia@mail.ru</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Какие данные мы обрабатываем</h2>
            <p className="leading-relaxed mb-3">Сервис обрабатывает два типа персональных данных:</p>

            <h3 className="font-semibold text-gray-800 mb-2">3.1. Данные врача (пользователя аккаунта)</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Имя и фамилия</li>
              <li>Адрес электронной почты</li>
              <li>Зашифрованный пароль (не хранится в открытом виде)</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mb-2 mt-4">3.2. Данные пациентов</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Имя и фамилия</li>
              <li>Дата рождения</li>
              <li>Номер телефона</li>
              <li>Адрес электронной почты</li>
              <li>Сведения о здоровье (жалобы, симптомы, назначения) — относятся к специальным категориям ПД</li>
              <li>Фотографии (при наличии)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Цели обработки персональных данных</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Ведение электронных медицинских карточек пациентов</li>
              <li>Организация приёмов и расписания консультаций</li>
              <li>Отправка и получение анкет пациентов</li>
              <li>Мониторинг динамики самочувствия после лечения</li>
              <li>Формирование выписок и экспорт данных</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Файлы cookie и аналитика</h2>
            <p className="leading-relaxed">
              Сервис использует Яндекс.Метрику для анализа посещаемости и улучшения удобства использования. Яндекс.Метрика использует файлы cookie для идентификации повторных визитов.
            </p>
            <p className="leading-relaxed mt-3">
              В Сервисе включена технология WebVisor — анонимная запись действий пользователя на странице (движения мыши, клики, прокрутка). WebVisor не записывает данные, вводимые в формы (пароли, персональные данные пациентов). Запись используется исключительно для улучшения интерфейса.
            </p>
            <p className="leading-relaxed mt-3">
              Аналитика загружается только после явного согласия пользователя через баннер на сайте. Вы можете отозвать согласие, очистив данные сайта в настройках браузера.
            </p>
            <p className="leading-relaxed mt-3 text-sm">
              Политика конфиденциальности Яндекс.Метрики:{' '}
              <a href="https://metrica.yandex.ru/about/info/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                metrica.yandex.ru/about/info/privacy-policy
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Согласие на обработку данных пациентов</h2>
            <p className="leading-relaxed">
              Данные пациентов вносятся в систему врачом, который несёт ответственность за получение письменного или электронного согласия пациента на обработку его персональных данных в соответствии с требованиями ст. 9 152-ФЗ.
            </p>
            <p className="leading-relaxed mt-3">
              При заполнении онлайн-анкеты пациент подтверждает согласие на обработку персональных данных, установив соответствующую галочку перед началом заполнения формы.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Хранение и защита данных</h2>
            <p className="leading-relaxed">
              Данные хранятся в облачной базе данных с разграничением доступа на уровне строк (Row Level Security): каждый врач видит только данные своих пациентов.
            </p>
            <p className="leading-relaxed mt-3">
              Пароли хранятся в хешированном виде. Передача данных осуществляется по защищённому протоколу HTTPS.
            </p>
            <p className="leading-relaxed mt-3 text-sm text-amber-900 bg-amber-50 rounded-xl px-4 py-3 border border-amber-200">
              ⚠ Обратите внимание: в текущей версии Сервиса серверная инфраструктура расположена за пределами территории РФ. Используя Сервис, вы даёте согласие на трансграничную передачу ваших персональных данных в соответствии со ст. 12 Федерального закона № 152-ФЗ. Если вы работаете с персональными данными граждан РФ в рамках профессиональной деятельности, рекомендуем уточнить требования локализации согласно ч. 5 ст. 18 152-ФЗ.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Права субъектов персональных данных</h2>
            <p className="leading-relaxed mb-3">В соответствии с 152-ФЗ, субъект персональных данных вправе:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Получить информацию об обработке его персональных данных</li>
              <li>Потребовать уточнения, блокировки или уничтожения своих данных</li>
              <li>Отозвать согласие на обработку персональных данных</li>
            </ul>
            <p className="leading-relaxed mt-3">
              Для реализации перечисленных прав обратитесь к врачу, ведущему вашу карточку, или направьте запрос по адресу: <a href="mailto:simillia@mail.ru" className="text-emerald-700 hover:underline">simillia@mail.ru</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Удаление данных</h2>
            <p className="leading-relaxed">
              Врач может удалить карточку пациента в любой момент через интерфейс Сервиса. При удалении аккаунта врача все связанные данные удаляются безвозвратно в течение 30 дней.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Изменения политики</h2>
            <p className="leading-relaxed">
              Мы оставляем за собой право изменять настоящую Политику. Актуальная версия всегда доступна по адресу simillia.ru/privacy. При существенных изменениях пользователи будут уведомлены по электронной почте.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t py-6 mt-6" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="text-sm py-2 text-gray-600 hover:text-gray-900 transition-colors">← На главную</Link>
          <Link href="/terms" className="text-sm py-2 text-gray-600 hover:text-gray-900 transition-colors">Публичная оферта</Link>
          <p className="text-sm text-gray-600">© 2026 Similia</p>
        </div>
      </footer>
    </div>
  )
}
