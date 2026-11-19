// modelli.js – i dati degli occhiali della classe e le funzioni per caricarli e sistemarli.
// Lo usano sia la galleria (js/galleria.js, in index.html) sia la pagina di ogni occhiale
// (js/occhiale.js, in occhiale.html?modello=...).

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


/* ===== 1. i modelli =====
   id          = il nome nell'indirizzo della pagina: occhiale.html?modello=<id>
   file        = il file mostrato (quello del gruppo che si vede meglio)
   autori      = tutte le persone che hanno consegnato quel modello
   tipo        = che occhiale è, in poche parole
   descrizione = il testo della pagina (descrive quello che si vede nel modello 3D)
   nascondi    = nomi dei pezzi da togliere (tavole, quote, una testa di prova…)
   rotazione   = correzione in gradi [x, y, z], se il modello è girato male
                 (il frontale girato al contrario lo trova e lo corregge da solo: vedi trovaFrontale)
   materialiParti = il materiale di una parte scritto a mano (es. { lente: 'Plastica' }), se quello automatico non va bene
   nomiParti   = nomi più chiari per le parti del file (es. il layer "Livello 01" → "Cornice")
   colori      = i colori per personalizzare l'occhiale nella sua pagina: [nome, colore]
                 (struttura = per tutte le parti che non sono lenti, lente = per le lenti; il colore del file c'è sempre)
   correzioni  = cosa è stato sistemato nel file, per la scheda della pagina */
export const CARTELLA = 'models/modelli_occhiali_glbxweb/';

