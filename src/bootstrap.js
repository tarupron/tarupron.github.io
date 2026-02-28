(async () => {
    try {
        const { ArchipelagoViewer } = await import('./index.js');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                new ArchipelagoViewer();
            });
        } else {
            new ArchipelagoViewer();
        }
    } catch (error) {
        console.error('Failed to load application:', error);
        console.error('Error stack:', error.stack);
        document.body.innerHTML += `<h1 style="color: red; font-family: monospace; padding: 20px;">Error loading application:<br>${error.message}</h1>`;
    }
})();
