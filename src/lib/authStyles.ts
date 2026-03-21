// Общие стили для страниц авторизации (login, register, forgot-password)

export const authInputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#faf7f2',
  border: '1px solid var(--sim-border)',
  borderRadius: '8px',
  padding: '12px 16px',
  fontSize: '16px',
  color: '#3a2e1a',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

export const authLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  letterSpacing: '0.08em',
  color: '#5a7060',
  marginBottom: '6px',
  textTransform: 'uppercase',
}

export function getAuthInputFocusStyle(field: string, focusedField: string | null): React.CSSProperties {
  return {
    ...authInputStyle,
    borderColor: focusedField === field ? 'var(--sim-green)' : 'var(--sim-border)',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(45,106,79,0.12)' : 'none',
  }
}
