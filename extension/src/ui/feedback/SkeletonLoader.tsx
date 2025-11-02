/**
 * Skeleton Loader Component
 *
 * Shows placeholder UI while content is loading.
 * Matches actual content layout for zero layout shifts.
 * Shimmer animation respects prefers-reduced-motion.
 */

import React from 'react'
import './SkeletonLoader.css'

export interface SkeletonLoaderProps
{
  /** Variant matches what's being loaded */
  variant?: 'plan-message' | 'chat-message' | 'inline-text'
  /** Number of lines for text variant */
  lines?: number
}

export function SkeletonLoader({ variant = 'plan-message', lines = 3 }: SkeletonLoaderProps): React.ReactElement | null
{
  if (variant === 'plan-message')
  {
    return (
      <div className="skeleton-plan" role="status" aria-label="Loading plan">
        {/* Title skeleton */}
        <div className="skeleton-plan__title skeleton-shimmer" />

        {/* Description skeleton - 3 lines with last line 60% width */}
        <div className="skeleton-plan__description">
          <div className="skeleton-shimmer" />
          <div className="skeleton-shimmer" />
          <div className="skeleton-shimmer" style={{ width: '60%' }} />
        </div>

        {/* Buttons skeleton */}
        <div className="skeleton-plan__actions">
          <div className="skeleton-shimmer skeleton-plan__button" />
          <div className="skeleton-shimmer skeleton-plan__button" />
        </div>

        <span className="sr-only">Loading workflow plan...</span>
      </div>
    )
  }

  if (variant === 'chat-message')
  {
    return (
      <div className="skeleton-message" role="status" aria-label="Loading message">
        <div className="skeleton-shimmer" />
        <div className="skeleton-shimmer" />
        <div className="skeleton-shimmer" style={{ width: '70%' }} />
        <span className="sr-only">Loading message...</span>
      </div>
    )
  }

  if (variant === 'inline-text')
  {
    return (
      <div className="skeleton-inline" role="status" aria-label="Loading">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="skeleton-shimmer"
            style={{ width: index === lines - 1 ? '75%' : '100%' }}
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  return null
}
