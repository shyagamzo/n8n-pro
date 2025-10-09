import React from 'react'
import type { AgentActivity } from '../state/chatStore'
import './AgentActivityItem.css'

type AgentActivityItemProps = {
  activity: AgentActivity
}

/**
 * Individual agent activity item with status indicator
 */
export default function AgentActivityItem({ activity }: AgentActivityItemProps): React.ReactElement
{
  const statusClass = `agent-activity-item agent-activity-${activity.status}`

  return (
    <div className={statusClass}>
      <div className="agent-activity-indicator">
        {activity.status === 'started' && <div className="spinner" />}
        {activity.status === 'working' && <div className="spinner" />}
        {activity.status === 'complete' && <span className="checkmark">✓</span>}
        {activity.status === 'error' && <span className="error-mark">!</span>}
      </div>
      <div className="agent-activity-text">{activity.activity}</div>
    </div>
  )
}

