// forma-apple.js – la pagina "CMF-1" (index4), con la struttura di una pagina prodotto Apple.
// Parte da forma-scroll.js (index3) e aggiunge: le card dei punti chiave in 3D dal vivo,
// il carosello dei punti chiave e i numeri che contano quando entrano nello schermo.
//
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

// quando ricarichi, la pagina riparte sempre dall'inizio (con l'animazione d'ingresso):
// il browser non deve ricordare dove eri, e tolgo l'eventuale #sezione dall'indirizzo
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
window.scrollTo(0, 0);
ScrollTrigger.clearScrollMemory('manual');

// scroll morbido (Lenis): la rotellina e il trackpad non fanno più scatti.
// Lenis avvisa ScrollTrigger a ogni movimento e gira sullo stesso orologio di GSAP.
const lenis = (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    ? new window.Lenis({ duration: 1.25, easing: function (t) { return 1 - Math.pow(1 - t, 4); }, smoothWheel: true })
    : null;
if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (tempo) { lenis.raf(tempo * 1000); });
    gsap.ticker.lagSmoothing(0);
}

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
// mappa: le parti di quale occhiale (quello grande della pagina, o la copia di una card)
function applicaParti(chiusura, esploso, mappa) {
    Object.entries(mappa || parti).forEach(function ([nome, gruppo]) {
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
    preparaGalleria();
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
    fronte:      { x: 0.54,  y: 0.02,  my: 0.5 , z: 0,    rx: 0.08, ry: -0.12, rz: 0,    s: 0.82, chiusura: 0, esploso: 0, etichette: 0 },
    cerniere:    { x: -0.56, y: 0.0,   my: 0.5 , z: 0,    rx: 0.26, ry: -0.7,  rz: 0.03, s: 0.8,  chiusura: 1, esploso: 0, etichette: 0 },
    colore:      { x: 0.54,  y: 0.02,  my: 0.5 , z: 0,    rx: 0.3,  ry: 0.3,   rz: -0.05, s: 0.8, chiusura: 0, esploso: 0, etichette: 0 },
    esploso0:    { x: -0.1,  y: -0.08, my: 0.02, z: -0.2, rx: 0.36, ry: -0.45, rz: 0,    s: 0.72, chiusura: 0, esploso: 0, etichette: 0 },
    esploso1:    { x: -0.12, y: -0.08, my: 0.02, z: -0.6, rx: 0.4,  ry: -0.85, rz: 0,    s: 0.72, chiusura: 0, esploso: 1, etichette: 1 },
    esplosoFine: { x: -0.12, y: -0.08, my: 0.02, z: -0.6, rx: 0.4,  ry: -1.05, rz: 0,    s: 0.72, chiusura: 0, esploso: 1, etichette: 1 },
    prova:       { x: 0,     y: 0.44,  my: 0.4,  z: -0.6, rx: 0.1,  ry: -0.2,  rz: 0,    s: 0.8,  chiusura: 0, esploso: 0, etichette: 0 },
    provaFuori:  { x: 0,     y: 1.5,   my: 1.6,  z: -0.6, rx: 0.1,  ry: -0.2,  rz: 0,    s: 0.8,  chiusura: 0, esploso: 0, etichette: 0 }
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
    gsap.to('.hero-copy > :not(.hero-links)', { opacity: 1, y: 0, duration: 1.6, stagger: 0.18, ease: 'power2.out', delay: ritardo });
    gsap.to('.scroll-cue', { opacity: 1, duration: 1, delay: ritardo + 0.6 });
}

function avvia() {
    // a) l'ingresso: entra girando, si ferma, apre le stanghette, poi compare il nome
    gsap.set('.hero-copy > :not(.hero-links)', { y: 30 });
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
        return tl;
    }
    passaggio('hero', 'fronte', '#fronte', 0.55, 'top 95%');
    // da un lato all'altro dello schermo: l'occhiale esce dal suo lato e rientra da quello opposto,
    // così non passa sopra ai testi. Nel primo tratto esce girando un po', a metà (fuori schermo)
    // salta dall'altra parte, nel secondo tratto entra e si ferma nella posa nuova.
    function passaggioLaterale(da, a, trigger) {
        const A = POSE[da], B = POSE[a];
        const uscita = A.x > 0 ? 1.9 : -1.9;          // fuori dallo schermo, dal lato in cui si trova
        const entrata = -uscita;                       // rientra dal lato opposto
        const giro = A.x > 0 ? 0.6 : -0.6;
        const tl = gsap.timeline({
            scrollTrigger: { trigger: trigger, start: 'top bottom', end: 'center center', scrub: 2.5 }
        });
        tl.fromTo(stato, { ...A, arco: 0 }, { ...A, x: uscita, ry: A.ry + giro, z: A.z - 0.4, duration: 0.5, ease: 'sine.in', immediateRender: false }, 0)
          .fromTo(stato, { ...B, x: entrata, ry: B.ry + giro, z: B.z - 0.4, chiusura: A.chiusura, arco: 0 },
                         { ...B, duration: 0.5, ease: 'sine.out', immediateRender: false }, 0.5);
        return tl;
    }
    passaggioLaterale('fronte', 'cerniere', '#cerniere');   // esce a destra, entra da sinistra
    passaggioLaterale('cerniere', 'colore', '#colore');     // esce a sinistra, entra da destra
    passaggio('colore', 'esploso0', '.numeri', -0.4, 'top bottom', 'bottom top');   // avviene dietro a "Ha tutti i numeri"

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
    passaggio('esplosoFine', 'prova', '#prova', 0.45, 'top bottom', 'center center')
        .to(stato, { etichette: 0, duration: 0.2, ease: 'none' }, 0);   // le etichette se ne vanno subito

    // f0) scendendo verso le specifiche l'occhiale sale ed esce, insieme al testo
    passaggio('prova', 'provaFuori', '#prova', 0, 'center center', 'bottom top');

    // f) i testi entrano salendo e restano sempre nitidi e pieni:
    //    l'animazione parte quando il testo entra e arriva sempre alla fine (non dipende da quanto scorri)
    gsap.utils.toArray('.reveal').forEach(function (el) {
        gsap.from(el, {
            opacity: 0, y: 30, duration: 1.1, ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none reverse' }
        });
    });
    // quando una row se ne va, il testo scorre via normalmente con la pagina (nessuna dissolvenza)

    preparaNavigazione();   // dopo l'esploso pinnato, così le posizioni tengono conto della pausa
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

// mette gli occhiali nella posa "v" per uno schermo di proporzioni "aspetto"
function posizionaProdotto(v, aspetto, m) { posizionaSu(prodotto, parti, v, aspetto, m); }

// lo stesso, per un occhiale qualsiasi (serve anche alle card dei punti chiave)
function posizionaSu(oggetto, mappa, v, aspetto, m) {
    const mezzaAltezza = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * DISTANZA;
    const mezzaLarghezza = mezzaAltezza * aspetto;
    const telefono = aspetto < 0.85;
    // su schermi stretti rimpicciolisco per farli stare in larghezza
    const adatta = Math.min(1, (mezzaLarghezza * 1.75) / LARGHEZZA);
    // l'arco: inclinazione sull'asse orizzontale (x), un po' su e un po' indietro
    const arco = v.arco || 0;
    oggetto.position.set(
        (telefono ? Math.sign(v.x) * Math.max(0, Math.abs(v.x) - 0.6) / 1.3 * 1.9 : v.x) * mezzaLarghezza,
        (telefono ? v.my : v.y) * mezzaAltezza + arco * 0.1,
        v.z - Math.abs(arco) * 0.4
    );
    oggetto.rotation.set(v.rx + arco * 0.35 + (m ? m.ly * 0.12 : 0), v.ry + (m ? m.lx * 0.25 : 0), v.rz);
    oggetto.scale.setScalar(v.s * adatta);
    applicaParti(v.chiusura, v.esploso, mappa);
}


/* ===== 9. i punti chiave in 3D, dal vivo =====
   Sopra il carosello c'è un secondo canvas 3D, trasparente e fisso sullo schermo.
   Ogni card ha il suo occhiale (una copia del modello, con i suoi colori): a ogni
   fotogramma lo disegno solo nel rettangolo della card (scissor), dovunque la card sia,
   anche mentre scorre nel carosello. Quando il carosello non si vede, non disegno niente. */

const CARD_3D = {
    linea:    { posa: { x: 0,    y: -0.04, z: 1.5, rx: 0.06,  ry: 0,     rz: 0,    s: 1,    chiusura: 0, esploso: 0 }, montatura: '#e9e8e3', lente: '#9aa6a8', anima: 'oscilla' },
    cerniere: { posa: { x: -0.08, y: -0.04, z: 0.9, rx: 0.3,  ry: -1.0,  rz: 0.04, s: 1,    chiusura: 0, esploso: 0 }, montatura: '#9a4a1a', lente: '#9aa6a8', anima: 'cerniere' },
    lenti:    { posa: { x: 0,    y: -0.04, z: 1.6, rx: 0.12,  ry: 0.35,  rz: 0,    s: 1,    chiusura: 0, esploso: 0 }, montatura: '#e9e8e3', lente: '#5f8fd0', anima: 'oscilla' },
    finiture: { posa: { x: 0,    y: -0.02, z: 1.2, rx: 0.85,  ry: -0.3,  rz: 0,    s: 1,    chiusura: 0, esploso: 0 }, montatura: '#1f3160', lente: '#9aa6a8', anima: 'colori' },
    esploso:  { posa: { x: -0.2, y: -0.02, z: 0.2, rx: 0.4,   ry: -0.85, rz: 0,    s: 0.85, chiusura: 0, esploso: 0 }, montatura: '#e9e8e3', lente: '#9aa6a8', anima: 'esploso' },
    prova:    { posa: { x: 0,    y: -0.04, z: 1.6, rx: -0.08, ry: 0.22,  rz: 0,    s: 1,    chiusura: 0, esploso: 0 }, montatura: '#e9e8e3', lente: '#f0a0b4', anima: 'oscilla' }
};
// la card "Quattro finiture" passa da un colore all'altro
const GIRO_FINITURE = ['#1f3160', '#9a4a1a', '#141416', '#e9e8e3'].map(function (c) { return new THREE.Color(c); });

function nuovaLente() {
    return conMaschera(new THREE.MeshPhysicalMaterial({
        color: '#9aa6a8', transmission: 1, thickness: 0.002, ior: 1.523,
        roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide
    }), 1);
}
function ruviditaPer(colore) { return colore.getHSL({}).l < 0.25 ? 0.18 : 0.32; }

let galleria = null;

function preparaGalleria() {
    const viste = Array.from(document.querySelectorAll('.card-vista[data-vista]'));
    const sezione = document.getElementById('punti-chiave');
    if (!viste.length || !sezione) return;

    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setSize(window.innerWidth, window.innerHeight);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = renderer.toneMappingExposure;
    r.setClearColor(0x000000, 0);
    r.domElement.className = 'galleria-3d';
    r.domElement.setAttribute('aria-hidden', 'true');
    document.body.appendChild(r.domElement);
    window.addEventListener('resize', function () { r.setSize(window.innerWidth, window.innerHeight); });

    // la scena delle card: stesse luci della pagina, fondo grigio come le card
    const sc = new THREE.Scene();
    sc.background = new THREE.Color('#101012');
    sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    sc.environmentIntensity = scena.environmentIntensity;
    [luceChiave, luceBordo, luceBordo2].forEach(function (l) { sc.add(l.clone()); });
    const cam = new THREE.PerspectiveCamera(FOV, 1.5, 0.1, 100);
    cam.position.set(0, 0, DISTANZA);

    // per ogni card: una copia del modello montato, con materiali suoi
    applicaParti(0, 0);
    const card = viste.map(function (el) {
        const conf = CARD_3D[el.dataset.vista];
        const gruppo = new THREE.Group();
        const copia = orienta.clone(true);
        gruppo.add(copia);
        const mat = { stanghette: plastica(), struttura: conMaschera(plastica(), 2), lente: nuovaLente() };
        const mappa = {};
        copia.traverse(function (o) {
            const nome = (o.name || '').replace(/_/g, ' ');
            if (ESPLOSO[nome]) mappa[nome] = o;
        });
        Object.entries(mappa).forEach(function ([nome, g]) {
            g.traverse(function (o) {
                if (o.isMesh) o.material = nome === 'LENTE' ? mat.lente : nome === 'STRUTTURA' ? mat.struttura : mat.stanghette;
            });
        });
        const montatura = new THREE.Color(conf.montatura);
        [mat.stanghette, mat.struttura].forEach(function (m) { m.color.copy(montatura); m.roughness = ruviditaPer(montatura); });
        mat.lente.color.set(conf.lente);
        gruppo.visible = false;
        sc.add(gruppo);
        return { el: el, conf: conf, gruppo: gruppo, mappa: mappa, mat: mat };
    });

    galleria = { r: r, sc: sc, cam: cam, card: card, sezione: sezione, vuoto: false };
}

const _colore = new THREE.Color();

function disegnaGalleria(adesso) {
    if (!galleria) return;
    const g = galleria, W = window.innerWidth, H = window.innerHeight;
    const zona = g.sezione.getBoundingClientRect();
    if (zona.bottom < 0 || zona.top > H) {             // il carosello non si vede: canvas vuoto e fermo
        if (!g.vuoto) { g.r.setScissorTest(false); g.r.setClearColor(0x000000, 0); g.r.clear(); g.vuoto = true; }
        return;
    }
    g.vuoto = false;
    const t = adesso / 1000;
    // tutto trasparente fuori dalle card (il colore di cancellazione va rimesso ogni volta:
    // disegnando una card, three.js lo lascia sul grigio dello sfondo)
    g.r.setScissorTest(false);
    g.r.setClearColor(0x000000, 0);
    g.r.clear();
    g.r.setScissorTest(true);

    g.card.forEach(function (c, i) {
        const b = c.el.getBoundingClientRect();
        if (b.bottom < 0 || b.top > H || b.right < 0 || b.left > W || b.width < 2) return;

        // l'animazione propria di ogni card (sfasata, così non si muovono tutte insieme)
        const v = { ...c.conf.posa };
        const fase = t + i * 1.3;
        if (c.conf.anima === 'oscilla') v.ry += Math.sin(fase * 0.6) * 0.35;
        if (c.conf.anima === 'cerniere') { v.chiusura = 0.5 - 0.5 * Math.cos(fase * 0.9); v.ry += Math.sin(fase * 0.3) * 0.15; }
        if (c.conf.anima === 'esploso') { v.esploso = 0.5 - 0.5 * Math.cos(fase * 0.8); v.ry += Math.sin(fase * 0.3) * 0.2; }
        if (c.conf.anima === 'colori') {
            const giro = t / 2.6, n = GIRO_FINITURE.length;
            const k = Math.floor(giro) % n;
            _colore.copy(GIRO_FINITURE[k]).lerp(GIRO_FINITURE[(k + 1) % n], THREE.MathUtils.smoothstep(giro % 1, 0.55, 1));
            [c.mat.stanghette, c.mat.struttura].forEach(function (m) { m.color.copy(_colore); m.roughness = ruviditaPer(_colore); });
            v.ry += Math.sin(fase * 0.5) * 0.3;
        }

        const aspetto = b.width / b.height;
        c.gruppo.visible = true;
        posizionaSu(c.gruppo, c.mappa, v, aspetto, null);
        g.cam.aspect = aspetto;
        g.cam.updateProjectionMatrix();
        const y = H - b.bottom;                         // WebGL conta dal basso
        g.r.setViewport(b.left, y, b.width, b.height);
        g.r.setScissor(b.left, y, b.width, b.height);
        g.r.render(g.sc, g.cam);
        c.gruppo.visible = false;
    });
}

function disegna(adesso) {
    requestAnimationFrame(disegna);
    // l'ammortizzatore: ogni valore si avvicina a quello voluto, indipendentemente dagli fps
    const dt = Math.min((adesso - ultimoFotogramma) / 1000, 0.1) || 0.016;
    ultimoFotogramma = adesso;
    const segui = 1 - Math.exp(-dt * 3);
    for (const k in stato) vista[k] += (stato[k] - vista[k]) * segui;
    if (Math.abs(stato.x - vista.x) > 2) { vista.x = stato.x; vista.ry = stato.ry; }   // salto fuori schermo: niente scia

    if (finestraProva.open || !prodotto.visible) return;   // durante la prova lavora solo prova.js

    mouse.lx += (mouse.x - mouse.lx) * 0.05;
    mouse.ly += (mouse.y - mouse.ly) * 0.05;
    posizionaProdotto(vista, camera.aspect, mouse);
    scena.updateMatrixWorld();

    // le etichette seguono i pezzi
    livelloEtichette.style.opacity = vista.etichette;
    if (vista.etichette > 0.01 && getComputedStyle(livelloEtichette).display !== "none") posizionaEtichette();

    renderer.render(scena, camera);
    disegnaGalleria(adesso);
}
requestAnimationFrame(disegna);


/* ===== 10. il carosello dei punti chiave ===== */

(function () {
    const traccia = document.getElementById('galleria-traccia');
    if (!traccia) return;
    const card = Array.from(traccia.querySelectorAll('.card'));
    const punti = document.getElementById('galleria-punti');
    const prima = document.getElementById('galleria-prima');
    const dopo = document.getElementById('galleria-dopo');
    let attiva = 0;

    const bottoni = card.map(function (c, i) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-label', c.querySelector('h3').textContent);
        b.addEventListener('click', function () { vaiA(i); });
        punti.appendChild(b);
        return b;
    });

    function vaiA(i) {
        i = Math.max(0, Math.min(card.length - 1, i));
        const inizio = parseFloat(getComputedStyle(traccia).scrollPaddingInlineStart) || 0;
        traccia.scrollTo({ left: card[i].offsetLeft - inizio, behavior: riduciMovimento ? 'auto' : 'smooth' });
    }

    function aggiorna() {
        const inizio = parseFloat(getComputedStyle(traccia).scrollPaddingInlineStart) || 0;
        let migliore = 0, distanza = Infinity;
        card.forEach(function (c, i) {
            const d = Math.abs(c.offsetLeft - inizio - traccia.scrollLeft);
            if (d < distanza) { distanza = d; migliore = i; }
        });
        attiva = migliore;
        bottoni.forEach(function (b, i) { b.setAttribute('aria-selected', i === attiva ? 'true' : 'false'); });
        prima.disabled = traccia.scrollLeft < 4;
        dopo.disabled = traccia.scrollLeft > traccia.scrollWidth - traccia.clientWidth - 4;
    }

    prima.addEventListener('click', function () { vaiA(attiva - 1); });
    dopo.addEventListener('click', function () { vaiA(attiva + 1); });
    traccia.addEventListener('scroll', function () { requestAnimationFrame(aggiorna); }, { passive: true });
    traccia.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); vaiA(attiva + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); vaiA(attiva - 1); }
    });
    window.addEventListener('resize', aggiorna);
    aggiorna();
})();


