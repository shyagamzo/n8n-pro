/**
 * n8n Page Detection
 * Identifies n8n editor pages and extracts theme information
 */

export class N8nDetector
{
    public async detectN8n(): Promise<boolean>
    {
        // Check for n8n-specific elements
        const hasN8nEditor = document.querySelector('[data-test-id="workflow-canvas"]') !== null;
        const hasN8nHeader = document.querySelector('[data-test-id="main-header"]') !== null;
        const hasN8nScript = document.querySelector('script[src*="n8n"]') !== null;
        
        return hasN8nEditor || hasN8nHeader || hasN8nScript;
    }

    public getN8nTheme(): Record<string, string>
    {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        // Extract n8n CSS custom properties
        const theme: Record<string, string> = {};
        const cssVars = [
            '--color-primary',
            '--color-background',
            '--color-text',
            '--color-border',
            '--color-success',
            '--color-warning',
            '--color-danger'
        ];
        
        cssVars.forEach(varName =>
        {
            const value = computedStyle.getPropertyValue(varName).trim();
            if (value)
            {
                theme[varName] = value;
            }
        });
        
        return theme;
    }

    public getCurrentWorkflow(): any
    {
        // TODO: Extract current workflow data from n8n page
        // This will need to interface with n8n's internal state
        return null;
    }
}
