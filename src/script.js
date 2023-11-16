import * as THREE from 'three';


let scene;
let camera;
let renderer;
let world;
let stack = [];
let gameStarted = false;
let overhangs = [];
const originalBoxSize = 3;
const boxHeight = 3;

init();
animation();


function init(){

    // Initialize CannonJS
    world = new CANNON.World();
    world.gravity.set(0, -10,0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 40;

    // Initialize ThreeJs Scene
    scene = new THREE.Scene();

    // Foundation
    addLayer(0, 0, originalBoxSize, originalBoxSize);

    // First Layer
    addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

    // Lights

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 20, 0);
    scene.add(directionalLight);

    // Camera
    const width = 10;
    const height = width * (window.innerWidth / window.innerHeight);
    camera = new THREE.OrthographicCamera(
        width / -2,
        width / 2,
        height / 2,
        height / -2,
        1,
        100
    );

    camera.position.set(4,4,4);
    camera.lookAt(0,0,0);

    // camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 )
    // camera.position.z = 5

    // Renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.render(scene,camera);
    document.body.appendChild( renderer.domElement );

}

function addLayer(x, z, width, depth, direction) {

    const y = boxHeight * stack.length;
    const layer = generateBox(x, y, z, width, depth, false);
    layer.direction = direction;
    stack.push(layer);

}

function addOverhang(x, z, width, depth) {

    const y = boxHeight * (stack.length - 1);
    const overhang = generateBox(x, y, z, width, depth, true);
    overhangs.push(overhang);

}

function generateBox(x, y, z, width, depth, falls) {

    // ThreeJS
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
    const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100%, 50%)`);
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    scene.add(mesh);

    // CannonJS
    const shape = new CANNON.Box(
        new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
    );
    let mass = falls ? 5 : 0; 
    mass *= width / originalBoxSize; 
    mass *= depth / originalBoxSize; 
    const body = new CANNON.Body({ mass, shape });
    body.position.set(x, y, z);
    world.addBody(body);

    return {
        threejs: mesh,
        cannonjs: body,
        width,
        depth
    };
}

window.addEventListener("click", () => {

    if (!gameStarted) {

        renderer.setAnimationLoop(animation);
        gameStarted = true;

    } else {

        const topLayer = stack[stack.length - 1];
        const previousLayer = stack[stack.length -2];

        const direction = topLayer.direction;

        const delta =
            topLayer.threejs.position[direction] -
            previousLayer.threejs.position [direction];

        const overHangSize = Math.abs(delta);

        const size = direction === "x" ? topLayer.width : topLayer.depth;

        const overlap = size - overHangSize;

        if (overlap > 0) {

            const newWidth = direction === "x" ? overlap : topLayer.width;
            const newDepth = direction === "z" ? overlap : topLayer.depth;

            topLayer.width = newWidth;
            topLayer.depth = newDepth;

            topLayer.threejs.scale[direction] = overlap / size;
            topLayer.threejs.position[direction] -= delta / 2;

            const overhangShift = (overlap / 2 + overHangSize / 2) * Math.sign(delta);

            const overhangX =
                direction === "x"
                    ? topLayer.threejs.position.x + overhangShift
                    : topLayer.threejs.position.x;

            const overhangZ =
                direction === "z"
                    ? topLayer.threejs.position.z + overhangShift
                    : topLayer.threejs.position.z;

            const overhangWidth = direction === "x" ? overHangSize : newWidth;
            const overhangDepth = direction === "z" ? overHangSize : newDepth;

            addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

            const nextX = direction === "x" ? 0 : -10;
            const nextZ = direction === "z" ? 0 : -10;
            const nextDirection = direction === "x" ? "z" : "x";

            addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
        }
    }
});

function animation() {

    const speed = 0.15;
    const topLayer = stack[stack.length -1];

    topLayer.threejs.position[topLayer.direction] += speed;
    topLayer.cannonjs.position[topLayer.direction] *= speed;

    if (camera.position.y < boxHeight * (stack.length -2) + 4) {
        camera.position.y += speed;
    }
    updatePhysics();
    renderer.render(scene, camera);

}

function updatePhysics() {

    world.step(1 / 60);
    overhangs.forEach((element) => {
        element.threejs.position.copy(element.cannonjs.position);
        element.threejs.quaternion.copy(element.cannonjs.quaternion);
    });

}

