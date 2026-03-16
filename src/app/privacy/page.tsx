import Link from 'next/link'

export const metadata = {
  title: 'Политика конфиденциальности — Similia',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Навбар */}
      <header className="border-b" style={{ backgroundColor: 'white', borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[11px]" style={{ backgroundColor: 'var(--color-sidebar)', color: 'var(--color-amber)' }}>H</div>
            <span className="font-semibold text-gray-900 text-sm">Similia</span>
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm text-gray-400">Политика конфиденциальности</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-light text-gray-900 mb-2" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
          Политика конфиденциальности
        </h1>
        <p className="text-sm text-gray-400 mb-10">Редакция от 16 марта 2025 года</p>

        <div className="prose prose-sm max-w-none space-y-8 text-gray-600">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Общие положения</h2>
            <p className="leading-relaxed">
              Настоящая Политика конфиденциальности регулирует порядок обработки персональных данных пользователей сервиса Similia (далее — «Сервис»), доступного по адресу similia.vercel.app, в соответствии с требованиями Федерального закона № 152-ФЗ «О персональных данных».
            </p>
            <p className="leading-relaxed mt-3">
              Используя Сервис, вы соглашаетесь с условиями настоящей Политики. Если вы не согласны с её условиями — прекратите использование Сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Оператор персональных данных</h2>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm space-y-1.5">
              <p><span className="text-gray-400">Сервис:</span> Similia</p>
              <p><span className="text-gray-400">Сайт:</span> similia.vercel.app</p>
              <p><span className="text-gray-400">Контакт:</span> support@similia.ru</p>
              <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                Для целей обработки персональных данных оператором является физическое лицо, зарегистрированное в качестве самозанятого или ИП, использующее данный сервис для ведения частной практики.
              </p>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Согласие на обработку данных пациентов</h2>
            <p className="leading-relaxed">
              Данные пациентов вносятся в систему врачом, который несёт ответственность за получение письменного или электронного согласия пациента на обработку его персональных данных в соответствии с требованиями ст. 9 152-ФЗ.
            </p>
            <p className="leading-relaxed mt-3">
              При заполнении онлайн-анкеты (intake-форма) пациент явно подтверждает согласие на обработку персональных данных путём отметки соответствующего чекбокса перед началом заполнения формы.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Хранение и защита данных</h2>
            <p className="leading-relaxed">
              Данные хранятся в базе данных Supabase. Доступ к данным конкретного врача ограничен на уровне базы данных (Row Level Security): врач видит только данные своих пациентов.
            </p>
            <p className="leading-relaxed mt-3">
              Пароли хранятся в хешированном виде. Передача данных осуществляется по защищённому протоколу HTTPS.
            </p>
            <p className="leading-relaxed mt-3 text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
              ⚠ Обратите внимание: в текущей версии Сервиса серверная инфраструктура расположена за пределами территории РФ. Если вы работаете с персональными данными граждан РФ в рамках профессиональной деятельности, рекомендуем уточнить требования локализации согласно ч. 5 ст. 18 152-ФЗ.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Права субъектов персональных данных</h2>
            <p className="leading-relaxed mb-3">В соответствии с 152-ФЗ, субъект персональных данных вправе:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Получить информацию об обработке его персональных данных</li>
              <li>Потребовать уточнения, блокировки или уничтожения своих данных</li>
              <li>Отозвать согласие на обработку персональных данных</li>
            </ul>
            <p className="leading-relaxed mt-3">
              Для реализации перечисленных прав обратитесь к врачу, ведущему вашу карточку, или направьте запрос по адресу: <span className="text-emerald-700">support@similia.ru</span>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Удаление данных</h2>
            <p className="leading-relaxed">
              Врач может удалить карточку пациента в любой момент через интерфейс Сервиса. При удалении аккаунта врача все связанные данные удаляются безвозвратно в течение 30 дней.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Изменения политики</h2>
            <p className="leading-relaxed">
              Мы оставляем за собой право изменять настоящую Политику. Актуальная версия всегда доступна по адресу similia.vercel.app/privacy. При существенных изменениях пользователи будут уведомлены по электронной почте.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t py-6 mt-6" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">← На главную</Link>
          <p className="text-xs text-gray-300">© 2025 Similia</p>
        </div>
      </footer>
    </div>
  )
}