export const MODELLI = [
    {
        id: 'del-bianco-cerioni-tito',
        colori: {
            struttura: [['Cristallo', '#f2f2ef'], ['Ghiaccio', '#cfe3ea'], ['Fumé', '#6e6e6e'], ['Giallo sicurezza', '#f2c230'], ['Arancio', '#e8742a']],
            lente: [['Trasparente', '#ffffff'], ['Giallo', '#f5d76e'], ['Fumé', '#8a8a8a'], ['Azzurro', '#9cc8e8']]
        },
        file: 'Jacopo_Del_Bianco.glb',
        autori: ['Jacopo Del Bianco', 'Giacomo Cerioni', 'Gianmarco Tito'],
        tipo: 'Occhiali di protezione a lente unica',
        materialiParti: { 'lente': 'Plastica' },     // la lente è in plastica, non in vetro
        descrizione: [
            'Una sola lente avvolgente copre tutto il campo visivo e scende ai lati per proteggere anche di lato. In alto una striscia di struttura la irrigidisce e la collega alle stanghette.',
            'Le stanghette sono larghe e piatte, con una serie di feritoie vicino alla cerniera che alleggeriscono il pezzo e fanno passare l\'aria. Si aprono e si chiudono su due perni infilati nelle sedi della struttura.'
        ],
        correzioni: ['Il frontale era girato al contrario rispetto agli altri modelli: girato di 180°']
    },
    {
        id: 'morri-garnaroli-vicinanza',
        colori: {
            struttura: [['Nero', '#1b1b1b'], ['Arancio fluo', '#ff7a1a'], ['Bianco', '#f2f2f2'], ['Verde lime', '#9ccc3c'], ['Blu elettrico', '#2557d6']],
            lente: [['Fumé scuro', '#3a3a3a'], ['Specchio blu', '#4a7bd0'], ['Rosa', '#e88aa0'], ['Ambra', '#d9902f']]
        },
        file: 'valentinavicinanza.glb',
        autori: ['Alessandro Morri', 'Linda Garnaroli', 'Valentina Vicinanza'],
        tipo: 'Occhiali sportivi a mascherina',
        nascondi: ['tavole'],
        descrizione: [
            'Una lente a mascherina scura, sagomata sul naso, è tenuta da una montatura nera sottile. Il frontale è un pezzo unico, senza cornice intorno alle due metà della lente.',
            'Le stanghette sottili hanno un inserto arancione vicino alla cerniera e terminano con una curva che si aggancia dietro l\'orecchio.'
        ],
        correzioni: ['Nel file c\'erano anche le tavole con quote e curve: tolte dal modello 3D']
    },
    {
        id: 'nobili-bezzicheri',
        colori: {
            struttura: [['Verde acqua', '#8fd9c2'], ['Bianco neve', '#f4f6f5'], ['Lilla', '#b9a7e0'], ['Nero', '#222222'], ['Corallo', '#ff7f6a']],
            lente: [['Rosso', '#d6332c'], ['Oro', '#e0b04a'], ['Viola', '#7b4fc9'], ['Blu ghiaccio', '#8ec9f0']]
        },
        file: 'Eleonora_Nobili.glb',
        autori: ['Eleonora Nobili', 'Sofia Bezzicheri'],
        tipo: 'Maschera da neve',
        nomiParti: { 'livello': 'Cornice' },          // "Livello 01" è il layer di Rhino con la cornice
        nascondi: ['internoLENT'],
        descrizione: [
            'Una maschera con una grande lente panoramica rossa, montata in una cornice morbida verde acqua che appoggia sul viso tutto intorno agli occhi.',
            'Sul bordo superiore della cornice una fila di piccoli fori fa circolare l\'aria e limita l\'appannamento. La fascia elastica verde, con la sua trama, tiene la maschera ferma sulla testa o sul casco.'
        ],
        correzioni: ['La faccia interna della lente era nera e sovrapposta alla lente rossa e creava macchie nere: tolta']
    },
    {
        id: 'porcellini-guezguez-palladino',
        colori: {
            struttura: [['Cristallo', '#f0f0ee'], ['Arancio', '#f08a24'], ['Blu', '#2f6db5'], ['Grigio', '#8b8f94'], ['Verde', '#3f9a5b']],
            lente: [['Trasparente', '#ffffff'], ['Giallo', '#f3d35a'], ['Fumé', '#777777'], ['Arancio', '#f0a050']]
        },
        file: 'AnnaPorcellini.glb',
        autori: ['Anna Porcellini', 'Takwa Guezguez', 'Federico Palladino'],
        tipo: 'Occhiali di protezione leggeri',
        descrizione: [
            'Occhiali molto leggeri con una lente unica trasparente e stanghette sottili. Il frontale non ha cornice: la lente stessa fa da struttura.',
            'Le parti che toccano il viso sono in gomma arancione: i naselli e i terminali delle stanghette. Piccoli elementi metallici fanno da cerniera.'
        ]
    },
    {
        id: 'sebastianelli-boccarossa',
        colori: {
            struttura: [['Nero', '#1d1d1d'], ['Rosso', '#c62f2f'], ['Blu navy', '#22355e'], ['Giallo', '#f3c623'], ['Grigio', '#7d7f82']],
            lente: [['Trasparente', '#ffffff'], ['Fumé', '#6f6f6f'], ['Giallo', '#f2d25c'], ['Verde', '#5f8f5f']]
        },
        file: 'luigiboccarossa.glb',
        autori: ['Davide Sebastianelli', 'Luigi Boccarossa'],
        tipo: 'Occhiali da lavoro con barra superiore',
        descrizione: [
            'Una lente unica trasparente è appesa sotto una barra nera dritta che attraversa tutto il frontale e ne segna la linea orizzontale.',
            'Le stanghette nere partono dalle estremità della barra e finiscono con un terminale curvo; hanno una parte allungabile per adattarsi alla testa.'
        ],
        correzioni: ['Tolte le curve di costruzione rimaste nel file']
    },
    {
        id: 'saravia-ruiz-cancello',
        colori: {
            struttura: [['Bronzo', '#5b5346'], ['Nero opaco', '#222222'], ['Sabbia', '#c9b48f'], ['Oliva', '#6b6f3c'], ['Bianco', '#eeeeea']],
            lente: [['Azzurro', '#7fb1e3'], ['Verde', '#79b59a'], ['Rosa', '#e3a3b6'], ['Fumé', '#666666']]
        },
        file: 'camilasaraviaruiz.glb',
        autori: ['Camila Saravia Ruiz', 'Federica Cancello'],
        tipo: 'Occhiali a fascia',
        nascondi: ['testa_sx', 'testa_dx', 'lente_esterna'],
        nomiParti: { 'occhiali': 'Montatura', 'lente interna': 'Lente' },
        descrizione: [
            'Una montatura scura, squadrata e continua, avvolge una lente azzurra che corre da una tempia all\'altra senza interruzioni.',
            'Le stanghette sono dritte e piatte, in linea con la fascia del frontale, e finiscono con un gancio curvo dietro l\'orecchio.'
        ],
        correzioni: [
            'Nel file c\'era anche una testa di prova: tolta',
            'Tolta una "lente esterna" di costruzione, larga 182 mm, molto più della montatura',
            '50 facce della montatura erano rotte dalla conversione da Rhino: ricostruite'
        ]
    },
    {
        id: 'camasso-de-marini-galli',
        colori: {
            struttura: [['Cristallo', '#f1f1ee'], ['Azzurro ghiaccio', '#cfe6f2'], ['Rosa cipria', '#f1cfd6'], ['Menta', '#cdeedd'], ['Fumé', '#777777']],
            lente: [['Trasparente', '#ffffff'], ['Fumé', '#7a7a7a'], ['Ambra', '#d39a3c'], ['Blu', '#6a9bd6']]
        },
        file: 'demariniadele.glb',
        autori: ['Giulia Camasso', 'Adele De Marini', 'Francesca Galli'],
        tipo: 'Occhiali di protezione avvolgenti',
        descrizione: [
            'Occhiali in plastica trasparente con una lente unica che gira intorno al viso e si chiude ai lati come uno schermo.',
            'Le stanghette sono larghe e piene, in continuità con la lente, e scendono curvando dietro l\'orecchio.'
        ]
    },
    {
        id: 'giorgetti-mongiusti',
        colori: {
            struttura: [['Arancio', '#f0a21e'], ['Blu notte', '#1f2a55'], ['Verde acido', '#b6d43a'], ['Nero', '#1a1a1a'], ['Bianco', '#f2f2f2']],
            lente: [['Turchese specchio', '#19c6c6'], ['Viola specchio', '#8a5cd6'], ['Oro', '#e0b13a'], ['Rosso', '#e04a3a']]
        },
        file: 'mongiustiviola.glb',
        autori: ['Luca Giorgetti', 'Viola Mongiusti'],
        tipo: 'Occhiali sportivi a fascia',
        descrizione: [
            'Una lente a scudo turchese a specchio, sagomata sul naso, è tenuta da una montatura in due parti, una davanti e una dietro, con un appoggio per il naso a parte.',
            'Le stanghette arancioni sono sottili e molto aperte: lasciano spazio a un casco o a una testa larga.'
        ],
        correzioni: ['Tolte le curve di costruzione rimaste nel file']
    },
    {
        id: 'carnevali-fabbri',
        colori: {
            struttura: [['Rosso', '#e04a4a'], ['Nero', '#1c1c1c'], ['Bianco', '#f2f2f2'], ['Giallo fluo', '#e6f23a'], ['Blu', '#2b63d9']],
            lente: [['Trasparente', '#ffffff'], ['Fumé', '#707070'], ['Arancio', '#f39a4a'], ['Viola', '#9a6ad6']]
        },
        file: 'fabbri_Edoardo.glb',
        autori: ['Martina Carnevali', 'Edoardo Fabbri'],
        tipo: 'Occhiali sportivi con barra superiore',
        rotazione: [0, 0, 180],
        descrizione: [
            'Una montatura rossa disegna una barra superiore spigolosa da cui scendono due lenti trasparenti a scudo, unite al centro sopra il naso.',
            'Le stanghette rosse, sottili, hanno fori allungati che le alleggeriscono e si curvano alla fine per agganciarsi all\'orecchio.'
        ],
        correzioni: ['Il modello era sottosopra: girato di 180°']
    },
    {
        id: 'casanova',
        colori: {
            struttura: [['Nero', '#1a1a1a'], ['Oro', '#c9a23a'], ['Argento', '#b9bcc0'], ['Rosso', '#b22a2a'], ['Bianco', '#f0f0f0']],
            lente: [['Fumé', '#3c3c3c'], ['Specchio oro', '#d4a83a'], ['Specchio blu', '#3f6fd1'], ['Verde', '#4f7f5a']]
        },
        file: 'niccolocasanova_da_3dm.glb',
        autori: ['Niccolò Casanova'],
        tipo: 'Occhiali da sole a fascia',
        nomiParti: { 'occhiali1': 'Frontale', 'stanghette 20': 'Stanghette' },   // i nomi dei layer di Rhino
        descrizione: [
            'Occhiali neri con una lente scura unica e una barra superiore dritta che taglia orizzontalmente il frontale, da una tempia all\'altra.',
            'Le stanghette sono lunghe e sottili e finiscono con un terminale curvo.'
        ],
        correzioni: [
            'Era un file Rhino .3dm con l\'estensione cambiata in .glb: convertito in un vero .glb',
            'Tolta la base di 1,8 m che falsava le misure'
        ]
    }
];


