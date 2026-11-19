// occhiali.js – il visualizzatore degli occhiali
// stessa idea del configuratore della lampada. Nel file models/OCCHIALI_PLASTICA.glb ci sono 3 parti:
// LENTE, STANGHETTA SX e STANGHETTA DX. La parte LENTE contiene sia la lente vera e propria
// sia la sua struttura (la striscia sopra e gli agganci alle stanghette): qui la divido in due.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


/* ===== 1. la sezione e il visore ===== */

// cerco i bottoni solo dentro la sezione degli occhiali (la lampada ha le stesse classi)
const sezione = document.getElementById('sezione-occhiali');
const visore = document.getElementById('visore-occhiali');

const segnaposto = visore.querySelector('.visore-segnaposto');
segnaposto.textContent = 'Carico gli occhiali…';


/* ===== 2. scena, camera, renderer ===== */

const scena = new THREE.Scene();
// lo sfondo è dipinto nella scena (non trasparente) perché le lenti trasparenti
// mostrano quello che c'è dietro: devono "vedere" il beige del visore
scena.background = new THREE.Color('#f3f0ea');

const camera = new THREE.PerspectiveCamera(35, visore.clientWidth / visore.clientHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(visore.clientWidth, visore.clientHeight);
visore.appendChild(renderer.domElement);


/* ===== 3. le luci ===== */

const faretto = new THREE.SpotLight(0xffffff, 60);
faretto.position.set(3, 4, -4);      // davanti agli occhiali, in alto
faretto.angle = Math.PI / 6;
faretto.penumbra = 0.5;
faretto.decay = 2;
scena.add(faretto);

scena.add(new THREE.HemisphereLight(0xffffff, 0xe8e0d0, 0.8));

// la stanza finta che si riflette: serve soprattutto alle lenti specchiate
const pmrem = new THREE.PMREMGenerator(renderer);
scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;


/* ===== 4. le texture tartarugate =====
   Le disegno in un <canvas>: tante macchie morbide, allungate tutte nella stessa direzione
   (l'acetato viene "tirato" quando si lavora), sopra un colore di fondo.
   Ogni macchia la ridisegno anche spostata di una larghezza/altezza, così la texture
   si ripete senza che si veda la giuntura. */

// numeri casuali ma sempre uguali a ogni caricamento (così la texture non cambia)
function casuale(seme) {
    return function () {
        seme = (seme * 16807) % 2147483647;
        return (seme - 1) / 2147483646;
    };
}

// una macchia: un'ellisse sfumata (piena al centro, trasparente sul bordo)
function macchia(ctx, x, y, rx, ry, angolo, colore, morbidezza) {
    const L = ctx.canvas.width;
    // la disegno 9 volte (al centro e nelle 8 caselle intorno): così la texture si ripete senza giunture
    for (let dx = -L; dx <= L; dx += L) {
        for (let dy = -L; dy <= L; dy += L) {
            ctx.save();
            ctx.translate(x + dx, y + dy);
            ctx.rotate(angolo);
            ctx.scale(rx, ry);
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
            g.addColorStop(0, colore);
            g.addColorStop(1 - morbidezza, colore);
            g.addColorStop(1, colore.replace(/[\d.]+\)$/, '0)'));     // stesso colore, trasparente
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// le ricette delle due texture, viste nelle foto.
// Ogni strato è un gruppo di macchie; una macchia può avere "dentro" altre macchie più piccole
// allo stesso centro (alone → macchia → cuore), come nell'acetato vero.
//   quante, raggio min, raggio max, allungamento, colore, morbidezza, dentro: [[grandezza, colore], ...]
const TEXTURE = {
    // Havana: fondo quasi nero, grandi fiamme ambra con il cuore giallo, chiazze nere sopra
    havana: {
        fondo: '#1a0b05',
        strati: [
            [22, 70, 150, 2.4, 'rgba(66, 26, 8, 0.9)', 0.6, []],                                // nuvole marrone scuro
            [30, 30, 80, 2.8, 'rgba(140, 54, 10, 0.85)', 0.5,                                   // fiamme ambra...
                [[0.65, 'rgba(206, 104, 24, 0.9)'], [0.3, 'rgba(246, 176, 64, 0.9)']]],         // ...arancio, cuore giallo
            [26, 12, 32, 3.0, 'rgba(214, 112, 28, 0.85)', 0.45, [[0.45, 'rgba(250, 196, 90, 0.8)']]],
            [34, 16, 55, 2.2, 'rgba(14, 6, 3, 0.9)', 0.45, []]                                   // chiazze nere
        ]
    },
    // Tartaruga chiara: fondo crema, macchie marroni con il centro scuro e un alone grigio-tortora
    chiara: {
        fondo: '#ebe3d4',
        strati: [
            [18, 60, 130, 2.0, 'rgba(214, 202, 182, 0.8)', 0.6, []],                            // velature beige
            [34, 26, 62, 2.3, 'rgba(150, 132, 112, 0.7)', 0.5,                                  // alone tortora...
                [[0.7, 'rgba(98, 74, 52, 0.9)'], [0.38, 'rgba(36, 26, 18, 0.95)']]],            // ...marrone, cuore scuro
            [26, 8, 20, 2.0, 'rgba(70, 52, 38, 0.85)', 0.4, []],                                 // macchioline
            [16, 18, 44, 2.0, 'rgba(250, 247, 240, 0.7)', 0.55, []]                              // riflessi chiari
        ]
    }
};

function disegnaTexture(ricetta, seme) {
    const L = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = L;
    const ctx = canvas.getContext('2d');
    const rnd = casuale(seme);

    ctx.fillStyle = ricetta.fondo;
    ctx.fillRect(0, 0, L, L);

    const direzione = 0.35;     // tutte le macchie un po' inclinate nello stesso verso
    ricetta.strati.forEach(function ([quante, rMin, rMax, allunga, colore, morbidezza, dentro]) {
        for (let i = 0; i < quante; i++) {
            const r = rMin + rnd() * (rMax - rMin);
            const x = rnd() * L, y = rnd() * L;
            const rx = r * allunga * (0.7 + rnd() * 0.6);
            const angolo = direzione + (rnd() - 0.5) * 0.6;
            macchia(ctx, x, y, rx, r, angolo, colore, morbidezza);
            // le macchie interne, un po' spostate dal centro così non sembrano bersagli
            dentro.forEach(function ([grandezza, coloreDentro]) {
                const sx = (rnd() - 0.5) * rx * 0.3, sy = (rnd() - 0.5) * r * 0.3;
                macchia(ctx, x + sx, y + sy, rx * grandezza, r * grandezza, angolo, coloreDentro, 0.45);
            });
        }
    });
    return canvas;
}

// le texture pronte per Three.js (una sola volta) + l'immagine per i campioni del pannello
const textureTartaruga = {};
Object.entries(TEXTURE).forEach(function ([nome, ricetta], i) {
    const canvas = disegnaTexture(ricetta, 7 + i * 31);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    textureTartaruga[nome] = t;

    // i campioni del pannello mostrano la stessa texture
    const immagine = canvas.toDataURL('image/jpeg', 0.85);
    sezione.querySelectorAll('.campione[data-texture="' + nome + '"]').forEach(function (c) {
        c.style.backgroundImage = 'url(' + immagine + ')';
        c.style.backgroundSize = '220%';
        c.style.backgroundPosition = 'center';
    });
});


/* ===== 5. dove finisce la lente e inizia la struttura =====
   La struttura è: la striscia in alto (gli ultimi 2,3 mm sotto il bordo superiore)
   e tutto quello che sta dietro la lente, verso le stanghette (z > 2,5 mm).
   Il bordo superiore non è dritto: scende verso i lati. Questa è la sua altezza (in mm),
   misurata dal file ogni 2 mm a partire dal centro degli occhiali (che è a x = -4,3 mm). */
const BORDO_SUPERIORE = [
    115.3, 115.3, 115.3, 115.3, 115.2, 115.2, 115.1, 115.0, 114.9, 114.8,
    114.6, 114.5, 114.3, 114.1, 113.9, 113.6, 113.4, 113.1, 112.8, 112.5,
    112.1, 111.7, 111.3, 110.9, 110.4, 109.8, 109.4, 108.6, 108.2, 107.2,
    106.7, 106.1, 104.9, 104.2, 102.7, 100.7, 97.6, 92.9, 86.6, 80.0, 80.0
];
const CENTRO_X = -4.3;          // mm
const ALTEZZA_STRISCIA = 2.3;   // mm
const INIZIO_AGGANCI = 2.5;     // mm (z)

// la stessa regola in JavaScript (per il nome sotto il mouse); p è in metri come nel file
function eStruttura(p) {
    const u = Math.min(Math.abs(p.x * 1000 - CENTRO_X) / 2, BORDO_SUPERIORE.length - 1);
    const i = Math.floor(u);
    const bordo = THREE.MathUtils.lerp(BORDO_SUPERIORE[i], BORDO_SUPERIORE[Math.min(i + 1, BORDO_SUPERIORE.length - 1)], u - i);
    return p.y * 1000 > bordo - ALTEZZA_STRISCIA || p.z * 1000 > INIZIO_AGGANCI;
}


/* ===== 6. i materiali =====
   Tutti i materiali degli occhiali passano da qui. Aggiungo al disegno di Three.js due cose:
   - la texture tartarugata "proiettata" dai tre lati (così non si stira sui pezzi del file);
   - la maschera: lo stesso pezzo del file è disegnato due volte, una come lente e una come
     struttura, e ognuna delle due copie butta via (discard) i punti che non sono suoi. */

// il pezzo di disegno (GLSL) che butta via i punti che non appartengono alla parte:
// uMaschera 1 = tengo solo la lente, 2 = tengo solo la struttura, 0 = tengo tutto
function codiceMaschera() {
    return [
        'if (uMaschera > 0) {',
        '    float u = min(abs(vPosFile.x * 1000.0 - (' + CENTRO_X.toFixed(1) + ')) / 2.0, ' + (BORDO_SUPERIORE.length - 1).toFixed(1) + ');',
        '    int i0 = int(floor(u));',
        '    int i1 = min(i0 + 1, ' + (BORDO_SUPERIORE.length - 1) + ');',
        '    float bordo = mix(uBordo[i0], uBordo[i1], fract(u));',
        '    bool struttura = vPosFile.y * 1000.0 > bordo - ' + ALTEZZA_STRISCIA.toFixed(1) +
        '                  || vPosFile.z * 1000.0 > ' + INIZIO_AGGANCI.toFixed(1) + ';',
        '    if (struttura != (uMaschera == 2)) discard;',
        '}'
    ].join('\n');
}

function materialeOcchiali(maschera) {
    // maschera: 0 = nessuna (stanghette), 1 = solo lente, 2 = solo struttura
    const m = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide });
    m.userData.uniforms = {
        uTexture: { value: textureTartaruga.havana },
        uUsaTexture: { value: 0 },
        uSpostamento: { value: new THREE.Vector2(Math.random(), Math.random()) },   // ogni parte un pezzo diverso di texture
        uMaschera: { value: maschera },
        uBordo: { value: BORDO_SUPERIORE }
    };

    m.onBeforeCompile = function (shader) {
        Object.assign(shader.uniforms, m.userData.uniforms);

        // vertex: passo al fragment la posizione e la normale "del file" (in metri)
        shader.vertexShader = 'varying vec3 vPosFile;\nvarying vec3 vNormFile;\n' +
            shader.vertexShader.replace('#include <begin_vertex>',
                '#include <begin_vertex>\nvPosFile = position;\nvNormFile = normal;');

        shader.fragmentShader = [
            'varying vec3 vPosFile;',
            'varying vec3 vNormFile;',
            'uniform sampler2D uTexture;',
            'uniform float uUsaTexture;',
            'uniform vec2 uSpostamento;',
            'uniform int uMaschera;',
            'uniform float uBordo[' + BORDO_SUPERIORE.length + '];',
            // la texture proiettata dai tre lati, mescolata secondo la direzione della superficie
            'vec3 tartaruga(vec3 p, vec3 n) {',
            '    vec3 w = pow(abs(normalize(n)), vec3(4.0));',
            '    w /= (w.x + w.y + w.z);',
            '    vec3 q = p * 15.0;',                         // la texture si ripete ogni 6,5 cm circa
            '    return texture2D(uTexture, q.zy + uSpostamento).rgb * w.x',
            '         + texture2D(uTexture, q.xz + uSpostamento).rgb * w.y',
            '         + texture2D(uTexture, q.xy + uSpostamento).rgb * w.z;',
            '}',
            shader.fragmentShader
        ].join('\n');

        // la maschera, all'inizio del fragment
        shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>',
            '#include <clipping_planes_fragment>\n' + codiceMaschera());

        // il colore: se c'è la texture, la uso al posto del colore pieno
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', [
            '#include <map_fragment>',
            'if (uUsaTexture > 0.5) diffuseColor.rgb *= tartaruga(vPosFile, vNormFile);'
        ].join('\n'));
    };
    return m;
}