/* ===== 11. i numeri contano fino al valore quando entrano nello schermo ===== */

document.querySelectorAll('.numero b[data-valore]').forEach(function (el) {
    const valore = parseFloat(el.dataset.valore);
    const decimali = parseInt(el.dataset.decimali || '0', 10);
    const scrivi = function (n) { el.textContent = n.toFixed(decimali).replace('.', ','); };
    if (riduciMovimento) { scrivi(valore); return; }
    scrivi(0);
    const contatore = { n: 0 };
    ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
            gsap.to(contatore, { n: valore, duration: 1.6, ease: 'power2.out', onUpdate: function () { scrivi(contatore.n); } });
        }
    });
});


/* ===== 12. la barra in alto segue la sezione in cui ti trovi =====
   Una "pillola" scivola sotto la voce della sezione attiva. Nella prova virtuale si
   accende il pulsante blu. Cliccando una voce la pagina scorre morbida fino alla sezione
   (senza aggiungere #sezione all'indirizzo, così ricaricando si riparte da capo). */

const ALTEZZA_NAV = 48;
const vociNav = Array.from(document.querySelectorAll('.nav nav a'));
const contenitoreNav = document.querySelector('.nav nav');
const pillola = document.createElement('span');
pillola.className = 'nav-pillola';
contenitoreNav.prepend(pillola);

