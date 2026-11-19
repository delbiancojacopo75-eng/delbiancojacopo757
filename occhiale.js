// occhiale.js – la pagina di un occhiale (occhiale.html?modello=<id>)
// Legge dall'indirizzo quale occhiale mostrare, prende i suoi dati da js/modelli.js
// e riempie la pagina: titolo, descrizione, scheda tecnica, componenti, colori e il modello 3D.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODELLI, caricaModello, testoMisure, scenaConLuci } from './modelli.js';
import { apriProva } from './prova.js';


/* ===== 1. quale occhiale? ===== */

const id = new URLSearchParams(location.search).get('modello');
let indice = MODELLI.findIndex(function (m) { return m.id === id; });
if (indice < 0) indice = 0;          // indirizzo sbagliato o senza modello: mostro il primo
const m = MODELLI[indice];

const $ = function (sel) { return document.querySelector(sel); };


/* ===== 2. i testi che conosco subito (da js/modelli.js) ===== */

document.title = m.autori.join(', ') + ' – Occhiali – Triennale Milano';
$('#scheda-tipo').textContent = m.tipo;
$('#scheda-autori').textContent = m.autori.join(', ');
$('#scheda-descrizione').innerHTML = m.descrizione.map(function (p) { return '<p>' + p + '</p>'; }).join('');


// l'occhiale prima e quello dopo (in giro: dopo l'ultimo torna il primo)
const prima = MODELLI[(indice - 1 + MODELLI.length) % MODELLI.length];
const dopo = MODELLI[(indice + 1) % MODELLI.length];
$('#scheda-prima').href = 'occhiale.html?modello=' + prima.id;
$('#scheda-prima span').textContent = prima.autori.join(', ');
$('#scheda-dopo').href = 'occhiale.html?modello=' + dopo.id;
$('#scheda-dopo span').textContent = dopo.autori.join(', ');


/* ===== 3. il visore 3D ===== */

const visore = $('#visore-scheda');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(visore.clientWidth, visore.clientHeight);
visore.appendChild(renderer.domElement);

const scena = scenaConLuci(renderer);
const camera = new THREE.PerspectiveCamera(30, visore.clientWidth / visore.clientHeight, 0.1, 100);
const controlli = new OrbitControls(camera, renderer.domElement);
controlli.enableDamping = true;
controlli.autoRotate = true;                 // gira piano finché non lo tocchi
controlli.autoRotateSpeed = 1;
controlli.addEventListener('start', function () {
    controlli.autoRotate = false;
    destinazione = null;
});

// le inquadrature (dopo la correzione tutti gli occhiali guardano verso +z)
const DISTANZA = 4.6;
const INQUADRATURE = {
    trequarti: new THREE.Vector3(-0.9, 0.5, 1.5),
    fronte:    new THREE.Vector3(0, 0.15, 1),
    lato:      new THREE.Vector3(1, 0.15, 0),
    sopra:     new THREE.Vector3(0, 1, 0.02)
};
Object.values(INQUADRATURE).forEach(function (v) { v.normalize().multiplyScalar(DISTANZA); });
camera.position.copy(INQUADRATURE.trequarti);
let destinazione = null;

document.querySelectorAll('.inquadratura').forEach(function (bottone) {
    bottone.addEventListener('click', function () {
        destinazione = INQUADRATURE[bottone.dataset.vista];
        controlli.autoRotate = false;
    });
});

// i bottoni di un gruppo: quello cliccato diventa nero e il nome va accanto al titolo
document.querySelectorAll('.inquadratura').forEach(function (bottone, _, tutti) {
    bottone.addEventListener('click', function () {
        tutti.forEach(function (b) { b.classList.remove('selected'); });
        bottone.classList.add('selected');
        bottone.closest('.opzione').querySelector('.opzione-valore').textContent = bottone.dataset.nome;
    });
});


/* ===== 4. l'esploso: le parti dell'occhiale si allontanano dal centro =====
   Le parti sono i gruppi del file (lente, stanghette, elastico…). Alcuni file esportati da Rhino
   hanno centinaia di pezzi senza nome, uno per faccia: in quel caso raggruppo i pezzi per materiale,
   così la montatura si muove tutta insieme invece di andare in frantumi. */

