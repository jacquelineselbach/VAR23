import * as THREE from 'three';
import * as CANNON from "cannon-es";
import { loadBirds } from './birds.js';
import { Clock } from 'three';

window.focus();
const clock = new Clock();

let camera, scene, renderer;
let world;
let lastTime;
let stack;
let overhangs;
let roboticAlignment;
let gameEnded;
let robotPrecision;
let baseHue;
let highScore = 0;
const boxHeight = 1;
const originalBoxSize = 3;
const highScoreElement = document.getElementById("highScore");
const scoreElement = document.getElementById("score");
const instructionsElement = document.getElementById("startScreen");
const gameOverElement = document.getElementById("gameOver");
const resultsElement = document.getElementById("results");
const { parrot, flamingo, stork } = await loadBirds();
const radius = 5;
let theta = 0;

init();

function init() {

    roboticAlignment = true;
    gameEnded = false;
    lastTime = 0;
    stack = [];
    overhangs = [];

    scene = new THREE.Scene();

    world = new CANNON.World();
    world.gravity.set(0, -10, 0);
    world.broadphase = new CANNON.NaiveBroadphase();

    baseHue = Math.floor(Math.random() * 360);
    scene.background = generateBackgroundColor();

    const aspect = window.innerWidth / window.innerHeight;
    const width = 10;
    const height = width / aspect;

    camera = new THREE.OrthographicCamera(
        width / -2,
        width / 2,
        height / 2,
        height / -2,
        0,
        100
    );

    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);

    addLayer(0, 0, originalBoxSize, originalBoxSize);
    addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 0);
    scene.add(dirLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animation);
    document.body.appendChild(renderer.domElement);

    scoreElement.style.display = "none";
    highScoreElement.style.display = highScore > 0 ? "block" : "none";

    setBlockPrecision();

    //Set scale of birds
    var desiredScale = 0.02;
    // Apply the scale to the object
    parrot.scale.set(desiredScale, desiredScale, desiredScale);
    flamingo.scale.set(desiredScale, desiredScale, desiredScale);
    stork.scale.set(desiredScale, desiredScale, desiredScale);
    scene.add(parrot, flamingo, stork);


}

function startGame() {

    if (scoreElement) {
        scoreElement.style.display = "block";
        scoreElement.innerText = 0;
    }

    if (gameOverElement) gameOverElement.style.display = "none";
    roboticAlignment = false;
    gameEnded = false;
    lastTime = 0;
    stack = [];
    overhangs = [];

    if (instructionsElement) instructionsElement.style.display = "none";

    if (resultsElement) resultsElement.style.display = "none";

    if (scoreElement) scoreElement.innerText = 0;

    if (highScore > 0) {

        highScoreElement.style.display = "block";

    } else {

        highScoreElement.style.display = "none";
    }

    if (scoreElement.innerText === "0") {

        scoreElement.style.display = "none";

    } else {

        scoreElement.style.display = "block";
    }

    if (world) {
        while (world.bodies.length > 0) {
            world.removeBody(world.bodies[0]);
        }
    }

    if (scene) {
        while (scene.children.find((c) => c.type === "Mesh")) {
            const mesh = scene.children.find((c) => c.type === "Mesh");
            scene.remove(mesh);
        }

        //Add birds to scene
        scene.add(parrot, flamingo, stork);  

        addLayer(0, 0, originalBoxSize, originalBoxSize);

        addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");
    }

    if (camera) {
        camera.position.set(4, 4, 4);
        camera.lookAt(0, 0, 0);
    }
}

function generateBackgroundColor() {

    if (isDarkMode()) {
        const hueVariation = baseHue + (Math.random() - 0.5) * 30;
        const saturation = 5 + Math.random() * 5;
        const lightness = 5 + Math.random() * 5;
        return new THREE.Color(`hsl(${hueVariation}, ${saturation}%, ${lightness}%)`);
    } else {
        const hueVariation = baseHue + (Math.random() - 0.5) * 30;
        const saturation = 30 + Math.random() * 20;
        const lightness = 80 + Math.random() * 20;
        return new THREE.Color(`hsl(${hueVariation}, ${saturation}%, ${lightness}%)`);
    }
}

function isDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
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

function setBlockPrecision() {
    robotPrecision = Math.random() - 0.5;
}

function generateBox(x, y, z, width, depth, falls) {

    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
    const hueVariation = baseHue + (Math.random() - 0.5) * 20;
    const saturation = 50 + Math.random() * 20;
    const lightness = 70 + Math.random() * 20;
    const color = new THREE.Color(`hsl(${hueVariation}, ${saturation}%, ${lightness}%)`);
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(x, y, z);
    scene.add(mesh);

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

function cutBox(topLayer, overlap, size, delta) {

    const direction = topLayer.direction;
    const newWidth = direction === "x" ? overlap : topLayer.width;
    const newDepth = direction === "z" ? overlap : topLayer.depth;

    topLayer.width = newWidth;
    topLayer.depth = newDepth;

    topLayer.threejs.scale[direction] = overlap / size;
    topLayer.threejs.position[direction] -= delta / 2;

    topLayer.cannonjs.position[direction] -= delta / 2;

    const shape = new CANNON.Box(
        new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
    );
    topLayer.cannonjs.shapes = [];
    topLayer.cannonjs.addShape(shape);
}

function splitBlockAndAddNextOneIfOverlaps() {

    if (gameEnded) return;

    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];

    const direction = topLayer.direction;
    const size = direction === "x" ? topLayer.width : topLayer.depth;
    const delta = topLayer.threejs.position[direction] - previousLayer.threejs.position[direction];
    const overhangSize = Math.abs(delta);
    const overlap = size - overhangSize;

    const precisionThreshold = 0.1;

    if (Math.abs(delta) < precisionThreshold) {

        if (!roboticAlignment) {
            updateScoreForPrecision();
        }

        topLayer.threejs.position[direction] = previousLayer.threejs.position[direction];
        topLayer.cannonjs.position[direction] = previousLayer.cannonjs.position[direction];

    } else if (overlap > 0) {

        if (!roboticAlignment) {
            updateRegularScore();
        }

        cutBox(topLayer, overlap, size, delta);

        const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
        const overhangX = direction === "x" ? topLayer.threejs.position.x + overhangShift : topLayer.threejs.position.x;
        const overhangZ = direction === "z" ? topLayer.threejs.position.z + overhangShift : topLayer.threejs.position.z;
        const overhangWidth = direction === "x" ? overhangSize : topLayer.width;
        const overhangDepth = direction === "z" ? overhangSize : topLayer.depth;

        addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

    } else {
        missedTheSpot();
    }

    if (!gameEnded) {

        const nextX = direction === "x" ? topLayer.threejs.position.x : -10;
        const nextZ = direction === "z" ? topLayer.threejs.position.z : -10;
        const newWidth = topLayer.width;
        const newDepth = topLayer.depth;
        const nextDirection = direction === "x" ? "z" : "x";

        addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
    }
}

function missedTheSpot() {

    const topLayer = stack[stack.length - 1];

    addOverhang(
        topLayer.threejs.position.x,
        topLayer.threejs.position.z,
        topLayer.width,
        topLayer.depth
    );

    world.removeBody(topLayer.cannonjs);
    scene.remove(topLayer.threejs);

    if (roboticAlignment) {
        location.reload()
    } else {

    updateHighScore()
    gameEnded = true;
    if (gameOverElement) gameOverElement.style.display = "flex";
    if (resultsElement && !roboticAlignment) resultsElement.style.display = "flex";
    }
}

function updateRegularScore() {
    const currentScore = parseInt(scoreElement.innerText, 10) + 1;
    scoreElement.innerText = currentScore;

    if (currentScore > 0) {
        scoreElement.style.display = "block";
    }
}

