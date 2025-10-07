import React from 'react'
import ApiKeySection from './components/ApiKeySection'

export default function Options(): React.ReactElement
{
  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial', padding: 12, maxWidth: 560 }}>
      <h1>n8n Pro Options</h1>
      <ApiKeySection />
    </div>
  )
}





