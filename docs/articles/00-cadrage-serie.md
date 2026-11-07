# Cadrage éditorial — Trilogie d'articles « MBSE Shepherd »

> **Origine :** Note vocale du 6 novembre (`Nov 6 at 5-35 PM.m4a`) croisée avec les éléments réels du projet `mbse-shepherd` (guides interactifs Parts 1–4, pont Cameo/relais, commandes OMF d'architecture logique, DSL `.scn`, méthode & générateur Kotlin pour LLM).
> **Objectif de ce dossier :** Poser le fil rouge de la série et fournir 3 notes de travail directement exploitables pour rédiger chaque article.

---

## 1. Philosophie générale & Ton éditorial

- **Authentique, fun, zéro prise de tête :** On ne rédige pas un manuel académique ni une thèse formelle. On raconte une histoire d'ingénierie et de pédagogie vécue sur le terrain (les TP SysML/Cameo à l'ISAE-SUPAERO, la mission *Pasture Sentinel* avec le drone berger, le troupeau et l'ours).
- **Raconter une histoire avant la mécanique :** Le cœur de chaque article porte sur *pourquoi* on a changé les choses (le problème humain/étudiant/ingénieur), *quelle démarche* on adopte, et *ce que ça donne visuellement et concrètement*.
- **La technique lourde en annexe (« pour ceux qui veulent creuser ») :** Tout ce qui relève du formel pur (syntaxe fUML/SysML, plomberie réseau/relais, grammaire du DSL, détails d'implémentation du plugin ou du compilateur Kotlin) est soit glissé dans des encadrés (« *Sous le capot* »), soit renvoyé en fin d'article.
- **Une progression logique en 3 actes :**
  1. **Réinventer la façon de former au MBSE :** Rendre l'apprentissage vivant, interactif et connecté à l'outil — pour des étudiants comme pour des ingénieurs en formation (Opérationnel & Fonctionnel).
  2. **Faire de la vraie architecture logique (et des *trade-offs*) sans y passer trois semaines :** Débloquer un problème général du MBSE (trop long à câbler, impossible de comparer plusieurs architectures candidates à la main) grâce au triptyque *Démarche · Automatisation · Simulation*.
  3. **L'IA prend le relais du labeur :** Quand la démarche, les outils d'automatisation et les tests de simulation existent, l'IA peut itérer et explorer des architectures candidates — jusqu'à l'essaim de drones (*Swarm*).

---

## 2. Vue d'ensemble de la trilogie

| Article | Titre de travail (pistes) | Problème de départ | Le déclic / La proposition | Ce qu'on montre (Show, don't tell) |
| :--- | :--- | :--- | :--- | :--- |
| **Article 1** | *Adieu Word… Enfin un TP MBSE interactif !* | 2h de théorie SysML abstraite + un PDF de 50 pages + un seul écran = apprenants perdus (étudiants comme ingénieurs), zéro plaisir, tout est oublié. | **Une Web App compagnon** (PC ou smartphone) couplée en temps réel à Cameo + micro-animations + simulation visuelle immédiate (le drone, les moutons, l'ours). | Le téléphone à côté de Cameo, le bouton *Open in Cameo*, le pâturage qui s'anime quand la state machine tourne, les concepts gamifiés. |
| **Article 2** | *Dompter la couche logique en MBSE : Démarche, Automatisation, Simulation* | En formation comme en vrai projet, la couche logique est trop longue à câbler dans l'outil (et demande aussi de faire plusieurs architectures candidates et des *trade-offs*, ce qui nécessite des outils). | **Le triptyque Démarche · Automatisation · Simulation** : partir de la STM mission, allouer aux composants (interne puis externe, sous-système par sous-système, puis *feature* par *feature*), clics droits (*Logical Transition*, *Create All Ports from Signals*, *Delegate*), et rejouer à coût zéro les scénarios fonctionnels de la mission (avant d'ouvrir sur les *trade-offs*). | La démarche interne → externe, les 3 clics droits OMF, la validation incrémentale *feature* par *feature* et les architectures candidates. |
| **Article 3** | *Teach MBSE to an AI : du copilote logique à l'essaim de drones (Swarm)* | Si la méthode est claire, que l'outillage abstrait la syntaxe et que la simulation valide le résultat… pourquoi faire faire la plomberie à un humain ? | **Donner le cours et les outils à un LLM** : règles de validation, scripts Kotlin (plutôt que 500 appels MCP), DSL de scénarios (`.scn`), et génération d'architectures candidates (jusqu'au *Swarm*). | La boucle d'itération du LLM face au simulateur, le DSL `.scn` lisible, et le bouquet final : 3 architectures d'essaim générées et comparées en live. |

---

## 3. Le fil conducteur technique (la thèse cachée de la série)

Ce qui lie les 3 articles — et qui fait la force de l'histoire — c'est que **chaque brique créée pour aider l'étudiant devient exactement la brique qui permet ensuite à l'IA d'être fiable** :

1. Pour que l'étudiant comprenne s'il a juste, on a créé une **simulation de mission visuelle et déterministe** (Article 1).
2. Pour que l'étudiant ne se noie pas dans la plomberie SysML de la couche logique, on a créé des **primitives d'automatisation (transitions logiques, ports auto) et une validation incrémentale par scénarios** (Article 2).
3. Résultat : au moment d'introduire l'IA (Article 3), on ne fait pas du « *vibe-modeling* » aveugle. L'IA utilise les **mêmes règles méthodologiques**, les **mêmes automatisations (via Kotlin)** et passe devant le **même juge impartial (les scénarios de simulation)**.

---

## 4. Fichiers de ce dossier

- [`00-cadrage-serie.md`](./00-cadrage-serie.md) — Ce document de cadrage global.
- [`01-note-article-1-tp-interactif.md`](./01-note-article-1-tp-interactif.md) — Note de cadrage et plan détaillé pour l'Article 1 (Le TP interactif & la démarche MBSE).
- [`02-note-article-2-couche-logique.md`](./02-note-article-2-couche-logique.md) — Note de cadrage et plan détaillé pour l'Article 2 (La couche logique : Démarche, Automatisation, Simulation).
- [`03-note-article-3-ia-et-mbse.md`](./03-note-article-3-ia-et-mbse.md) — Note de cadrage et plan détaillé pour l'Article 3 (Teach MBSE : l'IA, le DSL de scénarios et l'ouverture Swarm).