// il materiale delle "sagome" per la tavola: bianco pieno su fondo nero, con la stessa maschera
function materialeSagoma(maschera) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    m.onBeforeCompile = function (shader) {
        shader.uniforms.uMaschera = { value: maschera };
        shader.uniforms.uBordo = { value: BORDO_SUPERIORE };
        shader.vertexShader = 'varying vec3 vPosFile;\n' +
            shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPosFile = position;');
        shader.fragmentShader = 'varying vec3 vPosFile;\nuniform int uMaschera;\nuniform float uBordo[' + BORDO_SUPERIORE.length + '];\n' +
            shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + codiceMaschera());
    };
    // ogni maschera ha il suo programma (il codice è uguale, ma il valore è scritto dentro onBeforeCompile)
    m.customProgramCacheKey = function () { return 'sagoma' + maschera; };
    return m;
}

// l'acetato tartarugato (stanghette e struttura)
function mettiTexture(m, nomeTexture) {
    m.color.set(0xffffff);
    m.userData.uniforms.uTexture.value = textureTartaruga[nomeTexture];
    m.userData.uniforms.uUsaTexture.value = 1;
    m.metalness = 0;
    m.roughness = 0.28;
    m.clearcoat = 1;                  // la plastica lucidata
    m.clearcoatRoughness = 0.04;
    m.transmission = 0;
    m.envMapIntensity = 0.7;
    m.userData.trasparente = false;
}

