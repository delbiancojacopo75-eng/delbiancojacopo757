// prova.js – "Provali con la fotocamera": gli occhiali sul tuo viso, in diretta, e una foto da salvare.
//
// Come funziona:
// 1. la webcam riempie un <video>;
// 2. MediaPipe Face Landmarker (una libreria di Google che gira nel browser) trova il viso
//    in ogni fotogramma: 478 punti sul viso e una matrice con la rotazione della testa;
// 3. sopra il video c'è un canvas trasparente di Three.js: gli occhiali vanno tra gli occhi,
//    grandi quanto la distanza tra gli angoli esterni degli occhi, girati come la testa;
// 4. una "testa" invisibile (un ellissoide che scrive solo la profondità) nasconde le stanghette
//    dietro il viso;
// 5. "Scatta foto" disegna il video e gli occhiali in un'unica immagine da scaricare.
// Il video non esce dal computer: tutto avviene nel browser.

import * as THREE from 'three';

// la libreria e il modello del viso (si scaricano la prima volta che apri la prova)
const VERSIONE = '0.10.14';
const LIBRERIA = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + VERSIONE;
const MODELLO_VISO = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// i punti del viso che uso (numerazione di MediaPipe)
const OCCHIO_DESTRO_ESTERNO = 33;
const OCCHIO_SINISTRO_ESTERNO = 263;
const RADICE_NASO = 168;            // tra le sopracciglia, sopra il naso

// quanto sono larghi gli occhiali rispetto alla distanza tra gli angoli esterni degli occhi
const LARGHEZZA_SU_OCCHI = 1.55;

const finestra = document.getElementById('finestra-prova');
const schermo = document.getElementById('prova-schermo');
const video = document.getElementById('prova-video');
const foto = document.getElementById('prova-foto');
const stato = document.getElementById('prova-stato');
const bottoneScatta = document.getElementById('prova-scatta');
const linkScarica = document.getElementById('prova-scarica');
const bottoneRifai = document.getElementById('prova-rifai');

let riconoscitore = null;           // il Face Landmarker (lo carico una volta sola)
let flusso = null;                  // lo stream della webcam
let renderer = null, scena = null, camera = null;
let perno = null;                   // il gruppo che segue la testa
let occhiali = null;                // la copia degli occhiali messa sul viso
let inCorso = false;
let nomeFoto = 'occhiali';


/* ===== 1. la scena sopra il video ===== */

function preparaScena() {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.domElement.className = 'prova-canvas';
    schermo.insertBefore(renderer.domElement, foto);

    scena = new THREE.Scene();
    scena.add(new THREE.HemisphereLight(0xffffff, 0x8a8178, 1.6));
    const luce = new THREE.DirectionalLight(0xffffff, 1.4);
    luce.position.set(0, 1, 2);
    scena.add(luce);

    // camera ortografica in pixel del video: x verso destra, y verso l'alto
    camera = new THREE.OrthographicCamera(0, 1, 0, -1, -5000, 5000);
    camera.position.z = 1000;

    perno = new THREE.Group();
    perno.visible = false;
    scena.add(perno);
}

// gli occhiali della pagina (con i colori scelti in Personalizza: i materiali sono condivisi)
function mettiOcchiali(oggetto, misure) {
    if (occhiali) perno.remove(occhiali);
    occhiali = new THREE.Group();
    const copia = oggetto.clone(true);
    copia.position.set(0, 0, 0);
    copia.rotation.set(0, 0, 0);
    occhiali.add(copia);

    // il modello è centrato sulla sua scatola: lo sposto perché il frontale (z massimo)
    // stia nel punto del perno, e lo porto a larghezza 1
    copia.updateMatrixWorld(true);
    const scatola = new THREE.Box3().setFromObject(copia);
    const larghezza = scatola.max.x - scatola.min.x;
    copia.position.z = -scatola.max.z;
    copia.position.y = -(scatola.min.y + scatola.max.y) / 2;
    occhiali.scale.setScalar(1 / larghezza);

    // la testa invisibile: scrive solo la profondità, così nasconde le stanghette dietro il viso
    const profondita = (scatola.max.z - scatola.min.z) / larghezza;
    const testa = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 24),
        new THREE.MeshBasicMaterial({ colorWrite: false })
    );
    testa.renderOrder = -1;
    testa.scale.set(0.82, 1.15, Math.max(0.9, profondita * 1.1));
    testa.position.set(0, 0.05, -testa.scale.z * 0.5 - 0.04);
    occhiali.add(testa);

    perno.add(occhiali);
}


/* ===== 2. la webcam e il riconoscimento del viso ===== */

