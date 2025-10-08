import React, { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { typography, spacing, borders, colors } from '../styles/tokens'

type MarkdownProps = {
  content: string
}

const markdownStyles: React.CSSProperties = {
  lineHeight: typography.lineHeightXLoose,
  fontSize: typography.fontSizeS,
  color: 'inherit',
  fontFamily: 'inherit',
}

const markdownElementStyles: Record<string, React.CSSProperties> = {
  'ol, ul': {
    margin: `${spacing['2xs']} 0`,
    paddingLeft: spacing.m,
  },
  'li': {
    margin: `${spacing['4xs']} 0`,
    lineHeight: typography.lineHeightLoose,
  },
  'p': {
    margin: `${spacing['3xs']} 0`,
  },
  'strong': {
    fontWeight: typography.fontWeightBold,
  },
  'em': {
    fontStyle: 'italic',
  },
  'code': {
    background: colors.backgroundSecondary,
    color: colors.text,
    padding: `${spacing['5xs']} ${spacing['4xs']}`,
    borderRadius: borders.radiusSmall,
    fontSize: typography.fontSize2xs,
    fontFamily: typography.fontFamilyMono,
  },
  'pre': {
    background: colors.backgroundSecondary,
    color: colors.text,
    padding: spacing['2xs'],
    borderRadius: borders.radiusBase,
    overflow: 'auto',
    margin: `${spacing['2xs']} 0`,
  },
  'pre code': {
    background: 'none',
    padding: '0',
  },
  'blockquote': {
    borderLeft: `3px solid ${colors.border}`,
    paddingLeft: spacing.xs,
    margin: `${spacing['2xs']} 0`,
    opacity: 0.8,
  },
  'h1, h2, h3, h4, h5, h6': {
    margin: `${spacing.xs} 0 ${spacing['2xs']} 0`,
    fontWeight: typography.fontWeightBold,
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


