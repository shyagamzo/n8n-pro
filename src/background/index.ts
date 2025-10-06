/**
 * Background Service Worker for n8n Pro Extension
 * Handles extension lifecycle, message routing, and orchestration
 */

import { Orchestrator } from '@lib/services/orchestrator';

// Initialize the orchestrator when the service worker starts
const orchestrator = new Orchestrator();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) =>
{
    console.log('[Background] Extension installed/updated:', details.reason);
    
    if (details.reason === 'install')
    {
        // Set up initial state for new installations
        orchestrator.initialize();
    }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>
{
    console.log('[Background] Received message:', message);
    
    // Route messages to the orchestrator
    orchestrator.handleMessage(message, sender)
        .then(response => sendResponse(response))
        .catch(error => 
        {
            console.error('[Background] Error handling message:', error);
            sendResponse({ error: error.message });
        });
    
    // Return true to indicate we will send a response asynchronously
    return true;
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() =>
{
    console.log('[Background] Extension started');
    orchestrator.onStartup();
});

export {};