/* ===== 2. sistemare i file ===== */

// facce rotte: alcuni file convertiti dal .3dm hanno le facce piane triangolate male
// (un rettangolo di 4 vertici diventa un triangolo con due vertici uguali: area zero, non si vede).
// Per ogni pezzo piccolo con area zero: tolgo i vertici doppi, li metto in ordine intorno al centro
// (sul piano della faccia) e ricostruisco i triangoli a ventaglio.
function riparaFacce(radice) {
    let riparate = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    radice.traverse(function (o) {
        if (!o.isMesh) return;
        const pos = o.geometry.attributes.position;
        if (pos.count < 3 || pos.count > 12) return;          // solo le facce piccole e piane

        const indici = o.geometry.index ? Array.from(o.geometry.index.array) : [...Array(pos.count).keys()];
        let area = 0;
        for (let t = 0; t + 2 < indici.length; t += 3) {
            a.fromBufferAttribute(pos, indici[t]);
            b.fromBufferAttribute(pos, indici[t + 1]).sub(a);
            c.fromBufferAttribute(pos, indici[t + 2]).sub(a);
            area += b.cross(c).length() / 2;
        }
        if (area > 1e-9) return;                               // la faccia è a posto

        const punti = [];
        for (let i = 0; i < pos.count; i++) {
            const p = new THREE.Vector3().fromBufferAttribute(pos, i);
            if (!punti.some(function (q) { return q.distanceTo(p) < 1e-6; })) punti.push(p);
        }
        if (punti.length < 3) return;

        const centro = new THREE.Vector3();
        punti.forEach(function (p) { centro.add(p); });
        centro.divideScalar(punti.length);
        const u = punti.reduce(function (m, p) { return p.distanceTo(centro) > m.distanceTo(centro) ? p : m; })
            .clone().sub(centro).normalize();
        const normale = new THREE.Vector3();
        punti.forEach(function (p) {
            const n = u.clone().cross(p.clone().sub(centro));
            if (n.length() > normale.length()) normale.copy(n);
        });
        normale.normalize();
        const v = normale.clone().cross(u);

        punti.sort(function (p, q) {
            const dp = p.clone().sub(centro), dq = q.clone().sub(centro);
            return Math.atan2(dp.dot(v), dp.dot(u)) - Math.atan2(dq.dot(v), dq.dot(u));
        });
        const nuova = new THREE.BufferGeometry().setFromPoints(punti);
        const tri = [];
        for (let i = 1; i + 1 < punti.length; i++) tri.push(0, i, i + 1);
        nuova.setIndex(tri);
        nuova.computeVertexNormals();
        o.geometry.dispose();
        o.geometry = nuova;
        riparate++;
    });
    return riparate;
}

