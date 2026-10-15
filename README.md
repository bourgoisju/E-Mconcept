# EM Concept — site vitrine

Site d'E&M Concept, intégrateur son, vidéo et réseau, électricien à Roquebrune-sur-Argens (Var).
HTML / CSS / JavaScript sans dépendance ni étape de build : on modifie, on recharge, on publie.

## Structure

```
index.html              Page d'accueil (hero, services, réalisations, méthode, contact)
mentions-legales.html   Mentions légales et RGPD
assets/css/styles.css   Styles (tokens de couleur en tête de fichier)
assets/js/main.js       Interactions : menu mobile, animations, galerie, visionneuse, formulaire
assets/img/             Photos optimisées (640 px et 1280 px), logo, icônes
robots.txt, sitemap.xml, site.webmanifest
tools/serve.ps1         Petit serveur local pour prévisualiser
docs/motion-system.md   Spécification des animations (jetons, timings, comportements)
```

## Prévisualiser en local

```powershell
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

Puis ouvrir http://localhost:8080.

## Mettre en ligne (GitHub Pages, gratuit)

1. Pousser la branche `main` sur GitHub.
2. Sur GitHub : **Settings → Pages → Build and deployment → Deploy from a branch**, choisir `main` et `/ (root)`.
3. Le site est publié sur https://bourgoisju.github.io/E-Mconcept/.

Si vous prenez un nom de domaine (par exemple `emconcept83.fr`), remplacez l'URL
`https://bourgoisju.github.io/E-Mconcept/` dans `index.html`, `mentions-legales.html`,
`robots.txt` et `sitemap.xml`.

## Formulaire de contact

Le formulaire envoie les demandes vers e.mconcept83@gmail.com via [FormSubmit](https://formsubmit.co), sans serveur.
**La première fois** qu'une demande est envoyée depuis le site en ligne, FormSubmit envoie un e-mail
d'activation à cette adresse : il faut cliquer sur le lien une seule fois. Si l'envoi échoue,
le visiteur se voit proposer d'appeler ou d'écrire directement.

## Ajouter une réalisation

1. Exporter la photo en JPEG, en 640 px et 1280 px de large (`nom-640.jpg`, `nom-1280.jpg`) dans `assets/img/`.
2. Copier un bloc `<li class="gallery-item">` dans `index.html`, puis changer les images, le texte `alt`, la légende
   et `data-cat` (`electricite`, `reseau`, `audiovisuel`, `eclairage`, plusieurs possibles).
   Ajouter `tall` (photo verticale) ou `wide` (photo panoramique) à la classe si besoin.

## À compléter avant la mise en ligne

- Mentions légales : forme juridique, capital, adresse complète du siège, n° de TVA, assurance professionnelle
  (voir le commentaire dans `mentions-legales.html`).
