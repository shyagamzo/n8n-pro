import React from 'react'
import { createRoot } from 'react-dom/client'

export function ensureMountRoot(id: string): HTMLElement
{
  const existing = document.getElementById(id)
  if (existing) return existing
  const el = document.createElement('div')
  el.id = id
  document.body.appendChild(el)
  return el
}

export function mountReactOnce(container: HTMLElement, node: React.ReactElement): void
{
  if (!container.hasChildNodes())
  {
    const root = createRoot(container)
    root.render(node)
  }
}


