import React from 'react'
import './TestButton.css'

type TestButtonProps = {
  onTest: () => void
}

/**
 * TEMPORARY TEST BUTTON - Remove this component before production
 * This button clears the session and sends a test workflow creation message
 */
export default function TestButton({ onTest }: TestButtonProps): React.ReactElement
{
  return (
    <button
      className="test-button"
      onClick={onTest}
      title="Test workflow creation"
    >
      🧪
    </button>
  )
}

