# Berlin — Carnet Photo BÊTA 2.2

Correctif carte : ajout d’une feuille de style Leaflet locale de secours pour éviter l’affichage en tuiles dispersées lorsque la CSS du CDN ne se charge pas.

Remplacer tous les fichiers du dépôt GitHub par le contenu de ce dossier, y compris `leaflet-fallback.css`.

# Carnet Photo Berlin — BÊTA 2

Cette version corrige les retours de la première bêta.

## Changements principaux
- 75 lieux au total : les 55 lieux Berlin du CSV + 18 ajouts + ibis Styles Berlin Mitte + Messe Berlin.
- Les 75 coordonnées sont intégrées dans `data.js` : la carte ne dépend plus d’un géocodage au premier lancement.
- `Catégories` et `Quartiers` sont deux vues différentes avec de vrais groupes et leurs compteurs.
- Un groupe peut être envoyé directement sur la carte ; les filtres restent actifs en changeant d’onglet.
- Photos signalées en V1 : recherches corrigées et plusieurs photos Wikimedia fixées manuellement. Si aucune image pertinente ne peut être chargée, l’app affiche `PHOTO À VALIDER` au lieu d’une photo sans rapport.
- Hotel et Messe Berlin sont dans `Repères du séjour`, avec des marqueurs distincts.
- Boutons `Voir tous`, `Me localiser`, itinéraire Google Maps et Plans.
- Cache PWA V2 mis à jour pour éviter que l’ancienne bêta reste affichée après un déploiement.

## Mise à jour GitHub Pages
Remplacer les fichiers à la racine du dépôt Berlin par tous les fichiers de ce dossier, puis valider le commit. Après le déploiement GitHub Pages, recharger le site. Sur iPhone si une ancienne version reste ouverte, fermer puis rouvrir la web-app ; le nouveau service worker supprimera le cache V1.
