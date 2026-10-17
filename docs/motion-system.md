# Système de mouvement — EM Concept

**Fil conducteur : le courant passe, puis la lumière s'allume.**
Chaque animation raconte la même chose que le métier : un trait dégradé (le câble) se dessine, un élément s'éclaire.
Le mouvement sert à guider la lecture, à confirmer une action ou à montrer le travail caché. Jamais à décorer.

Code : `assets/css/styles.css` (jetons + section « Motion system ») et `assets/js/main.js`.

---

## 1. Jetons

| Jeton | Valeur | Usage |
|---|---|---|
| `--dur-micro` | 160 ms | couleur au survol, label de champ |
| `--dur-ui` | 320 ms | pastille de filtre, menu, en-tête, soulignés |
| `--dur-component` | 600 ms | cartes, nœuds d'étapes, entrée galerie |
| `--dur-narrative` | 950 ms | titres, textes, zoom photo |
| `--dur-cinematic` | 1400 ms | rideau photo, hero |
| `--stagger` | 70 ms | décalage entre éléments d'un même lot (max 6 → 420 ms) |

| Courbe | Valeur | Quand |
|---|---|---|
| `--ease-out` | `cubic-bezier(.16, 1, .3, 1)` | **entrées** : départ vif, arrivée longue et douce |
| `--ease-in-out` | `cubic-bezier(.65, 0, .35, 1)` | **déplacements à l'écran** : lumière, FLIP, pastille, rideau |
| `--ease-in` | `cubic-bezier(.7, 0, .84, 0)` | **sorties** : l'élément part vite, on ne l'attend pas |
| `--ease-back` | `cubic-bezier(.34, 1.45, .64, 1)` | **confirmations** : léger dépassement (succès, retour magnétique, nœud allumé) |

Règles :
- Une sortie dure environ 60 % de son entrée.
- On n'anime que `transform` / `translate` / `scale`, `opacity` et `clip-path`. Jamais `top`, `width` ni `height` (sauf la largeur de la pastille de filtre, sur un seul élément).
- `translate` sert au défilement et à l'apparition, `scale` au survol : propriétés séparées, donc jamais en conflit.

---

## 2. Séquence d'ouverture (hero)

| t | Événement | Détail |
|---|---|---|
| 0 | Pièce dans le noir | photo à 22 % de luminosité, grain animé |
| 0 → 1,3 s | **Le courant passe** | trait dégradé le long de la gorge LED (`stroke-dashoffset`), nœuds qui s'allument à 0,35 / 0,6 / 0,85 s (`--ease-back`) |
| 0,55 s + i × 90 ms | Le texte monte | badge, titre ligne par ligne (masque), sous-titre, CTA, carte, indicateur de défilement |
| 1,0 → 3,2 s | **La lumière s'allume** | rayon du masque de 0 à 170vmax depuis le plafond (`@property --r`, `--ease-in-out`) |

| 1,25 s | Devise « De l'énergie à l'émotion » | « De l'énergie » s'allume en grésillant (1 s, paliers) → trait de courant tracé (2,1 s, 700 ms in-out) → « à l'émotion » révélé de gauche à droite (2,6 s, 1 100 ms out) |
| 3,8 s puis toutes les 3,6 s | Étincelle | un point lumineux parcourt le trait ; « émotion » s'illumine à son arrivée (halo vert), en pause hors écran |

- Démarre quand la photo est chargée, ou au plus tard à 2,5 s : la page ne reste jamais noire.
- Interrupteur : lumière éteinte, le curseur devient une lampe de 230 px. Rallumée, la lumière repart du curseur.
- Défilement : la photo se referme en écran encadré (`clip-path: inset(5% 4% round 32px)` à 100 %), le texte monte de 70 px et s'efface.
- Parallaxe au pointeur : ±9 px / ±6 px, lissée sur 900 ms. Uniquement souris et pavé tactile.

## 3. Apparitions au défilement

Un seul `IntersectionObserver` ; les éléments qui entrent ensemble sont classés dans l'ordre de lecture (haut → bas, gauche → droite) et décalés de `--stagger`.

| Type | Classe | Mouvement | Durée / courbe |
|---|---|---|---|
| Texte, cartes | `.reveal` | fondu + montée de 24 px | narrative / out |
| Titres de section | `.reveal--mask` (auto) | le texte monte de 0,4 em à travers une fente invisible | narrative / out |
| Surtitre | `.eyebrow.reveal` | le petit trait se dessine 120 ms après | component / in-out |
| Photos | `.reveal--curtain` (auto) | rideau de bas en haut + photo de 1,18 à 1 | cinematic / in-out + out |

Le masque est posé sur un enfant (`.mask-inner`, `.gallery-btn`) et non sur l'élément observé. Chrome considère en effet un élément entièrement masqué par `clip-path` comme invisible pour l'IntersectionObserver.

## 4. Parallaxe et effets liés au défilement

Une seule boucle `requestAnimationFrame`. Chaque effet n'est calculé que lorsque son élément est à l'écran (± 25 %). À l'entrée et à la sortie, un dernier calcul fige l'état final, même après un saut rapide.

