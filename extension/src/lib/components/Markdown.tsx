import React, { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

type MarkdownProps = {
  content: string
}

const markdownStyles: React.CSSProperties = {
  lineHeight: '1.5',
  fontSize: '14px',
  color: 'inherit',
  fontFamily: 'inherit',
}

const markdownElementStyles: Record<string, React.CSSProperties> = {
  'ol, ul': {
    margin: '8px 0',
    paddingLeft: '20px',
  },
  'li': {
    margin: '4px 0',
    lineHeight: '1.4',
  },
  'p': {
    margin: '6px 0',
  },
  'strong': {
    fontWeight: '600',
  },
  'em': {
    fontStyle: 'italic',
  },
  'code': {
    background: 'rgba(0, 0, 0, 0.1)',
    padding: '2px 4px',
    borderRadius: '3px',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  'pre': {
    background: 'rgba(0, 0, 0, 0.05)',
    padding: '8px',
    borderRadius: '6px',
    overflow: 'auto',
    margin: '8px 0',
  },
  'pre code': {
    background: 'none',
    padding: '0',
  },
  'blockquote': {
    borderLeft: '3px solid #e5e7eb',
    paddingLeft: '12px',
    margin: '8px 0',
    color: '#6b7280',
  },
  'h1, h2, h3, h4, h5, h6': {
    margin: '12px 0 8px 0',
    fontWeight: '600',
  },
}

export default function Markdown({ content }: MarkdownProps): React.ReactElement
{
  const html = useMemo(() =>
  {
    try
    {
      const raw = marked.parse(content, { async: false }) as string
      return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
    }
    catch
    {
      return ''
    }
  }, [content])

  // Apply styles to markdown elements after rendering
  React.useEffect(() =>
  {
    const element = document.querySelector('.markdown-body')
    if (!element) return

    Object.entries(markdownElementStyles).forEach(([selector, styles]) =>
    {
      const elements = element.querySelectorAll(selector)
      elements.forEach((el) =>
      {
        Object.assign((el as HTMLElement).style, styles)
      })
    })
  }, [html])

  return (
    <div
      className="markdown-body"
      style={markdownStyles}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}