async function caricaRiconoscitore() {
    if (riconoscitore) return riconoscitore;
    stato.textContent = 'Carico il riconoscimento del viso…';
    const { FaceLandmarker, FilesetResolver } = await import(LIBRERIA + '/vision_bundle.mjs');
    const file = await FilesetResolver.forVisionTasks(LIBRERIA + '/wasm');
    riconoscitore = await FaceLandmarker.createFromOptions(file, {
        baseOptions: { modelAssetPath: MODELLO_VISO, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFacialTransformationMatrixes: true      // la rotazione della testa
    });
    return riconoscitore;
}

export async function apriProva(oggetto, misure, nome) {
    nomeFoto = nome || 'occhiali';
    finestra.showModal();
    mostraVideo();
    if (!renderer) preparaScena();
    mettiOcchiali(oggetto, misure);

    try {
        stato.textContent = 'Avvio la fotocamera…';
        flusso = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        video.srcObject = flusso;
        await video.play();
        adattaSchermo();
        await caricaRiconoscitore();
        stato.textContent = 'Guarda la fotocamera';
        bottoneScatta.disabled = false;
        inCorso = true;
        requestAnimationFrame(ciclo);
    } catch (errore) {
        console.error(errore);
        stato.textContent = errore.name === 'NotAllowedError'
            ? 'Serve il permesso per usare la fotocamera'
            : (location.protocol === 'file:' ? 'Apri la pagina da un server (es. Live Server) per usare la fotocamera'
                                             : 'Non riesco ad avviare la fotocamera');
    }
}

function chiudiProva() {
    inCorso = false;
    if (flusso) flusso.getTracks().forEach(function (t) { t.stop(); });
    flusso = null;
    video.srcObject = null;
    bottoneScatta.disabled = true;
    if (finestra.open) finestra.close();
}

document.getElementById('prova-chiudi').addEventListener('click', chiudiProva);
finestra.addEventListener('close', chiudiProva);        // anche con il tasto Esc

// lo schermo prende le proporzioni del video, il canvas le sue misure in pixel
function adattaSchermo() {
    const w = video.videoWidth || 1280, h = video.videoHeight || 720;
    schermo.style.aspectRatio = w + ' / ' + h;
    renderer.setSize(w, h, false);
    camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h;
    camera.updateProjectionMatrix();
}


/* ===== 3. ogni fotogramma: trovo il viso e ci metto gli occhiali ===== */

const posizioneVoluta = new THREE.Vector3();
const rotazioneVoluta = new THREE.Quaternion();
const matrice = new THREE.Matrix4();
const scarto = new THREE.Vector3(), scala = new THREE.Vector3();
let ultimoTempo = -1;

function ciclo() {
    if (!inCorso) return;
    requestAnimationFrame(ciclo);
    if (video.readyState < 2 || video.currentTime === ultimoTempo) return;
    ultimoTempo = video.currentTime;

    const w = video.videoWidth, h = video.videoHeight;
    const risultato = riconoscitore.detectForVideo(video, performance.now());
    const viso = risultato.faceLandmarks && risultato.faceLandmarks[0];

    if (!viso) {
        perno.visible = false;
        stato.textContent = 'Cerco il viso… mettiti davanti alla fotocamera';
    } else {
        stato.textContent = 'Muovi la testa: gli occhiali ti seguono';
        const a = viso[OCCHIO_DESTRO_ESTERNO], b = viso[OCCHIO_SINISTRO_ESTERNO], n = viso[RADICE_NASO];

        // dove: a metà tra gli occhi, un po' verso la radice del naso; y verso l'alto
        const cx = ((a.x + b.x) / 2 * 0.7 + n.x * 0.3) * w;
        const cy = ((a.y + b.y) / 2 * 0.7 + n.y * 0.3) * h;
        posizioneVoluta.set(cx, -cy, 0);

        // quanto grandi: la distanza tra gli angoli esterni degli occhi (in pixel)
        const occhi = Math.hypot((a.x - b.x) * w, (a.y - b.y) * h, (a.z - b.z) * w);
        const larghezza = occhi * LARGHEZZA_SU_OCCHI;

        // girati come la testa: la rotazione dalla matrice di MediaPipe
        const m = risultato.facialTransformationMatrixes && risultato.facialTransformationMatrixes[0];
        if (m) {
            matrice.fromArray(m.data);
            matrice.decompose(scarto, rotazioneVoluta, scala);
        } else {
            // senza matrice: solo l'inclinazione di lato, dalla linea degli occhi
            rotazioneVoluta.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.atan2((b.y - a.y) * h, (b.x - a.x) * w));
        }

        // la prima volta salto lì, poi mi avvicino piano (meno tremolio)
        if (!perno.visible) {
            perno.position.copy(posizioneVoluta);
            perno.quaternion.copy(rotazioneVoluta);
            perno.scale.setScalar(larghezza);
        } else {
            perno.position.lerp(posizioneVoluta, 0.5);
            perno.quaternion.slerp(rotazioneVoluta, 0.5);
            perno.scale.setScalar(THREE.MathUtils.lerp(perno.scale.x, larghezza, 0.5));
        }
        perno.visible = true;
    }
    renderer.render(scena, camera);
}


/* ===== 4. la foto ===== */

bottoneScatta.addEventListener('click', function () {
    const w = video.videoWidth, h = video.videoHeight;
    const tela = document.createElement('canvas');
    tela.width = w;
    tela.height = h;
    const ctx = tela.getContext('2d');
    // il video e gli occhiali sono mostrati a specchio (come uno specchio vero): la foto anche
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    renderer.render(scena, camera);
    ctx.drawImage(renderer.domElement, 0, 0, w, h);

    const immagine = tela.toDataURL('image/png');
    foto.src = immagine;
    linkScarica.href = immagine;
    linkScarica.download = nomeFoto + '.png';
    mostraFoto();
});

bottoneRifai.addEventListener('click', mostraVideo);

function mostraFoto() {
    schermo.classList.add('con-foto');
    bottoneScatta.hidden = true;
    linkScarica.hidden = false;
    bottoneRifai.hidden = false;
}

function mostraVideo() {
    schermo.classList.remove('con-foto');
    bottoneScatta.hidden = false;
    linkScarica.hidden = true;
    bottoneRifai.hidden = true;
}
