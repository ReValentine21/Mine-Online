import * as THREE from 'https://esm.sh/three@0.160.0';

export class RemotePlayer {
    constructor(scene, id) {
        this.scene = scene;
        this.id = id;

        // Simple Box representation for other players
        const geo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
        const mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geo, mat);
        
        // Head
        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xffaaaa });
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.y = 1.2;
        this.mesh.add(this.head);

        this.scene.add(this.mesh);

        this.targetPos = new THREE.Vector3();
        this.targetYaw = 0;
        this.targetPitch = 0;
    }

    updateTransform(pos, yaw, pitch) {
        this.targetPos.set(pos.x, pos.y + 0.9, pos.z); // Adjust center since height is 1.8
        this.targetYaw = yaw;
        this.targetPitch = pitch;
    }

    update(dt) {
        // Interpolate for smooth movement
        this.mesh.position.lerp(this.targetPos, 10 * dt);
        
        // Simple rotation
        this.mesh.rotation.y = this.targetYaw;
        this.head.rotation.x = this.targetPitch;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.head.geometry.dispose();
        this.mesh.material.dispose();
        this.head.material.dispose();
    }
}