// i 4 tipi di lente
const LENTI = {
    azzurra:     { colore: '#8cc4ee', trasmissione: 1, metallo: 0, ruvidita: 0.04 },
    trasparente: { colore: '#ffffff', trasmissione: 1, metallo: 0, ruvidita: 0.02 },
    rossa:       { colore: '#e2493b', trasmissione: 1, metallo: 0, ruvidita: 0.04 },
    specchiata:  { colore: '#c9d3dc', trasmissione: 0, metallo: 1, ruvidita: 0.03 }   // uno specchio: riflette la stanza
};

function mettiLente(m, nomeLente) {
    const l = LENTI[nomeLente];
    m.color.set(l.colore);
    m.userData.uniforms.uUsaTexture.value = 0;
    m.transmission = l.trasmissione;     // quanta luce passa attraverso
    m.thickness = 0.002;                 // la lente è spessa 2 mm
    m.ior = 1.5;                         // come il policarbonato
    m.metalness = l.metallo;
    m.roughness = l.ruvidita;
    m.clearcoat = 1;
    m.clearcoatRoughness = 0.02;
    m.envMapIntensity = l.metallo ? 1.6 : 1;
    m.userData.trasparente = l.trasmissione > 0;
}


/* ===== 7. gli occhiali dal file ===== */

// il file è in metri (gli occhiali sono larghi 16,5 cm): li ingrandisco 12 volte
const SCALA_MODELLO = 12;

const occhiali = new THREE.Group();
const modello = new THREE.Group();
occhiali.add(modello);
occhiali.scale.setScalar(SCALA_MODELLO);
scena.add(occhiali);

// le parti: parti['STANGHETTA SX'] = { gruppo, materiale, partenza }
// LENTE e STRUTTURA sono nello stesso gruppo del file, ma hanno due materiali diversi
const parti = {};

const NOMI_PARTI = {
    'LENTE': 'Lente',
    'STRUTTURA': 'Struttura della lente',
    'STANGHETTA SX': 'Stanghetta sinistra',
    'STANGHETTA DX': 'Stanghetta destra'
};

// quanto si sposta ogni gruppo del file nell'Esploso al 100% (in metri)
const SPOSTAMENTO_ESPLOSO = {
    'LENTE':         new THREE.Vector3(0, 0, -0.03),     // lente e struttura vanno in avanti
    'STANGHETTA SX': new THREE.Vector3(0.04, 0, 0.02),   // le stanghette si aprono di lato
    'STANGHETTA DX': new THREE.Vector3(-0.04, 0, 0.02)
};
const gruppi = {};      // i gruppi del file, per l'Esploso

// le cerniere delle stanghette (in metri, coordinate del file).
// Ogni stanghetta ha un perno (Ø 2,6 mm, uno sopra e uno sotto) che entra nella sua sede
// nella struttura della lente: la stanghetta deve girare proprio intorno all'asse del perno,
// così il perno resta sempre dentro la sede. L'asse passa per il centro del perno di sopra
// e di quello di sotto (misurati nel file) ed è un po' inclinato, come la montatura.
// La sinistra sta dal lato +x e si chiude verso -x, la destra il contrario.
// Le due si chiudono di angoli un po' diversi, così una si appoggia sopra l'altra senza toccarsi
const CERNIERE = {
    'STANGHETTA SX': {
        sopra: new THREE.Vector3(0.06619, 0.10168, 0.01019),
        sotto: new THREE.Vector3(0.06486, 0.05605, 0.01019),
        verso: -1, angoloChiuse: 88
    },
    'STANGHETTA DX': {
        sopra: new THREE.Vector3(-0.07480, 0.10168, 0.01019),
        sotto: new THREE.Vector3(-0.07347, 0.05605, 0.01019),
        verso: 1, angoloChiuse: 78
    }
};
// la direzione dell'asse di ogni perno (da sotto a sopra)
Object.values(CERNIERE).forEach(function (c) {
    c.asse = c.sopra.clone().sub(c.sotto).normalize();
});
const cerniere = {};    // i gruppi-cerniera, creati quando arriva il file

