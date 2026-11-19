// forma-scroll.js – la pagina "CMF-1"
//
// Un solo canvas Three.js, fisso dietro a tutta la pagina. Gli occhiali hanno uno "stato"
// (posizione, rotazione, quanto sono chiuse le stanghette, quanto sono esplosi) e GSAP
// ScrollTrigger porta questo stato da una sezione all'altra mentre scorri, con scrub:
// è la stessa idea della demo di GreenSock con gli AirPods, ma con un modello 3D vero
// al posto della sequenza di immagini.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { apriProva } from './prova.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const riduciMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = document.getElementById('stage');
const caricamento = document.getElementById('stage-loading');
const finestraProva = document.getElementById('finestra-prova');


/* ===== 1. scena, camera, luci ===== */

const DISTANZA = 6;
const FOV = 30;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);

const scena = new THREE.Scene();
scena.background = new THREE.Color('#000000');   // le lenti trasparenti devono "vedere" il nero

const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, DISTANZA);

const pmrem = new THREE.PMREMGenerator(renderer);
scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scena.environmentIntensity = 0.55;

const luceChiave = new THREE.DirectionalLight(0xffffff, 2.4);
luceChiave.position.set(-3, 4, 5);
scena.add(luceChiave);
const luceBordo = new THREE.DirectionalLight(0xbfd8ff, 3.0);   // il filo di luce sul bordo, alla Apple
luceBordo.position.set(4, 2, -4);
scena.add(luceBordo);
const luceBordo2 = new THREE.DirectionalLight(0xffffff, 1.6);
luceBordo2.position.set(-4, -1, -3);
scena.add(luceBordo2);

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


/* ===== 2. lente e struttura: stessa geometria, due maschere =====
   Nel file la parte LENTE contiene sia il vetro sia la striscia del frontale.
   La disegno due volte: una copia tiene solo il vetro, l'altra solo la struttura
   (stessa regola usata in occhiali.js). */

const BORDO_SUPERIORE = [
    115.3, 115.3, 115.3, 115.3, 115.2, 115.2, 115.1, 115.0, 114.9, 114.8,
    114.6, 114.5, 114.3, 114.1, 113.9, 113.6, 113.4, 113.1, 112.8, 112.5,
    112.1, 111.7, 111.3, 110.9, 110.4, 109.8, 109.4, 108.6, 108.2, 107.2,
    106.7, 106.1, 104.9, 104.2, 102.7, 100.7, 97.6, 92.9, 86.6, 80.0, 80.0
];
const N = BORDO_SUPERIORE.length;

// maschera: 1 = solo lente, 2 = solo struttura
function conMaschera(materiale, maschera) {
    materiale.onBeforeCompile = function (shader) {
        shader.uniforms.uBordo = { value: BORDO_SUPERIORE };
        shader.vertexShader = 'varying vec3 vPosFile;\n' +
            shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPosFile = position;');
        shader.fragmentShader = 'varying vec3 vPosFile;\nuniform float uBordo[' + N + '];\n' +
            shader.fragmentShader.replace('#include <clipping_planes_fragment>', [
                '#include <clipping_planes_fragment>',
                'float u = min(abs(vPosFile.x * 1000.0 + 4.3) / 2.0, ' + (N - 1).toFixed(1) + ');',
                'int i0 = int(floor(u));',
                'int i1 = min(i0 + 1, ' + (N - 1) + ');',
                'float bordo = mix(uBordo[i0], uBordo[i1], fract(u));',
                'bool struttura = vPosFile.y * 1000.0 > bordo - 2.3 || vPosFile.z * 1000.0 > 2.5;',
                'if (struttura != ' + (maschera === 2 ? 'true' : 'false') + ') discard;'
            ].join('\n'));
    };
    materiale.customProgramCacheKey = function () { return 'forma-maschera-' + maschera; };
    return materiale;
}

const COLORE_INIZIALE = '#e9e8e3';
function plastica() {
    return new THREE.MeshPhysicalMaterial({
        color: COLORE_INIZIALE, roughness: 0.32, metalness: 0,
        clearcoat: 1, clearcoatRoughness: 0.06, side: THREE.DoubleSide
    });
}
const matStanghette = plastica();
const matStruttura = conMaschera(plastica(), 2);
const matLente = conMaschera(new THREE.MeshPhysicalMaterial({
    color: '#9aa6a8', transmission: 1, thickness: 0.002, ior: 1.523,
    roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
    side: THREE.DoubleSide
}), 1);


