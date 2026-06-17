export const BLOCKS = {
    AIR: 0,
    STONE: 1,
    DIRT: 2,
    GRASS: 3,
    WOOD: 4,
    LEAVES: 5,
    BEDROCK: 6,
    WATER: 7,
    COAL_ORE: 8,
    IRON_ORE: 9,
    DIAMOND_ORE: 10,
    PLANKS: 11,
    COBBLESTONE: 12,
    CRAFTING_TABLE: 13
};

// Colors for the generated texture atlas (Fallback for rendering)
export const BLOCK_DATA = {
    [BLOCKS.AIR]: { transparent: true, solid: false, color: null },
    [BLOCKS.STONE]: { transparent: false, solid: true, color: '#7D7D7D' },
    [BLOCKS.DIRT]: { transparent: false, solid: true, color: '#866043' },
    [BLOCKS.GRASS]: { transparent: false, solid: true, color: '#599039', topColor: '#75B049', bottomColor: '#866043' },
    [BLOCKS.WOOD]: { transparent: false, solid: true, color: '#6A4D30', topColor: '#B28C5A', bottomColor: '#B28C5A' },
    [BLOCKS.LEAVES]: { transparent: true, solid: true, color: '#3A592D' },
    [BLOCKS.BEDROCK]: { transparent: false, solid: true, color: '#333333' },
    [BLOCKS.WATER]: { transparent: true, solid: false, color: '#2B4AED' },
    [BLOCKS.COAL_ORE]: { transparent: false, solid: true, color: '#7D7D7D', noiseColor: '#1A1A1A' },
    [BLOCKS.IRON_ORE]: { transparent: false, solid: true, color: '#7D7D7D', noiseColor: '#E6CAA4' },
    [BLOCKS.DIAMOND_ORE]: { transparent: false, solid: true, color: '#7D7D7D', noiseColor: '#4AEDD9' },
    [BLOCKS.PLANKS]: { transparent: false, solid: true, color: '#B28C5A' },
    [BLOCKS.COBBLESTONE]: { transparent: false, solid: true, color: '#666666' },
    [BLOCKS.CRAFTING_TABLE]: { transparent: false, solid: true, color: '#8B5A2B', topColor: '#D2B48C' }
};

// Generates a basic texture atlas canvas returning a DataURL
export function generateTextureAtlas() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const tileSize = 16;
    const tilesPerRow = 16;
    canvas.width = tileSize * tilesPerRow;
    canvas.height = tileSize * tilesPerRow;

    ctx.fillStyle = '#FF00FF'; // Magenta background for debugging
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    function drawTile(x, y, color, topColor, bottomColor, noiseColor) {
        const px = x * tileSize;
        const py = y * tileSize;
        ctx.fillStyle = color;
        ctx.fillRect(px, py, tileSize, tileSize);

        // Add some noise for texture
        for(let i=0; i<40; i++) {
            ctx.fillStyle = (Math.random() > 0.5) ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
            if(noiseColor && Math.random() > 0.7) ctx.fillStyle = noiseColor;
            ctx.fillRect(px + Math.floor(Math.random()*tileSize), py + Math.floor(Math.random()*tileSize), 1, 1);
        }
    }

    // Map block IDs to atlas coordinates (simple 1:1 for now, x = id % 16, y = floor(id / 16))
    for (const [idStr, data] of Object.entries(BLOCK_DATA)) {
        const id = parseInt(idStr);
        if (id === 0) continue; // Skip air
        
        // We will generate 3 tiles for blocks that have top/bottom (Side: x, Top: x+16, Bottom: x+32)
        // For simplicity, let's just lay them out sequentially
        let bx = id % 16;
        let by = Math.floor(id / 16) * 3; 

        drawTile(bx, by, data.color, null, null, data.noiseColor); // Side
        drawTile(bx, by + 1, data.topColor || data.color, null, null, data.noiseColor); // Top
        drawTile(bx, by + 2, data.bottomColor || data.color, null, null, data.noiseColor); // Bottom
    }

    return canvas.toDataURL('image/png');
}

export function getAtlasUVs(id, faceIndex) {
    // faceIndex: 0: right, 1: left, 2: top, 3: bottom, 4: front, 5: back
    const tileSize = 16;
    const atlasSize = 256;
    const fraction = tileSize / atlasSize;
    
    let bx = id % 16;
    let by = Math.floor(id / 16) * 3;

    // Adjust Y based on face
    if (faceIndex === 2) by += 1; // Top
    else if (faceIndex === 3) by += 2; // Bottom
    // else by += 0 (Side)

    const u0 = bx * fraction;
    const v0 = 1.0 - ((by + 1) * fraction);
    const u1 = (bx + 1) * fraction;
    const v1 = 1.0 - (by * fraction);

    return { u0, v0, u1, v1 };
}
