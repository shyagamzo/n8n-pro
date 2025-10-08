import React, { useEffect, useRef, useState } from 'react'
import { STORAGE_KEYS, DEFAULTS } from '../constants'
import { storageGetMany, storageSet } from '../utils/storage'
import { colors, borders, shadows, spacing, typography } from '../styles/tokens'

type PanelProps = {
  title: string
  onClose: () => void
  onNewSession?: () => void
  children: React.ReactNode
}

type PanelPosition = { x: number; y: number }
type PanelSize = { w: number; h: number }

function getDefaultPosition(): PanelPosition
{
  return {
    x: window.innerWidth - DEFAULTS.PANEL_WIDTH - DEFAULTS.PANEL_PADDING,
    y: window.innerHeight - DEFAULTS.PANEL_HEIGHT - DEFAULTS.PANEL_PADDING
  }
}

export default function Panel({ title, onClose, onNewSession, children }: PanelProps): React.ReactElement
{
  const [position, setPosition] = useState(getDefaultPosition())
  const [size, setSize] = useState<PanelSize>({ w: DEFAULTS.PANEL_WIDTH, h: DEFAULTS.PANEL_HEIGHT })
  const [isLoaded, setIsLoaded] = useState(false)
  const dragging = useRef<null | { offsetX: number; offsetY: number }>(null)
  const resizing = useRef<null | { startX: number; startY: number; startW: number; startH: number }>(null)

  // Load saved position and size from storage
  useEffect(() =>
  {
    void (async () =>
    {
      const result = await storageGetMany<{ [STORAGE_KEYS.PANEL_POSITION]: PanelPosition; [STORAGE_KEYS.PANEL_SIZE]: PanelSize }>([
        STORAGE_KEYS.PANEL_POSITION,
        STORAGE_KEYS.PANEL_SIZE
      ])

      const savedPosition = result[STORAGE_KEYS.PANEL_POSITION]
      const savedSize = result[STORAGE_KEYS.PANEL_SIZE]

      if (savedPosition)
      {
        setPosition(savedPosition)
      }

      if (savedSize)
      {
        setSize(savedSize)
      }

      setIsLoaded(true)
    })()
  }, [])

  // Save position when it changes
  useEffect(() =>
  {
    if (isLoaded)
    {
      void storageSet(STORAGE_KEYS.PANEL_POSITION, position)
    }
  }, [position, isLoaded])

  // Save size when it changes
  useEffect(() =>
  {
    if (isLoaded)
    {
      void storageSet(STORAGE_KEYS.PANEL_SIZE, size)
    }
  }, [size, isLoaded])

  useEffect(() =>
  {
    function onMove(e: MouseEvent)
    {
      if (dragging.current)
      {
        setPosition({ x: e.clientX - dragging.current.offsetX, y: e.clientY - dragging.current.offsetY })
      }

      if (resizing.current)
      {
        const dx = e.clientX - resizing.current.startX
        const dy = e.clientY - resizing.current.startY
        setSize({
          w: Math.max(DEFAULTS.PANEL_MIN_WIDTH, resizing.current.startW + dx),
          h: Math.max(DEFAULTS.PANEL_MIN_HEIGHT, resizing.current.startH + dy)
        })
      }
    }

    function onUp()
    {
      dragging.current = null
      resizing.current = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () =>
    {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        width: size.w,
        height: size.h,
        background: colors.background,
        color: colors.text,
        border: `${borders.widthBase} solid ${colors.border}`,
        borderRadius: borders.radiusXLarge,
        boxShadow: shadows.base,
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div
        onMouseDown={(e) =>
        {
          const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect()
          dragging.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing['2xs']} ${spacing['2xs']}`,
          background: colors.backgroundSecondary,
          borderBottom: `${borders.widthBase} solid ${colors.border}`,
          cursor: 'move',
          userSelect: 'none'
        }}
      >
        <div style={{ fontWeight: typography.fontWeightBold, color: colors.text }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing['2xs'] }}>
          {onNewSession && (
            <button
              onClick={(e) =>
              {
                e.stopPropagation()
                onNewSession()
              }}
              style={{
                background: 'transparent',
                border: `${borders.widthBase} solid ${colors.border}`,
                padding: `${spacing['4xs']} ${spacing['2xs']}`,
                borderRadius: borders.radiusSmall,
                fontSize: typography.fontSize2xs,
                cursor: 'pointer',
                color: colors.text
              }}
            >
              New Session
            </button>
          )}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: typography.fontSizeL, cursor: 'pointer', color: colors.text }}>
            ×
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      <div
        onMouseDown={(e) =>
        {
          const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect()
          resizing.current = { startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height }
        }}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 20,
          height: 20,
          cursor: 'nwse-resize',
          background: `linear-gradient(135deg, transparent 50%, ${colors.border} 50%)`,
          borderBottomRightRadius: borders.radiusXLarge
        }}
      />
    </div>
  )
}
