import React from 'react'
import ApiKeySection from './components/ApiKeySection'
import './Options.css'

export default function Options(): React.ReactElement
{
  return (
    <div className="options-container">
      <h1>n8n Pro Options</h1>
      <ApiKeySection />
    </div>
  )
}





