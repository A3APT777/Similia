-- Демо опросник 1: Соколова — отличная реакция (Sulphur 30C)
INSERT INTO pre_visit_surveys (consultation_id, patient_id, doctor_id, status, completed_at, answers)
VALUES (
  '5340d77f-0f1d-4482-a687-e308d51b19f8',
  '56ea1ad9-9aeb-45e8-8257-ff64552e4d87',
  '26b59b96-1da1-4da8-a31a-929730ca8089',
  'completed',
  now() - interval '2 days',
  '{"general_reaction":"После приёма Sulphur 30C через сутки заметила прилив энергии. Кожа стала чище на третий день. Головные боли уменьшились.","initial_aggravation":{"choice":"Да, усилились имеющиеся жалобы","comment":"На второй день усилился зуд кожи, длился около 6 часов, потом прошёл"},"overall_change":3,"emotional_state":"Стала спокойнее, меньше раздражаюсь по пустякам. Сон стал глубже. Появилось желание заниматься делами, которые откладывала.","energy_level":7,"dreams":"Снились яркие сны про воду — плавала в море. Раньше таких снов не было.","sleep":{"choice":"Улучшилось","comment":"Засыпаю быстрее, не просыпаюсь в 3 часа ночи как раньше"},"appetite":{"choice":"Улучшилось","comment":"Появился здоровый аппетит, перестала хотеть сладкое"},"thirst":{"choice":"Без изменений","comment":""},"sweating":{"choice":"Без изменений","comment":""},"thermoregulation":{"choice":"Улучшилось","comment":"Перестала мёрзнуть по вечерам"},"symptom_order":"Сначала улучшилось настроение (1-й день), потом сон (2-й день), потом кожа стала чище (3-5 день). Головные боли уменьшились последними.","old_symptoms_returned":{"value":true,"comment":"Вернулась лёгкая сыпь на локтях — такая была 2 года назад, прошла за 3 дня"},"main_complaint_change":{"scale":3,"comment":"Кожный зуд значительно уменьшился, сыпь почти прошла"},"compliance":{"choice":"Да, всё по назначению","comment":""},"other_medications":{"value":false,"comment":""},"life_events":""}'
);

-- Демо опросник 2: Петров — минимальная реакция (пропуски приёма)
INSERT INTO pre_visit_surveys (patient_id, doctor_id, status, completed_at, answers)
VALUES (
  '891034f3-41b7-49b2-9484-656204438e50',
  '26b59b96-1da1-4da8-a31a-929730ca8089',
  'completed',
  now() - interval '1 day',
  '{"general_reaction":"Особых изменений не заметил. Может быть чуть лучше сплю.","initial_aggravation":{"choice":"Нет, ничего не обострялось","comment":""},"overall_change":0,"emotional_state":"Без особых изменений. Может быть чуть менее тревожен на работе.","energy_level":5,"sleep":{"choice":"Улучшилось","comment":"Сплю немного крепче"},"appetite":{"choice":"Без изменений","comment":""},"thirst":{"choice":"Без изменений","comment":""},"sweating":{"choice":"Без изменений","comment":""},"thermoregulation":{"choice":"Без изменений","comment":""},"symptom_order":"Пока не могу сказать точно, изменения минимальные","main_complaint_change":{"scale":0,"comment":"Боли в суставах на том же уровне"},"compliance":{"choice":"Нет, были отклонения","comment":"Пропустил два дня приёма на прошлой неделе из-за командировки"},"other_medications":{"value":true,"comment":"Принимал ибупрофен от головной боли (однократно)"},"life_events":"Сильный стресс на работе — сдача проекта"}'
);

-- Демо опросник 3: Иванова — глубокая реакция (Natrum mur 200C)
INSERT INTO pre_visit_surveys (patient_id, doctor_id, status, completed_at, answers)
VALUES (
  '13b4beab-e158-49ee-b9a6-d23df05b6919',
  '26b59b96-1da1-4da8-a31a-929730ca8089',
  'completed',
  now() - interval '3 days',
  '{"general_reaction":"После Natrum muriaticum 200C первые два дня была очень плаксивой, хотелось побыть одной. Потом стало значительно легче.","initial_aggravation":{"choice":"Да, появились новые ощущения","comment":"Сильная плаксивость и желание уединения в первые 48 часов"},"overall_change":4,"emotional_state":"После обострения стало намного легче. Перестала держать обиды внутри, смогла поговорить с мужем о проблемах. Чувствую себя свободнее.","energy_level":8,"dreams":"Снился сон про маму — давно не снилась. Проснулась со слезами, но чувствовала облегчение.","sleep":{"choice":"Улучшилось","comment":"Сплю 7-8 часов вместо 5-6"},"appetite":{"choice":"Улучшилось","comment":"Появилось желание солёного — ем солёные огурцы и оливки"},"thirst":{"choice":"Улучшилось","comment":"Стала пить больше воды, раньше забывала"},"sweating":{"choice":"Без изменений","comment":""},"thermoregulation":{"choice":"Без изменений","comment":""},"discharges":"Появился лёгкий насморк на 4-й день, прошёл за 2 дня","symptom_order":"1) Сначала обострение психики (плаксивость, 1-2 день). 2) Улучшение сна (3-й день). 3) Улучшение эмоционального состояния (4-5 день). 4) Мигрени стали реже (к концу недели).","old_symptoms_returned":{"value":true,"comment":"Вернулся герпес на губе (был 3 года назад), появился на 5-й день, прошёл за 4 дня"},"main_complaint_change":{"scale":4,"comment":"Мигрени были 3 раза в неделю, сейчас 1 раз за 2 недели. Интенсивность снизилась вдвое."},"new_symptoms":"Лёгкое покалывание в кончиках пальцев — появляется перед сном, проходит утром","compliance":{"choice":"Да, всё по назначению","comment":""},"other_medications":{"value":false,"comment":""},"life_events":"Помирилась с сестрой после 2 лет ссоры"}'
);

-- Незаполненный опросник для Кузнецовой (pending)
INSERT INTO pre_visit_surveys (patient_id, doctor_id, status)
VALUES (
  'a63ec4e5-d271-405d-acf5-5b9cc9dba3fe',
  '26b59b96-1da1-4da8-a31a-929730ca8089',
  'pending'
);
