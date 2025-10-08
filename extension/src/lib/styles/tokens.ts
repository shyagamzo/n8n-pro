/**
 * Design Tokens - n8n Extension
 *
 * Aligned with n8n's design system for visual consistency.
 * Reference n8n tokens but maintain our own naming for flexibility.
 */

/**
 * Color Tokens
 *
 * Semantic naming that maps to n8n's color system.
 * Use these in components instead of hardcoded values.
 */
export const colors = {
  // Primary - Used for main actions and highlights
  primary: 'var(--color-primary, #ff6d5a)',
  primaryShade: 'var(--color-primary-shade-1, #ff5a45)',
  primaryTint: 'var(--color-primary-tint-1, #ff9b8f)',
  primaryLight: 'var(--color-primary-tint-2, #ffc7bf)',
  primaryXLight: 'var(--color-primary-tint-3, #ffebe8)',

  // Secondary - Used for secondary actions
  secondary: 'var(--color-secondary, #7c4dff)',
  secondaryShade: 'var(--color-secondary-shade-1, #6a3fe8)',
  secondaryTint: 'var(--color-secondary-tint-1, #b39dff)',

  // Text colors
  textDark: 'var(--color-text-dark, #2d2e3a)',
  textBase: 'var(--color-text-base, #555770)',
  textLight: 'var(--color-text-light, #7f8195)',
  textLighter: 'var(--color-text-lighter, #c5c7d0)',
  textXLight: 'var(--color-text-xlight, #ffffff)',

  // Background colors
  backgroundDark: 'var(--color-background-dark, #1a1a24)',
  backgroundMedium: 'var(--color-background-medium, #c5c7d0)',
  backgroundBase: 'var(--color-background-base, #f5f6f8)',
  backgroundLight: 'var(--color-background-light, #fafbfc)',
  backgroundXLight: 'var(--color-background-xlight, #ffffff)',

  // Foreground (borders, dividers, subtle UI)
  foregroundXDark: 'var(--color-foreground-xdark, #4f5166)',
  foregroundDark: 'var(--color-foreground-dark, #c5c7d0)',
  foregroundBase: 'var(--color-foreground-base, #dfe0e6)',
  foregroundLight: 'var(--color-foreground-light, #edf0f2)',
  foregroundXLight: 'var(--color-foreground-xlight, #ffffff)',

  // Status colors
  success: 'var(--color-success, #4caf50)',
  successLight: 'var(--color-success-light, #81c784)',
  successTint: 'var(--color-success-tint-1, #c8e6c9)',

  warning: 'var(--color-warning, #f59e0b)',
  warningTint: 'var(--color-warning-tint-1, #ffc107)',

  danger: 'var(--color-danger, #f44336)',
  dangerLight: 'var(--color-danger-light, #e57373)',
  dangerTint: 'var(--color-danger-tint-1, #ffcdd2)',

  // Chat-specific colors (n8n's chat widget colors)
  chatPrimary: 'var(--chat--color-primary, #e74266)',
  chatSecondary: 'var(--chat--color-secondary, #20b69e)',
  chatLight: 'var(--chat--color-light, #f2f4f8)',
  chatDark: 'var(--chat--color-dark, #101330)',
  chatUserBackground: 'var(--color-lm-chat-user-background, #31c4ab)',
  chatUserColor: 'var(--color-lm-chat-user-color, #ffffff)',
  chatBotBackground: 'var(--color-lm-chat-bot-background, #ffffff)',
  chatMessagesBackground: 'var(--color-lm-chat-messages-background, #f5f6f8)',

  // Assistant highlight (AI/gradient colors)
  assistantHighlight1: 'var(--color-assistant-highlight-1, #5b60e8)',
  assistantHighlight2: 'var(--color-assistant-highlight-2, #aa7bec)',
  assistantHighlight3: 'var(--color-assistant-highlight-3, #ec7b8e)',
  assistantGradient: 'var(--color-assistant-highlight-gradient, linear-gradient(105deg, #5b60e8 0%, #aa7bec 50%, #ec7b8e 100%))',

  // Code colors
  codeBackground: 'var(--color-code-background, #ffffff)',
  codeBackgroundReadonly: 'var(--color-code-background-readonly, #f5f6f8)',
  codeForeground: 'var(--color-code-foreground, #424242)',
} as const

