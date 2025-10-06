/**
 * Panel Injector Service
 * Handles injection of the AI assistant panel into n8n interface
 */

export function injectAssistantPanel(): void
{
    console.log('[PanelInjector] Injecting assistant panel');
    
    // Check if panel is already injected
    const existingPanel = document.getElementById('n8n-pro-panel');
    if (existingPanel)
    {
        console.log('[PanelInjector] Panel already exists, toggling visibility');
        togglePanelVisibility();
        return;
    }
    
    // Create the panel container
    const panelContainer = createPanelContainer();
    
    // Find the best location to inject the panel
    const targetElement = findInjectionTarget();
    
    if (targetElement)
    {
        targetElement.appendChild(panelContainer);
        console.log('[PanelInjector] Panel injected successfully');
        
        
        // Notify background script that panel was injected
        chrome.runtime.sendMessage({
            type: 'PANEL_INJECTED',
            timestamp: Date.now(),
            id: generateId()
        });
    }
    else
    {
        console.warn('[PanelInjector] Could not find suitable injection target');
    }
}

export function togglePanelVisibility(): void
{
    const panel = document.getElementById('n8n-pro-panel');
    if (panel)
    {
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
        console.log('[PanelInjector] Panel visibility toggled:', !isVisible ? 'visible' : 'hidden');
    }
}

function createPanelContainer(): HTMLElement
{
    const container = document.createElement('div');
    container.id = 'n8n-pro-panel';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        height: 600px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Create React root element
    const reactRoot = document.createElement('div');
    reactRoot.id = 'n8n-pro-panel-root';
    reactRoot.style.cssText = `
        width: 100%;
        height: 100%;
        overflow: hidden;
    `;
    
    // Add a test message to see if the panel is working
    reactRoot.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #333;">
            <h3>n8n AI Assistant</h3>
            <p>Panel is working! Loading React app...</p>
            <div id="react-loading">Initializing...</div>
        </div>
    `;
    
    container.appendChild(reactRoot);
    
    return container;
}

function findInjectionTarget(): HTMLElement | null
{
    // Try to find the main n8n interface container
    const possibleTargets = [
        document.body,
        document.querySelector('#app'),
        document.querySelector('.app'),
        document.querySelector('[data-test-id="app"]'),
        document.querySelector('main'),
        document.querySelector('.main-content')
    ];
    
    for (const target of possibleTargets)
    {
        if (target && target instanceof HTMLElement)
        {
            return target;
        }
    }
    
    return document.body;
}

function generateId(): string
{
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

