'use client'

import { useState } from 'react'
import { saveQuestionnaireTemplate, resetQuestionnaireTemplate } from '@/lib/actions/questionnaire-templates'
import type { TemplateField, TemplateType, FieldType } from '@/lib/actions/questionnaire-templates'
import { getDefaultFields } from '@/lib/default-questionnaire-fields'
import { useToast } from '@/components/ui/toast'

type Props = {
  type: TemplateType
  title: string
  initialFields: TemplateField[] | null  // null = дефолт
}

const TYPE_LABELS: Record<FieldType, string> = {
  text: 'Короткий текст',
  textarea: 'Длинный текст',
  select: 'Выбор из списка',
  scale: 'Шкала',
  chips: 'Множественный выбор',
}

export default function QuestionnaireEditor({ type, title, initialFields }: Props) {
  const defaults = getDefaultFields(type)
  const [fields, setFields] = useState<TemplateField[]>(initialFields || defaults)
  const [isCustom, setIsCustom] = useState(initialFields !== null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const { toast } = useToast()

  async function handleSave() {
    setSaving(true)
    const result = await saveQuestionnaireTemplate(type, fields)
    setSaving(false)
    if (result.success) {
      setIsCustom(true)
      toast('Шаблон сохранён', 'success')
    } else {
      toast(result.error || 'Ошибка', 'error')
    }
  }

  async function handleReset() {
    if (!confirm('Сбросить к стандартному шаблону? Ваши изменения будут потеряны.')) return
    setSaving(true)
    await resetQuestionnaireTemplate(type)
    setFields(defaults)
    setIsCustom(false)
    setSaving(false)
    toast('Шаблон сброшен', 'success')
  }

  function moveField(index: number, direction: 'up' | 'down') {
    const newFields = [...fields]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newFields.length) return
    ;[newFields[index], newFields[target]] = [newFields[target], newFields[index]]
    setFields(newFields)
  }

  function removeField(index: number) {
    const field = fields[index]
    if (field.required && ['chief_complaint', 'onset', 'general_state'].includes(field.id)) {
      toast('Это обязательное поле, его нельзя удалить', 'error')
      return
    }
    setFields(fields.filter((_, i) => i !== index))
  }

  function updateField(index: number, updates: Partial<TemplateField>) {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  function addField(field: TemplateField) {
    setFields([...fields, field])
    setShowAddForm(false)
  }

  const labelStyle = { fontSize: '11px', fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--sim-text-muted)' }

  return (
    <details className="group">
      <summary className="flex items-center justify-between py-3 cursor-pointer select-none" style={{ borderBottom: '1px solid var(--sim-border)' }}>
        <div className="flex items-center gap-2">
          <p style={labelStyle}>{title}</p>
          {isCustom && (
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(45,106,79,0.08)', color: 'var(--sim-green)' }}>
              Изменён
            </span>
          )}
          <span className="text-[11px]" style={{ color: 'var(--sim-text-muted)' }}>({fields.length} полей)</span>
        </div>
        <svg className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180" style={{ color: 'var(--sim-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </summary>

      <div className="pt-4 pb-2 space-y-2">
        {/* Список полей */}
        {fields.map((field, i) => (
          <div key={field.id + i} className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
            {/* Перемещение */}
            <div className="flex flex-col gap-0.5 shrink-0 pt-1">
              <button onClick={() => moveField(i, 'up')} disabled={i === 0} className="text-[11px] text-gray-400 hover:text-gray-700 disabled:opacity-20" title="Вверх">▲</button>
              <button onClick={() => moveField(i, 'down')} disabled={i === fields.length - 1} className="text-[11px] text-gray-400 hover:text-gray-700 disabled:opacity-20" title="Вниз">▼</button>
            </div>

            {/* Контент */}
            <div className="flex-1 min-w-0">
              {editingId === field.id + i ? (
                // Режим редактирования
                <div className="space-y-2">
                  <input
                    value={field.label}
                    onChange={e => updateField(i, { label: e.target.value })}
                    className="w-full text-sm px-2 py-1 rounded border"
                    style={{ borderColor: 'var(--sim-border)' }}
                    placeholder="Название поля"
                  />
                  <input
                    value={field.hint || ''}
                    onChange={e => updateField(i, { hint: e.target.value })}
                    className="w-full text-xs px-2 py-1 rounded border"
                    style={{ borderColor: 'var(--sim-border)', color: 'var(--sim-text-muted)' }}
                    placeholder="Подсказка (необязательно)"
                  />
                  <div className="flex items-center gap-3">
                    <select
                      value={field.type}
                      onChange={e => updateField(i, { type: e.target.value as FieldType })}
                      className="text-xs px-2 py-1 rounded border"
                      style={{ borderColor: 'var(--sim-border)' }}
                    >
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sim-text-muted)' }}>
                      <input type="checkbox" checked={field.required} onChange={e => updateField(i, { required: e.target.checked })} />
                      Обязательное
                    </label>
                  </div>
                  {(field.type === 'select' || field.type === 'chips') && (
                    <input
                      value={(field.options || []).join(', ')}
                      onChange={e => updateField(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      className="w-full text-xs px-2 py-1 rounded border"
                      style={{ borderColor: 'var(--sim-border)' }}
                      placeholder="Варианты через запятую"
                    />
                  )}
                  <button onClick={() => setEditingId(null)} className="text-xs font-medium" style={{ color: 'var(--sim-green)' }}>Готово</button>
                </div>
              ) : (
                // Режим просмотра
                <div onClick={() => setEditingId(field.id + i)} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--sim-text)' }}>{field.label}</p>
                    {field.required && <span className="text-[11px] text-red-400">*</span>}
                    <span className="text-[11px]" style={{ color: 'var(--sim-text-muted)' }}>{TYPE_LABELS[field.type]}</span>
                  </div>
                  {field.hint && <p className="text-[11px] mt-0.5" style={{ color: 'var(--sim-text-muted)' }}>{field.hint}</p>}
                </div>
              )}
            </div>

            {/* Удалить */}
            <button onClick={() => removeField(i)} className="text-[11px] text-gray-300 hover:text-red-500 shrink-0 pt-1" title="Удалить">✕</button>
          </div>
        ))}

        {/* Добавить поле */}
        {showAddForm ? (
          <AddFieldForm onAdd={addField} onCancel={() => setShowAddForm(false)} />
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full text-xs py-2 rounded-xl border border-dashed transition-colors hover:border-gray-400"
            style={{ borderColor: 'var(--sim-border)', color: 'var(--sim-text-muted)' }}
          >
            + Добавить поле
          </button>
        )}

        {/* Кнопки */}
        <div className="flex items-center gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary text-xs">
            {saving ? 'Сохраняю...' : 'Сохранить шаблон'}
          </button>
          {isCustom && (
            <button onClick={handleReset} disabled={saving} className="btn btn-ghost text-xs">
              Сбросить к стандартному
            </button>
          )}
        </div>
      </div>
    </details>
  )
}

function AddFieldForm({ onAdd, onCancel }: { onAdd: (f: TemplateField) => void; onCancel: () => void }) {
  const [label, setLabel] = useState('')
  const [hint, setHint] = useState('')
  const [fieldType, setFieldType] = useState<FieldType>('textarea')
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState('')

  function handleSubmit() {
    if (!label.trim()) return
    const id = label.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').slice(0, 50) + '_' + Date.now()
    onAdd({
      id,
      label: label.trim(),
      hint: hint.trim() || undefined,
      type: fieldType,
      required,
      options: (fieldType === 'select' || fieldType === 'chips') ? options.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    })
  }

  return (
    <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: 'rgba(45,106,79,0.03)', border: '1px solid rgba(45,106,79,0.15)' }}>
      <input value={label} onChange={e => setLabel(e.target.value)} className="w-full text-sm px-2 py-1.5 rounded border" style={{ borderColor: 'var(--sim-border)' }} placeholder="Название поля" autoFocus />
      <input value={hint} onChange={e => setHint(e.target.value)} className="w-full text-xs px-2 py-1.5 rounded border" style={{ borderColor: 'var(--sim-border)' }} placeholder="Подсказка (необязательно)" />
      <div className="flex items-center gap-3">
        <select value={fieldType} onChange={e => setFieldType(e.target.value as FieldType)} className="text-xs px-2 py-1 rounded border" style={{ borderColor: 'var(--sim-border)' }}>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sim-text-muted)' }}>
          <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} /> Обязательное
        </label>
      </div>
      {(fieldType === 'select' || fieldType === 'chips') && (
        <input value={options} onChange={e => setOptions(e.target.value)} className="w-full text-xs px-2 py-1.5 rounded border" style={{ borderColor: 'var(--sim-border)' }} placeholder="Варианты через запятую" />
      )}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={!label.trim()} className="btn btn-primary text-xs">Добавить</button>
        <button onClick={onCancel} className="btn btn-ghost text-xs">Отмена</button>
      </div>
    </div>
  )
}