/**
 * Spacing Tokens
 *
 * Consistent spacing scale from n8n.
 */
export const spacing = {
  '5xs': 'var(--spacing-5xs, 0.125rem)',    // 2px
  '4xs': 'var(--spacing-4xs, 0.25rem)',     // 4px
  '3xs': 'var(--spacing-3xs, 0.375rem)',    // 6px
  '2xs': 'var(--spacing-2xs, 0.5rem)',      // 8px
  xs: 'var(--spacing-xs, 0.75rem)',         // 12px
  s: 'var(--spacing-s, 1rem)',              // 16px
  m: 'var(--spacing-m, 1.25rem)',           // 20px
  l: 'var(--spacing-l, 1.5rem)',            // 24px
  xl: 'var(--spacing-xl, 2rem)',            // 32px
  '2xl': 'var(--spacing-2xl, 3rem)',        // 48px
  '3xl': 'var(--spacing-3xl, 4rem)',        // 64px
  '4xl': 'var(--spacing-4xl, 8rem)',        // 128px
  '5xl': 'var(--spacing-5xl, 16rem)',       // 256px
} as const

/**
 * Typography Tokens
 */
export const typography = {
  // Font families
  fontFamily: 'var(--font-family, InterVariable, sans-serif)',
  fontFamilyMono: 'var(--font-family-monospace, CommitMono, ui-monospace, Menlo, Consolas, monospace)',

  // Font sizes
  fontSize4xs: 'var(--font-size-4xs, 0.5rem)',      // 8px
  fontSize3xs: 'var(--font-size-3xs, 0.625rem)',    // 10px
  fontSize2xs: 'var(--font-size-2xs, 0.75rem)',     // 12px
  fontSizeXs: 'var(--font-size-xs, 0.8125rem)',     // 13px
  fontSizeS: 'var(--font-size-s, 0.875rem)',        // 14px
  fontSizeM: 'var(--font-size-m, 1rem)',            // 16px
  fontSizeL: 'var(--font-size-l, 1.125rem)',        // 18px
  fontSizeXl: 'var(--font-size-xl, 1.25rem)',       // 20px
  fontSize2xl: 'var(--font-size-2xl, 1.75rem)',     // 28px

  // Font weights
  fontWeightRegular: 'var(--font-weight-regular, 400)',
  fontWeightMedium: 'var(--font-weight-medium, 500)',
  fontWeightBold: 'var(--font-weight-bold, 600)',

  // Line heights
  lineHeightXSmall: 'var(--font-line-height-xsmall, 1)',
  lineHeightCompact: 'var(--font-line-height-compact, 1.25)',
  lineHeightRegular: 'var(--font-line-height-regular, 1.3)',
  lineHeightLoose: 'var(--font-line-height-loose, 1.35)',
  lineHeightXLoose: 'var(--font-line-height-xloose, 1.5)',
} as const

/**
 * Border Tokens
 */
export const borders = {
  // Radius
  radiusXLarge: 'var(--border-radius-xlarge, 12px)',
  radiusLarge: 'var(--border-radius-large, 8px)',
  radiusBase: 'var(--border-radius-base, 4px)',
  radiusSmall: 'var(--border-radius-small, 2px)',

  // Colors
  colorBase: 'var(--border-color-base, #dfe0e6)',
  colorLight: 'var(--border-color-light, #edf0f2)',

  // Widths
  widthBase: 'var(--border-width-base, 1px)',

  // Complete borders
  base: 'var(--border-base, 1px solid #dfe0e6)',
} as const

/**
 * Shadow Tokens
 */
export const shadows = {
  base: 'var(--box-shadow-base, 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04))',
  dark: 'var(--box-shadow-dark, 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.12))',
  light: 'var(--box-shadow-light, 0 2px 12px 0 rgba(0, 0, 0, 0.07))',
} as const

