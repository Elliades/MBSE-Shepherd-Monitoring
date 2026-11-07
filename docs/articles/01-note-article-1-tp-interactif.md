# Note de cadrage — Article 1 : Rendre le TP MBSE vivant, interactif et fun

## 1. Pitch & Intention

**Constat de départ :** Former des gens au MBSE sous Cameo/MagicDraw — que ce soient des étudiants en école d'ingénieurs ou des ingénieurs en formation continue —, c'est trop souvent la même douleur : deux heures de théorie SysML aride suivies d'un polycopié Word/PDF interminable où l'apprenant cherche désespérément dans quel sous-package cliquer, sur un seul écran, sans jamais voir son système « vivre ».
**La réponse :** Proposer une **manière différente de former**. Virer le document Word et le remplacer par une application web interactive (utilisable sur un second écran ou directement sur son smartphone), connectée en temps réel à Cameo, qui distille les concepts par petites scènes animées (*façon Duolingo / Brilliant*) et donne un **feedback immédiat** grâce à une simulation visuelle de la mission (le drone berger, le troupeau, le prédateur).

### Idées de titres
- *Adieu Word… Enfin un TP MBSE interactif !* (titre retenu)
- *MBSE Shepherd (1/3) : Comment rendre un TP SysML vivant, interactif et (vraiment) fun*
- *Un smartphone, un drone berger et Cameo : repenser l'apprentissage du MBSE par le feedback immédiat*

### Direction Artistique
- *des moutons (qui bougent au changement de scene?)* 


---

## 2. Les messages clés à faire passer

1. **Adieu le PDF passif, bonjour l'application compagnon (et le 2e écran dans la poche) :**
   - "Les jeunes ne savent plus lire un document", personne n'aime lire des paragraphes de texte qui décrivent où cliquer, décrivent l'attendu, encombrant le word avec des enchainement de screenshots.
   - La remarque récurrente des étudiants en salle de TP : *« Ce serait bien d'avoir deux écrans »* (un pour l'énoncé, un pour Cameo).
   - Or, chaque étudiant a déjà un deuxième écran dans sa poche : son téléphone. L'application web tourne sur le PC ou sur le smartphone (synchronisée en temps réel via un simple code d'appairage à 6 lettres).
