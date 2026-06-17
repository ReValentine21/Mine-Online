import { AABB } from './AABB.js';
import { BLOCK_DATA } from '../world/Blocks.js';

export class Physics {
    constructor(world) {
        this.world = world;
        this.gravity = 30; // Blocks per second squared
        this.terminalVelocity = 40;
    }

    // Sweeps an AABB against the voxel world and returns the actual allowed movement vector and collision flags
    collide(aabb, velocity, dt) {
        const dx = velocity.x * dt;
        const dy = velocity.y * dt;
        const dz = velocity.z * dt;

        let resX = dx;
        let resY = dy;
        let resZ = dz;

        const collisions = { x: false, y: false, z: false };

        // To handle sliding, we test each axis independently
        // 1. Y Axis (Gravity)
        let testAABB = aabb.clone();
        testAABB.translate(0, resY, 0);
        if (this.checkCollision(testAABB)) {
            resY = 0;
            collisions.y = true;
        } else {
            aabb.translate(0, resY, 0);
        }

        // 2. X Axis
        testAABB = aabb.clone();
        testAABB.translate(resX, 0, 0);
        if (this.checkCollision(testAABB)) {
            resX = 0;
            collisions.x = true;
        } else {
            aabb.translate(resX, 0, 0);
        }

        // 3. Z Axis
        testAABB = aabb.clone();
        testAABB.translate(0, 0, resZ);
        if (this.checkCollision(testAABB)) {
            resZ = 0;
            collisions.z = true;
        } else {
            aabb.translate(0, 0, resZ);
        }

        return { dx: resX, dy: resY, dz: resZ, collisions };
    }

    checkCollision(aabb) {
        const minX = Math.floor(aabb.x);
        const maxX = Math.floor(aabb.x + aabb.w);
        const minY = Math.floor(aabb.y);
        const maxY = Math.floor(aabb.y + aabb.h);
        const minZ = Math.floor(aabb.z);
        const maxZ = Math.floor(aabb.z + aabb.d);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const blockId = this.world.getBlock(x, y, z);
                    if (blockId !== 0) {
                        const bData = BLOCK_DATA[blockId];
                        if (bData && bData.solid) return true;
                    }
                }
            }
        }
        return false;
    }

    // Currently no global physics simulation since we only sweep player, but this is the hook
    simulate(dt) {
        // Falling sand/gravel or item drops would go here
    }
}
