import * as THREE from 'https://esm.sh/three@0.160.0';
import { BLOCKS, BLOCK_DATA } from './Blocks.js';
import { generateMeshes } from './Mesher.js';

export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 128;
export const CHUNK_DEPTH = 16;

export class Chunk {
    constructor(world, x, z) {
        this.world = world;
        this.x = x;
        this.z = z;
        this.data = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
        this.mesh = null;
        this.isDirty = false;
        this.isGenerated = false;
    }

    getIndex(x, y, z) {
        return x + z * CHUNK_WIDTH + y * CHUNK_WIDTH * CHUNK_DEPTH;
    }

    getBlock(x, y, z) {
        if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_DEPTH) {
            return BLOCKS.AIR;
        }
        return this.data[this.getIndex(x, y, z)];
    }

    setBlock(x, y, z, id) {
        if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_DEPTH) {
            return;
        }
        this.data[this.getIndex(x, y, z)] = id;
        this.isDirty = true;
    }

    generate(noise2D, noise3D) {
        const worldX = this.x * CHUNK_WIDTH;
        const worldZ = this.z * CHUNK_DEPTH;

        for (let x = 0; x < CHUNK_WIDTH; x++) {
            for (let z = 0; z < CHUNK_DEPTH; z++) {
                const wx = worldX + x;
                const wz = worldZ + z;
                
                // Base height using 2D noise
                const scale = 0.01;
                const elevationNoise = noise2D(wx * scale, wz * scale);
                const baseHeight = 64 + Math.floor(elevationNoise * 20);

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    if (y === 0) {
                        this.setBlock(x, y, z, BLOCKS.BEDROCK);
                    } else if (y < baseHeight - 4) {
                        this.setBlock(x, y, z, BLOCKS.STONE);
                    } else if (y < baseHeight) {
                        this.setBlock(x, y, z, BLOCKS.DIRT);
                    } else if (y === baseHeight) {
                        // Generate Water below level 60
                        if (y < 60) {
                            this.setBlock(x, y, z, BLOCKS.DIRT);
                        } else {
                            this.setBlock(x, y, z, BLOCKS.GRASS);
                        }
                    } else if (y < 60 && y > baseHeight) {
                        this.setBlock(x, y, z, BLOCKS.WATER);
                    } else {
                        this.setBlock(x, y, z, BLOCKS.AIR);
                    }

                    // 3D Noise for Caves
                    if (y > 0 && y <= baseHeight) {
                        const caveNoise = noise3D(wx * 0.05, y * 0.05, wz * 0.05);
                        if (caveNoise > 0.4) {
                            this.setBlock(x, y, z, BLOCKS.AIR);
                        }
                    }

                    // Ore Generation
                    if (this.getBlock(x,y,z) === BLOCKS.STONE) {
                        if (Math.random() < 0.01) this.setBlock(x, y, z, BLOCKS.COAL_ORE);
                        else if (y < 40 && Math.random() < 0.005) this.setBlock(x, y, z, BLOCKS.IRON_ORE);
                        else if (y < 16 && Math.random() < 0.002) this.setBlock(x, y, z, BLOCKS.DIAMOND_ORE);
                    }
                }

                // Trees
                if (this.getBlock(x, baseHeight, z) === BLOCKS.GRASS && Math.random() < 0.02) {
                    this.generateTree(x, baseHeight + 1, z);
                }
            }
        }
        this.isGenerated = true;
        this.isDirty = true;
    }

    generateTree(x, y, z) {
        const height = 4 + Math.floor(Math.random() * 3);
        // Trunk
        for (let i = 0; i < height; i++) {
            if (y + i < CHUNK_HEIGHT) this.setBlock(x, y + i, z, BLOCKS.WOOD);
        }
        // Leaves
        for (let lx = x - 2; lx <= x + 2; lx++) {
            for (let lz = z - 2; lz <= z + 2; lz++) {
                for (let ly = y + height - 2; ly <= y + height + 1; ly++) {
                    if (lx === x && lz === z && ly < y + height) continue; // Trunk
                    // Simple leaf sphere approx
                    if (Math.abs(lx - x) + Math.abs(ly - (y + height)) + Math.abs(lz - z) <= 3) {
                        if (this.getBlock(lx, ly, lz) === BLOCKS.AIR) {
                            this.setBlock(lx, ly, lz, BLOCKS.LEAVES);
                        }
                    }
                }
            }
        }
    }

    buildMesh(material) {
        if (!this.isDirty) return;
        
        if (this.mesh) {
            this.world.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh = null;
        }

        const geometry = generateMeshes(this);
        if (geometry) {
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.set(this.x * CHUNK_WIDTH, 0, this.z * CHUNK_DEPTH);
            this.world.scene.add(this.mesh);
        }
        
        this.isDirty = false;
    }
}
