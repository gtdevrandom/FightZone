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
let bulletTrails = {}; // Traînées des balles pour l'effet visuel

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
        gameLoop();
    });
}

// 2. Écouter les changements des autres joueurs (RÉSEAU)
database.ref('players').on('value', (snapshot) => {
    players = snapshot.val() || {};
});

// 3. Contrôles
const keys = {};
let controlsSetup = false;

function setupControls() {
    if (controlsSetup) return; // Éviter les doublons
    controlsSetup = true;
    
    window.addEventListener('keydown', (e) => keys[e.key] = true);
    window.addEventListener('keyup', (e) => keys[e.key] = false);

    // Tirer au clic de souris
    window.addEventListener('mousedown', (e) => {
        if (!myId) return;

        // Calcul de la direction vers la souris
        const dx = e.clientX - me.x;
        const dy = e.clientY - me.y;
        const angle = Math.atan2(dy, dx);

        console.log("Tir ! Angle:", angle, "Position:", me.x, me.y);

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

// Effets d'impact visuels
let impactEffects = [];

function createImpactEffect(x, y, color) {
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        impactEffects.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            life: 20,
            color: color
        });
    }
}

function updateImpactEffects() {
    for (let i = impactEffects.length - 1; i >= 0; i--) {
        const effect = impactEffects[i];
        effect.x += effect.vx;
        effect.y += effect.vy;
        effect.life--;
        
        const alpha = effect.life / 20;
        ctx.fillStyle = effect.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        if (effect.life <= 0) {
            impactEffects.splice(i, 1);
        }
    }
}

