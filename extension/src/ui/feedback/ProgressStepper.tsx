/**
 * Progress Stepper Component
 *
 * Shows workflow creation progress with clear visual steps.
 * Displays 5 workflow phases: enrichment → planning → awaiting_approval → executing → completed
 *
 * Features:
 * - Visual hierarchy (opacity/scale for incomplete steps)
 * - Accessible (ARIA progressbar, live regions, screen reader announcements)
 * - Responsive (horizontal on desktop, vertical on mobile)
 * - Respects prefers-reduced-motion
 */

import React from 'react'
import type { WorkflowState, WorkflowStateData } from '@shared/types/workflow-state'
import { ProgressStep } from './ProgressStep'
import './ProgressStepper.css'

interface StepConfig
{
  id: WorkflowState
  label: string
  description: string
}

const WORKFLOW_STEPS: StepConfig[] = [
  {
    id: 'enrichment',
    label: 'Understand',
    description: 'Gathering requirements'
  },
  {
    id: 'planning',
    label: 'Design',
    description: 'Creating workflow plan'
  },
  {
    id: 'awaiting_approval',
    label: 'Review',
    description: 'Awaiting your approval'
  },
  {
    id: 'executing',
    label: 'Build',
    description: 'Creating workflow in n8n'
  },
  {
    id: 'completed',
    label: 'Done',
    description: 'Workflow created successfully'
  }
]

type StepStatus = 'pending' | 'active' | 'completed' | 'failed'

function getStepStatus(stepId: WorkflowState, currentState: WorkflowState): StepStatus
{
  const stepOrder: WorkflowState[] = ['enrichment', 'planning', 'awaiting_approval', 'executing', 'completed']
  const currentIndex = stepOrder.indexOf(currentState)
  const stepIndex = stepOrder.indexOf(stepId)

  if (currentState === 'failed')
  {
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'failed'
    return 'pending'
  }

  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'active'
  return 'pending'
}

export interface ProgressStepperProps
{
  workflowState: WorkflowStateData
  className?: string
}

export function ProgressStepper({ workflowState, className = '' }: ProgressStepperProps): React.ReactElement
{
  const currentState = workflowState.state
  const currentStepIndex = WORKFLOW_STEPS.findIndex(step => step.id === currentState)

  return (
    <div
      className={`progress-stepper ${className}`}
      role="progressbar"
      aria-valuenow={currentStepIndex + 1}
      aria-valuemin={1}
      aria-valuemax={WORKFLOW_STEPS.length}
      aria-label={`Workflow progress: Step ${currentStepIndex + 1} of ${WORKFLOW_STEPS.length}`}
    >
      <div className="progress-stepper__container">
        {WORKFLOW_STEPS.map((step, index) =>
        {
          const status = getStepStatus(step.id, currentState)
          const isLast = index === WORKFLOW_STEPS.length - 1

          return (
            <ProgressStep
              key={step.id}
              state={step.id}
              label={step.label}
              description={step.description}
              status={status}
              stepNumber={index + 1}
              isLast={isLast}
            />
          )
        })}
      </div>

      {/* Single live region for announcements */}
      {currentStepIndex >= 0 && (
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          Step {currentStepIndex + 1} of {WORKFLOW_STEPS.length}: {WORKFLOW_STEPS[currentStepIndex].label}. {WORKFLOW_STEPS[currentStepIndex].description}
        </div>
      )}
    </div>
  )
}
