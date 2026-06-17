import * as THREE from 'https://esm.sh/three@0.160.0';
import { AABB } from '../physics/AABB.js';
import { BLOCKS, BLOCK_DATA } from '../world/Blocks.js';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.camera = engine.camera;
        this.world = engine.world;
        this.physics = engine.physics;

        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        // AABB (Width 0.6, Height 1.8, Depth 0.6) - centered around position horizontally
        this.width = 0.6;
        this.height = 1.8;
        this.aabb = new AABB(
            this.position.x - this.width/2,
            this.position.y,
            this.position.z - this.width/2,
            this.width, this.height, this.width
        );

        this.speed = 4.3; // Blocks per second
        this.jumpForce = 8.0;
        this.onGround = false;

        // Survival Stats
        this.health = 20;
        this.hunger = 20;
        
        // Raycaster for block interaction
        this.raycaster = new THREE.Raycaster();
        
        this.selectedBlockId = BLOCKS.DIRT; // What we place
    }

    fixedUpdate(dt, input) {
        // Input Translation
        let dirX = 0;
        let dirZ = 0;

        if (input.keys['KeyW']) dirZ -= 1;
        if (input.keys['KeyS']) dirZ += 1;
        if (input.keys['KeyA']) dirX -= 1;
        if (input.keys['KeyD']) dirX += 1;

        // Normalize direction
        const len = Math.sqrt(dirX*dirX + dirZ*dirZ);
        if (len > 0) {
            dirX /= len;
            dirZ /= len;
        }

        // Apply yaw rotation to movement vector
        const cosY = Math.cos(input.yaw);
        const sinY = Math.sin(input.yaw);
        
        const moveX = dirX * cosY + dirZ * sinY;
        const moveZ = -dirX * sinY + dirZ * cosY;

        this.velocity.x = moveX * this.speed;
        this.velocity.z = moveZ * this.speed;

        // Jumping
        if (input.keys['Space'] && this.onGround) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        // Gravity
        this.velocity.y -= this.physics.gravity * dt;
        if (this.velocity.y < -this.physics.terminalVelocity) {
            this.velocity.y = -this.physics.terminalVelocity;
        }

        // Collision
        const { dy, collisions } = this.physics.collide(this.aabb, this.velocity, dt);
        
        // Update position from AABB (aabb tracks actual collision-resolved position)
        this.position.x = this.aabb.x + this.width/2;
        this.position.y = this.aabb.y;
        this.position.z = this.aabb.z + this.width/2;

        if (collisions.y) {
            if (this.velocity.y < -10) {
                // Fall damage
                const damage = Math.floor((-this.velocity.y - 10) / 3);
                if (damage > 0) this.takeDamage(damage);
            }
            this.velocity.y = 0;
        }
        
        this.onGround = collisions.y && dy === 0 && this.velocity.y <= 0;

        // Sync Camera
        this.camera.position.set(this.position.x, this.position.y + 1.6, this.position.z);
        this.camera.rotation.order = "YXZ";
        this.camera.rotation.y = input.yaw;
        this.camera.rotation.x = input.pitch;
    }

    update(dt) {
        // Variable updates (hunger depletion etc over time)
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 20;
            this.position.set(8, 100, 8); // Respawn
            this.velocity.set(0,0,0);
            this.aabb.y = this.position.y;
            this.aabb.x = this.position.x - this.width/2;
            this.aabb.z = this.position.z - this.width/2;
        }
    }

    interact(buildMode) {
        // Simple DDA Raycast through voxel grid
        const maxDist = 5;
        const pos = this.camera.position;
        const dir = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
        
        let t = 0;
        let x = Math.floor(pos.x);
        let y = Math.floor(pos.y);
        let z = Math.floor(pos.z);
        
        const stepX = Math.sign(dir.x);
        const stepY = Math.sign(dir.y);
        const stepZ = Math.sign(dir.z);
        
        const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
        const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
        const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;
        
        let tMaxX = stepX > 0 ? (Math.floor(pos.x) + 1 - pos.x) * tDeltaX : (pos.x - Math.floor(pos.x)) * tDeltaX;
        let tMaxY = stepY > 0 ? (Math.floor(pos.y) + 1 - pos.y) * tDeltaY : (pos.y - Math.floor(pos.y)) * tDeltaY;
        let tMaxZ = stepZ > 0 ? (Math.floor(pos.z) + 1 - pos.z) * tDeltaZ : (pos.z - Math.floor(pos.z)) * tDeltaZ;
        
        let prevX = x, prevY = y, prevZ = z;

        for (let i = 0; i < 50; i++) {
            if (t > maxDist) break;
            
            const blockId = this.world.getBlock(x, y, z);
            if (blockId !== 0 && BLOCK_DATA[blockId]) {
                if (buildMode) {
                    // Place block at previous empty position
                    this.world.setBlock(prevX, prevY, prevZ, this.selectedBlockId);
                    if (this.engine.network) this.engine.network.sendBlock(prevX, prevY, prevZ, this.selectedBlockId);
                } else {
                    // Break block
                    this.world.setBlock(x, y, z, BLOCKS.AIR);
                    if (this.engine.network) this.engine.network.sendBlock(x, y, z, BLOCKS.AIR);
                }
                return;
            }

            prevX = x; prevY = y; prevZ = z;

            if (tMaxX < tMaxY) {
                if (tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; }
                else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; }
            } else {
                if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; }
                else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; }
            }
        }
    }
}