new GLTFLoader().load(
    'models/OCCHIALI_PLASTICA.glb',

    function (gltf) {
        // centro il modello (misuro prima di metterlo nella scatola ingrandita)
        const scatola = new THREE.Box3().setFromObject(gltf.scene);
        modello.position.copy(scatola.getCenter(new THREE.Vector3())).negate();

        // le sagome per la tavola: una copia di ogni pezzo, ferma nelle coordinate del file
        preparaSagome(gltf.scene, scatola);

        modello.add(gltf.scene);

        // copio la lista: dentro il ciclo sposto le stanghette nelle loro cerniere
        gltf.scene.children.slice().forEach(function (gruppo) {
            // il caricatore cambia gli spazi del nome in "_": li rimetto
            const nome = gruppo.name.replace(/_/g, ' ');
            gruppi[nome] = { gruppo: gruppo, partenza: gruppo.position.clone() };

            const mesh = [];
            gruppo.traverse(function (o) { if (o.isMesh) mesh.push(o); });

            if (nome === 'LENTE') {
                // ogni pezzo della lente diventa due: la lente (maschera 1) e la struttura (maschera 2)
                const lente = materialeOcchiali(1);
                const struttura = materialeOcchiali(2);
                mesh.forEach(function (o) {
                    o.material = lente;
                    o.userData.parte = 'LENTE';
                    const copia = new THREE.Mesh(o.geometry, struttura);
                    copia.userData.parte = 'STRUTTURA';
                    o.add(copia);            // figlia del pezzo: si muove con lui
                });
                parti['LENTE'] = { materiale: lente };
                parti['STRUTTURA'] = { materiale: struttura };
            } else {
                const materiale = materialeOcchiali(0);
                mesh.forEach(function (o) {
                    o.material = materiale;
                    o.userData.parte = nome;
                });
                parti[nome] = { materiale: materiale };

                // la cerniera: un gruppo messo sul perno; la stanghetta gira con lui (vedi CERNIERE)
                const c = CERNIERE[nome];
                const cerniera = new THREE.Group();
                cerniera.position.copy(c.sopra);
                gltf.scene.add(cerniera);
                cerniera.add(gruppo);
                gruppo.position.sub(c.sopra);
                gruppi[nome].partenza = gruppo.position.clone();
                cerniere[nome] = cerniera;
            }
        });

        // ogni parte prende la scelta già selezionata nell'HTML
        sezione.querySelectorAll('.opzione[data-parti]').forEach(function (opzione) {
            applicaScelta(opzione.dataset.parti, opzione.querySelector('.campione.selected'));
        });

        segnaposto.remove();
    },

    undefined,

    function (errore) {
        console.error(errore);
        segnaposto.textContent = 'Non riesco a caricare models/OCCHIALI_PLASTICA.glb';
    }
);


/* ===== 8. i campioni del pannello ===== */

function applicaScelta(nome, campione) {
    const parte = parti[nome];
    if (!parte || !campione) return;
    if (campione.dataset.texture) mettiTexture(parte.materiale, campione.dataset.texture);
    if (campione.dataset.lente) mettiLente(parte.materiale, campione.dataset.lente);
    parte.materiale.needsUpdate = true;
}

sezione.querySelectorAll('.opzione[data-parti]').forEach(function (opzione) {
    const campioni = opzione.querySelectorAll('.campione');
    const valore = opzione.querySelector('.opzione-valore');

    campioni.forEach(function (campione) {
        campione.addEventListener('click', function () {
            campioni.forEach(function (c) { c.classList.remove('selected'); });
            campione.classList.add('selected');
            valore.textContent = campione.dataset.nome;
            applicaScelta(opzione.dataset.parti, campione);
        });
    });
});


/* ===== 9. i controlli ===== */
const controlli = new OrbitControls(camera, renderer.domElement);
controlli.enableDamping = true;


/* ===== 10. le viste ===== */

// --- Inquadratura. Gli occhiali guardano verso -z (le stanghette vanno verso +z)
const INQUADRATURE = {
    trequarti: new THREE.Vector3(-2.6, 0.9, -3.2),   // davanti, un po' di lato: la vista di partenza
    fronte:    new THREE.Vector3(0, 0.3, -4.2),      // come li vede chi ti guarda
    lato:      new THREE.Vector3(4.2, 0.3, 0)        // di profilo, si vede la stanghetta
};
camera.position.copy(INQUADRATURE.trequarti);

let destinazioneCamera = null;
let giraDaSoli = true;          // gli occhiali girano piano finché non scegli un'inquadratura

sezione.querySelectorAll('.inquadratura').forEach(function (bottone) {
    bottone.addEventListener('click', function () {
        destinazioneCamera = INQUADRATURE[bottone.dataset.vista];
        giraDaSoli = false;     // per vedere davvero "di fronte" gli occhiali devono stare fermi
    });
});

controlli.addEventListener('start', function () {
    destinazioneCamera = null;
});

// --- Esploso
let esploso = 0;
const cursoreEsploso = document.getElementById('cursore-esploso-occhiali');
const valoreEsploso = document.getElementById('valore-esploso-occhiali');

cursoreEsploso.addEventListener('input', function () {
    esploso = Number(cursoreEsploso.value) / 100;
    valoreEsploso.textContent = cursoreEsploso.value + '%';
});

// --- Modalità: Solido / Tavola (il foglio con le viste quotate copre il 3D)
sezione.querySelectorAll('.modalita').forEach(function (bottone) {
    bottone.addEventListener('click', function () {
        const tavolaAccesa = bottone.dataset.modalita === 'tavola';
        if (tavolaAccesa) disegnaTavola();
        tavola.classList.toggle('visibile', tavolaAccesa);
    });
});

