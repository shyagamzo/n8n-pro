import React from 'react'
import './PanelSkeleton.css'

/**
 * Loading skeleton displayed while panel is initializing
 */
export default function PanelSkeleton(): React.ReactElement
{
  return (
    <div className="panel-skeleton">
      <div className="panel-skeleton__header">
        <div className="panel-skeleton__title" />
        <div className="panel-skeleton__controls">
          <div className="panel-skeleton__button" />
          <div className="panel-skeleton__button" />
        </div>
      </div>
      <div className="panel-skeleton__body">
        <div className="panel-skeleton__message" />
        <div className="panel-skeleton__message panel-skeleton__message--short" />
        <div className="panel-skeleton__message" />
      </div>
      <div className="panel-skeleton__composer" />
    </div>
  )
}

