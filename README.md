# Mini Craft Multijoueur

Version multijoueur de **Mini Craft** (clone Minecraft dans le navigateur).

- Joueurs visibles en temps réel (avatars)
- Salles avec code à 6 caractères
- Chat partagé
- Même serveur WebSocket pour tous
- Déploiement gratuit sur [Render](https://render.com)

## Lancer en local

```bash
npm install
npm start
```

Ouvre **http://localhost:3000** dans deux onglets / navigateurs.

1. Entre un pseudo
2. Laisse le code vide pour **créer** une salle, ou entre le code d’un ami pour **rejoindre**
3. Clique **Rejoindre / Créer**

## Déployer sur Render (via GitHub)

### 1. Mettre le projet sur GitHub

```bash
cd minicraft-multi
git init
git add .
git commit -m "Mini Craft multijoueur"
# Crée un repo vide sur GitHub, puis :
git branch -M main
git remote add origin https://github.com/TON_USER/minicraft-multi.git
git push -u origin main
```

### 2. Créer un Web Service sur Render

1. Va sur [render.com](https://render.com) → **New +** → **Web Service**
2. Connecte ton compte GitHub et choisis le dépôt `minicraft-multi`
3. Réglages recommandés :

| Champ | Valeur |
|--------|--------|
| **Name** | `minicraft-multi` (ou autre) |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance type** | Free |
| **Health Check Path** | `/healthz` |

4. Clique **Create Web Service**

Quand le déploiement est vert, ton jeu est en ligne :  
`https://ton-service.onrender.com`

### 3. Jouer avec des amis

- Tout le monde ouvre la **même URL** Render
- Un joueur crée une salle (code vide) → récupère le code affiché
- Les autres collent ce code et cliquent **Rejoindre / Créer**

## Notes importantes

- **Free tier Render** : le service s’endort après ~15 min sans trafic. Le premier chargement peut prendre 30–60 s (cold start). Ensuite c’est fluide.
- Les **modifications de blocs** ne sont pas encore synchronisées (chaque client a son propre monde généré). Les joueurs se voient et peuvent discuter.
- Pour un vrai monde partagé (blocks, coffres…), il faudrait un serveur autoritaire beaucoup plus lourd — possible en v2.

## Structure

```
minicraft-multi/
├── package.json
├── server.js          # Express + Socket.io
├── public/
│   └── index.html     # Jeu + client multi
└── README.md
```

## Commandes utiles en jeu

Comme dans la version solo : `/help`, `/locate`, `/nether`, etc.  
Le chat normal (sans `/`) est aussi envoyé aux autres joueurs de la salle.
