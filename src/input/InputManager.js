export class InputManager {
    constructor(engine) {
        this.engine = engine;
        this.keys = {};
        this.isLocked = false;
        this.movement = { x: 0, z: 0 };
        this.pitch = 0;
        this.yaw = 0;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Buttons
        this.btnJump = document.getElementById('btn-jump');
        this.btnSneak = document.getElementById('btn-sneak');
        this.btnMode = document.getElementById('btn-mode');
        this.buildMode = true; // true = Build, false = Break

        this.setupListeners();
        
        if (this.isMobile) {
            document.getElementById('mobile-controls').classList.remove('hidden');
            this.setupMobileControls();
        }
    }

    setupListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // Pointer Lock (PC)
        const canvas = this.engine.renderer.domElement;
        
        if (!this.isMobile) {
            canvas.addEventListener('click', () => {
                if (!this.isLocked) {
                    canvas.requestPointerLock();
                } else {
                    // Block Interaction Trigger (Handled by Player)
                    this.engine.player.interact(event.button === 2); // Right click = true (Build)
                }
            });

            document.addEventListener('pointerlockchange', () => {
                this.isLocked = document.pointerLockElement === canvas;
            });

            document.addEventListener('mousemove', (e) => {
                if (this.isLocked) {
                    this.yaw -= e.movementX * 0.002;
                    this.pitch -= e.movementY * 0.002;
                    // Clamp pitch
                    this.pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, this.pitch));
                }
            });
            
            // Context menu prevent
            document.addEventListener('contextmenu', e => e.preventDefault());
        }
    }

    setupMobileControls() {
        // Virtual Joystick setup would go here (using touchstart, touchmove, touchend on a zone)
        // For simplicity, tapping buttons sets keys
        const setupBtn = (btn, code) => {
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[code] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[code] = false; });
        };
        
        setupBtn(this.btnJump, 'Space');
        setupBtn(this.btnSneak, 'ShiftLeft');
        
        this.btnMode.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.buildMode = !this.buildMode;
            this.btnMode.innerText = `Mode: ${this.buildMode ? 'Build' : 'Break'}`;
        });

        // Swipe to look
        let lastTouch = null;
        document.addEventListener('touchmove', (e) => {
            // Ignore if touching UI buttons
            if (e.target.tagName === 'BUTTON') return;
            
            if (lastTouch) {
                const touch = e.touches[0];
                const dx = touch.clientX - lastTouch.x;
                const dy = touch.clientY - lastTouch.y;
                
                this.yaw -= dx * 0.005;
                this.pitch -= dy * 0.005;
                this.pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, this.pitch));
                
                lastTouch = { x: touch.clientX, y: touch.clientY };
            } else {
                lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        document.addEventListener('touchend', () => {
            lastTouch = null;
        });

        // Tap to interact
        document.addEventListener('touchstart', (e) => {
            if (e.target.tagName !== 'BUTTON' && !lastTouch) {
                 this.engine.player.interact(this.buildMode);
            }
        });
    }

    getForwardVector() {
        return {
            x: -Math.sin(this.yaw) * Math.cos(this.pitch),
            y: Math.sin(this.pitch),
            z: -Math.cos(this.yaw) * Math.cos(this.pitch)
        };
    }
}
