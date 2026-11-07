# Note de cadrage — Article 3 : « Teach MBSE » — Quand l'IA applique la méthode, jusqu'à l'essaim de drones (Swarm)

## 1. Pitch & Intention

**Constat de départ :** Dans les deux premiers articles, on a construit trois choses pour nos étudiants : une **démarche** structurée, des **outils** d'automatisation dans Cameo, et un moyen de **tester/simuler** des scénarios. Or, un LLM moderne sait faire exactement trois choses : suivre une démarche écrite, appeler des outils, et itérer à partir d'un retour de test.
**La proposition :** Remplacer tout le travail mécanique (qui n'est pas la valeur ajoutée de l'ingénieur) par l'IA, en lui donnant **les mêmes règles, les mêmes validateurs et les mêmes scénarios qu'aux étudiants** (*« Teach MBSE »*). Montrer comment on évite le piège du *vibe-modeling* (l'humain garde le besoin, le contexte et les scénarios de référence), comment on résout le mur des tokens grâce à un **DSL de génération en Kotlin** et un **DSL de scénarios (`.scn`)**, et terminer en prenant de la hauteur (*show-off*) : demander à l'IA de générer et tester des architectures candidates pour un **essaim de drones (Swarm)**.

### Idées de titres
- *Teach MBSE : J'ai donné mon cours et mes outils SysML à une IA (jusqu'à concevoir un essaim de drones)*
- *MBSE Shepherd (3/3) : Du copilote d'architecture logique au Swarm — outiller un LLM pour faire du vrai MBSE*
- *Arrêtez le « vibe-modeling » : comment faire itérer une IA sur une architecture SysML avec des validateurs et de la simulation*

---

## 2. Les messages clés à faire passer

1. **« Teach MBSE » : l'IA suit le même cours et passe les mêmes contrôles que les étudiants :**
   - On a écrit la méthode dans un document structuré (le *skill* `mbse-architecture`) que l'IA doit suivre couche par couche.
   - À chaque étape, on lui impose des **validateurs** (exactement les règles demandées aux élèves) :
     - Cohérence entre couche opérationnelle et *Use Cases* (tous les acteurs externes y sont-ils ?).
     - Cohérence entre *Use Cases*, diagrammes de séquence et diagramme de contexte (les acteurs et les interactions/messages correspondent-ils ?).
     - Validateur grammatical SysML intégré à Cameo + validateurs métiers de la méthode.