/* ===== 3. le parti, le cerniere e l'esploso (coordinate del file, in metri) ===== */

// spostamento di ogni parte con l'esploso al 100% (il davanti degli occhiali è verso -z)
const ESPLOSO = {
    'LENTE':         new THREE.Vector3(0, -0.004, -0.05),
    'STRUTTURA':     new THREE.Vector3(0, 0.012, -0.012),
    'STANGHETTA SX': new THREE.Vector3(0.05, 0, 0.035),
    'STANGHETTA DX': new THREE.Vector3(-0.05, 0, 0.035)
};
// le cerniere: asse del perno (sopra → sotto), verso di chiusura, angolo da chiuse
// da/a: in che parte della chiusura (0…1) si muove ogni stanghetta: prima la sinistra (SX, 88°,
// più vicina alla lente), poi la destra (DX, 78°) che si appoggia sopra senza attraversarla.
// Quando si aprono succede al contrario: prima la destra, poi la sinistra.
const CERNIERE = {
    'STANGHETTA SX': { sopra: new THREE.Vector3(0.06619, 0.10168, 0.01019), sotto: new THREE.Vector3(0.06486, 0.05605, 0.01019), verso: -1, angolo: 88, da: 0,   a: 0.5 },
    'STANGHETTA DX': { sopra: new THREE.Vector3(-0.07480, 0.10168, 0.01019), sotto: new THREE.Vector3(-0.07347, 0.05605, 0.01019), verso: 1, angolo: 78, da: 0.5, a: 1 }
};
Object.values(CERNIERE).forEach(function (c) { c.asse = c.sopra.clone().sub(c.sotto).normalize(); });

// dove si attaccano le etichette dell'esploso
const ANCORE = {
    'LENTE':         new THREE.Vector3(0.035, 0.075, -0.012),
    'STRUTTURA':     new THREE.Vector3(-0.03, 0.113, -0.014),
    'STANGHETTA SX': new THREE.Vector3(0.07, 0.07, 0.12),
    'STANGHETTA DX': new THREE.Vector3(-0.072, 0.07, 0.12)
};

const parti = {};       // nome → gruppo del file
const prodotto = new THREE.Group();     // quello che muove lo scroll
const orienta = new THREE.Group();      // girato di 180°: il frontale guarda la camera
const modello = new THREE.Group();      // centrato
orienta.rotation.y = Math.PI;
orienta.add(modello);
prodotto.add(orienta);
prodotto.visible = false;
scena.add(prodotto);

const LARGHEZZA = 2.4;  // larghezza degli occhiali nella scena
let misure = new THREE.Vector3();

const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _t = new THREE.Matrix4();
function applicaParti(chiusura, esploso) {
    Object.entries(parti).forEach(function ([nome, gruppo]) {
        const o = ESPLOSO[nome];
        _m.makeTranslation(o.x * esploso, o.y * esploso, o.z * esploso);
        const c = CERNIERE[nome];
        if (c) {
            // giro intorno all'asse del perno: T(perno) · R · T(-perno)
            _t.makeTranslation(c.sopra.x, c.sopra.y, c.sopra.z);
            _m.multiply(_t);
            _r.makeRotationAxis(c.asse, c.verso * THREE.MathUtils.degToRad(c.angolo) * THREE.MathUtils.smoothstep(chiusura, c.da, c.a));
            _m.multiply(_r);
            _t.makeTranslation(-c.sopra.x, -c.sopra.y, -c.sopra.z);
            _m.multiply(_t);
        }
        gruppo.matrix.copy(_m);
    });
}

