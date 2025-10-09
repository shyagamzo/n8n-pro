import React from 'react'
import type { AgentActivity } from '../state/chatStore'
import AgentActivityItem from './AgentActivityItem'
import './AgentActivityPanel.css'

type AgentActivityPanelProps = {
  activities: AgentActivity[]
}

export default function AgentActivityPanel({ activities }: AgentActivityPanelProps): React.ReactElement | null
{
  if (activities.length === 0) return null

  return (
    <div className="agent-activity-panel">
      <div className="agent-activity-list">
        {activities.map((activity) => (
          <AgentActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  )
}

