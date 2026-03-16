import Link from 'next/link'

export const metadata = {
  title: 'Публичная оферта — Similia',
  description: 'Условия оказания услуг сервиса Similia для гомеопатов',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ebe3' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors"
          style={{ color: '#9a8a6a' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Similia
        </Link>

        <h1
          className="text-4xl font-light mb-2"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#1a1a0a' }}
        >
          Публичная оферта
        </h1>
        <p className="text-sm mb-10" style={{ color: '#9a8a6a' }}>
          Редакция от 1 марта 2025 г.
        </p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: '#3a2e1a' }}>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a0a' }}>1. Общие положения</h2>
            <p>
              Настоящий документ является публичной офертой (далее — «Оферта») и адресован любому физическому лицу, желающему использовать сервис Similia (далее — «Сервис»).
            </p>
            <p className="mt-2">
              Акцептом оферты считается регистрация в Сервисе и/или начало использования любых его функций. С момента акцепта Пользователь считается ознакомленным и согласившимся с условиями настоящей Оферты.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a0a' }}>2. Исполнитель</h2>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#e8e0d4', border: '1px solid #d4c9b8' }}>
              <p>Сервис предоставляется на условиях самозанятости.</p>
              <p className="mt-1">По вопросам обращайтесь: <a href="mailto:hello@simillia.ru" style={{ color: '#2d6a4f' }}>hello@simillia.ru</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a0a' }}>3. Предмет договора</h2>
            <p>
              Исполнитель предоставляет Пользователю доступ к веб-сервису Similia — цифровому кабинету для специалистов в области гомеопатии. Сервис включает:
            </p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Ведение картотеки пациентов</li>
              <li>Запись и хранение консультаций</li>
              <li>Онлайн-анкетирование пациентов</li>
              <li>Инструменты реперторизации (Repertorium Publicum)</li>
              <li>Функцию онлайн-записи пациентов</li>
              <li>Прочие инструменты, описанные в интерфейсе Сервиса</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a0a' }}>4. Стоимость и оплата</h2>
            <p>
              Сервис работает по модели подписки. Актуальные тарифы указаны на странице настроек аккаунта. Оплата принимается в рублях РФ через платёжные сервисы-агрегаторы.
            </p>
            <p className="mt-2">
              В настоящее время доступ к Сервису предоставляется бесплатно в режиме бета-тестирования. Исполнитель уведомит Пользователей об изменении условий не менее чем за 7 дней.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a0a' }}>5. Порядок возврата</h2>
            <p>
              В случае оплаты подписки Пользователь вправе запросить возврат средств в течение 3 (трёх) рабочих дней с момента оплаты, если услуги фактически не были использованы. Для возврата необходимо направить запрос на <a href="mailto:hello@simillia.ru" style={{ color: '#2d6a4f' }}>hello@simillia.ru</a> с указанием причины.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a0a' }}>6. Персональные данные</h2>
            <p>
              Обработка персональных данных осуществляется в соответствии с Федеральным законом №152-ФЗ «О персональных данных» и{' '}
              <Link href="/privacy" style={{ color: '#2d6a4f', textDecoration: 'underline' }}>
                Политикой конфиденциальности
              </Link>.
            </p>
            <p className="mt-2">
              Данные пациентов, которые Пользователь вносит в Сервис, являются ответственностью самого Пользователя. Исполнитель обеспечивает техническую защиту данных, но не несёт ответственности за законность их сбора и хранения.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a0a' }}>7. Ограничение ответственности</h2>
            <p>
              Сервис предоставляется «как есть». Исполнитель не гарантирует бесперебойную работу, но прилагает все разумные усилия для обеспечения стабильности.
            </p>
            <p className="mt-2">
              Сервис является инструментом для врачей и не заменяет медицинскую документацию. Ответственность за медицинские решения несёт исключительно Пользователь-специалист.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a0a' }}>8. Изменение условий</h2>
            <p>
              Исполнитель вправе в одностороннем порядке изменять условия настоящей Оферты. Изменения вступают в силу с момента публикации новой редакции на данной странице.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a0a' }}>9. Применимое право</h2>
            <p>
              Настоящая Оферта регулируется законодательством Российской Федерации. Споры разрешаются путём переговоров, при невозможности — в суде по месту нахождения Исполнителя.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a0a' }}>10. Контакты</h2>
            <p>
              По всем вопросам, связанным с Офертой и использованием Сервиса:{' '}
              <a href="mailto:hello@simillia.ru" style={{ color: '#2d6a4f' }}>hello@simillia.ru</a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t" style={{ borderColor: '#d4c9b8' }}>
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#9a8a6a' }}>
            <Link href="/privacy" className="hover:underline" style={{ color: '#9a8a6a' }}>Политика конфиденциальности</Link>
            <Link href="/" className="hover:underline" style={{ color: '#9a8a6a' }}>Similia — главная</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
