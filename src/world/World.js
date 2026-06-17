import * as THREE from 'https://esm.sh/three@0.160.0';
import { createNoise2D, createNoise3D } from 'https://esm.sh/simplex-noise@4.0.1';
import { Chunk, CHUNK_WIDTH, CHUNK_DEPTH } from './Chunk.js';
import { generateTextureAtlas } from './Blocks.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        
        // Setup Texture Atlas
        const atlasDataUrl = generateTextureAtlas();
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(atlasDataUrl);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        
        this.material = new THREE.MeshLambertMaterial({
            map: texture,
            vertexColors: false,
            transparent: true,
            alphaTest: 0.1
        });

        this.noise2D = createNoise2D();
        this.noise3D = createNoise3D();
        
        this.renderDistance = 8; // default
    }

    getChunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    updateChunks(playerPos) {
        const cx = Math.floor(playerPos.x / CHUNK_WIDTH);
        const cz = Math.floor(playerPos.z / CHUNK_DEPTH);

        // Simple spiral generation around player
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                // Circular render distance check
                if (x*x + z*z > this.renderDistance * this.renderDistance) continue;
                
                const targetX = cx + x;
                const targetZ = cz + z;
                const key = this.getChunkKey(targetX, targetZ);

                if (!this.chunks.has(key)) {
                    const chunk = new Chunk(this, targetX, targetZ);
                    chunk.generate(this.noise2D, this.noise3D);
                    this.chunks.set(key, chunk);
                }
            }
        }

        // Build meshes for dirty chunks
        for (const chunk of this.chunks.values()) {
            if (chunk.isDirty) {
                chunk.buildMesh(this.material);
            }
        }

        // Unload far chunks
        const unloadDist = this.renderDistance + 2;
        for (const [key, chunk] of this.chunks.entries()) {
            const dx = chunk.x - cx;
            const dz = chunk.z - cz;
            if (dx*dx + dz*dz > unloadDist * unloadDist) {
                if (chunk.mesh) {
                    this.scene.remove(chunk.mesh);
                    chunk.mesh.geometry.dispose();
                }
                this.chunks.delete(key);
            }
        }
    }

    getBlock(x, y, z) {
        const cx = Math.floor(x / CHUNK_WIDTH);
        const cz = Math.floor(z / CHUNK_DEPTH);
        const chunk = this.chunks.get(this.getChunkKey(cx, cz));
        if (!chunk) return 0;

        const bx = Math.floor(x) - cx * CHUNK_WIDTH;
        const by = Math.floor(y);
        const bz = Math.floor(z) - cz * CHUNK_DEPTH;

        return chunk.getBlock(bx, by, bz);
    }

    setBlock(x, y, z, id) {
        const cx = Math.floor(x / CHUNK_WIDTH);
        const cz = Math.floor(z / CHUNK_DEPTH);
        const chunk = this.chunks.get(this.getChunkKey(cx, cz));
        if (!chunk) return;

        const bx = Math.floor(x) - cx * CHUNK_WIDTH;
        const by = Math.floor(y);
        const bz = Math.floor(z) - cz * CHUNK_DEPTH;

        chunk.setBlock(bx, by, bz, id);
        
        // If on chunk boundary, mark neighbor dirty too
        if (bx === 0) {
            const neighbor = this.chunks.get(this.getChunkKey(cx - 1, cz));
            if (neighbor) neighbor.isDirty = true;
        } else if (bx === CHUNK_WIDTH - 1) {
            const neighbor = this.chunks.get(this.getChunkKey(cx + 1, cz));
            if (neighbor) neighbor.isDirty = true;
        }
        if (bz === 0) {
            const neighbor = this.chunks.get(this.getChunkKey(cx, cz - 1));
            if (neighbor) neighbor.isDirty = true;
        } else if (bz === CHUNK_DEPTH - 1) {
            const neighbor = this.chunks.get(this.getChunkKey(cx, cz + 1));
            if (neighbor) neighbor.isDirty = true;
        }
    }
}
