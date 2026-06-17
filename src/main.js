import { Engine } from './core/Engine.js';

window.addEventListener('DOMContentLoaded', () => {
    // Prevent default touch behaviors like double-tap zoom
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    const engine = new Engine();
    
    // We do not start the engine loop until the Play button is pressed.
    // However, we render the first frame so the background looks nice.
    engine.renderer.render(engine.scene, engine.camera);
    
    // Export for debug
    window.engine = engine;
});
