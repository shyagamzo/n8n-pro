import React, { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import './Markdown.css'

type MarkdownProps = {
  content: string
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

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}


