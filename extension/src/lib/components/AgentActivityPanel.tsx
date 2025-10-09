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
  console.info('🎨 AgentActivityPanel render:', {
    totalActivities: activities.length,
    activities: activities.map(a => ({ agent: a.agent, status: a.status, activity: a.activity }))
  })

  // Don't render if no activities
  if (activities.length === 0)
  {
    console.info('🎨 No activities, not rendering panel')
    return null
  }

  // Show all activities including completed (they auto-remove from store after 3s)
  console.info('🎨 Rendering activity panel with', activities.length, 'activities')

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

