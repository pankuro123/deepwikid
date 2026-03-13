# 📦 Upload ZIP — Guide de fonctionnement

## Est-ce que ça marchera sur ma machine de dev ?

**✅ Oui, ça fonctionne en local sans aucune dépendance externe.**

Le flux d'upload ZIP est **100% local** — aucune connexion internet n'est nécessaire, contrairement au clonage de repos Git.

---

## Comment ça marche (flux technique)

```
┌─────────────┐     POST /upload/project     ┌──────────────┐
│  Navigateur  │ ──── fichier .zip ────────► │  Backend API  │
│  (Next.js)   │                              │  (FastAPI)    │
└─────────────┘                              └──────┬───────┘
                                                     │
                                              Extraction ZIP
                                                     │
                                                     ▼
                                        ~/.adalflow/uploads/{uuid}/
                                              (fichiers extraits)
                                                     │
                                              Chemin retourné
                                                     │
                                                     ▼
                                          Traitement comme un
                                          projet local existant
```

## Prérequis

| Élément | Requis ? | Détail |
|---------|----------|--------|
| Internet | ❌ Non | Tout est local |
| Git | ❌ Non | Pas de `git clone`, les fichiers sont déjà extraits |
| Token Bitbucket | ❌ Non | Pas d'accès à un serveur distant |
| Certificat SSL | ❌ Non | Pas de requête HTTPS externe |
| Clé API (OpenAI/Google) | ✅ Oui | Nécessaire pour la génération du wiki (LLM) |
| Python + FastAPI | ✅ Oui | Le backend doit tourner |
| Node.js + Next.js | ✅ Oui | Le frontend doit tourner |

## Étapes pour tester

### 1. Préparer un fichier ZIP

```
Clic droit sur le dossier du projet → Envoyer vers → Dossier compressé
```

Ou avec PowerShell :
```powershell
Compress-Archive -Path "C:\chemin\vers\mon-projet\*" -DestinationPath "C:\Users\hp\Desktop\mon-projet.zip"
```

### 2. Lancer DeepWiki

```powershell
# Terminal 1 — Backend
cd c:\Users\hp\deepwiki-open
python -m api.main

# Terminal 2 — Frontend
cd c:\Users\hp\deepwiki-open
npm run dev
```

### 3. Utiliser l'upload

1. Ouvrir `http://localhost:3000`
2. Cliquer sur le bouton **"Upload ZIP"** (à côté de "Generate Wiki")
3. Sélectionner le fichier `.zip`
4. Attendre l'upload (spinner visible)
5. Le champ de saisie se remplit automatiquement avec le chemin serveur
6. Le modal de configuration s'ouvre → cliquer **"Generate Wiki"**

## Où sont stockés les fichiers uploadés ?

```
~/.adalflow/uploads/
├── a1b2c3d4/          ← upload 1
│   └── mon-projet/
│       ├── src/
│       ├── package.json
│       └── ...
├── e5f6g7h8/          ← upload 2
│   └── autre-projet/
└── ...
```

Chaque upload crée un sous-dossier avec un UUID unique. Les fichiers restent sur le disque local.

## Limitations connues

| Limitation | Détail |
|------------|--------|
| Taille max | Pas de limite côté code, mais la mémoire RAM sera le facteur limitant pour de très gros projets |
| Format | Uniquement `.zip` (pas `.tar.gz`, `.rar`, etc.) |
| Structure | Le ZIP doit contenir un dossier de projet avec le code source |
| Nettoyage | Les fichiers extraits ne sont pas supprimés automatiquement — pensez à vider `~/.adalflow/uploads/` de temps en temps |

## Résumé

> **Cette fonctionnalité est idéale pour un poste de dev BNP Paribas** car elle ne nécessite aucune connexion réseau vers un serveur Git. Il suffit de zipper le projet localement, de l'uploader via le navigateur, et DeepWiki s'occupe du reste. La seule connexion externe requise est celle vers l'API LLM (OpenAI ou Google) pour la génération du wiki.
