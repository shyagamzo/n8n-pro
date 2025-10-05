/**
 * Panel Mounting
 * Creates and mounts the React chatbot panel into n8n pages
 */

export class PanelMounter
{
    private panelContainer: HTMLElement | null = null;

    public async mountPanel(): Promise<void>
    {
        // Create panel container
        this.panelContainer = this.createPanelContainer();
        
        // Add to page
        document.body.appendChild(this.panelContainer);
        
        // Load and mount React app
        await this.loadReactApp();
    }

    private createPanelContainer(): HTMLElement
    {
        const container = document.createElement('div');
        container.id = 'n8n-ai-assistant-panel';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            height: 600px;
            z-index: 10000;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: none;
        `;
        
        return container;
    }

    private async loadReactApp(): Promise<void>
    {
        // TODO: Load the React panel app
        // This will be implemented when we create the panel component
        console.log('Loading React panel app...');
    }

    public showPanel(): void
    {
        if (this.panelContainer)
        {
            this.panelContainer.style.display = 'block';
        }
    }

    public hidePanel(): void
    {
        if (this.panelContainer)
        {
            this.panelContainer.style.display = 'none';
        }
    }

    public togglePanel(): void
    {
        if (this.panelContainer)
        {
            const isVisible = this.panelContainer.style.display !== 'none';
            this.panelContainer.style.display = isVisible ? 'none' : 'block';
        }
    }
}