// --- Stanghette: aperte, chiuse, o "apri e chiudi" all'infinito
let chiusura = 0;               // da 0 (aperte) a 1 (chiuse): dove sono adesso
let chiusuraVoluta = 0;         // dove devono andare (i bottoni Aperte/Chiuse)
let animaStanghette = false;    // true = si aprono e si chiudono da sole
let inizioAnimazione = 0;
let secondiGiro = 4;            // un "apri e chiudi" completo
const cursoreChiusura = document.getElementById('cursore-chiusura');
const valoreChiusura = document.getElementById('valore-chiusura');
const bottoniStanghette = sezione.querySelectorAll('.stanghette');

sezione.querySelectorAll('.stanghette').forEach(function (bottone) {
    bottone.addEventListener('click', function () {
        const scelta = bottone.dataset.stanghette;
        animaStanghette = scelta === 'anima';
        if (animaStanghette) {
            // parto dal punto in cui sono, così non c'è uno scatto
            inizioAnimazione = performance.now() - Math.acos(1 - 2 * chiusura) / (2 * Math.PI) * secondiGiro * 1000;
        } else {
            chiusuraVoluta = scelta === 'chiuse' ? 1 : 0;
        }
    });
});

// il cursore: piega le stanghette a mano (e ferma l'animazione)
cursoreChiusura.addEventListener('input', function () {
    animaStanghette = false;
    chiusuraVoluta = chiusura = Number(cursoreChiusura.value) / 100;
    bottoniStanghette.forEach(function (b) { b.classList.remove('selected'); });
    bottoniStanghette[0].closest('.opzione').querySelector('.opzione-valore').textContent = 'A mano';
});

sezione.querySelectorAll('.velocita').forEach(function (bottone) {
    bottone.addEventListener('click', function () {
        // cambio velocità tenendo il punto in cui sono
        const fase = (performance.now() - inizioAnimazione) / (secondiGiro * 1000);
        secondiGiro = Number(bottone.dataset.secondi);
        inizioAnimazione = performance.now() - fase * secondiGiro * 1000;
    });
});

// ogni fotogramma: calcolo la chiusura e giro le cerniere
function aggiornaStanghette(adesso) {
    if (animaStanghette) {
        // un giro: aperte → chiuse → aperte, con partenza e arrivo morbidi
        const fase = (adesso - inizioAnimazione) / (secondiGiro * 1000);
        chiusura = (1 - Math.cos(fase * 2 * Math.PI)) / 2;
    } else {
        chiusura += (chiusuraVoluta - chiusura) * 0.1;
    }

    Object.entries(cerniere).forEach(function ([nome, cerniera]) {
        const c = CERNIERE[nome];
        // giro intorno all'asse del perno (non all'asse y): così il perno non esce dalla sede
        cerniera.quaternion.setFromAxisAngle(c.asse, c.verso * THREE.MathUtils.degToRad(c.angoloChiuse) * chiusura);
    });

    // il cursore e il numero seguono le stanghette
    cursoreChiusura.value = Math.round(chiusura * 100);
    valoreChiusura.textContent = Math.round(CERNIERE['STANGHETTA SX'].angoloChiuse * chiusura) + '°';
}

// --- i bottoni Inquadratura e Modalità: quello cliccato diventa nero e il nome va accanto al titolo
['.inquadratura', '.modalita', '.stanghette', '.velocita'].forEach(function (classe) {
    const bottoni = sezione.querySelectorAll(classe);
    const valore = bottoni[0].closest('.opzione').querySelector('.opzione-valore');

    bottoni.forEach(function (bottone) {
        bottone.addEventListener('click', function () {
            bottoni.forEach(function (b) { b.classList.remove('selected'); });
            bottone.classList.add('selected');
            valore.textContent = bottone.dataset.nome;
        });
    });
});

// --- il nome della parte sotto il mouse
const etichetta = document.createElement('div');
etichetta.className = 'etichetta-parte';
visore.appendChild(etichetta);

const raggio = new THREE.Raycaster();
const puntatore = new THREE.Vector2();

renderer.domElement.addEventListener('pointermove', function (evento) {
    if (evento.buttons) {
        etichetta.classList.remove('visibile');
        return;
    }
    const r = renderer.domElement.getBoundingClientRect();
    puntatore.x = ((evento.clientX - r.left) / r.width) * 2 - 1;
    puntatore.y = -((evento.clientY - r.top) / r.height) * 2 + 1;
    raggio.setFromCamera(puntatore, camera);

    const colpiti = raggio.intersectObject(modello, true);
    if (colpiti.length > 0) {
        const colpo = colpiti[0];
        let nome = colpo.object.userData.parte;
        // lente e struttura sono lo stesso pezzo del file: decido con la stessa regola del disegno
        if (nome === 'LENTE' || nome === 'STRUTTURA') {
            nome = eStruttura(colpo.object.worldToLocal(colpo.point.clone())) ? 'STRUTTURA' : 'LENTE';
        }
        etichetta.textContent = NOMI_PARTI[nome] || nome;
        etichetta.style.left = (evento.clientX - r.left) + 'px';
        etichetta.style.top = (evento.clientY - r.top) + 'px';
        etichetta.classList.add('visibile');
    } else {
        etichetta.classList.remove('visibile');
    }
});

renderer.domElement.addEventListener('pointerleave', function () {
    etichetta.classList.remove('visibile');
});


/* ===== 10b. la TAVOLA: tre viste disegnate in vettoriale, con le quote =====
   Come si fa, senza disegnarla a mano:
   1. per ogni vista (fronte, lato, pianta) e per ogni parte, Three.js disegna la "sagoma"
      della parte vista da lì: bianca su nero, in una immagine nascosta;
   2. leggo i pixel e ne ricavo il contorno (marching squares: per ogni quadratino di 4 pixel
      decido da dove passa il bordo);
   3. semplifico il contorno (tolgo i punti che non servono) e lo scrivo come <path> SVG in millimetri;
   4. aggiungo le quote. Le misure sono quelle del modello, arrotondate; quelle segnate con * sono inventate. */

const tavola = document.createElement('div');
tavola.className = 'disegno tavola';
visore.appendChild(tavola);

const scenaSagome = new THREE.Scene();
const sagome = {};              // sagome['LENTE'] = [mesh, ...]
let centroFile = new THREE.Vector3();
let tavolaFatta = false;