new GLTFLoader().load('models/OCCHIALI_PLASTICA.glb', function (gltf) {
    const radice = gltf.scene;
    const scatola = new THREE.Box3().setFromObject(radice);
    misure = scatola.getSize(new THREE.Vector3());
    // il perno di tutti i movimenti è il centro della lente (non il centro della scatola,
    // che con le stanghette lunghe cadrebbe dietro il frontale)
    const gruppoLente = radice.children.find(function (g) { return g.name === 'LENTE'; }) || radice;
    modello.position.copy(new THREE.Box3().setFromObject(gruppoLente).getCenter(new THREE.Vector3())).negate();
    orienta.scale.setScalar(LARGHEZZA / misure.x);
    modello.add(radice);

    const struttura = new THREE.Group();
    struttura.name = 'STRUTTURA';

    radice.children.slice().forEach(function (gruppo) {
        const nome = gruppo.name.replace(/_/g, ' ');
        gruppo.traverse(function (o) {
            if (!o.isMesh) return;
            if (nome === 'LENTE') {
                o.material = matLente;
                const copia = new THREE.Mesh(o.geometry, matStruttura);
                copia.position.copy(o.position);
                copia.quaternion.copy(o.quaternion);
                copia.scale.copy(o.scale);
                struttura.add(copia);
            } else {
                o.material = matStanghette;
            }
        });
        if (ESPLOSO[nome]) parti[nome] = gruppo;
    });
    radice.add(struttura);
    parti['STRUTTURA'] = struttura;
    Object.values(parti).forEach(function (g) { g.matrixAutoUpdate = false; });

    caricamento.remove();
    prodotto.visible = true;
    preparaProva();
    avvia();
}, undefined, function (errore) {
    console.error(errore);
    caricamento.textContent = 'Non riesco a caricare models/OCCHIALI_PLASTICA.glb';
    caricamento.style.animation = 'none';
    mostraTestoHero(0);
});


/* ===== 4. lo stato degli occhiali e le "pose" di ogni sezione =====
   x, y: posizione sullo schermo (-1…1 della metà schermo); my: y su telefono
   z: avanti/indietro; rx, ry, rz: rotazione; s: scala
   chiusura: 0 aperte → 1 chiuse; esploso: 0 → 1; etichette: 0 → 1 */

// tra una posa e la successiva cambiano pochi gradi alla volta: niente giri bruschi
const POSE = {
    ingresso:    { x: 0,     y: 0.12,  my: 0.22, z: -9,   rx: 0.7,  ry: -4.6,  rz: 0.35, s: 1,    chiusura: 1, esploso: 0, etichette: 0 },
    hero:        { x: 0,     y: 0.14,  my: 0.22, z: 0,    rx: 0.16, ry: -0.42, rz: 0,    s: 1.12, chiusura: 0, esploso: 0, etichette: 0 },
    fronte:      { x: 0.44,  y: 0.02,  my: 0.42, z: 0.6,  rx: 0.08, ry: -0.12, rz: 0,    s: 1,    chiusura: 0, esploso: 0, etichette: 0 },
    cerniere:    { x: -0.42, y: 0.0,   my: 0.42, z: 0.5,  rx: 0.26, ry: -0.95, rz: 0.03, s: 1,    chiusura: 1, esploso: 0, etichette: 0 },
    colore:      { x: 0.42,  y: 0.02,  my: 0.42, z: 0.4,  rx: 0.3,  ry: 0.3,   rz: -0.05, s: 0.98, chiusura: 0, esploso: 0, etichette: 0 },
    esploso0:    { x: -0.1,  y: -0.08, my: 0.02, z: -0.2, rx: 0.36, ry: -0.45, rz: 0,    s: 0.72, chiusura: 0, esploso: 0, etichette: 0 },
    esploso1:    { x: -0.12, y: -0.08, my: 0.02, z: -0.6, rx: 0.4,  ry: -0.85, rz: 0,    s: 0.72, chiusura: 0, esploso: 1, etichette: 1 },
    esplosoFine: { x: -0.12, y: -0.08, my: 0.02, z: -0.6, rx: 0.4,  ry: -1.05, rz: 0,    s: 0.72, chiusura: 0, esploso: 1, etichette: 1 },
    prova:       { x: 0,     y: 0.36,  my: 0.38, z: -0.6, rx: 0.1,  ry: -0.2,  rz: 0,    s: 1,    chiusura: 0, esploso: 0, etichette: 0 }
};
const stato = { ...POSE.ingresso, arco: 0 };
// quello che si vede: insegue "stato" con un ammortizzatore, così ogni movimento è morbido
const vista = { ...stato };