vociNav.concat(Array.from(document.querySelectorAll('a[href^="#"]:not(.nav nav a)'))).forEach(function (link) {
    link.addEventListener('click', function (e) {
        const id = link.getAttribute('href');
        const meta = id === '#top' ? document.body : document.querySelector(id);
        if (!meta) return;
        e.preventDefault();
        const y = id === '#top' ? 0 : meta.getBoundingClientRect().top + window.scrollY - ALTEZZA_NAV;
        if (lenis) lenis.scrollTo(y, { duration: 1.6 });
        else window.scrollTo({ top: y, behavior: riduciMovimento ? 'auto' : 'smooth' });
    });
});

let voceAttiva = null;
function attiva(voce) {
    if (voce === voceAttiva) return;
    voceAttiva = voce;
    vociNav.forEach(function (v) { v.classList.toggle('attiva', v === voce); });
    if (!voce || voce.classList.contains('nav-cta')) {
        gsap.to(pillola, { opacity: 0, duration: 0.3 });
        return;
    }
    const box = contenitoreNav.getBoundingClientRect(), r = voce.getBoundingClientRect();
    const primaVolta = getComputedStyle(pillola).opacity === '0';
    gsap.to(pillola, {
        x: r.left - box.left - 12, width: r.width + 24, opacity: 1,
        duration: primaVolta ? 0 : 0.45, ease: 'power3.out'
    });
    if (primaVolta) gsap.fromTo(pillola, { opacity: 0 }, { opacity: 1, duration: 0.3 });
}

function preparaNavigazione() {
    const voce = function (href) { return vociNav.find(function (v) { return v.getAttribute('href') === href; }); };
    // [voce della barra, da quale sezione, fino a quale sezione]
    const zone = [
        [voce('#punti-chiave'), '#punti-chiave', '#punti-chiave'],
        [voce('#fronte'),       '#fronte',       '.numeri'],
        [voce('#esploso'),      '#esploso',      '#esploso'],
        [voce('#prova'),        '#prova',        '#prova'],
        [voce('#specifiche'),   '#specifiche',   '.footer']
    ];
    zone.forEach(function ([v, da, a]) {
        if (!v) return;
        ScrollTrigger.create({
            trigger: da, endTrigger: a, start: 'top 50%', end: 'bottom 50%',
            onToggle: function (st) {
                if (st.isActive) attiva(v);
                else if (voceAttiva === v) attiva(null);
            }
        });
    });
    window.addEventListener('resize', function () { const v = voceAttiva; voceAttiva = null; attiva(v); });
}