// copie dei pezzi del file, ferme nelle coordinate del file (la lente in due: lente e struttura)
function preparaSagome(radice, scatola) {
    centroFile = scatola.getCenter(new THREE.Vector3());
    radice.updateMatrixWorld(true);
    radice.children.forEach(function (gruppo) {
        const nome = gruppo.name.replace(/_/g, ' ');
        gruppo.traverse(function (o) {
            if (!o.isMesh) return;
            const copie = nome === 'LENTE'
                ? [['LENTE', materialeSagoma(1)], ['STRUTTURA', materialeSagoma(2)]]
                : [[nome, materialeSagoma(0)]];
            copie.forEach(function ([parte, materiale]) {
                const m = new THREE.Mesh(o.geometry, materiale);
                m.matrixAutoUpdate = false;
                m.matrix.copy(o.matrixWorld);
                scenaSagome.add(m);
                (sagome[parte] = sagome[parte] || []).push(m);
            });
        });
    });
}

// le tre viste: da dove guarda la camera e in che ordine si disegnano le parti (da dietro a davanti)
const LATO_FOGLIO = 0.18;       // ogni vista è un quadrato di 18 cm
const PIXEL = 1024;             // 1024 pixel per 18 cm: circa 0,18 mm per pixel
const VISTE_TAVOLA = {
    fronte: { titolo: 'PROSPETTO FRONTALE', direzione: [0, 0, 1], su: [0, 1, 0],
              ordine: ['STANGHETTA SX', 'STANGHETTA DX', 'LENTE', 'STRUTTURA'] },
    lato:   { titolo: 'PROSPETTO LATERALE', direzione: [-1, 0, 0], su: [0, 1, 0],
              ordine: ['STANGHETTA DX', 'LENTE', 'STRUTTURA', 'STANGHETTA SX'] },
    pianta: { titolo: 'PIANTA', direzione: [0, -1, 0], su: [0, 0, 1],
              ordine: ['LENTE', 'STANGHETTA SX', 'STANGHETTA DX', 'STRUTTURA'] }
};

// 1. la sagoma di una parte vista da una direzione → una griglia di 0 e 1
const bersaglio = new THREE.WebGLRenderTarget(PIXEL, PIXEL);
const pixel = new Uint8Array(PIXEL * PIXEL * 4);

function sagoma(vista, parte) {
    const cam = new THREE.OrthographicCamera(-LATO_FOGLIO / 2, LATO_FOGLIO / 2, LATO_FOGLIO / 2, -LATO_FOGLIO / 2, 0.01, 2);
    const d = new THREE.Vector3().fromArray(vista.direzione);
    cam.up.fromArray(vista.su);
    cam.position.copy(centroFile).addScaledVector(d, -1);
    cam.lookAt(centroFile);

    Object.entries(sagome).forEach(function ([nome, lista]) {
        lista.forEach(function (m) { m.visible = nome === parte; });
    });

    const coloreDiPrima = renderer.getClearColor(new THREE.Color());
    renderer.setRenderTarget(bersaglio);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scenaSagome, cam);
    renderer.readRenderTargetPixels(bersaglio, 0, 0, PIXEL, PIXEL, pixel);
    renderer.setRenderTarget(null);
    renderer.setClearColor(coloreDiPrima, 1);

    const griglia = new Uint8Array(PIXEL * PIXEL);
    for (let i = 0; i < PIXEL * PIXEL; i++) griglia[i] = pixel[i * 4] > 127 ? 1 : 0;
    return griglia;
}

// 2. marching squares: i contorni della griglia, come anelli chiusi di punti (in pixel)
function contorni(g) {
    const N = PIXEL;
    const v = function (i, j) { return (i < 0 || j < 0 || i >= N || j >= N) ? 0 : g[j * N + i]; };
    const vicini = new Map();           // punto → i due punti a cui è collegato
    const chiave = function (x, y) { return (x * 2 + 4) * 100000 + (y * 2 + 4); };
    function segmento(ax, ay, bx, by) {
        const a = chiave(ax, ay), b = chiave(bx, by);
        if (!vicini.has(a)) vicini.set(a, { x: ax, y: ay, l: [] });
        if (!vicini.has(b)) vicini.set(b, { x: bx, y: by, l: [] });
        vicini.get(a).l.push(b);
        vicini.get(b).l.push(a);
    }
    for (let j = -1; j < N; j++) {
        for (let i = -1; i < N; i++) {
            const caso = v(i, j) | (v(i + 1, j) << 1) | (v(i + 1, j + 1) << 2) | (v(i, j + 1) << 3);
            if (caso === 0 || caso === 15) continue;
            // i punti a metà dei 4 lati del quadratino
            const S = [i + 0.5, j], E = [i + 1, j + 0.5], N_ = [i + 0.5, j + 1], O = [i, j + 0.5];
            const coppie = {
                1: [[O, S]], 2: [[S, E]], 3: [[O, E]], 4: [[E, N_]], 5: [[O, N_], [S, E]],
                6: [[S, N_]], 7: [[O, N_]], 8: [[N_, O]], 9: [[S, N_]], 10: [[S, O], [N_, E]],
                11: [[E, N_]], 12: [[O, E]], 13: [[S, E]], 14: [[O, S]]
            }[caso];
            coppie.forEach(function ([a, b]) { segmento(a[0], a[1], b[0], b[1]); });
        }
    }
    // unisco i segmenti in anelli
    const anelli = [];
    const visti = new Set();
    vicini.forEach(function (punto, k) {
        if (visti.has(k)) return;
        const anello = [];
        let corrente = k, precedente = null;
        while (corrente !== undefined && !visti.has(corrente)) {
            visti.add(corrente);
            const p = vicini.get(corrente);
            anello.push([p.x, p.y]);
            const prossimo = p.l.find(function (n) { return n !== precedente && !visti.has(n); });
            precedente = corrente;
            corrente = prossimo;
        }
        if (anello.length > 8) anelli.push(anello);      // scarto i puntini isolati
    });
    return anelli;
}

