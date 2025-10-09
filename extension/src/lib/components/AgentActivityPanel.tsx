import React from 'react'
import type { AgentActivity } from '../state/chatStore'
import AgentActivityItem from './AgentActivityItem'
import './AgentActivityPanel.css'

type AgentActivityPanelProps = {
  activities: AgentActivity[]
}

/**
 * Panel that displays current agent activities
 * Shows what agents are doing in real-time with smooth animations
 */
export default function AgentActivityPanel({ activities }: AgentActivityPanelProps): React.ReactElement | null
{
  // Don't render if no activities
  if (activities.length === 0) return null

  // Filter out completed activities (they auto-remove after 3s)
  const activeActivities = activities.filter(a => a.status !== 'complete')

  if (activeActivities.length === 0) return null

  return (
    <div className="agent-activity-panel">
      <div className="agent-activity-list">
        {activeActivities.map((activity) => (
          <AgentActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  )
}

