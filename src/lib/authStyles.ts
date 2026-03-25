// Общие стили для страниц авторизации (login, register, forgot-password)

export const authInputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '12px',
  padding: '14px 18px',
  fontSize: '15px',
  color: 'var(--sim-text)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

export const authLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  letterSpacing: '0.08em',
  color: '#8a7e6c',
  marginBottom: '6px',
  textTransform: 'uppercase',
}

export function getAuthInputFocusStyle(field: string, focusedField: string | null): React.CSSProperties {
  return {
    ...authInputStyle,
    borderColor: focusedField === field ? 'var(--sim-green)' : 'rgba(0,0,0,0.08)',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(45,106,79,0.1)' : 'none',
  }
}
