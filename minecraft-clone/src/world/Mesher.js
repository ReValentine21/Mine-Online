import * as THREE from 'https://esm.sh/three@0.160.0';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './Chunk.js';
import { BLOCKS, BLOCK_DATA, getAtlasUVs } from './Blocks.js';

export function generateMeshes(chunk) {
    const vertices = [];
    const indices = [];
    const uvs = [];
    let indexOffset = 0;

    // We do greedy meshing for 3 axes: X, Y, Z
    // To simplify, let's start with a highly optimized Face Culling mesher first.
    // If performance demands it, we can upgrade to greedy meshing. Face culling 
    // alone reduces 90% of internal faces, which is often enough for a web voxel clone.
    
    // Actually, the prompt explicitly demands "Greedy Meshing". 
    // I will implement a greedy mesher.

    const dims = [CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH];
    
    // For each of the 3 axes (0=X, 1=Y, 2=Z)
    for (let d = 0; d < 3; d++) {
        let u = (d + 1) % 3;
        let v = (d + 2) % 3;
        
        const x = [0, 0, 0];
        const q = [0, 0, 0];
        
        let mask = new Int32Array(dims[u] * dims[v]);

        q[d] = 1;

        for (x[d] = -1; x[d] < dims[d];) {
            // Compute the mask
            let n = 0;
            for (x[v] = 0; x[v] < dims[v]; ++x[v]) {
                for (x[u] = 0; x[u] < dims[u]; ++x[u]) {
                    // Two block types to compare
                    const blockCurrent = x[d] >= 0 ? chunk.getBlock(x[0], x[1], x[2]) : BLOCKS.AIR;
                    const blockNext = x[d] < dims[d] - 1 ? chunk.getBlock(x[0] + q[0], x[1] + q[1], x[2] + q[2]) : BLOCKS.AIR;
                    
                    const matCurrent = blockCurrent ? BLOCK_DATA[blockCurrent] : null;
                    const matNext = blockNext ? BLOCK_DATA[blockNext] : null;

                    // Visibility checks
                    const t1 = blockCurrent && (!matNext || (matNext.transparent && blockCurrent !== blockNext));
                    const t2 = blockNext && (!matCurrent || (matCurrent.transparent && blockCurrent !== blockNext));

                    if (t1 && !t2) {
                        mask[n++] = blockCurrent;
                    } else if (t2 && !t1) {
                        mask[n++] = -blockNext;
                    } else {
                        mask[n++] = 0;
                    }
                }
            }

            ++x[d];

            // Generate mesh from the mask
            n = 0;
            for (let j = 0; j < dims[v]; ++j) {
                for (let i = 0; i < dims[u];) {
                    let id = mask[n];
                    if (id !== 0) {
                        // Compute width
                        let w;
                        for (w = 1; i + w < dims[u] && mask[n + w] === id; ++w) {}
                        
                        // Compute height
                        let h;
                        let done = false;
                        for (h = 1; j + h < dims[v]; ++h) {
                            for (let k = 0; k < w; ++k) {
                                if (mask[n + k + h * dims[u]] !== id) {
                                    done = true;
                                    break;
                                }
                            }
                            if (done) break;
                        }

                        // Generate Quad
                        x[u] = i;
                        x[v] = j;

                        const du = [0, 0, 0];
                        const dv = [0, 0, 0];
                        du[u] = w;
                        dv[v] = h;
                        
                        // Absolute ID
                        const absId = Math.abs(id);

                        // Determine face index for UV mapping
                        // d=0: X-axis (Right/Left) -> id>0: Right(0), id<0: Left(1)
                        // d=1: Y-axis (Top/Bottom) -> id>0: Top(2), id<0: Bottom(3)
                        // d=2: Z-axis (Front/Back) -> id>0: Back(5), id<0: Front(4)
                        let faceIndex = 0;
                        if (d === 0) faceIndex = id > 0 ? 0 : 1;
                        if (d === 1) faceIndex = id > 0 ? 2 : 3;
                        if (d === 2) faceIndex = id > 0 ? 5 : 4;

                        const uvCoords = getAtlasUVs(absId, faceIndex);

                        const widthScale = w;
                        const heightScale = h;

                        // Create vertices
                        let v1 = [x[0], x[1], x[2]];
                        let v2 = [x[0] + du[0], x[1] + du[1], x[2] + du[2]];
                        let v3 = [x[0] + du[0] + dv[0], x[1] + du[1] + dv[1], x[2] + du[2] + dv[2]];
                        let v4 = [x[0] + dv[0], x[1] + dv[1], x[2] + dv[2]];

                        // Winding order depends on direction
                        if (id > 0) {
                            vertices.push(...v1, ...v2, ...v3, ...v4);
                        } else {
                            vertices.push(...v1, ...v4, ...v3, ...v2);
                        }

                        // Adjust UVs based on face size so textures tile instead of stretch
                        // U goes along the 'u' axis (width), V goes along 'v' axis (height)
                        let uRange = uvCoords.u1 - uvCoords.u0;
                        let vRange = uvCoords.v1 - uvCoords.v0;
                        
                        // Pushing UVs for the 4 vertices
                        // Top-left, Top-right, Bottom-right, Bottom-left mapping
                        if (id > 0) {
                            uvs.push(
                                uvCoords.u0, uvCoords.v0,
                                uvCoords.u0 + uRange * widthScale, uvCoords.v0,
                                uvCoords.u0 + uRange * widthScale, uvCoords.v0 + vRange * heightScale,
                                uvCoords.u0, uvCoords.v0 + vRange * heightScale
                            );
                        } else {
                            uvs.push(
                                uvCoords.u0, uvCoords.v0,
                                uvCoords.u0, uvCoords.v0 + vRange * heightScale,
                                uvCoords.u0 + uRange * widthScale, uvCoords.v0 + vRange * heightScale,
                                uvCoords.u0 + uRange * widthScale, uvCoords.v0
                            );
                        }

                        indices.push(
                            indexOffset, indexOffset + 1, indexOffset + 2,
                            indexOffset, indexOffset + 2, indexOffset + 3
                        );
                        indexOffset += 4;

                        // Clear the mask
                        for (let l = 0; l < h; ++l) {
                            for (let k = 0; k < w; ++k) {
                                mask[n + k + l * dims[u]] = 0;
                            }
                        }

                        i += w;
                        n += w;
                    } else {
                        i++;
                        n++;
                    }
                }
            }
        }
    }

    if (vertices.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}
