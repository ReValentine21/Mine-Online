export class AABB {
    constructor(x, y, z, w, h, d) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        this.h = h;
        this.d = d;
    }

    // Clone the AABB
    clone() {
        return new AABB(this.x, this.y, this.z, this.w, this.h, this.d);
    }

    // Check intersection with another AABB
    intersects(other) {
        return (
            this.x < other.x + other.w &&
            this.x + this.w > other.x &&
            this.y < other.y + other.h &&
            this.y + this.h > other.y &&
            this.z < other.z + other.d &&
            this.z + this.d > other.z
        );
    }

    // Move AABB by an offset
    translate(dx, dy, dz) {
        this.x += dx;
        this.y += dy;
        this.z += dz;
    }
}
