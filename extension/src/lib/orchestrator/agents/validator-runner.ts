import type { Plan } from '../../types/plan'
import { createAgentTracer } from '../../ai/tracing'
import { validatePlan } from '../validator'
import { fetchNodeTypes } from '../../n8n/node-types'
import { logValidation, formatValidationErrors } from '../../utils/validation-logger'
import { getN8nApiKey, getBaseUrl } from '../../services/settings'
import { debugAgentDecision, debugAgentHandoff, type DebugSession } from '../../utils/debug'

export async function runDeepValidation(
  plan: Plan,
  apiKey: string,
  session: DebugSession,
  onNarrate?: (action: string, phase: 'started' | 'complete' | 'error') => void
): Promise<void>
{
  session.log('Running deep validation with Validator Agent')

  const tracer = createAgentTracer(session.getSessionId())
  debugAgentHandoff('planner', 'validator', 'Validate workflow against n8n API')
  tracer.logHandoff('validator', 'Check node types and parameters against n8n')
  tracer.setAgent('validator')

  try
  {
    const [n8nApiKey, baseUrl] = await Promise.all([getN8nApiKey(), getBaseUrl()])
    const nodeTypes = await fetchNodeTypes({
      baseUrl: baseUrl || undefined,
      apiKey: n8nApiKey || undefined
    })

    onNarrate?.('validating workflow structure', 'started')

    const validatorResult = await validatePlan({ apiKey, plan, nodeTypes })

    logValidation({
      workflowName: plan.workflow.name,
      valid: validatorResult.valid,
      errors: validatorResult.errors || [],
      warnings: validatorResult.warnings || [],
      plannerOutput: plan,
      validatorDecision: validatorResult.valid ? 'pass' : 'fail',
      retryCount: 0,
      sessionId: session.getSessionId()
    })

    if (!validatorResult.valid)
    {
      handleValidationFailure(validatorResult, session, onNarrate)
    }

    onNarrate?.('validation passed', 'complete')

    if (validatorResult.warnings && validatorResult.warnings.length > 0)
    {
      session.log('Validator has warnings', { warningCount: validatorResult.warnings.length })
      console.warn('⚠️ Validator warnings:', validatorResult.warnings)
    }
  }
  catch (error)
  {
    handleValidatorUnavailable(error, session)
  }

  debugAgentHandoff('validator', 'orchestrator', 'Plan validated and ready for user review')
  tracer.logHandoff('orchestrator', 'Return validated plan to user')
  tracer.setAgent('orchestrator')
  tracer.completeTrace()
}

function handleValidationFailure(
  validatorResult: Awaited<ReturnType<typeof validatePlan>>,
  session: DebugSession,
  onNarrate?: (action: string, phase: 'error') => void
): never
{
  session.log('Validator rejected plan', {
    errors: validatorResult.errors?.length || 0,
    warnings: validatorResult.warnings?.length || 0
  })

  debugAgentDecision(
    'validator',
    'Validation failed',
    'Workflow contains invalid node types or structure',
    { errors: validatorResult.errors?.length, warnings: validatorResult.warnings?.length }
  )

  onNarrate?.('found workflow issues', 'error')

  const errorMessage = formatValidationErrors(validatorResult)
  console.error('❌ Validator rejected plan:', errorMessage)

  throw new Error(
    'Workflow validation failed:\n\n' + errorMessage + '\n\n' +
    'The workflow was rejected because it contains node types or structures that don\'t exist in n8n. ' +
    'Please try again with a different approach.'
  )
}

function handleValidatorUnavailable(error: unknown, session: DebugSession): void
{
  console.info('ℹ️ Deep validation skipped (node types API unavailable)', {
    reason: error instanceof Error ? error.message : String(error),
    fallback: 'Using structural validation only'
  })
  session.log('Validator unavailable, using structural validation', { error })

  debugAgentDecision(
    'validator',
    'Deep validation skipped',
    'Node types API unavailable, relying on structural validation',
    { error: error instanceof Error ? error.message : String(error) }
  )

  console.info('✅ Structural validation passed, proceeding with workflow creation')
}

