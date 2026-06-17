import * as THREE from 'https://esm.sh/three@0.160.0';
import { World } from '../world/World.js';
import { Physics } from '../physics/Physics.js';
import { Player } from '../entity/Player.js';
import { InputManager } from '../input/InputManager.js';
import { UIManager } from '../ui/UIManager.js';
import { Inventory } from '../ui/Inventory.js';
import { Crafting } from '../ui/Crafting.js';
import { NetworkClient } from '../network/NetworkClient.js';

export class Engine {
    constructor() {
        this.container = document.getElementById('game-container');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky color
        this.scene.fog = new THREE.Fog(0x87CEEB, 32, 128); // Will match render distance dynamically

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: false }); // Pixelated look is better without antialias
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.dirLight.position.set(100, 200, 50);
        this.scene.add(this.dirLight);

        // Systems
        this.world = new World(this.scene);
        this.physics = new Physics(this.world);
        this.player = new Player(this);
        this.input = new InputManager(this);
        this.inventory = new Inventory(this);
        this.crafting = new Crafting(this.inventory);
        this.ui = new UIManager(this);
        this.network = new NetworkClient(this);

        // Place player high up
        this.player.position.set(8, 100, 8);

        // Event Listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Time tracking
        this.clock = new THREE.Clock();
        this.fixedTimeStep = 1 / 60;
        this.accumulator = 0;
        this.timeOfDay = 6000; // 0-24000 ticks like Minecraft

        this.isRunning = false;
    }

    start() {
        this.isRunning = true;
        this.renderer.setAnimationLoop(this.loop.bind(this));
    }

    stop() {
        this.isRunning = false;
        this.renderer.setAnimationLoop(null);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateDayNightCycle(dt) {
        this.timeOfDay += dt * 20; // 20 ticks per real second
        if (this.timeOfDay >= 24000) this.timeOfDay = 0;

        // Map timeOfDay to angle (0 is dawn, 6000 is noon, 12000 is dusk, 18000 is midnight)
        const angle = (this.timeOfDay / 24000) * Math.PI * 2 - (Math.PI / 2);
        
        this.dirLight.position.x = Math.cos(angle) * 100;
        this.dirLight.position.y = Math.sin(angle) * 100;

        // Sky colors
        if (this.dirLight.position.y > 0) {
            this.scene.background.setHex(0x87CEEB); // Day
            this.scene.fog.color.setHex(0x87CEEB);
            this.ambientLight.intensity = 0.6;
            this.dirLight.intensity = 0.8;
        } else {
            this.scene.background.setHex(0x050510); // Night
            this.scene.fog.color.setHex(0x050510);
            this.ambientLight.intensity = 0.2;
            this.dirLight.intensity = 0.0;
        }
    }

    loop() {
        if (!this.isRunning) return;

        const dt = this.clock.getDelta();
        this.accumulator += dt;

        // Fixed Physics Update
        while (this.accumulator >= this.fixedTimeStep) {
            this.player.fixedUpdate(this.fixedTimeStep, this.input);
            this.physics.simulate(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }

        // Variable Update
        this.player.update(dt);
        this.world.updateChunks(this.player.position);
        this.updateDayNightCycle(dt);
        this.network.update(dt);

        this.renderer.render(this.scene, this.camera);
    }
}
