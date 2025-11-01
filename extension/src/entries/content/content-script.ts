/**
 * Content script entry point for n8n extension
 *
 * Injects trigger buttons into n8n pages for accessing the AI assistant.
 */

import { isN8nHost } from './utils/host-detection'
import { createTriggerButton } from './trigger-button'
import { createTestButton } from './test-button'
import { emitSystemInit } from '@events/emitters'

const MOUNT_ID = 'n8n-pro-mount-root'

/**
 * Initialize extension on n8n pages
 */
function initialize(): void 
{
  // Create and inject buttons
  const trigger = createTriggerButton(MOUNT_ID)
  const testButton = createTestButton(MOUNT_ID)

  document.body.appendChild(trigger)
  document.body.appendChild(testButton)

  emitSystemInit('content-script', 'n8n Pro content script initialized', {})
}

// Initialize if on n8n host
if (isN8nHost()) 
{
  initialize()
}

