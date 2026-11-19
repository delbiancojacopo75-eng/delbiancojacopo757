import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { apriProva } from './prova.js';

const MODEL_URL = 'models/OCCHIALI_PLASTICA.glb';
const hero = document.getElementById('hero-viewer');
const explodedViewer = document.getElementById('exploded-viewer');
const tryButton = document.getElementById('bottone-prova');
const loader = new GLTFLoader();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function creaScena(contenitore, distanza) {
    const scena = new THREE.Scene();
    scena.background = new THREE.Color('#000000');

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0.1, distanza);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(contenitore.clientWidth, contenitore.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    contenitore.appendChild(renderer.domElement);

    scena.add(new THREE.HemisphereLight(0xffffff, 0x24242b, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-3, 4, 5);
    scena.add(key);
    const rim = new THREE.DirectionalLight(0x9ec9ff, 2.2);
    rim.position.set(3, 1, -3);
    scena.add(rim);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = distanza * 0.6;
    controls.maxDistance = distanza * 1.8;
    controls.target.set(0, 0, 0);

    const ridimensiona = new ResizeObserver(function () {
        const width = contenitore.clientWidth;
        const height = contenitore.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
    ridimensiona.observe(contenitore);

    return { scena, camera, renderer, controls };
}

function normalizzaModello(radice) {
    const contenitore = new THREE.Group();
    contenitore.add(radice);
    const scatola = new THREE.Box3().setFromObject(radice);
    const dimensioni = scatola.getSize(new THREE.Vector3());
    radice.position.sub(scatola.getCenter(new THREE.Vector3()));
    contenitore.scale.setScalar(2.4 / Math.max(dimensioni.x, dimensioni.y, dimensioni.z));
    return { contenitore, dimensioni };
}

function preparaEsploso(oggetto) {
    oggetto.updateMatrixWorld(true);
    const livello = oggetto.children.length === 1 && oggetto.children[0].children.length > 1
        ? oggetto.children[0]
        : oggetto;
    const gruppi = livello.children.filter(function (figlio) {
        let contieneMesh = false;
        figlio.traverse(function (nodo) { if (nodo.isMesh) contieneMesh = true; });
        return contieneMesh;
    });

    if (gruppi.length > 1 && gruppi.length <= 30) {
        return gruppi.map(function (gruppo) {
            const centro = new THREE.Box3().setFromObject(gruppo).getCenter(new THREE.Vector3());
            const verso = centro.clone().normalize().multiplyScalar(0.42);
            return { gruppo, origine: gruppo.position.clone(), offset: verso };
        });
    }

    const raggruppati = new Map();
    oggetto.traverse(function (nodo) {
        if (!nodo.isMesh) return;
        const materiale = Array.isArray(nodo.material) ? nodo.material[0] : nodo.material;
        const chiave = materiale.uuid;
        if (!raggruppati.has(chiave)) raggruppati.set(chiave, []);
        raggruppati.get(chiave).push(nodo);
    });
    const centroModello = new THREE.Box3().setFromObject(oggetto).getCenter(new THREE.Vector3());
    const pezzi = [];
    raggruppati.forEach(function (mesh) {
        const bounds = new THREE.Box3();
        mesh.forEach(function (nodo) { bounds.expandByObject(nodo); });
        const offset = bounds.getCenter(new THREE.Vector3()).sub(centroModello).multiplyScalar(0.4);
        mesh.forEach(function (nodo) {
            const mondo = nodo.getWorldPosition(new THREE.Vector3());
            const posizione = nodo.parent.worldToLocal(mondo.clone());
            const spostata = nodo.parent.worldToLocal(mondo.clone().add(offset));
            pezzi.push({ gruppo: nodo, origine: nodo.position.clone(), offset: spostata.sub(posizione) });
        });
    });
    return pezzi;
}

const heroScene = creaScena(hero, 5.3);
const explodedScene = creaScena(explodedViewer, 5.2);
let modelloHero = null;
let modelloEsploso = null;
let partiEsploso = [];
let oraHero = performance.now();
const durataIngresso = reduceMotion ? 0 : 6200;
const cursoreEsploso = document.getElementById('exploded-range');
const valoreEsploso = document.getElementById('exploded-value');

loader.load(MODEL_URL, function (gltf) {
    const { contenitore: modello, dimensioni } = normalizzaModello(gltf.scene);
    modelloHero = modello;
    heroScene.scena.add(modelloHero);
    hero.querySelector('.loading-note')?.remove();

    modelloEsploso = modelloHero.clone(true);
    explodedScene.scena.add(modelloEsploso);
    partiEsploso = preparaEsploso(modelloEsploso);
    explodedViewer.querySelector('.loading-note')?.remove();

    tryButton.disabled = false;
    tryButton.addEventListener('click', function () {
        apriProva(modelloHero, dimensioni, 'forma-01');
    });
}, undefined, function (errore) {
    console.error('Impossibile caricare ' + MODEL_URL, errore);
    hero.querySelector('.loading-note').textContent = 'Modello non disponibile: ' + MODEL_URL;
    explodedViewer.querySelector('.loading-note').textContent = 'Vista esplosa non disponibile';
});

cursoreEsploso.addEventListener('input', function () {
    valoreEsploso.textContent = cursoreEsploso.value + '%';
    if (!partiEsploso.length) return;
    const valore = Number(cursoreEsploso.value) / 100;
    partiEsploso.forEach(function (parte) {
        parte.gruppo.position.copy(parte.origine).addScaledVector(parte.offset, valore);
    });
});

function anima(tempo) {
    requestAnimationFrame(anima);
    if (modelloHero && tempo - oraHero < durataIngresso) {
        const progresso = Math.min((tempo - oraHero) / durataIngresso, 1);
        const rotazione = Math.PI * 2 * (1 - Math.pow(1 - progresso, 2));
        modelloHero.rotation.y = -0.55 + rotazione;
    }
    heroScene.controls.update();
    explodedScene.controls.update();
    heroScene.renderer.render(heroScene.scena, heroScene.camera);
    explodedScene.renderer.render(explodedScene.scena, explodedScene.camera);
}

requestAnimationFrame(anima);