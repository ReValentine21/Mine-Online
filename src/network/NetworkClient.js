import { RemotePlayer } from '../entity/RemotePlayer.js';

export class NetworkClient {
    constructor(engine) {
        this.engine = engine;
        this.players = new Map();
        this.ws = null;
        this.connected = false;
        this.myId = null;

        this.connect();
    }

    connect() {
        try {
            this.ws = new WebSocket('ws://localhost:8080');
            
            this.ws.onopen = () => {
                console.log("Connected to Multiplayer Server");
                this.connected = true;
            };

            this.ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                this.handleMessage(data);
            };

            this.ws.onclose = () => {
                console.log("Disconnected from Server");
                this.connected = false;
            };
            
            this.ws.onerror = (e) => {
                // Silent fail if server isn't running
                this.connected = false;
            };
        } catch (e) {
            console.warn("Could not connect to multiplayer server.");
        }
    }

    handleMessage(data) {
        if (data.type === 'init') {
            this.myId = data.id;
            // Apply initial world state
            data.world.forEach(str => {
                const parts = str.split(':');
                const coords = parts[0].split(',');
                this.engine.world.setBlock(parseInt(coords[0]), parseInt(coords[1]), parseInt(coords[2]), parseInt(parts[1]));
            });
        } else if (data.type === 'update') {
            if (!this.players.has(data.id)) {
                this.players.set(data.id, new RemotePlayer(this.engine.scene, data.id));
            }
            const rp = this.players.get(data.id);
            rp.updateTransform(data.pos, data.yaw, data.pitch);
        } else if (data.type === 'block') {
            this.engine.world.setBlock(data.x, data.y, data.z, data.id);
        } else if (data.type === 'disconnect') {
            if (this.players.has(data.id)) {
                this.players.get(data.id).destroy();
                this.players.delete(data.id);
            }
        } else if (data.type === 'chat') {
            this.engine.ui.addChatMessage(`Player ${data.id}: ${data.text}`);
        }
    }

    sendMove(pos, yaw, pitch) {
        if (!this.connected) return;
        this.ws.send(JSON.stringify({ type: 'move', pos, yaw, pitch }));
    }

    sendBlock(x, y, z, id) {
        if (!this.connected) return;
        this.ws.send(JSON.stringify({ type: 'block', x, y, z, id }));
    }
    
    sendChat(text) {
        if (!this.connected) return;
        this.ws.send(JSON.stringify({ type: 'chat', text }));
    }

    update(dt) {
        if (this.connected) {
            // Send position at ~20Hz
            this.sendMove(this.engine.player.position, this.engine.input.yaw, this.engine.input.pitch);
            
            // Update interpolations
            for (const rp of this.players.values()) {
                rp.update(dt);
            }
        }
    }
}
