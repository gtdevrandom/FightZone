const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let myId = null;
let players = {}; // Stocke tous les joueurs
let me = { x: 0, y: 0, color: 'white', name: '' };

// 1. Démarrage du jeu
function startGame() {
    const nameInput = document.getElementById('username').value || "Joueur";
    document.getElementById('ui-layer').style.display = 'none';

    // Connexion Anonyme
    auth.signInAnonymously().then((userCredential) => {
        myId = userCredential.user.uid;
        me.name = nameInput;
        me.x = Math.random() * canvas.width;
        me.y = Math.random() * canvas.height;
        me.color = `hsl(${Math.random() * 360}, 70%, 50%)`;

        // Créer la référence du joueur dans Firebase
        const playerRef = database.ref('players/' + myId);
        playerRef.set(me);

        // IMPORTANT : Si je me déconnecte, supprimer mon perso
        playerRef.onDisconnect().remove();

        // Écouter les mouvements des claviers
        setupControls();
        
        // Lancer la boucle
        requestAnimationFrame(gameLoop);
    });
}

// 2. Écouter les changements des autres joueurs (RÉSEAU)
database.ref('players').on('value', (snapshot) => {
    players = snapshot.val() || {};
});

// 3. Contrôles
const keys = {};
function setupControls() {
    window.addEventListener('keydown', (e) => keys[e.key] = true);
    window.addEventListener('keyup', (e) => keys[e.key] = false);
}

// 4. Boucle de jeu (60 FPS)
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mouvement local
    if (myId) {
        let moved = false;
        if (keys['ArrowUp'] || keys['z']) { me.y -= 5; moved = true; }
        if (keys['ArrowDown'] || keys['s']) { me.y += 5; moved = true; }
        if (keys['ArrowLeft'] || keys['q']) { me.x -= 5; moved = true; }
        if (keys['ArrowRight'] || keys['d']) { me.x += 5; moved = true; }

        // Mettre à jour Firebase seulement si on bouge (optimisation)
        if (moved) {
            database.ref('players/' + myId).update({ x: me.x, y: me.y });
        }
    }

    // Dessiner tous les joueurs
    for (let id in players) {
        const p = players[id];
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2); // Le joueur est un cercle
        ctx.fill();
        
        // Pseudo
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(p.name, p.x, p.y - 30);
    }

    requestAnimationFrame(gameLoop);
}