let esploso = 0;
const pezziEsploso = [];      // { mesh, partenza, spostamento }

function preparaEsploso(oggetto) {
    oggetto.updateMatrixWorld(true);
    const centro = new THREE.Box3().setFromObject(oggetto).getCenter(new THREE.Vector3());

    // il livello delle parti: se c'è un solo gruppo che contiene tutto, scendo dentro
    let livello = oggetto.children[0];
    while (livello.children.length === 1 && livello.children[0].children.length > 1) livello = livello.children[0];

    // le parti: i gruppi del livello, oppure i materiali se i gruppi sono troppi o uno solo
    const perMateriale = livello.children.length > 30 || livello.children.length < 2;
    const parti = new Map();
    livello.children.forEach(function (figlio) {
        figlio.traverse(function (o) {
            if (!o.isMesh) return;
            const chiave = perMateriale ? (Array.isArray(o.material) ? o.material[0] : o.material).uuid : figlio.uuid;
            if (!parti.has(chiave)) parti.set(chiave, []);
            parti.get(chiave).push(o);
        });
    });
    if (parti.size < 2) return;          // un pezzo solo: niente da esplodere

    parti.forEach(function (mesh) {
        const scatola = new THREE.Box3();
        mesh.forEach(function (o) { scatola.expandByObject(o); });
        const c = scatola.getCenter(new THREE.Vector3());
        const verso = c.clone().sub(centro).multiplyScalar(0.4);     // al 100%: il 40% della sua distanza dal centro
        mesh.forEach(function (o) {
            const qui = o.getWorldPosition(new THREE.Vector3());
            const spostamento = o.parent.worldToLocal(qui.clone().add(verso)).sub(o.parent.worldToLocal(qui.clone()));
            pezziEsploso.push({ mesh: o, partenza: o.position.clone(), spostamento: spostamento });
        });
    });
}

const cursore = $('#cursore-esploso-scheda');
cursore.addEventListener('input', function () {
    esploso = Number(cursore.value) / 100;
    $('#valore-esploso-scheda').textContent = cursore.value + '%';
});


/* ===== 5. carico il modello e scrivo la scheda tecnica ===== */

function numero(n) { return n.toLocaleString('it-IT'); }

caricaModello(m).then(function (dati) {
    scena.add(dati.oggetto);
    preparaEsploso(dati.oggetto);
    visore.querySelector('.visore-segnaposto').remove();

    const s = dati.misure;
    const righe = [
        ['Misure', testoMisure(s)],
        ['Larghezza', Math.round(s.x) + ' mm'],
        ['Altezza', Math.round(s.y) + ' mm'],
        ['Profondità', Math.round(s.z) + ' mm'],
        ['Pezzi nel modello', numero(dati.pezzi)],
        ['Triangoli', numero(dati.triangoli)],
        ['File', m.file]
    ];
    $('#scheda-dati').innerHTML = righe.map(function ([k, v]) { return '<dt>' + k + '</dt><dd>' + v + '</dd>'; }).join('');

    // i componenti: i nomi dei gruppi nel file (o dei materiali, se i gruppi non hanno nome)
    $('#scheda-componenti').innerHTML = dati.parti.map(function (p) {
        return '<li>' + p.nome + (p.quanti > 1 ? ' <span>· ' + numero(p.quanti) + ' pezzi</span>' : '') + '</li>';
    }).join('');

    // i materiali: di che cosa sono le lenti e di che cosa la struttura
    // (se il file non lo dice: Vetro per le lenti, Plastica per la struttura; vedi nomeMateriale in modelli.js)
    const materiali = [];
    if (dati.materiali.lente.length) materiali.push(['Lente', dati.materiali.lente.join(', ')]);
    if (dati.materiali.struttura.length) materiali.push(['Struttura', dati.materiali.struttura.join(', ')]);
    $('#scheda-materiali').innerHTML = materiali.map(function ([k, v]) { return '<dt>' + k + '</dt><dd>' + v + '</dd>'; }).join('');

    preparaPersonalizza(dati.parti);

    // "Provali con la fotocamera": gli occhiali (con i colori scelti) sul viso, vedi js/prova.js
    const bottoneProva = $('#bottone-prova');
    bottoneProva.disabled = false;
    bottoneProva.addEventListener('click', function () {
        apriProva(dati.oggetto, dati.misure, 'occhiali-' + m.id);
    });
}).catch(function (errore) {
    console.error(errore);
    visore.querySelector('.visore-segnaposto').textContent = 'Non riesco a caricare ' + m.file;
});


