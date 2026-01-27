import * as THREE from "three";

export function createOriginSphere(
    origin: number[],
    ras: number[],
    spacing: number[],
    x_bias: number,
    y_bias: number,
    z_bias: number
) {
    const geometry = new THREE.SphereGeometry(5, 32, 16);
    const materiallt = new THREE.MeshBasicMaterial({ color: "red" });
    const materialrt = new THREE.MeshBasicMaterial({ color: "skyblue" });
    const materiallb = new THREE.MeshBasicMaterial({ color: "grey" });
    const materialrb = new THREE.MeshBasicMaterial({ color: "dark" });
    const spherelt = new THREE.Mesh(geometry, materiallt);
    const spherert = new THREE.Mesh(geometry, materialrt);
    const spherelb = new THREE.Mesh(geometry, materiallb);
    const sphererb = new THREE.Mesh(geometry, materialrb);

    const resetOrigin = [
        origin[0] + x_bias,
        origin[1] + y_bias,
        origin[2] + z_bias,
    ];

    spherelt.position.set(resetOrigin[0], resetOrigin[1], resetOrigin[2]);
    spherert.position.set(
        resetOrigin[0] + ras[0],
        resetOrigin[1],
        resetOrigin[2]
    );
    spherelb.position.set(
        resetOrigin[0],
        resetOrigin[1] + ras[1],
        resetOrigin[2]
    );
    sphererb.position.set(
        resetOrigin[0] + ras[0],
        resetOrigin[1] + ras[1],
        resetOrigin[2]
    );

    return [spherelt, spherert, spherelb, sphererb];
}