// i quadrati neri: due cause, le sistemo su tutti i modelli
// 1. normali rotte (lunghe zero o NaN), frequenti nei file esportati da Rhino: la luce le fa nere → le ricalcolo
// 2. la "trasmissione" (vetro vero) su superfici visibili dai due lati e su tanti pezzi sovrapposti
//    dà macchie nere su molte schede grafiche → la sostituisco con una trasparenza semplice
function sistemaMateriali(radice) {
    radice.traverse(function (o) {
        if (!o.isMesh) return;

        const n = o.geometry.attributes.normal;
        let rotte = !n;
        for (let i = 0; n && i < n.count && !rotte; i++) {
            const l = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
            if (!(l > 0.5)) rotte = true;          // !(l > 0.5) è vero anche se l è NaN
        }
        if (rotte) o.geometry.computeVertexNormals();

        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mat) {
            mat.side = THREE.DoubleSide;            // i file di Rhino hanno spesso facce girate
            if (mat.transmission > 0) {
                mat.opacity = 1 - 0.65 * mat.transmission;
                mat.transmission = 0;
                mat.transparent = true;
                mat.depthWrite = false;             // le parti trasparenti non si coprono a vicenda
            }
        });
    });
}

// da che parte guarda il frontale? +1 = verso +z, -1 = verso -z, 0 = non si capisce.
// Il frontale è il lato dove ci sono punti anche al centro (il ponte sul naso);
// dal lato delle stanghette i punti stanno solo ai due estremi, a destra e a sinistra.
function trovaFrontale(radice) {
    radice.updateMatrixWorld(true);
    const punti = [];
    const p = new THREE.Vector3();
    radice.traverse(function (o) {
        if (!o.isMesh) return;
        const pos = o.geometry.attributes.position;
        const passo = Math.max(1, Math.floor(pos.count / 3000));
        for (let i = 0; i < pos.count; i += passo) {
            punti.push(p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone());
        }
    });
    const scatola = new THREE.Box3().setFromPoints(punti);
    const cx = (scatola.min.x + scatola.max.x) / 2;
    const larghezza = scatola.max.x - scatola.min.x;
    const profondita = scatola.max.z - scatola.min.z;
    function alCentro(z0, z1) {
        return punti.filter(function (q) {
            return q.z >= z0 && q.z <= z1 && Math.abs(q.x - cx) < 0.15 * larghezza;
        }).length;
    }
    const davanti = alCentro(scatola.max.z - 0.25 * profondita, scatola.max.z);
    const dietro = alCentro(scatola.min.z, scatola.min.z + 0.25 * profondita);
    if (davanti === dietro) return 0;
    return davanti > dietro ? 1 : -1;
}

