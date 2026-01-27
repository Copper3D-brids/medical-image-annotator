import * as THREE from "three";

export function transformMeshPointToImageSpace(
    x: number[],
    origin: number[],
    spacing: number[],
    dimensions: number[],
    bias: THREE.Vector3
) {
    const z = [
        -x[1] + origin[0] + spacing[0] * dimensions[0] + bias.x,
        x[0] + origin[1] + bias.y,
        x[2] + origin[2] + bias.z,
    ];
    return z;
}

export function distance3D(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let dz = z2 - z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function customRound(num: number) {
    const decimalPart = num - Math.floor(num);

    if (decimalPart > 0.5) {
        return Math.ceil(num);
    } else {
        return Math.floor(num);
    }
}

export function getNippleClock(tumourCenter: THREE.Vector3, nipplePos: THREE.Vector3) {
    let dx = tumourCenter.x - nipplePos.x;
    let dy = tumourCenter.y - nipplePos.y;
    let dz = tumourCenter.z - nipplePos.z;

    let rd = Math.sqrt(dx * dx + dz * dz);
    let angle = Math.atan2(-dx, -dz);
    let time = 6 + (12 * angle) / (2 * Math.PI);

    return { rd, angle, time };
}
