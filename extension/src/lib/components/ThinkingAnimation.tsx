import React from 'react'
import './ThinkingAnimation.css'

/**
 * Animated thinking indicator with bouncing dots
 */
export default function ThinkingAnimation(): React.ReactElement
{
  return (
    <div className="thinking-animation">
      <div className="thinking-dot" />
      <div className="thinking-dot" />
      <div className="thinking-dot" />
    </div>
  )
}

