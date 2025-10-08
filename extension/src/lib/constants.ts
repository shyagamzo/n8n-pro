/**
 * Storage keys for chrome.storage.local
 */
export const STORAGE_KEYS = {
  // API Keys
  OPENAI_API_KEY: 'openai_api_key',
  N8N_API_KEY: 'n8n_api_key',
  N8N_BASE_URL: 'n8n_base_url',

  // Chat State
  CHAT_MESSAGES: 'n8n-pro-chat-messages',

  // UI State
  PANEL_POSITION: 'n8n-pro-panel-position',
  PANEL_SIZE: 'n8n-pro-panel-size',
} as const

/**
 * Default values for configuration
 */
export const DEFAULTS = {
  N8N_BASE_URL: 'http://127.0.0.1:5678',
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_TIMEOUT_MS: 60000,
  API_TIMEOUT_MS: 10000,
  PANEL_WIDTH: 420,
  PANEL_HEIGHT: 560,
  PANEL_PADDING: 24,
  PANEL_MIN_WIDTH: 320,
  PANEL_MIN_HEIGHT: 360,
} as const
