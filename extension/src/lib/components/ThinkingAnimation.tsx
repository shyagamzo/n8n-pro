import React from 'react'

/**
 * Animated thinking indicator with bouncing dots
 */
export default function ThinkingAnimation(): React.ReactElement
{
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 0',
  }

  const dotStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'currentColor',
    opacity: 0.6,
  }

  // Keyframe animation for bouncing effect
  const bounceAnimation = `
    @keyframes thinking-bounce {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.6;
      }
      30% {
        transform: translateY(-8px);
        opacity: 1;
      }
    }
  `

  const dot1Style: React.CSSProperties = {
    ...dotStyle,
    animation: 'thinking-bounce 1.4s infinite ease-in-out',
    animationDelay: '0s',
  }

  const dot2Style: React.CSSProperties = {
    ...dotStyle,
    animation: 'thinking-bounce 1.4s infinite ease-in-out',
    animationDelay: '0.2s',
  }

  const dot3Style: React.CSSProperties = {
    ...dotStyle,
    animation: 'thinking-bounce 1.4s infinite ease-in-out',
    animationDelay: '0.4s',
  }

  return (
    <>
      <style>{bounceAnimation}</style>
      <div style={containerStyle}>
        <div style={dot1Style} />
        <div style={dot2Style} />
        <div style={dot3Style} />
      </div>
    </>
  )
}

