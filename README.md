# Revente PFC : suivi des reventes Paris FC

Application privée pour suivre la revente des places d'abonnement (Paris FC), les prix conseillés et les ventes encaissées. Utilisée à deux (Rachid et Sylvain), depuis n'importe où.

**Adresse :** https://crachdev.github.io/revente-pfc/

## Ce que fait l'application

- **Onglet Matchs** : les matchs à domicile, leur statut (pas encore ouverte, ouverte à poster, en vente, vendue, gardée), le prix conseillé et les prochains paliers de baisse (J-7, J-3, J-1).
- **Onglet Finances** : saisie des ventes (prix de la paire, commission du club), totaux par saison (1er août au 31 juillet) et par année fiscale (année civile), import de ventes et export Excel (3 feuilles : Ventes, Par saison, Par année fiscale).
- **Alerte e-mail quotidienne** à 12h (heure de Paris) quand il y a quelque chose à faire (revente ouverte à poster, baisse de prix, match à surveiller).

L'ouverture d'une revente est notée à la main dans l'appli (un clic) : le site de billetterie du club bloque les robots, elle ne peut pas être détectée automatiquement.

## Comptes

Deux comptes séparés, chacun avec son mot de passe : Rachid et Sylvain. Le mot de passe se change dans l'appli (section « Mon mot de passe »).

## Comment c'est construit

| Élément | Rôle |
|---|---|
| `index.html` | Toute l'application (une seule page), hébergée par GitHub Pages |
| `config.js` | Configuration publique Firebase et liste des utilisateurs |
| `scripts/alerte.js` | Programme de l'alerte e-mail quotidienne |
| `.github/workflows/alerte-quotidienne.yml` | Planification de l'alerte (tous les jours, 12h Paris) |

Les données sont dans Firebase (projet Revente-pfc, base Firestore, plan gratuit) : collection `revente_matches` (les matchs), document `revente_config/main` (grille de prix) et document `revente_config/ventes` (les ventes).

## Entretien

**Secrets GitHub** (Settings → Secrets and variables → Actions) :

- `FIREBASE_SERVICE_ACCOUNT` : contenu du fichier `.json` d'un compte de service Firebase.
- `GMAIL_APP_PASSWORD` : mot de passe d'application Gmail (16 caractères).
- `MAIL_TO` : adresse(s) qui reçoivent l'alerte, séparées par une virgule.

**Changer la clé Firebase** : Firebase → Paramètres du projet → Comptes de service → Générer une nouvelle clé privée, remplacer le secret `FIREBASE_SERVICE_ACCOUNT`, puis supprimer l'ancienne clé dans Firebase.

**Tester l'alerte** : onglet Actions → « Alerte quotidienne revente » → Run workflow.

**Ajouter un destinataire** : modifier le secret `MAIL_TO` (`adresse1,adresse2`).

**Mettre à jour l'application** : remplacer `index.html` dans le dépôt (Add file → Upload files). Le site se met à jour en 1 à 2 minutes ; recharger avec Ctrl+F5.

## Règles de sécurité Firebase

Les collections `revente_matches` et `revente_config` ne sont lisibles et modifiables que par un utilisateur connecté (`request.auth != null`).

## Limites connues

- Pas de détection automatique des ouvertures de revente (site du club protégé contre les robots).
- La revente est autorisée uniquement sur la plateforme officielle du club (CGV abonnements 2026-27, art. 2.7.2).
- Les ventes importées depuis la billetterie portent la date du match, pas celle de la vente.