// un nome leggibile: "STANGHETTA_SX" → "Stanghetta sx", "Plastica (3)" → "Plastica", "Livello 01" → "Livello"
function nomeLeggibile(n) {
    const t = n.replace(/[_]+/g, ' ').replace(/\s*\(\d+\)$/, '').replace(/\s+\d+$/, '').trim();
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}


// il nome del materiale per la scheda.
// Se il file dice il materiale (Plastica, Vetro, Metal…) lo uso, tradotto in italiano.
// Se non lo dice (nome vuoto, oppure il nome di una parte come "Montatura" o "Occhiali1"):
// Vetro per le lenti (parte con "lent"/"lens" nel nome), Plastica per la struttura.
// E il vetro solo per le lenti: una stanghetta chiamata "Vetro" nel file diventa Plastica.
const MATERIALI_NOTI = [
    [/vetro|glass/i, 'Vetro'],
    [/plasti/i, 'Plastica'],
    [/metal/i, 'Metallo'],
    [/gomma|rubber/i, 'Gomma'],
    [/acetat/i, 'Acetato']
];

// una parte è una lente se il suo nome lo dice
export function eLente(nomeParte) {
    return /lent|lens|vetro|glass/i.test(nomeParte || '');
}

function nomeMateriale(nomeFile, componente, trasparente) {
    const eLente = /lent|lens|vetro|glass/i.test(componente || '') ||
                   (!componente && (/lent|lens/i.test(nomeFile || '') || trasparente));
    const noto = MATERIALI_NOTI.find(function ([regola]) { return regola.test(nomeFile || ''); });
    // il vetro va bene solo per le lenti: se il file chiama "Vetro" una stanghetta, è plastica
    if (noto && !(noto[1] === 'Vetro' && !eLente)) return noto[1];
    return eLente ? 'Vetro' : 'Plastica';
}


/* ===== 3. caricare e preparare un modello =====
   Restituisce: { oggetto, misure (mm), tolti, pezzi, vertici, triangoli, componenti, colori } */
const caricatore = new GLTFLoader();