// 3. semplifico un anello (Ramer-Douglas-Peucker): tengo solo i punti che cambiano la forma
function semplifica(punti, tolleranza) {
    if (punti.length < 3) return punti;
    let massimo = 0, indice = 0;
    const [ax, ay] = punti[0], [bx, by] = punti[punti.length - 1];
    const lunghezza = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = 1; i < punti.length - 1; i++) {
        const d = Math.abs((by - ay) * punti[i][0] - (bx - ax) * punti[i][1] + bx * ay - by * ax) / lunghezza;
        if (d > massimo) { massimo = d; indice = i; }
    }
    if (massimo <= tolleranza) return [punti[0], punti[punti.length - 1]];
    return semplifica(punti.slice(0, indice + 1), tolleranza).slice(0, -1)
        .concat(semplifica(punti.slice(indice), tolleranza));
}

// pixel → millimetri sul foglio (y verso il basso, come in SVG)
function mm(p) {
    const u = ((p[0] + 0.5) / PIXEL - 0.5) * LATO_FOGLIO * 1000;
    const w = ((p[1] + 0.5) / PIXEL - 0.5) * LATO_FOGLIO * 1000;
    return [u, -w];
}

// una vista: i path delle parti e i loro ingombri (in mm)
function vistaVettoriale(vista) {
    const parti = {};
    vista.ordine.forEach(function (parte) {
        const anelli = contorni(sagoma(vista, parte));
        let d = '';
        const ingombro = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
        anelli.forEach(function (anello) {
            // per semplificare un anello chiuso lo taglio in due nel punto più lontano dal primo
            let lontano = 0, dist = 0;
            anello.forEach(function (p, i) {
                const q = Math.hypot(p[0] - anello[0][0], p[1] - anello[0][1]);
                if (q > dist) { dist = q; lontano = i; }
            });
            const semplice = semplifica(anello.slice(0, lontano + 1), 0.6).slice(0, -1)
                .concat(semplifica(anello.slice(lontano).concat([anello[0]]), 0.6).slice(0, -1));
            semplice.forEach(function (p, i) {
                const [x, y] = mm(p);
                ingombro.x0 = Math.min(ingombro.x0, x); ingombro.x1 = Math.max(ingombro.x1, x);
                ingombro.y0 = Math.min(ingombro.y0, y); ingombro.y1 = Math.max(ingombro.y1, y);
                d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
            });
            d += 'Z';
        });
        parti[parte] = { d: d, ingombro: ingombro };
    });
    // l'ingombro di tutta la vista
    const tot = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    Object.values(parti).forEach(function (p) {
        tot.x0 = Math.min(tot.x0, p.ingombro.x0); tot.x1 = Math.max(tot.x1, p.ingombro.x1);
        tot.y0 = Math.min(tot.y0, p.ingombro.y0); tot.y1 = Math.max(tot.y1, p.ingombro.y1);
    });
    return { parti: parti, tot: tot };
}

// 4. le quote (in mm sul foglio)
function numero(n) { return String(Math.round(n)); }

function quotaOrizzontale(x0, x1, yOggetto, yQuota, testo) {
    const verso = yQuota > yOggetto ? 1 : -1;
    return '<line class="t-richiamo" x1="' + x0 + '" y1="' + yOggetto + '" x2="' + x0 + '" y2="' + (yQuota + verso * 2) + '"/>' +
           '<line class="t-richiamo" x1="' + x1 + '" y1="' + yOggetto + '" x2="' + x1 + '" y2="' + (yQuota + verso * 2) + '"/>' +
           '<line class="t-quota" x1="' + x0 + '" y1="' + yQuota + '" x2="' + x1 + '" y2="' + yQuota + '" marker-start="url(#t-freccia)" marker-end="url(#t-freccia)"/>' +
           '<text class="t-testo" x="' + ((x0 + x1) / 2) + '" y="' + (yQuota - 1.5) + '">' + testo + '</text>';
}

function quotaVerticale(y0, y1, xOggetto, xQuota, testo) {
    const verso = xQuota > xOggetto ? 1 : -1;
    const ym = (y0 + y1) / 2;
    return '<line class="t-richiamo" x1="' + xOggetto + '" y1="' + y0 + '" x2="' + (xQuota + verso * 2) + '" y2="' + y0 + '"/>' +
           '<line class="t-richiamo" x1="' + xOggetto + '" y1="' + y1 + '" x2="' + (xQuota + verso * 2) + '" y2="' + y1 + '"/>' +
           '<line class="t-quota" x1="' + xQuota + '" y1="' + y0 + '" x2="' + xQuota + '" y2="' + y1 + '" marker-start="url(#t-freccia)" marker-end="url(#t-freccia)"/>' +
           '<text class="t-testo" x="' + (xQuota - 1.5) + '" y="' + ym + '" transform="rotate(-90 ' + (xQuota - 1.5) + ' ' + ym + ')">' + testo + '</text>';
}

