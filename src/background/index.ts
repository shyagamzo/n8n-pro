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
    
    // Validate message structure
    if (!message || typeof message !== 'object')
    {
        console.error('[Background] Invalid message format');
        sendResponse({ error: 'Invalid message format' });
        return false;
    }
    
    // Route messages to the orchestrator
    orchestrator.handleMessage(message, sender)
        .then(response => 
        {
            console.log('[Background] Sending response:', response);
            sendResponse(response);
        })
        .catch(error => 
        {
            console.error('[Background] Error handling message:', error);
            sendResponse({ 
                error: error.message || 'Unknown error occurred',
                type: 'ERROR'
            });
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

// Handle tab updates to detect n8n page navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) =>
{
    if (changeInfo.status === 'complete' && tab.url)
    {
        const isN8nUrl = tab.url.includes('n8n') || 
                        tab.url.includes('localhost') ||
                        tab.url.includes('/workflow') ||
                        tab.url.includes('/workflows');
        
        if (isN8nUrl)
        {
            console.log('[Background] n8n page detected in tab:', tabId);
            // Notify content script if needed
            chrome.tabs.sendMessage(tabId, {
                type: 'PAGE_NAVIGATION',
                url: tab.url,
                timestamp: Date.now(),
                id: `nav_${Date.now()}`
            }).catch(() =>
            {
                // Content script might not be ready yet, ignore error
            });
        }
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) =>
{
    if (tab.id)
    {
        console.log('[Background] Extension icon clicked on tab:', tab.id);
        // Open popup or toggle panel
        chrome.tabs.sendMessage(tab.id, {
            type: 'TOGGLE_PANEL',
            timestamp: Date.now(),
            id: `toggle_${Date.now()}`
        }).catch(() =>
        {
            // Content script might not be ready, ignore error
        });
    }
});

export {};
