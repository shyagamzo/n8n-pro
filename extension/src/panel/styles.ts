import { spacing, borders, componentTokens } from '../lib/styles/tokens'

export const panelBodyColumn: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%'
}

export const messagesList: React.CSSProperties = {
  flex: 1,
  padding: spacing.s,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing['2xs']
}

export const draftBubble: React.CSSProperties = {
  ...componentTokens.messageBubble.assistant,
  alignSelf: 'flex-start',
  maxWidth: '80%'
}

export const composerRow: React.CSSProperties = {
  padding: spacing.s,
  borderTop: `${borders.widthBase} solid ${borders.colorBase}`,
  display: 'flex',
  gap: spacing['2xs']
}

export const inputFlex: React.CSSProperties = { flex: 1 }


