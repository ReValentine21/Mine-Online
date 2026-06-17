export class UIManager {
    constructor(engine) {
        this.engine = engine;

        this.startScreen = document.getElementById('start-screen');
        this.settingsScreen = document.getElementById('settings-screen');
        this.hud = document.getElementById('hud');
        this.inventoryScreen = document.getElementById('inventory-screen');
        
        this.btnPlay = document.getElementById('btn-play');
        this.btnSettings = document.getElementById('btn-settings');
        this.btnCloseSettings = document.getElementById('btn-close-settings');

        this.healthBar = document.getElementById('health-bar');
        this.hungerBar = document.getElementById('hunger-bar');
        
        this.setupEvents();
    }

    setupEvents() {
        this.btnPlay.addEventListener('click', () => {
            this.startScreen.classList.add('hidden');
            this.hud.classList.remove('hidden');
            this.engine.start();
            
            // Auto lock pointer if PC
            if (!this.engine.input.isMobile) {
                this.engine.renderer.domElement.requestPointerLock();
            }
        });

        this.btnSettings.addEventListener('click', () => {
            this.startScreen.classList.add('hidden');
            this.settingsScreen.classList.remove('hidden');
        });

        this.btnCloseSettings.addEventListener('click', () => {
            this.settingsScreen.classList.add('hidden');
            this.startScreen.classList.remove('hidden');
        });

        // Settings
        const renderDist = document.getElementById('setting-render-dist');
        renderDist.addEventListener('input', (e) => {
            document.getElementById('val-render-dist').innerText = e.target.value;
            this.engine.world.renderDistance = parseInt(e.target.value);
        });

        const fov = document.getElementById('setting-fov');
        fov.addEventListener('input', (e) => {
            document.getElementById('val-fov').innerText = e.target.value;
            this.engine.camera.fov = parseInt(e.target.value);
            this.engine.camera.updateProjectionMatrix();
        });

        // Inventory toggle
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') {
                if (this.engine.isRunning) {
                    if (this.inventoryScreen.classList.contains('hidden')) {
                        this.inventoryScreen.classList.remove('hidden');
                        document.exitPointerLock();
                    } else {
                        this.inventoryScreen.classList.add('hidden');
                        this.engine.renderer.domElement.requestPointerLock();
                    }
                }
            }
        });
    }

    updateStats() {
        // Simple text representation for now, normally we'd render 10 heart icons
        this.healthBar.innerText = `Health: ${this.engine.player.health}/20`;
        this.hungerBar.innerText = `Hunger: ${this.engine.player.hunger}/20`;
    }
}
