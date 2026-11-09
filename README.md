# Revente PFC : suivi des reventes Paris FC

Application privée pour suivre la revente des places d'abonnement (Paris FC), les prix conseillés et les ventes encaissées. Utilisée à deux (Rachid et Sylvain), depuis n'importe où.

**Adresse :** https://crachdev.github.io/revente-pfc/

## Ce que fait l'application

- **Deux vues** (bouton « Vue complète / Vue simple », mémorisé sur l'appareil) : la vue simple affiche l'essentiel, la vue complète donne accès à tout.
- **Onglet Matchs** : les matchs à domicile avec le logo du club adverse, leur statut (pas encore ouverte, ouverte à poster, en vente, vendue, prêtée, non vendue, gardée), le prix conseillé et les paliers de baisse (J-7, J-3, J-1). Sur un match « en vente », un bloc « Vendue ? » enregistre la vente (prix + commission) en un geste. Boutons « Google Agenda », « .ics » et « Partager » sur chaque match.
- **Onglet Finances** : bilan de la saison, rentabilité de l'abonnement de chacun, qui doit quoi à qui (ventes encaissées, règlement du club, virements entre vous), saisie et import de ventes, totaux par saison et par année fiscale, export Excel.
- **Alerte e-mail quotidienne** à 12h (heure de Paris) quand il y a quelque chose à faire, et notification push sur les téléphones qui l'ont activée.
- **Sauvegarde hebdomadaire** par e-mail (fichier JSON) et outil de **restauration** dans la vue complète.
- **Application installable** (écran d'accueil du téléphone), qui démarre aussi sans réseau en lecture seule.

L'ouverture d'une revente est notée à la main dans l'appli (un clic) : le site de billetterie du club bloque les robots, elle ne peut pas être détectée automatiquement.

## Règles de calcul

- Net d'une vente = prix de la paire − commission du club.
- « Par personne » = total net ÷ 2 (vous êtes deux).
- Saison du 1er août au 31 juillet ; une vente compte dans la saison de **son match**. Année fiscale = année civile de la date de la vente.
- Une vente est liée à son match par `matchId`.

## Comptes

Deux comptes séparés, chacun avec son mot de passe : Rachid et Sylvain. Le mot de passe se change dans l'appli (section « Mon mot de passe »).

## Comment c'est construit

| Élément | Rôle |
|---|---|
| `index.html` | Toute l'application (une seule page), hébergée par GitHub Pages |
| `config.js` | Configuration publique Firebase et liste des utilisateurs |
| `sw.js`, `manifest.json`, `icons/` | Application installable, cache hors connexion, notifications push |
| `scripts/alerte.js` | Alerte e-mail + push quotidienne |
| `scripts/sauvegarde.js` | Sauvegarde hebdomadaire envoyée par e-mail |
| `.github/workflows/` | Planification des deux scripts |

Les données sont dans Firebase (projet Revente-pfc, base Firestore, plan gratuit) :

- `revente_matches` : un document par match ;
- `revente_config/main` : grille de prix, dernière vérification, clé web push ;
- `revente_config/ventes` : les ventes (`v`) et les virements (`t`) ;
- `revente_config/abonnements` : les abonnements de chacun ;
- `revente_config/push` : les appareils qui reçoivent les notifications.

La grille de prix existe dans l'appli et dans `scripts/alerte.js` (constante `DEF` et formule `plan`) : les deux doivent rester identiques.

## Entretien

**Secrets GitHub** (Settings → Secrets and variables → Actions) :

- `FIREBASE_SERVICE_ACCOUNT` : contenu du fichier `.json` d'un compte de service Firebase.
- `GMAIL_APP_PASSWORD` : mot de passe d'application Gmail (16 caractères).
- `MAIL_TO` : adresse(s) qui reçoivent l'alerte et la sauvegarde, séparées par une virgule.

**Changer la clé Firebase** : Firebase → Paramètres du projet → Comptes de service → Générer une nouvelle clé privée, remplacer le secret `FIREBASE_SERVICE_ACCOUNT`, puis supprimer l'ancienne clé dans Firebase.

**Tester l'alerte** : onglet Actions → « Alerte quotidienne revente » → Run workflow (s'il n'y a rien à signaler, une notification « Test » est envoyée aux appareils enregistrés).

**Activer le push** : Firebase → Paramètres du projet → Cloud Messaging → Certificats Web Push → générer une paire de clés ; dans l'appli (vue complète → « Notifications push »), coller la clé une fois, puis activer sur chaque téléphone (iPhone : appli installée sur l'écran d'accueil).

**Restaurer une sauvegarde** : vue complète → « Restaurer une sauvegarde » → choisir le fichier JSON reçu par e-mail → vérifier l'aperçu → confirmer.

**Mettre à jour l'application** : remplacer les fichiers modifiés dans le dépôt (Add file → Upload files). Le site se met à jour en 1 à 3 minutes ; recharger l'appli. Annuler une modification : ouvrir le commit concerné → Revert.

## Règles de sécurité Firebase

Les collections `revente_matches` et `revente_config` doivent n'être lisibles et modifiables que par les deux comptes (Rachid et Sylvain), et l'inscription libre doit être désactivée dans Firebase Authentication.

## Limites connues

- Pas de détection automatique des ouvertures de revente (site du club protégé contre les robots).
- La revente est autorisée uniquement sur la plateforme officielle du club (CGV abonnements 2026-27, art. 2.7.2).
- Les ventes importées depuis la billetterie portent la date du match, pas celle de la vente.
- Le push web sur iPhone est moins fiable qu'une application native.