| Effet | Valeur |
|---|---|
| Photos de la galerie | `translate` vertical de ±5 % de la hauteur du cadre (image à 112 %, sans bord vide) |
| Sections sombres | s'ouvrent depuis un cadre : `inset(0 4vw round 40px)` → plein écran sur 55 % de la hauteur d'écran. C'est l'écho du hero qui se referme. |
| En-tête | se cache en lisant vers le bas (au-delà de 90 % de la hauteur d'écran, après 6 px de défilement), revient au moindre défilement vers le haut. Jamais quand le menu est ouvert ou qu'un élément de l'en-tête a le focus. |

## 5. Section épinglée — Méthode

- Sur ordinateur, le titre et le CTA restent fixés (`position: sticky`, pas de détournement du défilement) pendant que les quatre étapes défilent, espacées de 22vh.
- Le courant descend le long de la ligne : `--progress` = position de la ligne de lecture (62 % de la hauteur d'écran) dans la liste.
- Quand le courant atteint un nœud, `.is-active` s'applique : le chiffre passe en bleu, un halo dégradé apparaît (`--ease-back`) et le texte passe de 45 % à 100 % d'opacité.
- Sur mobile, la mise en page est verticale et non épinglée, avec la même ligne et les mêmes nœuds.

## 6. Transitions d'images

- **Visionneuse (FLIP)** : la photo grandit depuis sa vignette, recadrée par `clip-path` pour que le cadrage reste identique. 700 ms, in-out. La vignette déjà chargée sert d'image de départ ; la version HD la remplace une fois décodée, donc l'animation n'attend jamais le réseau.
- **Fermeture** : la photo retourne dans sa vignette en 520 ms pendant que le fond s'efface. Si la vignette n'est plus à l'écran, simple fondu.
- **Suivante / précédente** : sortie de 40 px (180 ms, in), entrée depuis l'autre côté (380 ms, out). Glissement de doigt à partir de 50 px.
- **Filtres** : les photos restantes glissent vers leur nouvelle place (FLIP, 600 ms, in-out), les nouvelles apparaissent en fondu depuis 94 % de leur taille, décalées.

## 7. Survols et micro-interactions

| Élément | Comportement |
|---|---|
| Bouton principal | reflet lumineux qui balaie le bouton (750 ms), flèche décalée de 4 px, enfoncement de 97 % au clic (90 ms) |
| CTA magnétiques (`data-magnetic`) | suivent le pointeur (±8 px / ±6 px), reviennent avec `--ease-back` |
| Pastille de filtre | une seule pastille blanche glisse sous le filtre actif (320 ms, in-out) |
| Index des services | le titre glisse de 0,35 em, le numéro passe en bleu, le courant se dessine sous la ligne (600 ms, in-out) ; la réalisation correspondante flotte sous le curseur (suivi lissé à 18 % par image, inclinaison de ±6° selon la vitesse, fondu enchaîné entre photos) |
| Numéro de téléphone (pied de page) | le dégradé remplit le texte de gauche à droite (950 ms, in-out), la flèche avance |
| Photos | zoom de 1,06 (950 ms), légende qui monte |
| Liens texte | soulignement qui se dessine depuis la gauche |
| Champs (contact sombre) | simple trait ; au focus, le courant se dessine le long du trait (600 ms, in-out) et le label passe en cyan |
| Photos de la galerie | étalonnage commun au repos (contraste +6 %, saturation −14 %, légère chaleur) ; au survol, la photo d'origine revient, comme si la lumière s'allumait (600 ms) |
| Compteur de la galerie | le nombre de réalisations suit le filtre, annoncé aux lecteurs d'écran |
| Envoi du formulaire | trois points qui pulsent pendant l'envoi ; succès : coche dégradée qui apparaît avec un léger rebond ; erreur : secousse de 420 ms |
| Barre de contact mobile (Appeler / WhatsApp) | fixe, sans animation en boucle ; enfoncement de 96 % au toucher (90 ms) |
| Pastille WhatsApp (hero) | fond vert à 14 % et contour vert au survol ; étiquette « WhatsApp » qui monte de 4 px |

## 8. Mouvement réduit (`prefers-reduced-motion: reduce`)

- Tout s'affiche directement dans son état final : texte, photos, étapes allumées, courant à 100 %.
- Pas d'intro : la photo est éclairée d'emblée. Pas de parallaxe, d'effet magnétique, de cadrage au défilement, de grain ni de masquage de l'en-tête.
- La visionneuse et les filtres changent d'état sans animation.
- L'interrupteur et le mode lampe restent utilisables : c'est une action choisie, pas un mouvement imposé.

## 9. Performance

- Aucune bibliothèque : environ 21 Ko de JavaScript non compressé.
- Une seule boucle de défilement, et seuls les éléments visibles sont calculés.
- Les animations en boucle (grain, égaliseur, point « en direct ») sont mises en pause quand le hero sort de l'écran.
- `will-change` n'est utilisé que sur la photo de la visionneuse.