// segue un po' il mouse (solo un accenno)
const mouse = { x: 0, y: 0, lx: 0, ly: 0 };
window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
});


/* ===== 5. le animazioni ===== */

function mostraTestoHero(ritardo) {
    gsap.to('.hero-copy > *', { opacity: 1, y: 0, duration: 1.6, stagger: 0.18, ease: 'power2.out', delay: ritardo });
    gsap.to('.scroll-cue', { opacity: 1, duration: 1, delay: ritardo + 0.6 });
}

function avvia() {
    // a) l'ingresso: entra girando, si ferma, apre le stanghette, poi compare il nome
    gsap.set('.hero-copy > *', { y: 30 });
    if (riduciMovimento || window.scrollY > 40) {
        Object.assign(stato, POSE.hero);
        Object.assign(vista, stato);
        mostraTestoHero(0);
    } else {
        const intro = gsap.timeline({ delay: 0.15 });
        intro.to(stato, { z: 0, y: POSE.hero.y, my: POSE.hero.my, rx: POSE.hero.rx, ry: POSE.hero.ry, rz: 0, s: POSE.hero.s, duration: 2.8, ease: 'power3.out' })
             .to(stato, { chiusura: 0, duration: 1.3, ease: 'power2.inOut' }, '-=1.1')
             .add(function () { mostraTestoHero(0); }, '-=0.5');
        // se l'utente scorre durante l'ingresso, l'ingresso finisce subito
        ScrollTrigger.create({ start: 30, onEnter: function () { if (intro.isActive()) intro.progress(1); } });
    }

    // b) il nome sparisce quando si scende
    gsap.to('.hero-fade', {
        opacity: 0, y: -50, ease: 'sine.in',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: 1.5 }
    });

    // c) da una posa all'altra, legato allo scroll.
    //    "giro" inclina l'occhiale sull'asse orizzontale a metà passaggio (avanti o indietro)
    //    e poi lo riporta dritto: il movimento disegna un arco invece di una linea.
    function passaggio(da, a, trigger, giro, start, end) {
        const tl = gsap.timeline({
            scrollTrigger: { trigger: trigger, start: start || 'top bottom', end: end || 'center center', scrub: 2.5 }
        });
        tl.fromTo(stato, { ...POSE[da] }, { ...POSE[a], duration: 1, ease: 'sine.inOut', immediateRender: false }, 0)
          .fromTo(stato, { arco: 0 }, { arco: giro, duration: 0.5, ease: 'sine.inOut', immediateRender: false }, 0)
          .to(stato, { arco: 0, duration: 0.5, ease: 'sine.inOut' }, 0.5);
    }
    passaggio('hero', 'fronte', '#fronte', 0.55, 'top 95%');
    passaggio('fronte', 'cerniere', '#cerniere', -0.5);
    passaggio('cerniere', 'colore', '#colore', 0.5);
    passaggio('colore', 'esploso0', '#esploso', -0.4, 'top bottom', 'top top');

    // d) l'esploso: la sezione resta ferma mentre lo scroll smonta gli occhiali
    const didascalia = document.getElementById('esploso-caption');
    const frasi = ['Continua a scorrere', 'Quattro parti, nessuna vite in vista.', 'Lente in vetro ottico, frontale e stanghette in plastica.'];
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '#esploso', start: 'top top', end: '+=250%', pin: true, scrub: 2.5,
            onUpdate: function (st) {
                const i = st.progress < 0.3 ? 0 : st.progress < 0.7 ? 1 : 2;
                if (didascalia.dataset.i !== String(i)) {
                    didascalia.dataset.i = i;
                    gsap.to(didascalia, { opacity: 0, y: 10, duration: 0.45, ease: 'sine.in', overwrite: true, onComplete: function () {
                        didascalia.textContent = frasi[i];
                        gsap.to(didascalia, { opacity: 1, y: 0, duration: 0.8, ease: 'sine.out' });
                    } });
                }
            }
        }
    });
    tl.fromTo(stato, { ...POSE.esploso0 }, { ...POSE.esploso1, etichette: 0, duration: 0.65, ease: 'power2.inOut', immediateRender: false })
      .to(stato, { etichette: 1, duration: 0.15, ease: 'none' }, 0.5)
      .to(stato, { ry: POSE.esplosoFine.ry, duration: 0.35, ease: 'none' }, 0.65);

    // e) verso la prova: si rimontano e salgono sopra il bottone
    passaggio('esplosoFine', 'prova', '#prova', 0.45, 'top bottom', 'center center');

    // f) i testi entrano salendo e restano sempre nitidi e pieni:
    //    l'animazione parte quando il testo entra e arriva sempre alla fine (non dipende da quanto scorri)
    gsap.utils.toArray('.reveal').forEach(function (el) {
        gsap.from(el, {
            opacity: 0, y: 30, duration: 1.1, ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none reverse' }
        });
    });
    // quando una row se ne va, il testo scorre via normalmente con la pagina (nessuna dissolvenza)

    ScrollTrigger.refresh();
}