/* ===== 5b. personalizza: una fila di colori per ogni componente =====
   Ogni componente ha i suoi materiali (copie, così colorarne uno non cambia gli altri).
   I colori vengono da m.colori in js/modelli.js: "struttura" per le parti normali, "lente" per le lenti.
   Il primo pallino è sempre il colore originale del file. */

const contenitorePersonalizza = $('#scheda-personalizza');
const ripristini = [];       // una funzione per componente che rimette il colore originale

function preparaPersonalizza(parti) {
    parti.forEach(function (parte) {
        // copio i materiali di questa parte e li metto sui suoi pezzi
        const copie = new Map();      // materiale originale → copia
        parte.pezzi.forEach(function (p) {
            if (!copie.has(p.mat)) copie.set(p.mat, p.mat.clone());
            const copia = copie.get(p.mat);
            if (p.indice >= 0) p.mesh.material[p.indice] = copia;
            else p.mesh.material = copia;
        });
        const materiali = [...copie.values()];
        const originali = materiali.map(function (mt) { return mt.color.clone(); });
        const trasparente = materiali.some(function (mt) { return mt.transparent && mt.opacity < 1; });

        // i colori: l'originale (il colore più usato della parte) + la tavolozza dell'occhiale
        const tavolozza = (parte.lente ? m.colori.lente : m.colori.struttura) || [];
        const colori = [['Originale', '#' + originali[0].getHexString(), true]].concat(tavolozza);

        const blocco = document.createElement('div');
        blocco.className = 'personalizza-parte';
        blocco.innerHTML =
            '<p class="personalizza-nome">' + parte.nome + ' <span class="opzione-valore">Originale</span></p>' +
            '<div class="campioni">' + colori.map(function ([nome, colore], i) {
                return '<button type="button" class="campione' + (i === 0 ? ' selected campione-originale' : '') +
                       (parte.lente || trasparente ? ' campione-trasparente' : '') +
                       '" data-indice="' + i + '" aria-label="' + nome + '" title="' + nome + '" style="--colore: ' + colore + '"></button>';
            }).join('') + '</div>';
        contenitorePersonalizza.appendChild(blocco);

        const bottoni = blocco.querySelectorAll('.campione');
        const valore = blocco.querySelector('.opzione-valore');
        function scegli(i) {
            bottoni.forEach(function (b) { b.classList.remove('selected'); });
            bottoni[i].classList.add('selected');
            valore.textContent = colori[i][0];
            materiali.forEach(function (mt, k) {
                if (i === 0) mt.color.copy(originali[k]);       // il colore del file
                else mt.color.set(colori[i][1]);
            });
        }
        bottoni.forEach(function (b) {
            b.addEventListener('click', function () { scegli(Number(b.dataset.indice)); });
        });
        ripristini.push(function () { scegli(0); });
    });
}

$('#scheda-ripristina').addEventListener('click', function () {
    ripristini.forEach(function (f) { f(); });
});


/* ===== 6. l'animazione ===== */

renderer.setAnimationLoop(function () {
    // esploso: ogni pezzo scivola verso la sua posizione
    pezziEsploso.forEach(function (p) {
        const meta = p.partenza.clone().addScaledVector(p.spostamento, esploso);
        p.mesh.position.lerp(meta, 0.15);
    });

    // inquadratura: la camera gira intorno al modello fino alla destinazione
    if (destinazione) {
        const distanza = THREE.MathUtils.lerp(camera.position.length(), destinazione.length(), 0.08);
        camera.position.lerp(destinazione, 0.08).setLength(distanza);
        controlli.target.lerp(new THREE.Vector3(), 0.08);
        if (camera.position.distanceTo(destinazione) < 0.01) destinazione = null;
    }

    controlli.update();
    renderer.render(scena, camera);
});

window.addEventListener('resize', function () {
    camera.aspect = visore.clientWidth / visore.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(visore.clientWidth, visore.clientHeight);
});
