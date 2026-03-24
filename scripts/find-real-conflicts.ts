/**
 * Анализ реальных конфликтующих пар из 50 тестовых кейсов.
 * Цель: найти какие пары РЕАЛЬНО конкурируют, а не теоретически.
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { analyzePipeline as analyze } from '../src/lib/mdri/engine'
import { loadMDRIData } from '../src/lib/mdri/data-loader'
import type { MDRISymptom, MDRIModality } from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'

// 50 кейсов
const CASES = [
  { id: 1, expected: 'sulph', text: 'Зуд кожи, усиливается от тепла и мытья. Жжение стоп ночью — высовывает из-под одеяла. Голод в 11 утра, пустота в желудке. Не любит мыться. Склонен философствовать. Хуже стоя. Покраснение всех отверстий. Жаркий.' },
  { id: 2, expected: 'calc', text: 'Ребёнок 3 года. Потеет голова ночью. Стопы холодные и влажные. Поздно пошёл, поздно зубы. Любит яйца. Боится собак. Упрямый. Очень зябкий. Кислый запах от тела.' },
  { id: 3, expected: 'lyc', text: 'Вздутие живота после нескольких глотков еды. Все жалобы справа. Хуже с 16 до 20 часов. Тревога перед выступлениями. Властный, любит командовать. Любит сладкое. Тёплые напитки улучшают.' },
  { id: 4, expected: 'phos', text: 'Носовые кровотечения яркой красной кровью. Боится темноты, грозы и одиночества. Очень сочувственный и чуткий. Жажда холодной воды большими глотками. Хуже в сумерках. Жжение между лопатками. Любит мороженое.' },
  { id: 5, expected: 'sep', text: 'Безразличие к семье, не хочет видеть детей. Опущение внутренних органов. Хуже утром. Желтовато-коричневые пятна на лице. Лучше от энергичных упражнений. Тянет к кислому и уксусу.' },
  { id: 6, expected: 'ars', text: 'Педантичный, всё должно быть идеально. Тревога о здоровье. Хуже после полуночи, особенно 1-2 часа. Жжение, но лучше от тепла — парадокс. Пьёт маленькими глотками часто. Зябкий. Беспокойный.' },
  { id: 7, expected: 'nux-v', text: 'Бизнесмен, много кофе и алкоголя. Раздражительный, нетерпеливый. Хуже утром. Запоры с безрезультатными позывами. Зябкий. Чувствителен к шуму и свету. Хуже от переедания.' },
  { id: 8, expected: 'puls', text: 'Девочка, плаксивая, легко плачет от всего. Хочет утешения и внимания. Нет жажды. Хуже в тёплой комнате, лучше на свежем воздухе. Любит масло и жирное, но плохо переносит. Все выделения мягкие, жёлто-зелёные.' },
  { id: 9, expected: 'bell', text: 'Внезапная высокая температура 40. Лицо красное, горячее. Зрачки расширены. Пульсирующая головная боль. Хуже от света, шума, прикосновения. Бред при лихорадке. Правая сторона.' },
  { id: 10, expected: 'rhus-t', text: 'Скованность суставов хуже утром и от покоя. Первое движение болезненно, потом расходится — лучше от продолжительного движения. Беспокойный, не может лежать на месте. Хуже в сырую холодную погоду. Простуда после промокания.' },
  { id: 11, expected: 'staph', text: 'Подавляет гнев и обиду. Не может выразить злость. Тремор от подавленных эмоций. Цистит после полового акта. Хуже от унижения. Зубы крошатся. Послеоперационная боль.' },
  { id: 12, expected: 'aur', text: 'Глубокая депрессия с чувством вины. Думает о самоубийстве. Ощущение что провалил жизнь. Хуже ночью. Боль в костях. Гипертония. Ответственный, требовательный к себе.' },
  { id: 13, expected: 'cham', text: 'Невыносимая боль при прорезывании зубов у ребёнка. Одна щека красная, другая бледная. Не успокаивается ничем, только когда носят на руках. Капризный, гневливый. Зелёный понос.' },
  { id: 14, expected: 'apis', text: 'Отёк, жалящие боли. Нет жажды. Хуже от тепла. Лучше от холодных компрессов. Кожа розовая, восковидная. Ревность. Суетливость. Правосторонний отит.' },
  { id: 15, expected: 'gels', text: 'Дрожь, слабость, тяжесть. Тяжёлые веки, не может открыть глаза. Тупость, заторможенность. Понос от страха перед экзаменом. Нет жажды при лихорадке. Головная боль от затылка.' },
  { id: 16, expected: 'merc', text: 'Обильное слюноотделение ночью, подушка мокрая. Зловонный пот, не приносит облегчения. Язвы во рту. Хуже ночью. Лимфоузлы увеличены. Не переносит ни жару ни холод. Дёсны кровоточат.' },
  { id: 17, expected: 'con', text: 'Головокружение при повороте головы или в постели. Уплотнения, затвердения желёз. Хуже лёжа. Слабость ног поднимается вверх. Нарушение потенции у пожилых. Медленное прогрессирование.' },
  { id: 18, expected: 'kali-c', text: 'Просыпается в 2-4 часа ночи с тревогой. Колющие боли. Отёки верхних век. Зябкий. Боль в пояснице, хуже в покое. Чувство долга, правила. Слабость. Астма ночью.' },
  { id: 19, expected: 'arg-n', text: 'Тревога ожидания: перед экзаменом, собеседованием — понос. Торопливость. Страх высоты, открытых пространств. Любит сладкое, но от него хуже. Вздутие с громкой отрыжкой. Жарко.' },
  { id: 20, expected: 'petr', text: 'Экзема с глубокими трещинами, хуже зимой. Кожа грубая, шершавая. Укачивает в транспорте. Тошнота от запаха бензина. Потрескавшиеся кончики пальцев. Хуже от холода.' },
  { id: 21, expected: 'lac-c', text: 'Боль в горле меняет сторону: сегодня справа, завтра слева. Низкая самооценка, чувство никчёмности. Страх змей. Чувствительность груди перед менструацией. Выделения из носа тоже чередуют стороны.' },
  { id: 22, expected: 'cocc', text: 'Полное истощение от ухода за больным — не спала неделями. Головокружение, тошнота от поездок. Пустота в голове. Слабость в шее, голова падает. Онемение конечностей. Хуже от недосыпания.' },
  { id: 23, expected: 'thuj', text: 'Бородавки появились после прививки. Жирная кожа. Пот с неприятным запахом. Ощущение что внутри что-то живое. Секретничает, скрытный. Фиксированные идеи. Хуже от сырости. Левая сторона.' },
  { id: 24, expected: 'spong', text: 'Лающий сухой кашель, как пила по дереву. Круп. Хуже до полуночи. Удушье во сне. Ощущение пробки в гортани. Тревога с удушьем. Щитовидная железа увеличена.' },
  { id: 25, expected: 'ip', text: 'Постоянная тошнота, не облегчается рвотой. Язык чистый при тошноте. Кровотечения ярко-красные. Кашель с тошнотой. Хуже в тепле. Бронхоспазм с хрипами.' },
  { id: 26, expected: 'dros', text: 'Приступообразный кашель, как коклюш. Кашель следует друг за другом без перерыва. Хуже после полуночи, лёжа. Рвота от кашля. Носовое кровотечение при кашле. Першение в гортани.' },
  { id: 27, expected: 'coloc', text: 'Жестокие колики, сгибается пополам. Боль после гнева или обиды. Лучше от сильного давления и тепла. Понос от боли. Невралгия лица слева. Горечь во рту.' },
  { id: 28, expected: 'tab', text: 'Сильное укачивание: тошнота, бледность, холодный пот. Лучше на свежем воздухе, от раскрывания живота. Ледяной холод тела. Морская болезнь. Слабость и обморок.' },
  { id: 29, expected: 'caust', text: 'Охриплость, потеря голоса. Обострённое чувство справедливости, переживает за других. Паралич лицевого нерва. Ночной энурез. Контрактуры сухожилий. Хуже в сухую холодную погоду. Зябкий.' },
  { id: 30, expected: 'stram', text: 'Паника, ужас темноты. Насильственное, агрессивное поведение. Галлюцинации. Расширенные зрачки. Судороги от испуга. Заикание. Боится воды. Хуже ночью и в одиночестве.' },
  { id: 31, expected: 'med', text: 'Спит только на животе. На море значительно лучше. Торопится. Грызёт ногти. Хронические выделения. Боли в пятках. Хуже днём. Любит апельсины. Ощущение нереальности.' },
  { id: 32, expected: 'tub', text: 'Постоянное желание перемен и путешествий. Худеет несмотря на хороший аппетит. Частые простуды и бронхиты. Потливость ночью. Боится собак и кошек. Раздражительный от мелочей. Романтичный.' },
  { id: 33, expected: 'psor', text: 'Крайне зябкий, мёрзнет даже летом. Грязная кожа, запах тела. Безнадёжность, отчаяние выздоровления. Хронические зловонные выделения. Голод ночью. Зуд хуже от тепла постели.' },
  { id: 34, expected: 'carc', text: 'Перфекционист, угождает другим в ущерб себе. Подавление эмоций с детства. Любит танцевать, шоколад, путешествия. Множественные родинки. Сильное сочувствие. Бессонница от тревоги. Семейная онкология.' },
  { id: 35, expected: 'sil', text: 'Тонкий, хрупкий, но упрямый. Очень зябкий. Потеют стопы с запахом. Нагноения хронические. Головная боль от затылка вперёд. Боится выступлений. Медленное заживление ран.' },
  { id: 36, expected: 'graph', text: 'Полный, зябкий. Мокнущая экзема за ушами и в складках — выделения как мёд. Запоры: стул крупный, в комках, со слизью. Толстые ногти. Нерешительный.' },
  { id: 37, expected: 'hep', text: 'Крайне чувствителен к холоду и прикосновению. Нагноения с неприятным запахом. Раздражительный, вспыльчивый. Занозистые боли. Хуже от малейшего сквозняка. Потеет при малейшем усилии.' },
  { id: 38, expected: 'bar-c', text: 'Ребёнок медленно развивается, отстаёт в учёбе. Стеснительный, прячется за маму. Увеличенные миндалины и аденоиды. Частые ангины. Маленький рост. Потливость стоп.' },
  { id: 39, expected: 'lach', text: 'Менопауза: приливы жара. Все жалобы слева. Хуже после сна. Не переносит тесную одежду на горле. Ревность и подозрительность. Болтливость, перескакивает с темы. Хуже весной.' },
  { id: 40, expected: 'ph-ac', text: 'Полная апатия и безразличие после горя. Не плачет, просто лежит. Выпадение волос от горя. Понос без боли. Жажда фруктовых соков. Слабость. Рос слишком быстро.' },
  { id: 41, expected: 'bry', text: 'Артрит: любое движение ухудшает. Лежит абсолютно неподвижно. Сильная жажда холодной воды большими глотками. Раздражительный, хочет чтобы оставили в покое. Сухость всех слизистых. Колющие боли.' },
  { id: 42, expected: 'nat-m', text: 'Давнее горе, которое носит в себе. Плачет только одна, утешение ухудшает. Любит солёное. Головная боль от солнца. Герпес на губах. Хуже на солнце. Замкнутая, не показывает чувств.' },
  { id: 43, expected: 'arn', text: 'После падения, травмы. Говорит "я в порядке", не хочет чтобы трогали. Ушибы, синяки. Кровать кажется жёсткой. Страх прикосновения. Кровоподтёки после любого удара.' },
  { id: 44, expected: 'verat', text: 'Одновременно рвота и понос с холодным потом. Коллапс. Ледяной холод тела. Жажда ледяной воды. Судороги в икрах. Лицо бледное с синевой. Выраженная слабость.' },
  { id: 45, expected: 'mag-p', text: 'Спазматические судорожные боли. Лучше от тепла и давления. Лучше сгибаясь пополам. Колики у младенцев. Менструальные спазмы лучше от грелки. Невралгия лица справа.' },
  { id: 46, expected: 'all-c', text: 'Насморк: жгучие водянистые выделения из носа, разъедают верхнюю губу. Слезотечение мягкое, не разъедает. Хуже в тёплой комнате, лучше на свежем воздухе. Чихание.' },
  { id: 47, expected: 'ferr', text: 'Анемия, но лицо легко краснеет. Приливы крови к голове. Слабость от малейшего усилия. Пульсирующая головная боль. Непереносимость яиц. Лучше от медленной ходьбы.' },
  { id: 48, expected: 'nat-s', text: 'Головная боль и астма хуже в сырую погоду. Понос утром. Депрессия хуже утром. Последствия травмы головы. Бородавки. Хуже на морском побережье. Желчные приступы.' },
  { id: 49, expected: 'cina', text: 'Ребёнок скрежещет зубами во сне. Ковыряет в носу. Капризный, не хочет чтобы трогали. Червячки в кале. Голод сразу после еды. Тёмные круги под глазами. Судороги.' },
  { id: 50, expected: 'plat', text: 'Высокомерная, считает себя выше других. Презрение к окружающим. Онемение, ощущение что тело увеличивается. Повышенное либидо. Менструации обильные, тёмные, рано приходят. Спазмы вагинизм.' },
]

// Простой парсер русского текста в симптомы (детерминированный, без AI)
function parseRussianToSymptoms(text: string): { symptoms: MDRISymptom[], modalities: MDRIModality[] } {
  const symptoms: MDRISymptom[] = []
  const modalities: MDRIModality[] = []
  const lower = text.toLowerCase()

  // Базовые маппинги
  const MAPPINGS: { pattern: RegExp; rubric: string; category: 'mental' | 'general' | 'particular'; weight: 1|2|3 }[] = [
    // Mental
    { pattern: /раздражител|нетерпелив|вспыльчив|гневлив/, rubric: 'mind irritability', category: 'mental', weight: 2 },
    { pattern: /тревог|беспоко/, rubric: 'mind anxiety', category: 'mental', weight: 2 },
    { pattern: /депресси|подавлен|угнетён/, rubric: 'mind sadness depression', category: 'mental', weight: 2 },
    { pattern: /страх.*темнот/, rubric: 'mind fear dark', category: 'mental', weight: 3 },
    { pattern: /страх.*высот/, rubric: 'mind fear heights', category: 'mental', weight: 3 },
    { pattern: /страх.*одиночеств/, rubric: 'mind fear alone', category: 'mental', weight: 3 },
    { pattern: /страх.*гроз/, rubric: 'mind fear thunderstorm', category: 'mental', weight: 3 },
    { pattern: /боит.*собак/, rubric: 'mind fear dogs', category: 'mental', weight: 3 },
    { pattern: /ревнив|ревност/, rubric: 'mind jealousy', category: 'mental', weight: 2 },
    { pattern: /плаксив|плачет|слёз/, rubric: 'mind weeping', category: 'mental', weight: 2 },
    { pattern: /утешени.*ухудш|хуже.*утешен/, rubric: 'mind consolation aggravates', category: 'mental', weight: 3 },
    { pattern: /хочет утешени|ищет.*компани/, rubric: 'mind consolation desires', category: 'mental', weight: 3 },
    { pattern: /безразличи|апати/, rubric: 'mind indifference', category: 'mental', weight: 2 },
    { pattern: /горе|утрат/, rubric: 'mind grief', category: 'mental', weight: 2 },
    { pattern: /перфекционист|педантич/, rubric: 'mind perfectionist fastidious', category: 'mental', weight: 2 },
    { pattern: /подавля.*гнев|подавля.*эмоц/, rubric: 'mind suppressed anger', category: 'mental', weight: 3 },
    { pattern: /самоубийств/, rubric: 'mind suicidal', category: 'mental', weight: 3 },
    { pattern: /замкнут|закрыва/, rubric: 'mind reserved closed', category: 'mental', weight: 2 },
    { pattern: /болтлив|перескакив/, rubric: 'mind loquacity', category: 'mental', weight: 2 },
    { pattern: /высокомерн|презрен/, rubric: 'mind haughty', category: 'mental', weight: 3 },
    { pattern: /галлюцинаци/, rubric: 'mind delusions hallucinations', category: 'mental', weight: 3 },
    { pattern: /агрессив|насильств/, rubric: 'mind rage violent', category: 'mental', weight: 3 },
    { pattern: /стеснительн|робк|прячется/, rubric: 'mind timidity bashful', category: 'mental', weight: 2 },
    { pattern: /справедливост/, rubric: 'mind sympathetic injustice', category: 'mental', weight: 2 },
    { pattern: /философств/, rubric: 'mind philosophical', category: 'mental', weight: 2 },
    // General
    { pattern: /зябк|мёрзн|озноб/, rubric: 'generalities chilly', category: 'general', weight: 2 },
    { pattern: /жарк|не переносит жар/, rubric: 'generalities warm aggravates', category: 'general', weight: 2 },
    { pattern: /хуже.*утр/, rubric: 'generalities morning aggravates', category: 'general', weight: 2 },
    { pattern: /хуже.*ночь|хуже.*после полуноч/, rubric: 'generalities night aggravates', category: 'general', weight: 2 },
    { pattern: /2-?4 час.*ночи|просыпа.*2.*4/, rubric: 'sleep waking 2-4am', category: 'general', weight: 3 },
    { pattern: /16.*20 час|4.*8 вечер/, rubric: 'generalities afternoon 16-20h aggravates', category: 'general', weight: 3 },
    { pattern: /слабост|истощен|утомля/, rubric: 'generalities weakness', category: 'general', weight: 1 },
    { pattern: /жажд.*холодн.*большими/, rubric: 'stomach thirst large quantities cold', category: 'general', weight: 3 },
    { pattern: /нет жажды|без жажды/, rubric: 'stomach thirstless', category: 'general', weight: 3 },
    { pattern: /маленькими глотками/, rubric: 'stomach thirst small sips', category: 'general', weight: 3 },
    { pattern: /любит солён/, rubric: 'generalities desire salt', category: 'general', weight: 3 },
    { pattern: /любит сладк/, rubric: 'generalities desire sweets', category: 'general', weight: 2 },
    { pattern: /лучше.*свеж.*воздух/, rubric: 'generalities open air ameliorates', category: 'general', weight: 2 },
    { pattern: /хуже.*тёпл.*комнат/, rubric: 'generalities warm room aggravates', category: 'general', weight: 2 },
    { pattern: /лучше.*движен|расходится/, rubric: 'generalities motion continued ameliorates', category: 'general', weight: 3 },
    { pattern: /хуже.*движен|любое движение/, rubric: 'generalities motion aggravates', category: 'general', weight: 3 },
    { pattern: /хуже.*покой|хуже.*лёж/, rubric: 'generalities rest aggravates', category: 'general', weight: 2 },
    { pattern: /хуже.*сыр.*погод/, rubric: 'generalities wet weather aggravates', category: 'general', weight: 2 },
    { pattern: /лучше.*тепл|лучше.*грелк/, rubric: 'generalities warmth ameliorates', category: 'general', weight: 2 },
    { pattern: /лучше.*давлен/, rubric: 'generalities pressure ameliorates', category: 'general', weight: 2 },
    { pattern: /лучше.*мор/, rubric: 'generalities seashore ameliorates', category: 'general', weight: 3 },
    { pattern: /хуже.*солнц/, rubric: 'generalities sun aggravates', category: 'general', weight: 2 },
    { pattern: /потеет.*голова.*ноч|потливость.*ноч/, rubric: 'perspiration head night', category: 'general', weight: 3 },
    { pattern: /хуже.*после.*сн/, rubric: 'generalities sleep after aggravates', category: 'general', weight: 3 },
    // Particular
    { pattern: /головн.*бол/, rubric: 'head pain', category: 'particular', weight: 1 },
    { pattern: /кашел/, rubric: 'cough', category: 'particular', weight: 1 },
    { pattern: /тошнот/, rubric: 'stomach nausea', category: 'particular', weight: 1 },
    { pattern: /понос|диаре/, rubric: 'rectum diarrhea', category: 'particular', weight: 1 },
    { pattern: /запор/, rubric: 'rectum constipation', category: 'particular', weight: 1 },
    { pattern: /экзем|сыпь|зуд.*кож/, rubric: 'skin eruptions eczema', category: 'particular', weight: 2 },
    { pattern: /отёк|отечност/, rubric: 'generalities swelling edema', category: 'particular', weight: 1 },
    { pattern: /судорог|спазм/, rubric: 'generalities convulsions', category: 'particular', weight: 2 },
    { pattern: /кровотечен/, rubric: 'generalities hemorrhage', category: 'particular', weight: 2 },
    { pattern: /бородавк/, rubric: 'skin warts', category: 'particular', weight: 2 },
    { pattern: /нагноен/, rubric: 'generalities suppuration', category: 'particular', weight: 2 },
    { pattern: /головокружен/, rubric: 'vertigo', category: 'particular', weight: 1 },
    { pattern: /колик/, rubric: 'abdomen pain colic', category: 'particular', weight: 2 },
    { pattern: /сгиба.*попол/, rubric: 'abdomen pain bending double ameliorates', category: 'particular', weight: 3 },
    { pattern: /слев|левая сторон/, rubric: 'generalities side left', category: 'particular', weight: 2 },
    { pattern: /справа|правая сторон/, rubric: 'generalities side right', category: 'particular', weight: 2 },
    { pattern: /одна щека красн/, rubric: 'face one cheek red other pale', category: 'particular', weight: 3 },
    { pattern: /зрачки расширен/, rubric: 'eye pupils dilated', category: 'particular', weight: 3 },
    { pattern: /герпес.*губ/, rubric: 'face eruptions herpes lips', category: 'particular', weight: 3 },
    { pattern: /слюноотделен.*обильн/, rubric: 'mouth salivation profuse', category: 'particular', weight: 3 },
    { pattern: /лающ.*кашел/, rubric: 'larynx croup cough barking', category: 'particular', weight: 3 },
    { pattern: /укачива|морск.*болезн/, rubric: 'stomach nausea motion sickness', category: 'particular', weight: 3 },
    { pattern: /охриплост|потеря голос/, rubric: 'larynx hoarseness voice lost', category: 'particular', weight: 2 },
    { pattern: /жжение стоп/, rubric: 'extremities burning feet', category: 'particular', weight: 3 },
    { pattern: /потеют стопы|потливость стоп/, rubric: 'extremities perspiration feet', category: 'particular', weight: 2 },
    { pattern: /пульсирующ.*головн/, rubric: 'head pain pulsating', category: 'particular', weight: 2 },
    { pattern: /меняет сторон|чередуют/, rubric: 'generalities alternating sides', category: 'particular', weight: 3 },
  ]

  for (const map of MAPPINGS) {
    if (map.pattern.test(lower)) {
      symptoms.push({
        rubric: map.rubric,
        category: map.category,
        present: true,
        weight: map.weight,
      })
    }
  }

  // Модальности
  if (/хуже.*тепл|хуже.*жар/.test(lower)) modalities.push({ pairId: 'heat_cold', value: 'agg' })
  if (/лучше.*тепл|лучше.*грелк/.test(lower)) modalities.push({ pairId: 'heat_cold', value: 'amel' })
  if (/хуже.*движен/.test(lower)) modalities.push({ pairId: 'motion_rest', value: 'agg' })
  if (/лучше.*движен|расходится/.test(lower)) modalities.push({ pairId: 'motion_rest', value: 'amel' })
  if (/лучше.*свеж.*воздух/.test(lower)) modalities.push({ pairId: 'open_air', value: 'amel' })
  if (/хуже.*утешен/.test(lower)) modalities.push({ pairId: 'consolation', value: 'agg' })

  return { symptoms, modalities }
}

async function main() {
  const data = await loadMDRIData()

  // Собираем конфликты
  const pairCount: Record<string, { count: number; cases: { id: number; expected: string; top1: string; top2: string; gap: number; correct: boolean }[] }> = {}

  for (const c of CASES) {
    const { symptoms, modalities } = parseRussianToSymptoms(c.text)
    if (symptoms.length === 0) continue

    const results = analyze(data, symptoms, modalities, [], DEFAULT_PROFILE)
    if (results.length < 2) continue

    const top1 = results[0].remedy.toLowerCase()
    const top2 = results[1].remedy.toLowerCase()
    const gap = results[0].totalScore - results[1].totalScore

    // Нормализуем пару (алфавитный порядок)
    const pair = [top1, top2].sort().join(' vs ')

    if (!pairCount[pair]) pairCount[pair] = { count: 0, cases: [] }
    pairCount[pair].count++
    pairCount[pair].cases.push({
      id: c.id,
      expected: c.expected,
      top1,
      top2,
      gap,
      correct: top1 === c.expected,
    })
  }

  // Сортируем по частоте
  const sorted = Object.entries(pairCount)
    .sort((a, b) => b[1].count - a[1].count)

  console.log('\n═══ РЕАЛЬНЫЕ КОНФЛИКТУЮЩИЕ ПАРЫ (из 50 кейсов) ═══\n')

  for (const [pair, data] of sorted) {
    const errorCases = data.cases.filter(c => !c.correct)
    const icon = errorCases.length > 0 ? '❌' : '✅'
    console.log(`${icon} ${pair}  (${data.count} раз, ${errorCases.length} ошибок)`)
    for (const c of data.cases) {
      const mark = c.correct ? '✓' : '✗'
      console.log(`   ${mark} #${c.id} expected=${c.expected} top1=${c.top1} top2=${c.top2} gap=${c.gap}`)
    }
    console.log()
  }

  // ТОП-5 пар с ошибками
  const errorPairs = sorted
    .filter(([, d]) => d.cases.some(c => !c.correct))
    .sort((a, b) => b[1].cases.filter(c => !c.correct).length - a[1].cases.filter(c => !c.correct).length)

  console.log('\n═══ ТОП ПАРЫ ГДЕ НУЖЕН DISCRIMINATOR ═══\n')
  for (const [pair, data] of errorPairs.slice(0, 10)) {
    const errors = data.cases.filter(c => !c.correct)
    console.log(`${pair}: ${errors.length} ошибок из ${data.count} кейсов`)
    for (const e of errors) {
      console.log(`   expected=${e.expected} got=${e.top1} (gap=${e.gap})`)
    }
  }
}

main().catch(console.error)