/**
 * Z-Index Tokens
 *
 * Layering system for proper stacking.
 */
export const zIndex = {
  contextMenu: 'var(--z-index-context-menu, 10)',
  appHeader: 'var(--z-index-app-header, 99)',
  appSidebar: 'var(--z-index-app-sidebar, 999)',
  askAssistantChat: 'var(--z-index-ask-assistant-chat, 300)',
  askAssistantButton: 'var(--z-index-ask-assistant-floating-button, 3000)',
  modals: 'var(--z-index-modals, 2000)',
  toasts: 'var(--z-index-toasts, 2100)',
  draggable: 'var(--z-index-draggable, 9999999)',
} as const

/**
 * Chat-Specific Tokens
 *
 * Tokens for chat UI components.
 */
export const chat = {
  // Message styling
  messagePadding: 'var(--chat--message--padding, 1rem)',
  messageBorderRadius: 'var(--chat--message--border-radius, 0.25rem)',
  messageFontSize: 'var(--chat--message--font-size, 1rem)',
  messageLineHeight: 'var(--chat--message-line-height, 1.5)',
  messageMarginBottom: 'var(--chat--message--margin-bottom, 1rem)',

  // Input styling
  inputPadding: 'var(--chat--input--padding, 0.8rem)',
  inputBorderRadius: 'var(--chat--input--border-radius, 0)',
  inputFontSize: 'var(--chat--input--font-size, inherit)',
  inputLineHeight: 'var(--chat--input--line-height, 1.5)',

  // Window sizing
  windowWidth: 'var(--chat--window--width, 400px)',
  windowHeight: 'var(--chat--window--height, 600px)',
  windowZIndex: 'var(--chat--window--z-index, 9999)',
  windowBorderRadius: 'var(--chat--window--border-radius, 0.25rem)',

  // Spacing
  spacing: 'var(--chat--spacing, 1rem)',
} as const

/**
 * Component-Specific Mappings
 * 
 * Recommended token usage for specific components.
 * Dark theme aligned with n8n's dark UI.
 */
export const componentTokens = {
  // Message bubbles - Dark theme
  messageBubble: {
    user: {
      background: colors.chatUserBackground,
      color: colors.textXLight,
      padding: `${spacing['2xs']} ${spacing.xs}`,
      borderRadius: borders.radiusLarge,
    },
    assistant: {
      background: colors.foregroundXDark,
      color: colors.textXLight,
      padding: `${spacing['2xs']} ${spacing.xs}`,
      borderRadius: borders.radiusLarge,
    },
  },

  // Input/Textarea - Dark theme
  input: {
    padding: `${spacing['2xs']} ${spacing.xs}`,
    borderRadius: borders.radiusLarge,
    border: `${borders.widthBase} solid ${colors.foregroundXDark}`,
    fontSize: typography.fontSizeS,
    fontFamily: typography.fontFamily,
    background: colors.backgroundDark,
    color: colors.textXLight,
  },

  // Buttons - Dark theme
  button: {
    primary: {
      background: colors.primary,
      color: colors.textXLight,
      padding: `${spacing['2xs']} ${spacing.s}`,
      borderRadius: borders.radiusBase,
      fontWeight: typography.fontWeightMedium,
    },
    secondary: {
      background: colors.foregroundXDark,
      color: colors.textXLight,
      border: `${borders.widthBase} solid ${colors.foregroundDark}`,
      padding: `${spacing['2xs']} ${spacing.s}`,
      borderRadius: borders.radiusBase,
      fontWeight: typography.fontWeightMedium,
    },
  },

  // Panel/Container - Dark theme
  panel: {
    background: colors.backgroundDark,
    borderRadius: borders.radiusXLarge,
    shadow: shadows.dark,
    padding: spacing.s,
  },

  // Thinking animation - Light color for dark theme
  thinkingAnimation: {
    dotSize: spacing['2xs'],
    dotColor: colors.textLighter,
    gap: spacing['4xs'],
  },
} as const

/**
 * Utility function to create inline styles from token objects
 */
export function createStyles<T extends Record<string, React.CSSProperties>>(styles: T): T {
  return styles
}