/* ===== 6. i colori ===== */

// due gruppi di campioni: montatura (stanghette + frontale) e lenti
document.querySelectorAll(".swatches").forEach(function (gruppo) {
    const bottoni = gruppo.querySelectorAll(".swatch");
    const nome = gruppo.querySelector(".swatch-name");
    const lente = gruppo.dataset.target === "lente";
    bottoni.forEach(function (bottone) {
        bottone.addEventListener("click", function () {
            bottoni.forEach(function (b) {
                b.classList.toggle("selected", b === bottone);
                b.setAttribute("aria-checked", b === bottone ? "true" : "false");
            });
            nome.textContent = bottone.dataset.nome;
            const c = new THREE.Color(bottone.dataset.colore);
            const materiali = lente ? [matLente] : [matStanghette, matStruttura];
            materiali.forEach(function (m) {
                gsap.to(m.color, { r: c.r, g: c.g, b: c.b, duration: 0.8, ease: "power2.out" });
            });
            if (!lente) {
                // le finiture scure hanno bisogno di un po' più di riflesso per staccarsi dal nero
                const scura = c.getHSL({}).l < 0.25;
                materiali.forEach(function (m) { gsap.to(m, { roughness: scura ? 0.18 : 0.32, duration: 0.8 }); });
            }
        });
    });
});


/* ===== 7. la prova con la fotocamera (js/prova.js) ===== */

function preparaProva() {
    const bottone = document.getElementById('bottone-prova');
    bottone.disabled = false;
    bottone.addEventListener('click', function () {
        // una copia degli occhiali montati, con il frontale verso +z (come vuole prova.js)
        applicaParti(0, 0);
        modello.updateMatrixWorld(true);
        const perProva = new THREE.Group();
        perProva.add(orienta.clone(true));
        applicaParti(stato.chiusura, stato.esploso);
        apriProva(perProva, misure, 'cmf-1');
    });
}


/* ===== 8. il disegno di ogni fotogramma ===== */

const etichette = Array.from(document.querySelectorAll(".tag"));
const livelloEtichette = document.getElementById("tags");
const _v = new THREE.Vector3();
let ultimoFotogramma = performance.now();
const _scatola = new THREE.Box3();
const _angolo = new THREE.Vector3();

// per ogni etichetta: una linea (SVG) e un punto sul pezzo
const svgNS = "http://www.w3.org/2000/svg";
const svgLinee = document.createElementNS(svgNS, "svg");
svgLinee.setAttribute("class", "tags-lines");
livelloEtichette.prepend(svgLinee);
etichette.forEach(function (el) {
    el.linea = document.createElementNS(svgNS, "line");
    svgLinee.appendChild(el.linea);
    el.punto = document.createElement("span");
    el.punto.className = "tag-dot";
    livelloEtichette.appendChild(el.punto);
});