2. **Pourquoi le « vibe-modeling » complet n'a aucun intérêt (où se place l'ingénieur) :**
   - Si l'IA invente à la fois ses propres scénarios et son architecture, elle se valide elle-même : aucun intérêt d'ingénierie.
   - Le vrai partage des rôles : **l'ingénieur système pose l'intention haut niveau** (contexte opérationnel, étapes clés de la mission, contraintes d'exigences, scénarios à tenir). L'IA, guidée par l'ingénieur, réalise l'architecture, ajoute des fonctionnalités, ou décline les architectures logiques.
3. **Le secret technique n°1 : Générer en Kotlin plutôt que de noyer le LLM sous les appels MCP :**
   - Si un LLM essaie de créer une architecture logique clic par clic via des appels MCP génériques, il explose sa fenêtre de contexte, brûle des milliers de tokens en orchestration, perd ses identifiants et échoue.
   - **La solution :** Le LLM écrit un **script Kotlin** qui s'appuie sur la bibliothèque OMF (transitions logiques, résolution par contexte, layout automatique). Il résout les éléments par fonctions typées, génère tout d'un bloc, met en page les diagrammes, et garde son *focus* sur l'architecture.
4. **Le secret technique n°2 : La boucle d'itération par la simulation et le DSL de scénarios (`.scn`) :**
   - Une fois le modèle généré, que fait le LLM ? **Comme un étudiant : il lance la simulation et joue les scénarios.**
   - Si un scénario ne passe pas (état non atteint, mauvaise contrainte), le LLM lit le rapport d'échec et **itère** jusqu'à ce que toute la batterie de scénarios passe.
   - Problème : décrire des dizaines de scénarios MBSE en JSON ou en diagrammes est horriblement lourd. D'où la création d'un **DSL textuel de scénarios (`.scn`)** + une IHM dédiée (`/scenarios/`) : ultra-lisible pour l'humain comme pour le LLM, supportant les préconditions (`given`), les séquences et les variantes (nominales, alternatives, dysfonctionnelles).
5. **Le bouquet final (*Show-off*) : Prendre de la hauteur avec le Swarm (l'essaim de drones) :**
   - Le vrai but d'une couche logique, ce n'est pas de dessiner « une » boîte, c'est d'explorer des **architectures candidates** (avec orchestrateur central, station sol maître, ou essaim décentralisé/réflexe) pour choisir la meilleure.
   - On passe à l'échelle supérieure (Part 4) : un loup/ours *et* une brebis égarée en même temps → un seul drone ne suffit plus, il faut un **essaim (Swarm)** où au moins un drone garde toujours le troupeau.
   - Démonstration : demander au LLM de générer et revalider des architectures d'essaim avec des briques modulaires (« boîte de Lego »), observer les drones coopérer dans le simulateur multi-drones, et comparer les *trade-offs*.

---

## 3. Plan détaillé suggéré pour la rédaction

### Accroche — La pièce manquante du puzzle
- Rappeler où on s'est arrêté à la fin de l'Article 2 : on a une **démarche**, des **outils d'automatisation**, et un **juge de paix (la simulation)**.
- Constat : *« Une IA est capable de suivre une démarche, d'utiliser des outils, et de tester puis d'itérer. Remplaçons donc tout le travail ingrat qui n'est pas du ressort de l'ingénieur par de l'IA. »*

### Partie 1 — « Teach MBSE » : donner les règles des étudiants à l'IA (et ses validateurs)
- Présenter comment la méthode a été encapsulée pour l'IA : étape par étape, avec des portes de validation strictes.
- Donner des exemples concrets de vérifications inter-couches :
  - Acteurs du contexte ↔ acteurs des Use Cases ↔ lifelines des diagrammes de séquence ↔ flux du contexte.
  - Validation grammaticale SysML dans Cameo + règles méthodologiques.
- Clarifier la posture d'ingénierie : **contre le « vibe-coding » d'architecture en roue libre**. Pourquoi c'est à l'ingénieur de fixer le cadre opérationnel, les grandes étapes de la mission et les scénarios d'acceptation.

### Partie 2 — Comment j'ai branché l'IA sans exploser les tokens : le générateur Kotlin
- Expliquer l'écueil classique des agents MCP sur des outils lourds : 50 appels unitaires = perte de focus, lenteur, erreurs d'UUID.
- La solution mise en place : faire écrire à l'IA un **script Kotlin** qui appelle directement les primitives métier du plugin OMF (celles-là mêmes vues à l'Article 2 : transitions logiques, délégation de signaux, auto-connect, auto-layout).
- Le gain : le compilateur + le moteur réconcilient le modèle proprement, en une fraction du coût en tokens.

### Partie 3 — Tester, échouer, itérer : la batterie de scénarios et le DSL `.scn`
- Montrer le cycle réel du LLM sur la couche logique :
  1. Je lui donne la mission validée et mes contraintes (« Je veux une architecture avec tels composants, ou un orchestrateur, ou décentralisée, et je veux que mes scénarios passent »).
  2. Il génère, il lance la simulation, certains scénarios échouent → il analyse pourquoi et itère jusqu'au vert.
- Introduire le **DSL de scénarios (`.scn`)** et son visualiseur :
  - Pourquoi écrire 30 scénarios MBSE (nominaux, alternatifs, dysfonctionnels) à la main dans SysML est trop lourd.
  - Montrer un court extrait de `.scn` (`given`, `step ... sends ...`, `then ... is ...`) : limpide pour un ingénieur, parfait pour un LLM, exécutable directement contre Cameo.

### Partie 4 — Bouquet final (*Show-off*) : Explorer des architectures d'essaim (Swarm)
- Prendre de la hauteur : la vraie puissance du MBSE assisté par l'IA, c'est l'exploration d'architectures candidates et la **revalidation** rapide quand le problème change.
- Le nouveau défi (*Swarm*) : l'ours attaque d'un côté pendant qu'une brebis s'échappe de l'autre. Règle d'or : *on ne laisse jamais le pâturage sans surveillance*.
- Montrer comment on assemble et compare des architectures d'essaim (station de base maître, drone leader, ou drones autonomes réflexes) et comment la simulation multi-drones permet de juger visuellement et quantitativement les architectures candidates.

### Conclusion générale de la trilogie — Raconter une histoire, ouvrir le champ des possibles
- Résumer le chemin parcouru : d'un TP papier ennuyeux (Article 1) à une couche logique automatisée (Article 2), jusqu'à un ingénieur augmenté qui explore des architectures d'essaim avec l'IA (Article 3).
- Conclure sur la suite : maintenant que la plomberie est maîtrisée et que la boucle de validation tourne, on peut lancer l'IA sur l'exploration et la critique d'architectures (*trade-offs*, endurance, variantes).

---

## 4. Structure « Récit d'abord, Annexe formelle à la fin »

Conformément à la note vocale (*« tout ce qui est partie formelle/thésard, on la met à la fin pour qui veut la lire ; nous on raconte une histoire et on montre des trucs »*) :

- **Dans le corps de l'article :** Garder un rythme narratif dynamique, illustré par l'histoire du drone berger, des exemples visuels parlants (un bout de DSL `.scn`, l'IHM des scénarios, les 3 architectures du Swarm côte à côte).
- **En fin d'article (Section « Pour aller plus loin / Sous le capot ») :**
  - L'architecture exacte du *skill* `mbse-architecture` et de la pyramide de validation (`PASS / FAIL / INCOMPLETE`).
  - Pourquoi une bibliothèque déclarative Kotlin avec réconciliation plutôt que des appels impératifs.
  - La grammaire complète des scénarios `.scn` (assemblages `sequence:`, variantes `from: ... after/instead of`).

---

## 5. Visuels / Démos à intégrer dans l'article

- **Visuel 1 :** Schéma simple de la boucle de rétroaction du LLM : *Méthode + Contraintes ingénieur → Script Kotlin (OMF) → Modèle Cameo → Validateurs & Scénarios `.scn` → Verdict (Itération)*.
- **Visuel 2 :** Capture de l'IHM de la bibliothèque de scénarios (`/scenarios/index.html`) + un extrait de fichier `.scn` de 10 lignes montrant la lisibilité du DSL.
- **Visuel 3 (le *Show-off* tiré de `/promo/next.html` ou Part 4) :** Le simulateur multi-drones (*Swarm*) avec les 3 architectures d'essaim côte à côte (Master au sol, Lead Drone, Essaim réflexe) face à l'ours et à la brebis égarée.