export async function caricaModello(m) {
    const gltf = await caricatore.loadAsync(CARTELLA + m.file);
    const radice = gltf.scene;

    // tolgo linee e punti (le curve di Rhino) e i pezzi con i nomi da nascondere
    const daTogliere = [];
    radice.traverse(function (o) {
        if (o.isLine || o.isPoints) daTogliere.push(o);
        else if ((m.nascondi || []).includes(o.name)) daTogliere.push(o);
    });
    const contati = new Set();
    daTogliere.forEach(function (o) {
        o.traverse(function (x) { if (x.isMesh || x.isLine || x.isPoints) contati.add(x); });
        if (o.parent) o.parent.remove(o);
    });

    riparaFacce(radice);
    sistemaMateriali(radice);

    if (m.rotazione) radice.rotation.set(...m.rotazione.map(THREE.MathUtils.degToRad));
    if (trovaFrontale(radice) < 0) radice.rotation.y += Math.PI;   // il frontale deve guardare verso +z

    // centro il modello e lo porto a una grandezza standard (largo circa 2)
    const contenitore = new THREE.Group();
    contenitore.add(radice);
    const scatola = new THREE.Box3().setFromObject(radice);
    const misure = scatola.getSize(new THREE.Vector3());
    radice.position.sub(scatola.getCenter(new THREE.Vector3()));
    contenitore.scale.setScalar(2 / Math.max(misure.x, misure.y, misure.z));

    // le informazioni per la scheda: pezzi, vertici, triangoli, componenti, colori
    let pezzi = 0, vertici = 0, triangoli = 0;

    // il livello delle parti: di solito i figli della radice; se la radice ha un solo figlio
    // che contiene tutto (es. un gruppo "occhiale"), scendo di un livello
    let livello = radice;
    while (livello.children.length === 1 && livello.children[0].children.length > 1) livello = livello.children[0];

    // il nome di una parte, con le correzioni del modello (m.nomiParti) per i nomi poco chiari
    function nomeParte(n) {
        const leggibile = nomeLeggibile(n);
        return (m.nomiParti && m.nomiParti[leggibile.toLowerCase()]) || leggibile;
    }

    // prima raccolgo pezzo per pezzo: la parte (dal gruppo del file) e i materiali
    const elenco = [];      // { gruppo, mat, mesh, indice }  (indice: quale materiale, se il pezzo ne ha più di uno)
    radice.traverse(function (o) {
        if (!o.isMesh) return;
        pezzi++;
        const g = o.geometry;
        vertici += g.attributes.position.count;
        triangoli += (g.index ? g.index.count : g.attributes.position.count) / 3;
        let x = o, gruppo = '';
        while (x && x !== livello) { if (x.name && x.parent === livello) gruppo = x.name; x = x.parent; }
        if (/^(mesh|node|object|oggetto)(_?\d+)?$/i.test(gruppo)) gruppo = '';   // nomi automatici: non dicono niente
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mat, indice) {
            elenco.push({ gruppo: gruppo, mat: mat, mesh: o, indice: Array.isArray(o.material) ? indice : -1 });
        });
    });

    // se il file non ha almeno due gruppi con un nome, le parti le prendo dai nomi dei materiali
    // (es. un pezzo unico con i materiali "Montatura" e "Lenti")
    const gruppiConNome = new Set(elenco.map(function (e) { return e.gruppo; }).filter(Boolean));
    const usaMateriali = gruppiConNome.size < 2;

    // le parti: nome, se è una lente, i suoi pezzi (con i materiali) e il materiale per la scheda
    const parti = new Map();
    elenco.forEach(function (e) {
        const grezzo = usaMateriali ? (e.mat.name || e.gruppo) : (e.gruppo || e.mat.name);
        const nome = grezzo ? nomeParte(grezzo) : 'Montatura';
        if (!parti.has(nome)) {
            parti.set(nome, { nome: nome, lente: eLente(nome), pezzi: [], mesh: new Set(), materiali: new Set() });
        }
        const p = parti.get(nome);
        p.pezzi.push({ mesh: e.mesh, indice: e.indice, mat: e.mat });
        p.mesh.add(e.mesh);
        const trasparente = e.mat.transparent && e.mat.opacity < 1;
        p.materiali.add((m.materialiParti && m.materialiParti[nome.toLowerCase()]) || nomeMateriale(e.mat.name, nome, trasparente));
    });

    // la voce "Materiali" della scheda: di che cosa sono le lenti e di che cosa la struttura
    const materialiLente = new Set(), materialiStruttura = new Set();
    parti.forEach(function (p) {
        p.materiali.forEach(function (nome) { (p.lente ? materialiLente : materialiStruttura).add(nome); });
    });

    const elencoParti = [...parti.values()].map(function (p) {
        return { nome: p.nome, lente: p.lente, pezzi: p.pezzi, quanti: p.mesh.size };
    });

    return {
        oggetto: contenitore,
        misure: misure.multiplyScalar(1000),     // metri → millimetri
        tolti: contati.size,
        pezzi: pezzi,
        vertici: vertici,
        triangoli: Math.round(triangoli),
        parti: elencoParti,
        materiali: { lente: [...materialiLente], struttura: [...materialiStruttura] }
    };
}

// "L 158 × A 68 × P 155 mm"
export function testoMisure(s) {
    return 'L ' + Math.round(s.x) + ' × A ' + Math.round(s.y) + ' × P ' + Math.round(s.z) + ' mm';
}


/* ===== 4. luci e inquadratura comuni ===== */

export const COLORE_FONDO = '#f3f0ea';

export function scenaConLuci(renderer) {
    const scena = new THREE.Scene();
    scena.background = new THREE.Color(COLORE_FONDO);   // serve alle lenti trasparenti
    scena.add(new THREE.HemisphereLight(0xffffff, 0xe8e0d0, 1.2));
    const luce = new THREE.DirectionalLight(0xffffff, 1.6);
    luce.position.set(-2, 3, 3);
    scena.add(luce);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
    return scena;
}

// la camera di tre quarti, davanti (dopo la correzione tutti gli occhiali guardano verso +z)
export function inquadra(camera, distanza) {
    camera.position.set(-0.9, 0.5, 1.5).normalize().multiplyScalar(distanza);
    camera.lookAt(0, 0, 0);
}
