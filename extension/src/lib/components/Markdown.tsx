import React, { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import './Markdown.css'

type MarkdownProps = {
  content: string
}

// Configure marked with enhanced options
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
  pedantic: false,
  sanitize: false, // We use DOMPurify instead
  smartLists: true,
  smartypants: false,
  xhtml: false,
  highlight: function(code: string, lang: string) {
    // Basic syntax highlighting for common languages
    if (lang === 'json' || lang === 'yaml' || lang === 'yml') {
      return highlightCode(code, lang)
    }
    return code
  }
})

function highlightCode(code: string, lang: string): string {
  // Basic syntax highlighting without external dependencies
  if (lang === 'json') {
    return code
      .replace(/"([^"]+)":/g, '<span class="token property">"$1":</span>')
      .replace(/: "([^"]*)"/g, ': <span class="token string">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="token number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="token boolean">$1</span>')
      .replace(/: null/g, ': <span class="token keyword">null</span>')
  }
  
  if (lang === 'yaml' || lang === 'yml') {
    return code
      .replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*):/gm, '$1<span class="token key">$2:</span>')
      .replace(/: "([^"]*)"/g, ': <span class="token string">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="token number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="token boolean">$1</span>')
  }
  
  return code
}

export default function Markdown({ content }: MarkdownProps): React.ReactElement
{
  const html = useMemo(() =>
  {
    try
    {
      const raw = marked.parse(content, { async: false }) as string
      
      // Configure DOMPurify with more permissive settings for markdown
      const clean = DOMPurify.sanitize(raw, {
        USE_PROFILES: { html: true },
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'del', 'u', 's',
          'ul', 'ol', 'li',
          'blockquote',
          'code', 'pre',
          'a', 'img',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'hr',
          'input', 'label',
          'span', 'div'
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'alt', 'src', 'width', 'height',
          'class', 'id', 'type', 'checked', 'disabled',
          'target', 'rel'
        ],
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false
      })
      
      return clean
    }
    catch (error)
    {
      console.error('Markdown parsing error:', error)
      return content // Fallback to raw content
    }
  }, [content])

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}


