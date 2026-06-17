const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });
console.log("Minecraft Clone Multiplayer Server running on ws://localhost:8080");

const clients = new Map();
let nextId = 1;

// Global world state (very simplified, usually chunk based)
const worldState = new Map(); // "x,y,z" -> blockId

wss.on('connection', (ws) => {
    const id = nextId++;
    clients.set(id, { ws, pos: { x:0, y:0, z:0 }, yaw: 0, pitch: 0 });

    console.log(`Client ${id} connected.`);

    // Send initial world state
    const worldPayload = [];
    for(const [key, val] of worldState.entries()) {
        worldPayload.push(`${key}:${val}`);
    }
    ws.send(JSON.stringify({ type: 'init', id: id, world: worldPayload }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'move') {
                const client = clients.get(id);
                if (client) {
                    client.pos = data.pos;
                    client.yaw = data.yaw;
                    client.pitch = data.pitch;

                    // Broadcast movement
                    const out = JSON.stringify({
                        type: 'update',
                        id: id,
                        pos: client.pos,
                        yaw: client.yaw,
                        pitch: client.pitch
                    });
                    
                    for (const [otherId, other] of clients.entries()) {
                        if (otherId !== id && other.ws.readyState === 1) {
                            other.ws.send(out);
                        }
                    }
                }
            } else if (data.type === 'block') {
                // Block place/break
                const key = `${data.x},${data.y},${data.z}`;
                if (data.id === 0) {
                    worldState.delete(key);
                } else {
                    worldState.set(key, data.id);
                }

                // Broadcast block update
                const out = JSON.stringify({
                    type: 'block',
                    x: data.x, y: data.y, z: data.z, id: data.id
                });

                for (const [otherId, other] of clients.entries()) {
                    if (otherId !== id && other.ws.readyState === 1) {
                        other.ws.send(out);
                    }
                }
            } else if (data.type === 'chat') {
                const out = JSON.stringify({
                    type: 'chat',
                    id: id,
                    text: data.text
                });
                for (const other of clients.values()) {
                    if (other.ws.readyState === 1) {
                        other.ws.send(out);
                    }
                }
            }

        } catch (e) {
            console.error("Parse error:", e);
        }
    });

    ws.on('close', () => {
        clients.delete(id);
        console.log(`Client ${id} disconnected.`);
        // Broadcast disconnect
        const out = JSON.stringify({ type: 'disconnect', id: id });
        for (const other of clients.values()) {
            if (other.ws.readyState === 1) {
                other.ws.send(out);
            }
        }
    });
});
