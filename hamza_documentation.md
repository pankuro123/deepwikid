# Documentation Technique DeepWiki

Ce document présente le fonctionnement technique du projet DeepWiki, les procédures d'installation ainsi que les fonctionnalités spécifiques implémentées.

## Présentation du projet

DeepWiki est un outil d'analyse de dépôts de code conçu pour générer automatiquement des wikis structurés et interactifs. En s'appuyant sur des modèles d'intelligence artificielle, il analyse la structure du code source pour produire des explications textuelles, des diagrammes d'architecture (via Mermaid) et offre une interface de question-réponse basée sur le contenu du dépôt.

---

## Guide d'installation et d'exécution

Le projet peut être déployé selon deux méthodes principales, en fonction de l'environnement cible.

### Déploiement via Docker
Cette méthode est recommandée pour une mise en service rapide et isolée.
1. Configurez le fichier `.env` à la racine avec les clés API nécessaires (Google Gemini, OpenAI, etc.).
2. Exécutez la commande : `docker-compose up`.
3. L'interface est accessible à l'adresse [http://localhost:3000](http://localhost:3000).

### Installation manuelle pour le développement
Pour les environnements de développement nécessitant des modifications du code source :
1. **Serveur API (Backend)** : Accédez au répertoire `api`, installez les dépendances via `poetry install`, puis lancez le serveur avec `python -m api.main`.
2. **Interface Utilisateur (Frontend)** : À la racine du projet, installez les dépendances avec `npm install` et lancez le serveur de développement avec `npm run dev`.
3. Le service sera disponible par défaut sur le port 3000.

Pour plus de précisions sur les variables d'environnement, veuillez consulter le fichier [README.fr.md](file:///c:/Users/hp/deepwiki-open/README.fr.md).

---

## 1. Exportation des rapports au format PDF

Le système propose une fonctionnalité d'exportation de la documentation au format PDF, implémentée côté client pour optimiser les ressources serveur.

**Processus technique :**
- L'activation du bouton de téléchargement déclenche la fonction `downloadPdf` située dans [page.tsx](file:///c:/Users/hp/deepwiki-open/src/app/[owner]/[repo]/page.tsx).
- Cette fonction agrège dynamiquement l'ensemble des pages du wiki généré.
- Un nouveau contexte de navigation est créé via `window.open` pour y injecter le contenu HTML formaté.
- Un style spécifique inspiré de LaTeX (police CMU Serif) est appliqué pour garantir un rendu professionnel.
- Les diagrammes Mermaid sont ré-initialisés dans ce contexte pour assurer leur rendu avant l'appel à la fonction `window.print()`.

---

## 2. Intégration des dépôts Bitbucket Server (BNPP)

Le projet supporte les instances GitLab et Bitbucket spécifiques, notamment les structures d'URL utilisées au sein de l'environnement BNPP (Echonet).

**Mécanisme de détection :**
Les utilitaires de décodage d'URL dans [urlDecoder.tsx](file:///c:/Users/hp/deepwiki-open/src/utils/urlDecoder.tsx) intègrent une logique de reconnaissance du motif `/scm/`, caractéristique de Bitbucket Server.
- Le système identifie automatiquement la plateforme source (GitHub, GitLab ou Bitbucket Server).
- Les liens de navigation vers le code source sont reconstruits dynamiquement pour pointer vers les instances internes de l'entreprise, permettant une transition fluide entre la documentation et le code.

---

## 3. Modes de rapport : Fonctionnel et Technique

L'utilisateur peut définir le niveau de détail de la documentation générée via une option de configuration préalable.

- **Mode Fonctionnel** : Destiné aux profils orientés gestion de produit (Product Owners). Le contenu privilégie la description des processus métier, les cas d'utilisation et les fonctionnalités utilisateur.
- **Mode Technique** : Destiné aux profils techniques. Le contenu détaille les choix d'architecture, les patterns de conception, les interactions entre modules et les structures de données.

Le mode sélectionné modifie les instructions de génération (prompts) définies dans [prompts.ts](file:///c:/Users/hp/deepwiki-open/src/utils/prompts.ts).

---

## 4. Téléchargement de projets par archive ZIP

Pour les projets ne disposant pas d'un accès Git direct ou pour des tests locaux, une fonction d'importation par archive ZIP est disponible.

**Flux opérationnel :**
1. L'archive sélectionnée est transmise à la route API [zip-upload-proxy/route.ts](file:///c:/Users/hp/deepwiki-open/src/app/api/zip-upload-proxy/route.ts).
2. Ce proxy assure le transfert du flux binaire vers le backend FastAPI.
3. Le serveur backend procède à l'extraction dans un répertoire temporaire et traite les fichiers comme un dépôt standard.

---

## 5. Interface d'analyse des tickets Jira

Une interface dédiée permet de transformer les exports de tickets Jira au format PDF en spécifications techniques consolidées.

**Fonctionnement :**
- Accessible via [jira/page.tsx](file:///c:/Users/hp/deepwiki-open/src/app/jira/page.tsx).
- Le traitement du document PDF permet d'extraire les données textuelles brutes.
- Un algorithme de clustering regroupe les tickets par domaines fonctionnels ou techniques.
- Les résultats sont présentés sous forme de tableaux structurés, facilitant l'élaboration de backlogs de développement.

---

## Informations complémentaires

- **Internationalisation** : Le projet supporte plusieurs langues de génération via le `LanguageContext`.
- **Interface visuelle** : L'interface propose un mode sombre accessible via le composant `ThemeToggle`.