function updateScoreForPrecision() {

    let currentScore = parseInt(scoreElement.innerText, 10);

    if (currentScore === 0) {
        currentScore = 1;
    } else {
        currentScore *= 2;
    }

    scoreElement.innerText = currentScore;
    scoreElement.style.display = "block";
}

function updateHighScore() {
    const currentScore = parseInt(scoreElement.innerText, 10);
    if (currentScore > highScore) {
        highScore = currentScore;
        highScoreElement.innerText = `High Score: ${highScore}`;
        if (highScore > 0) {
            highScoreElement.style.display = "block";
        } else {
            highScoreElement.style.display = "none";
        }
    }
}

function animation(time) {
    if (lastTime) {
        const timePassed = time - lastTime;
        const speed = 0.008;

        const topLayer = stack[stack.length - 1];
        const previousLayer = stack[stack.length - 2];

        const boxShouldMove =
            !gameEnded &&
            (!roboticAlignment ||
                (roboticAlignment &&
                    topLayer.threejs.position[topLayer.direction] <
                    previousLayer.threejs.position[topLayer.direction] +
                    robotPrecision));

        if (boxShouldMove) {
            topLayer.threejs.position[topLayer.direction] += speed * timePassed;
            topLayer.cannonjs.position[topLayer.direction] += speed * timePassed;

            if (topLayer.threejs.position[topLayer.direction] > 10) {
                missedTheSpot();
            }
        } else {
            if (roboticAlignment) {
                splitBlockAndAddNextOneIfOverlaps();
                setBlockPrecision();
            }
        }

        if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
            camera.position.y += speed * timePassed;
        }

        updatePhysics(timePassed);
        renderer.render(scene, camera);
    }
    lastTime = time;

         //Animate and move birds
         tick([parrot, flamingo, stork]);
        //Update the object's position in a circular path
        theta += 0.15;
        parrot.position.x = radius * Math.cos(theta/10);
        parrot.position.y = 10;
        parrot.position.z = radius * Math.sin(theta/10);
        flamingo.position.x = radius * Math.cos(theta/10);
        flamingo.position.z = radius * Math.sin(theta/10);
        flamingo.position.y = 20;
        stork.position.x = radius * Math.cos(theta/10);
        stork.position.z = radius * Math.sin(theta/10);
        stork.position.y = 3;
        
        // Rotate the object 
        parrot.rotation.y += -0.0155;
        flamingo.rotation.y += -0.0155;
        stork.rotation.y += -0.0155;
}

function updatePhysics(timePassed) {
    world.step(timePassed / 1000);

    overhangs.forEach((element) => {
        element.threejs.position.copy(element.cannonjs.position);
        element.threejs.quaternion.copy(element.cannonjs.quaternion);
    });
}

function eventHandler() {
    if (roboticAlignment) startGame();
    else splitBlockAndAddNextOneIfOverlaps();
}

function isLightOrDarkMode(e) {
    scene.background = generateBackgroundColor();
}

window.addEventListener("mousedown", eventHandler);
window.addEventListener("touchstart", eventHandler);
window.addEventListener("keydown", function (event) {
    if (event.key === " ") {
        event.preventDefault();
        eventHandler();
        return;
    }
    if (event.key === "R" || event.key === "r") {
        event.preventDefault();
        startGame();
    }
});

window.addEventListener("resize", () => {
    // Adjust camera
    console.log("resize", window.innerWidth, window.innerHeight);
    const aspect = window.innerWidth / window.innerHeight;
    const width = 10;
    const height = width / aspect;

    camera.top = height / 2;
    camera.bottom = height / -2;

    // Reset renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
});

document.getElementById("restartButton").addEventListener("click", function() {
    baseHue = Math.floor(Math.random() * 360);
    scene.background = generateBackgroundColor();
    startGame();
});

function tick(updatables) {
    // only call the getDelta function once per frame!
    const delta = clock.getDelta();

    for (const object of updatables) {
      object.tick(delta);
    }
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', isLightOrDarkMode);