// le etichette NON stanno sopra il modello: due colonne, a sinistra e a destra
// del suo ingombro sullo schermo, collegate al pezzo da una linea sottile
function posizionaEtichette() {
    const W = window.innerWidth, H = window.innerHeight;
    const margine = Math.max(W * 0.05, 16);

    // l'ingombro del modello sullo schermo (gli 8 angoli della scatola, proiettati)
    _scatola.setFromObject(prodotto);
    let sinistra = Infinity, destra = -Infinity;
    for (let i = 0; i < 8; i++) {
        _angolo.set(i & 1 ? _scatola.max.x : _scatola.min.x, i & 2 ? _scatola.max.y : _scatola.min.y, i & 4 ? _scatola.max.z : _scatola.min.z).project(camera);
        const x = (_angolo.x * 0.5 + 0.5) * W;
        sinistra = Math.min(sinistra, x);
        destra = Math.max(destra, x);
    }

    const voci = etichette.map(function (el) {
        _v.copy(ANCORE[el.dataset.parte]).applyMatrix4(parti[el.dataset.parte].matrixWorld).project(camera);
        return { el: el, px: (_v.x * 0.5 + 0.5) * W, py: (-_v.y * 0.5 + 0.5) * H, w: el.offsetWidth, h: el.offsetHeight };
    });
    // le due più a sinistra vanno nella colonna di sinistra, le altre a destra
    voci.sort(function (a, b) { return a.px - b.px; });
    voci.forEach(function (v, i) { v.lato = i < voci.length / 2 ? "sx" : "dx"; });

    ["sx", "dx"].forEach(function (lato) {
        const colonna = voci.filter(function (v) { return v.lato === lato; }).sort(function (a, b) { return a.py - b.py; });
        let ultima = -Infinity;
        colonna.forEach(function (v) {
            v.y = Math.min(Math.max(v.py, ultima + v.h + 22, H * 0.3), H * 0.82);
            ultima = v.y;
        });
    });

    voci.forEach(function (v) {
        const x = v.lato === "sx"
            ? Math.max(margine, sinistra - 48 - v.w)
            : Math.min(W - margine - v.w, destra + 48);
        v.el.style.textAlign = v.lato === "sx" ? "right" : "left";
        v.el.style.transform = "translate(" + x + "px," + (v.y - v.h / 2) + "px)";
        const xLinea = v.lato === "sx" ? x + v.w + 12 : x - 12;
        v.el.linea.setAttribute("x1", xLinea);
        v.el.linea.setAttribute("y1", v.y);
        v.el.linea.setAttribute("x2", v.px);
        v.el.linea.setAttribute("y2", v.py);
        v.el.punto.style.transform = "translate(" + (v.px - 4.5) + "px," + (v.py - 4.5) + "px)";
    });
}

function disegna(adesso) {
    requestAnimationFrame(disegna);
    // l'ammortizzatore: ogni valore si avvicina a quello voluto, indipendentemente dagli fps
    const dt = Math.min((adesso - ultimoFotogramma) / 1000, 0.1) || 0.016;
    ultimoFotogramma = adesso;
    const segui = 1 - Math.exp(-dt * 3);
    for (const k in stato) vista[k] += (stato[k] - vista[k]) * segui;

    if (finestraProva.open || !prodotto.visible) return;   // durante la prova lavora solo prova.js

    const mezzaAltezza = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * DISTANZA;
    const mezzaLarghezza = mezzaAltezza * camera.aspect;
    const telefono = camera.aspect < 0.85;
    // su schermi stretti rimpicciolisco per farli stare in larghezza
    const adatta = Math.min(1, (mezzaLarghezza * 1.75) / LARGHEZZA);

    mouse.lx += (mouse.x - mouse.lx) * 0.05;
    mouse.ly += (mouse.y - mouse.ly) * 0.05;

    // l'arco: inclinazione sull'asse orizzontale (x), un po' su e un po' indietro
    const arco = vista.arco;
    prodotto.position.set(
        telefono ? 0 : vista.x * mezzaLarghezza,
        (telefono ? vista.my : vista.y) * mezzaAltezza + arco * 0.1,
        vista.z - Math.abs(arco) * 0.4
    );
    prodotto.rotation.set(vista.rx + arco * 0.35 + mouse.ly * 0.12, vista.ry + mouse.lx * 0.25, vista.rz);
    prodotto.scale.setScalar(vista.s * adatta);
    applicaParti(vista.chiusura, vista.esploso);
    scena.updateMatrixWorld();

    // le etichette seguono i pezzi
    livelloEtichette.style.opacity = vista.etichette;
    if (vista.etichette > 0.01 && getComputedStyle(livelloEtichette).display !== "none") posizionaEtichette();

    renderer.render(scena, camera);
}
requestAnimationFrame(disegna);