function disegnaTavola() {
    if (tavolaFatta || !sagome.LENTE) return;
    tavolaFatta = true;

    const V = {};
    Object.entries(VISTE_TAVOLA).forEach(function ([nome, vista]) { V[nome] = vistaVettoriale(vista); });

    // la posizione delle viste sul foglio: fronte in alto a sinistra, lato a destra, pianta sotto il fronte
    // (fronte e lato hanno la stessa altezza, fronte e pianta la stessa larghezza: sono allineate)
    const spazio = 34;
    const dxLato = V.fronte.tot.x1 - V.lato.tot.x0 + spazio + 12;
    const dyPianta = V.fronte.tot.y1 - V.pianta.tot.y0 + spazio + 10;

    function vista(nome, dx, dy, quote) {
        const v = V[nome];
        let g = '<g transform="translate(' + dx.toFixed(1) + ' ' + dy.toFixed(1) + ')">';
        VISTE_TAVOLA[nome].ordine.forEach(function (parte) {
            const classe = parte === 'LENTE' ? 't-parte t-lente' : 't-parte';
            g += '<path class="' + classe + '" fill-rule="evenodd" d="' + v.parti[parte].d + '"/>';
        });
        g += quote(v);
        g += '<text class="t-titolo" x="' + v.tot.x0 + '" y="' + (v.tot.y1 + (nome === 'pianta' ? 26 : 26)) + '">' + VISTE_TAVOLA[nome].titolo + '</text>';
        return g + '</g>';
    }

    let svg = '';
    // FRONTE: larghezza totale sotto, altezza a destra, larghezza della lente sopra
    svg += vista('fronte', 0, 0, function (v) {
        const t = v.tot, l = v.parti.LENTE.ingombro;
        return quotaOrizzontale(t.x0, t.x1, t.y1, t.y1 + 12, numero(t.x1 - t.x0)) +
               quotaVerticale(t.y0, t.y1, t.x1, t.x1 + 12, numero(t.y1 - t.y0)) +
               quotaOrizzontale(l.x0, l.x1, t.y0, t.y0 - 10, numero(l.x1 - l.x0)) +
               // il ponte (la curva per il naso): inventata, al centro sotto la lente
               quotaOrizzontale(-10, 10, l.y1 - 18, l.y1 - 6, '20*');
    });
    // LATO: profondità totale sotto, lunghezza stanghetta sopra, altezza della stanghetta a destra
    svg += vista('lato', dxLato, 0, function (v) {
        const t = v.tot, s = v.parti['STANGHETTA SX'].ingombro;
        return quotaOrizzontale(t.x0, t.x1, t.y1, t.y1 + 12, numero(t.x1 - t.x0)) +
               quotaOrizzontale(s.x0, s.x1, t.y0, t.y0 - 10, numero(s.x1 - s.x0)) +
               quotaVerticale(s.y0, s.y0 + 12, t.x1, t.x1 + 12, '12*');
    });
    // PIANTA: larghezza tra le stanghette sotto, profondità a destra, curvatura della lente
    svg += vista('pianta', 0, dyPianta, function (v) {
        const t = v.tot, sx = v.parti['STANGHETTA SX'].ingombro, dx = v.parti['STANGHETTA DX'].ingombro;
        const x0 = Math.min(sx.x0, dx.x0), x1 = Math.max(sx.x1, dx.x1);
        return quotaOrizzontale(x0, x1, t.y1, t.y1 + 12, numero(x1 - x0)) +
               quotaVerticale(t.y0, t.y1, t.x1, t.x1 + 12, numero(t.y1 - t.y0)) +
               // il raggio di curvatura della lente: inventato, con una linea di richiamo
               '<line class="t-quota" x1="' + (t.x0 + 20) + '" y1="' + (t.y1 - 3) + '" x2="' + (t.x0 + 8) + '" y2="' + (t.y1 + 9) + '"/>' +
               '<text class="t-testo" style="text-anchor: end" x="' + (t.x0 + 6) + '" y="' + (t.y1 + 13) + '">R 110*</text>';
    });

    // il foglio: cornice e cartiglio intorno a tutto
    const x0 = V.fronte.tot.x0 - 18, y0 = V.fronte.tot.y0 - 24;
    const x1 = dxLato + V.lato.tot.x1 + 26, y1 = dyPianta + V.pianta.tot.y1 + 36;
    svg = '<rect class="t-cornice" x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '"/>' + svg;
    const cx = dxLato + V.lato.tot.x0, cy = y1 - 30;
    svg += '<g class="t-cartiglio">' +
           '<rect x="' + cx + '" y="' + cy + '" width="' + (x1 - cx - 6) + '" height="24"/>' +
           '<text class="t-cartiglio-titolo" x="' + (cx + 4) + '" y="' + (cy + 9) + '">OCCHIALI IN PLASTICA</text>' +
           '<text x="' + (cx + 4) + '" y="' + (cy + 15.5) + '">Tavola 1 · tre viste · scala 1:1 · misure in mm</text>' +
           '<text x="' + (cx + 4) + '" y="' + (cy + 21) + '">* quota indicativa</text>' +
           '</g>';

    tavola.innerHTML =
        '<svg viewBox="' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' ' + (x1 - x0).toFixed(1) + ' ' + (y1 - y0).toFixed(1) + '"' +
        ' preserveAspectRatio="xMidYMid meet" role="img" aria-label="Tavola quotata degli occhiali: prospetto frontale, laterale e pianta">' +
        '<defs><marker id="t-freccia" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse"' +
        ' markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z"/></marker></defs>' +
        svg + '</svg>';
}


/* ===== 11. l'animazione ===== */
const destinazioneGruppo = new THREE.Vector3();

// disegno solo quando il visore si vede sullo schermo:
// la pagina ha due scene 3D e così non lavorano tutte e due insieme
let visoreVisibile = true;
new IntersectionObserver(function (voci) {
    visoreVisibile = voci[0].isIntersecting;
}).observe(visore);

function anima() {
    requestAnimationFrame(anima);
    if (!visoreVisibile) return;

    aggiornaStanghette(performance.now());

    if (giraDaSoli) {
        occhiali.rotation.y += 0.004;
    } else {
        // dopo un'inquadratura gli occhiali tornano dritti, piano
        occhiali.rotation.y += Math.atan2(Math.sin(-occhiali.rotation.y), Math.cos(-occhiali.rotation.y)) * 0.08;
    }

    // Esploso: ogni gruppo del file scivola verso la sua posizione
    Object.entries(gruppi).forEach(function ([nome, g]) {
        destinazioneGruppo.copy(SPOSTAMENTO_ESPLOSO[nome] || new THREE.Vector3())
            .multiplyScalar(esploso)
            .add(g.partenza);
        g.gruppo.position.lerp(destinazioneGruppo, 0.15);
    });

    // Inquadratura: la camera gira intorno agli occhiali fino alla destinazione
    if (destinazioneCamera) {
        const distanza = THREE.MathUtils.lerp(camera.position.length(), destinazioneCamera.length(), 0.08);
        camera.position.lerp(destinazioneCamera, 0.08).setLength(distanza);
        controlli.target.lerp(new THREE.Vector3(), 0.08);
        if (camera.position.distanceTo(destinazioneCamera) < 0.01) {
            destinazioneCamera = null;
        }
    }

    controlli.update();
    renderer.render(scena, camera);
}
anima();

window.addEventListener('resize', function () {
    camera.aspect = visore.clientWidth / visore.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(visore.clientWidth, visore.clientHeight);
});
