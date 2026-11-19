// galleria.js – tutti gli occhiali della classe, in index.html
// Ogni card mostra un modello. Quando più persone hanno consegnato lo stesso modello
// mostro un solo file e cito tutti gli autori. I dati e le correzioni dei file sono in js/modelli.js;
// ogni card porta alla pagina dell'occhiale: occhiale.html?modello=<id>

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODELLI, caricaModello, testoMisure, scenaConLuci, inquadra } from './modelli.js';


/* ===== 1. le card ===== */

const griglia = document.getElementById('griglia-occhiali');
const caricati = [];       // caricati[i] = quello che restituisce caricaModello

MODELLI.forEach(function (m, i) {
    const pagina = 'occhiale.html?modello=' + m.id;
    const card = document.createElement('article');
    card.className = 'card-occhiale';
    card.innerHTML =
        '<a class="card-anteprima" href="' + pagina + '"><span class="card-attesa">Carico…</span></a>' +
        '<div class="card-testo">' +
            '<h3 class="card-autori"><a href="' + pagina + '">' + m.autori.join(', ') + '</a></h3>' +
            '<p class="card-misure">—</p>' +
            '<div class="card-bottoni">' +
                '<a class="card-scheda" href="' + pagina + '">Scheda</a>' +
                '<button type="button" class="card-guarda" disabled>Guarda in 3D</button>' +
            '</div>' +
        '</div>';
    griglia.appendChild(card);
    m.card = card;
    card.querySelector('.card-guarda').addEventListener('click', function () { apriVisore(i); });
});


/* ===== 2. le anteprime: un solo renderer nascosto fa la foto a ogni modello ===== */

let rendererFoto = null, scenaFoto = null, cameraFoto = null;

function fotografa(m, dati) {
    if (!rendererFoto) {
        rendererFoto = new THREE.WebGLRenderer({ antialias: true });
        rendererFoto.setSize(600, 450);
        scenaFoto = scenaConLuci(rendererFoto);
        cameraFoto = new THREE.PerspectiveCamera(30, 600 / 450, 0.1, 100);
        inquadra(cameraFoto, 4.6);
    }
    scenaFoto.add(dati.oggetto);
    rendererFoto.render(scenaFoto, cameraFoto);
    scenaFoto.remove(dati.oggetto);

    const img = new Image();
    img.alt = 'Occhiali di ' + m.autori.join(', ');
    img.src = rendererFoto.domElement.toDataURL('image/jpeg', 0.9);
    const anteprima = m.card.querySelector('.card-anteprima');
    anteprima.innerHTML = '';
    anteprima.appendChild(img);
}

// carico i modelli uno alla volta, solo quando la galleria si avvicina allo schermo
async function caricaTutti() {
    for (let i = 0; i < MODELLI.length; i++) {
        const m = MODELLI[i];
        try {
            const dati = await caricaModello(m);
            caricati[i] = dati;
            m.card.querySelector('.card-misure').textContent = testoMisure(dati.misure);
            m.card.querySelector('.card-guarda').disabled = false;
            fotografa(m, dati);
        } catch (errore) {
            console.error(m.file, errore);
            m.card.querySelector('.card-anteprima').innerHTML = '<span class="card-attesa">Non riesco a caricare ' + m.file + '</span>';
        }
    }
}

const osservatore = new IntersectionObserver(function (voci) {
    if (voci[0].isIntersecting) {
        osservatore.disconnect();
        caricaTutti();
    }
}, { rootMargin: '400px' });
osservatore.observe(griglia);


/* ===== 3. "Guarda in 3D": una finestra con il modello da girare ===== */

const finestra = document.getElementById('finestra-occhiale');
const spazio3d = finestra.querySelector('.finestra-3d');
let rendererGrande = null, scenaGrande = null, cameraGrande = null, controlli = null, inVista = null;

function apriVisore(i) {
    const m = MODELLI[i], dati = caricati[i];
    if (!dati) return;

    finestra.querySelector('.finestra-titolo').textContent = m.autori.join(', ');
    finestra.querySelector('.finestra-misure').textContent = testoMisure(dati.misure);
    finestra.querySelector('.finestra-scheda').href = 'occhiale.html?modello=' + m.id;
    finestra.showModal();

    if (!rendererGrande) {
        rendererGrande = new THREE.WebGLRenderer({ antialias: true });
        rendererGrande.setPixelRatio(window.devicePixelRatio);
        spazio3d.appendChild(rendererGrande.domElement);
        scenaGrande = scenaConLuci(rendererGrande);
        cameraGrande = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
        controlli = new OrbitControls(cameraGrande, rendererGrande.domElement);
        controlli.enableDamping = true;
        controlli.autoRotate = true;          // gira da solo finché non lo tocchi
        controlli.autoRotateSpeed = 1.2;
        controlli.addEventListener('start', function () { controlli.autoRotate = false; });
        rendererGrande.setAnimationLoop(function () {
            if (!finestra.open) return;
            controlli.update();
            rendererGrande.render(scenaGrande, cameraGrande);
        });
    }

    if (inVista) scenaGrande.remove(inVista);
    inVista = dati.oggetto;
    scenaGrande.add(inVista);

    adattaFinestra();
    inquadra(cameraGrande, 4.4);
    controlli.target.set(0, 0, 0);
    controlli.autoRotate = true;
}

function adattaFinestra() {
    if (!rendererGrande) return;
    const w = spazio3d.clientWidth, h = spazio3d.clientHeight;
    rendererGrande.setSize(w, h);
    cameraGrande.aspect = w / h;
    cameraGrande.updateProjectionMatrix();
}
window.addEventListener('resize', adattaFinestra);

finestra.querySelector('.finestra-chiudi').addEventListener('click', function () { finestra.close(); });
finestra.addEventListener('click', function (e) { if (e.target === finestra) finestra.close(); });
