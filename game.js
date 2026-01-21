const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Map boundaries
const MAP_PADDING = 50;
const MAP_WIDTH = canvas.width - MAP_PADDING * 2;
const MAP_HEIGHT = canvas.height - MAP_PADDING * 2;

let myId = null;
let players = {}; // Stocke tous les joueurs
let bullets = {}; // Stocke les projectiles du serveur
let me = { x: 0, y: 0, color: 'white', name: '', health: 100 };
const MAX_HEALTH = 100;

// 1. Démarrage du jeu
function startGame() {
    const nameInput = document.getElementById('username').value || "Joueur";
    document.getElementById('ui-layer').style.display = 'none';

    // Connexion Anonyme
    auth.signInAnonymously().then((userCredential) => {
        myId = userCredential.user.uid;
        me.name = nameInput;
        me.x = MAP_PADDING + Math.random() * MAP_WIDTH;
        me.y = MAP_PADDING + Math.random() * MAP_HEIGHT;
        me.color = document.getElementById('colorPicker').value;
        me.health = MAX_HEALTH;
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

    // Tirer au clic de souris
    window.addEventListener('mousedown', (e) => {
        if (!myId) return;

        // Calcul de la direction vers la souris
        const dx = e.clientX - me.x;
        const dy = e.clientY - me.y;
        const angle = Math.atan2(dy, dx);

        // Créer un projectile dans Firebase
        const bulletRef = database.ref('bullets').push();
        bulletRef.set({
            ownerId: myId,
            x: me.x,
            y: me.y,
            vx: Math.cos(angle) * 10, // Vitesse X
            vy: Math.sin(angle) * 10, // Vitesse Y
            color: me.color
        });

        // Supprimer le projectile après 2 secondes (portée)
        setTimeout(() => bulletRef.remove(), 2000);
    });
}

// Écouter les projectiles sur le réseau
database.ref('bullets').on('value', (snapshot) => {
    bullets = snapshot.val() || {};
});

// 4. Boucle de jeu (60 FPS)
function gameLoop() {
    // Fond stylé avec dégradé
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner la bordure de la map
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(MAP_PADDING, MAP_PADDING, MAP_WIDTH, MAP_HEIGHT);

    // Mouvement local
    if (myId) {
        let moved = false;
        if (keys['ArrowUp'] || keys['z']) { me.y -= 5; moved = true; }
        if (keys['ArrowDown'] || keys['s']) { me.y += 5; moved = true; }
        if (keys['ArrowLeft'] || keys['q']) { me.x -= 5; moved = true; }
        if (keys['ArrowRight'] || keys['d']) { me.x += 5; moved = true; }

        // Clamp aux limites de la map
        me.x = Math.max(MAP_PADDING + 20, Math.min(MAP_PADDING + MAP_WIDTH - 20, me.x));
        me.y = Math.max(MAP_PADDING + 20, Math.min(MAP_PADDING + MAP_HEIGHT - 20, me.y));

        // Mettre à jour Firebase seulement si on bouge (optimisation)
        if (moved) {
            database.ref('players/' + myId).update({ x: me.x, y: me.y });
        }
    }

    // Dessiner les projectiles
    for (let id in bullets) {
        const b = bullets[id];
        
        // Mise à jour locale de la position pour la fluidité
        b.x += b.vx;
        b.y += b.vy;

        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Détection de collision (très basique)
        if (myId && b.ownerId !== myId) {
            const dist = Math.hypot(me.x - b.x, me.y - b.y);
            if (dist < 25) { // 20 (taille joueur) + 5 (taille balle)
                me.health -= 10;
                console.log("Touché ! Santé: " + me.health);
                
                // Si mort, respawn
                if (me.health <= 0) {
                    me.health = MAX_HEALTH;
                    me.x = MAP_PADDING + Math.random() * MAP_WIDTH;
                    me.y = MAP_PADDING + Math.random() * MAP_HEIGHT;
                }
                
                database.ref('players/' + myId).update({ x: me.x, y: me.y, health: me.health });
                
                // Supprimer la bullet après collision
                database.ref('bullets').child(id).remove();
            }
        }
    }

    // Dessiner tous les joueurs
    for (let id in players) {
        const p = players[id];
        const health = p.health || MAX_HEALTH;
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Barre de santé
        const healthPercent = Math.max(0, health / MAX_HEALTH);
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(p.x - 20, p.y - 35, 40 * healthPercent, 4);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - 20, p.y - 35, 40, 4);
        
        // Pseudo et santé
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(p.name, p.x, p.y - 30);
        ctx.font = "10px Arial";
        ctx.fillText(Math.max(0, Math.floor(health)), p.x, p.y - 17);
    }

    requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