2. **Le pont bidirectionnel Guide ↔ Cameo (zéro friction d'outil) :**
   - L'étudiant ne perd plus 10 minutes à chercher un élément dans l'arbre du modèle : il clique sur **« Open in Cameo »** (ou *Find in Cameo* pour un élément qu'il vient de créer) dans sa page web, et Cameo sélectionne/ouvre directement le bon diagramme ou élément.
   - Inversement, quand il lance la simulation dans MagicDraw/Cameo, l'application web écoute les états et les signaux en direct.
3. **Apprendre façon *Brilliant / Duolingo* plutôt qu'avec 2h de cours magistral :**
   - Au lieu d'assommer les élèves avec 2h de grammaire SysML abstraite qu'ils oublient aussitôt, la démarche MBSE (opérationnel → fonctionnel) est découpée en courtes scènes (*une idée par scène*).
   - Chaque concept est introduit au moment où on en a besoin, avec de petites animations et des micro-interactions (déplacer des éléments, tester une machine à états miniature, rejouer une séquence) qui stimulent l'attention.
4. **La simulation de la mission comme moteur de *feedback* immédiat :**
   - On modélise la mission du drone berger (*Pasture Sentinel*).
   - Dès que la machine à états tourne dans Cameo, le panneau de simulation de l'application montre le drone décoller, patrouiller au-dessus des moutons, ou réagir à l'arrivée de l'ours.
   - **Pédagogie par le feedback :** Si le drone reste bloqué et ne passe pas dans un état clé, l'étudiant le voit tout de suite. Il comprend par lui-même qu'il lui manque une fonction ou un événement/signal. Il voit son système progresser au fil du TP.

---

## 3. Plan détaillé suggéré pour la rédaction

### Accroche — Le syndrome de la formation SysML

- Décrire la scène classique (en école d'ingénieurs comme en formation pro) : 2 heures de slides sur la notation SysML, puis un gros document Word de 40 pages et MagicDraw ouvert avec des centaines d'éléments déjà présents, sur un écran 15 pouces.
- Le résultat : les gens qu'on forme appliquent des clics mécaniquement sans comprendre la démarche système, ou décrochent à la première erreur d'outil.
- L'objectif fixé : inventer une manière différente de former au MBSE — plus authentique, plus fun, moins prise de tête — où l'on comprend vraiment la démarche par la pratique et le feedback.

### Partie 1 — « J'ai viré le document » : l'application compagnon et le double écran

- Le problème ergonomique tout bête : jongler avec `Alt+Tab` entre un PDF et Cameo.
- L'idée : transformer le polycopié en une Web App légère (zéro installation, HTML/JS) accessible sur le PC *et* sur le smartphone de l'étudiant /leur pc portable (synchronisation instantanée des réponses et de la progression entre téléphone et PC). encart dédiés aux réponses. 
- Le couplage direct avec l'outil :
  - Cliquer sur une puce dans l'énoncé → **Open in Cameo** sélectionne l'élément dans le Model Browser.
  - Mise en valeur des éléments importants : show in diagram
  - Finie la chasse au trésor dans les packages : l'énergie mentale reste sur l'ingénierie système, pas sur l'interface de l'outil.

### Partie 2 — La démarche MBSE distillée façon *Brilliant / Duolingo*

- Pourquoi le bloc « 2h de théorie + 2h de pratique » échoue.
- Découper la démarche MBSE  (besoin, contexte opérationnel, cas d'usage, scénarios d'échange, puis analyse fonctionnelle et state machine de mission) + concept Sysml en micro-scènes.
- Utiliser des animations ciblées et des widgets interactifs dans la page avant même de toucher à Cameo : manipuler quelques blocs, déclencher des transitions à la souris pour *sentir* le concept avant de le modéliser.
 (introduire l'ex de port/interface/flowProperty/signal + item flow pour exemple, et/ou les scenario de stm)
 
 
 ### Partie 3 — Modéliser la mission et voir le drone voler (le feedback immédiat)

- Pourquoi modéliser la **mission** (machine à états fonctionnelle) change tout : c'est exécutable.
- Connecter le simulateur de Cameo au panneau visuel de l'application web : le pâturage, les moutons, l'ours, le drone.
- L'effet « waouh » et pédagogique :
  - L'étudiant lance sa simulation dans MagicDraw → le drone bouge dans sa page web.
  - S'il a oublié un signal ou mal câblé une transition, le drone ne réagit pas face à l'ours. Le diagnostic est visuel, immédiat, auto-porteur.
  - S'il a réussit des confétis et un retour imédiat, c'est satisfaisant et ça permet à tout le monde d'être sûr que la modélisation est correcte. (fun fact: les étudiants adorent les confétis)

### Conclusion & Transition vers l'Article 2

- Bilan sur les étudiants : un vrai engagement, une progression visible (et mesurable côté enseignant via le monitoring de session), et une compréhension solide des couches opérationnelle et fonctionnelle (Part 1 guidée, puis Part 2 évaluée sur l'arrivée du prédateur).
- **Teasing de l'Article 2 :** *« Génial, nos étudiants maîtrisent le besoin et le fonctionnel. Mais en ingénierie système, l'étape suivante, c'est l'architecture logique (allouer ça sur des composants). Jusqu'ici, je n'avais jamais le temps de l'aborder en TP tellement c'est un enfer de rigueur et de plomberie dans l'outil. Comment rendre la couche logique aussi fluide et ludique ? »*

---

## 4. Visuels / Démos à intégrer dans l'article

- **Visuel 1 :** Photo ou montage du setup étudiant : Cameo sur l'écran du PC + le guide ouvert sur un smartphone à côté (code d'appairage).
- **Visuel 2 (GIF/Vidéo courte tirée de** `/promo/`**) :** Clic sur `Open in Cameo` dans le guide → sélection instantanée dans l'arbre du modèle.
- **Visuel 3 (GIF/Vidéo) :** La simulation en action : la State Machine dans Cameo d'un côté, et le panneau du pâturage (`sim-scene.js`) avec le drone qui patrouille et détecte l'ours de l'autre.
- **Visuel 4 :** Un exemple de widget interactif / animation de concept dans le guide. (port/interface/flowProperty/signal + item flow pour exemple, et/ou les scenario de stm)
- **Visuel 5 :** un exemple d'animation pour décrire la manipulations (clique droit ...)
- **Visuel 6 :** Un exemple de mission échouée
- **Visuel 7 :** Un exemple de mission réussi de confétis (fun fact: les étudiants adorent les confétis)

---

## 5. Encadré optionnel « Sous le capot » (en fin d'article, pour les curieux)

*À garder en court  pour ne pas alourdir le récit :*

- Comment le navigateur et Cameo discutent via un petit **relais** (WebSocket avec repli automatique en HTTP long-polling quand le proxy de l'école bloque les WebSockets).
- La recherche tolérante par nom (`selectByName`) pour retrouver dans Cameo les éléments que l'étudiant a créés lui-même pendant le TP sans connaître leur UUID à l'avance.
- OMF le framework qui permet de connecter la simulation et l'application web en temps réel via WSS.

