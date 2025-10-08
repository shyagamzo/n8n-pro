export const styles = {
  container: {
    marginTop: 8,
    padding: 12,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    background: '#f9fafb',
  },
  title: {
    fontWeight: 600,
    marginBottom: 6,
    fontSize: '14px',
  },
  summary: {
    color: '#374151',
    marginBottom: 10,
    fontSize: '13px',
  },
  credentialsContainer: {
    marginBottom: 10,
  },
  toggleButton: {
    fontSize: '11px',
    color: '#6b7280',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
    marginTop: 6,
    textDecoration: 'underline',
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  applyButton: {
    padding: '8px 14px',
    borderRadius: 6,
    border: 'none',
    background: '#10b981',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '13px',
  },
  cancelButton: {
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#111827',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '13px',
  },
} as const