// 4. Boucle de jeu (60 FPS)
function gameLoop() {
    // Fond
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner les gradients de la map
    const gradient = ctx.createLinearGradient(MAP_PADDING, MAP_PADDING, MAP_PADDING + MAP_WIDTH, MAP_PADDING + MAP_HEIGHT);
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(50, 50, 100, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(MAP_PADDING, MAP_PADDING, MAP_WIDTH, MAP_HEIGHT);

    // Dessiner la bordure de la map avec meilleur style
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 15;
    ctx.strokeRect(MAP_PADDING, MAP_PADDING, MAP_WIDTH, MAP_HEIGHT);
    ctx.shadowBlur = 0;

    if (myId) {
        let moved = false;
        if (keys['ArrowUp'] || keys['z']) { me.y -= 5; moved = true; }
        if (keys['ArrowDown'] || keys['s']) { me.y += 5; moved = true; }
        if (keys['ArrowLeft'] || keys['q']) { me.x -= 5; moved = true; }
        if (keys['ArrowRight'] || keys['d']) { me.x += 5; moved = true; }

        me.x = Math.max(MAP_PADDING + 20, Math.min(MAP_PADDING + MAP_WIDTH - 20, me.x));
        me.y = Math.max(MAP_PADDING + 20, Math.min(MAP_PADDING + MAP_HEIGHT - 20, me.y));

        if (moved) {
            database.ref('players/' + myId).update({ x: me.x, y: me.y });
        }
    }

    // --- GESTION DES PROJECTILES ---
    for (let id in bullets) {
        const b = bullets[id];
        
        // Initialiser la traînée si elle n'existe pas
        if (!bulletTrails[id]) {
            bulletTrails[id] = [];
        }
        
        // On fait avancer la balle localement
        b.x += b.vx;
        b.y += b.vy;
        
        // Ajouter le point actuel à la traînée
        bulletTrails[id].push({ x: b.x, y: b.y });
        
        // Limiter la longueur de la traînée
        if (bulletTrails[id].length > 8) {
            bulletTrails[id].shift();
        }
        
        // Vérifier si la balle sort de la map
        const isOutOfBounds = b.x < MAP_PADDING || b.x > MAP_PADDING + MAP_WIDTH ||
                              b.y < MAP_PADDING || b.y > MAP_PADDING + MAP_HEIGHT;

        // Dessiner la traînée
        for (let i = 0; i < bulletTrails[id].length; i++) {
            const trail = bulletTrails[id][i];
            const alpha = (i / bulletTrails[id].length) * 0.6;
            ctx.fillStyle = `rgba(` + parseInt(b.color.slice(1, 3), 16) + `, ` + 
                            parseInt(b.color.slice(3, 5), 16) + `, ` + 
                            parseInt(b.color.slice(5, 7), 16) + `, ` + alpha + `)`;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Dessiner la balle principale avec effet de glow
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Bord de la balle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Détection de collision (seulement si la balle n'est pas la nôtre)
        if (myId && b.ownerId !== myId && !isOutOfBounds) {
            const dist = Math.hypot(me.x - b.x, me.y - b.y);
            if (dist < 25) { 
                me.health -= 10;
                // Créer un effet d'impact
                createImpactEffect(b.x, b.y, b.color);
                
                // On supprime la balle du serveur immédiatement après impact
                database.ref('bullets').child(id).remove();
                delete bulletTrails[id];
                
                if (me.health <= 0) {
                    me.health = MAX_HEALTH;
                    me.x = MAP_PADDING + Math.random() * MAP_WIDTH;
                    me.y = MAP_PADDING + Math.random() * MAP_HEIGHT;
                }
                database.ref('players/' + myId).update({ x: me.x, y: me.y, health: me.health });
            }
        }
        
        // Nettoyer les balles hors limites
        if (isOutOfBounds) {
            delete bulletTrails[id];
        }
    }

    // Dessiner tous les joueurs
    for (let id in players) {
        const p = players[id];
        const health = p.health || MAX_HEALTH;
        
        // Effet de glow autour du joueur
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Corps du joueur
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Bord du joueur
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Barre de santé (amélioration)
        const healthPercent = Math.max(0, health / MAX_HEALTH);
        const healthBarWidth = 50;
        const healthBarX = p.x - healthBarWidth / 2;
        const healthBarY = p.y - 40;
        
        // Fond de la barre
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(healthBarX - 2, healthBarY - 2, healthBarWidth + 4, 10);
        
        // Barre de santé avec dégradé
        const healthGradient = ctx.createLinearGradient(healthBarX, healthBarY, healthBarX + healthBarWidth, healthBarY);
        if (healthPercent > 0.5) {
            healthGradient.addColorStop(0, '#00ff00');
            healthGradient.addColorStop(1, '#ffff00');
        } else if (healthPercent > 0.25) {
            healthGradient.addColorStop(0, '#ffff00');
            healthGradient.addColorStop(1, '#ff6600');
        } else {
            healthGradient.addColorStop(0, '#ff0000');
            healthGradient.addColorStop(1, '#cc0000');
        }
        ctx.fillStyle = healthGradient;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, 6);
        
        // Texte du nom
        ctx.fillStyle = "white";
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 5;
        ctx.fillText(p.name, p.x, p.y - 50);
        ctx.shadowBlur = 0;
    }
    
    // Dessiner les effets d'impact
    updateImpactEffects();
    
    // Affichage de la santé du joueur
    if (myId) {
        const healthPercent = Math.max(0, me.health / MAX_HEALTH);
        
        // Afficher la barre de santé du joueur en bas de l'écran
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, canvas.height - 40, 200, 30);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Santé: ' + Math.ceil(me.health) + '/' + MAX_HEALTH, 20, canvas.height - 20);
        
        // Barre de santé
        const gradient = ctx.createLinearGradient(20, canvas.height - 35, 200, canvas.height - 35);
        if (healthPercent > 0.5) {
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(1, '#ffff00');
        } else if (healthPercent > 0.25) {
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(1, '#ff6600');
        } else {
            gradient.addColorStop(0, '#ff0000');
            gradient.addColorStop(1, '#cc0000');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(20, canvas.height - 35, 170 * healthPercent, 8);
        
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(20, canvas.height - 35, 170, 8);
    }

    requestAnimationFrame(gameLoop);
}
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
