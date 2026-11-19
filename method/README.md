# Méthode MBSE Shepherd : cadrage

Ce dossier tient le cadrage. La méthode elle-même se trouve dans le skill
[.claude/skills/mbse-architecture/](../.claude/skills/mbse-architecture/SKILL.md), et la bibliothèque à implémenter
dans OMF est décrite dans [implementation.md](implementation.md).

## Ce qu'on veut

Un LLM qui a les outils du plugin et la connaissance du système doit pouvoir construire une architecture SysML v1
dans Cameo, ou la corriger, couche par couche : exigences, cycle de vie, fonctionnel, logique. La couche physique
n'est pas traitée.

Il le fait de la bonne manière :
- il décide d'abord, et l'humain valide ;
- il décrit ensuite le modèle dans un générateur Kotlin ;
- il juge le résultat par les règles de la méthode, puis le teste par simulation.

## Les décisions de cadrage

| # | Décision | Pourquoi |
|---|---|---|
| 1 | **La méthode dit ce qui doit être vrai et comment raisonner, jamais quels clics faire.** Les gestes restent dans les guides du TP. | « Create Diagram » est une manipulation, pas une finalité. La première version découpait les gestes du TP en étapes : rejetée. |
| 2 | **Un cœur commun, deux réalisations.** Le cœur, ce sont le raisonnement, les tables de décision et les règles. L'élève le réalise par les scènes du TP ; le LLM, par un générateur et la bibliothèque. | Ce qui n'est écrit qu'une fois ne diverge pas. |
| 3 | **Les règles sont du code**, une classe par règle, avec ses jeux de test. Le même code juge la description du LLM, le modèle qu'il a écrit et le modèle d'un élève. | C'est ce qui rend les deux méthodes cohérentes : elles partagent des critères, pas des gestes. |
| 4 | **La génération est du code Kotlin**, dans OMF. La lecture peut passer par MCP. L'écriture ne passe jamais par des appels MCP élément par élément. | Demande explicite. Kotlin donne aussi un premier contrôle gratuit : le compilateur. |
| 5 | **Une bibliothèque déclarative au vocabulaire de la méthode**, plutôt que du SysML pur suivi d'une passe de correction, ou que des fabriques qui écrivent tout de suite. | L'encodage v1 est écrit une fois et testé. Les règles tournent avant d'écrire. Le plan montre ce qui va changer, et un générateur se rejoue sans dégâts. Une passe de correction devinerait des décisions. |
| 6 | **La correction finale se limite à ce qui se dérive sans choix** : ports, conjugaison, item flows, `_ext`, connexions, `refine` / `allocate`, mise en page. | La mise en page n'a pas de sens, et une dérivation n'a qu'une réponse possible. |
| 7 | **Le générateur possède un périmètre ; le moteur réconcilie au lieu de reconstruire.** | Corriger un modèle existant sans le casser, et rejouer à volonté. |
| 8 | **On étend ce qui existe dans OMF.** `LogicalArchitectureBuilder`, `behavior/*`, signalports et assembly deviennent le kit ; `AutoConnectPlanner` sert de modèle (Kotlin pur testé, puis appliqué). | Ce chemin a fait ses preuves sur la couche logique. On ne le refait pas. |
| 9 | **SysML v1 d'abord.** Le modèle de méthode emprunte le vocabulaire de v2 quand le mot existe (`subject`, `actor`, `flow`, `satisfy`, `verify`). Un second moteur v2 pourra s'ajouter sous la même bibliothèque, sans toucher aux générateurs. | Demande explicite : v1 maintenant, v2 si ça vient tout seul. |
| 10 | **Les tests suivent une pyramide** : compilation, règles avant écriture, idempotence, règles et contrôles du plugin après écriture, simulation, couverture, exigences. Les scénarios de simulation se tirent des scénarios du cycle de vie, avec le skill `mbse-scenarios`. | Les attendus viennent du besoin, pas du modèle produit. |
| 11 | **La première couche est une architecture de cycle de vie** (*lifecycle architecture*), pas seulement l'opération. « Couche opérationnelle » veut dire cette couche ; « opération » seul désigne la phase Exécuter. On liste les phases de la mission (planifier, préparer, déployer, exécuter, désengager, soutenir, évaluer), on décide lesquelles on traite et pourquoi, et chaque phase guide la recherche de ses cas d'utilisation. L'environnement existant y est une étape courte. | On ne conçoit pas que la mission en cours : les phases font trouver les services oubliés (déploiement, retrait, maintenance, analyse). Elles viennent de l'analyse de mission d'ISO/IEC/IEEE 15288 (§6.4.1-6.4.2), du handbook INCOSE et du ConOps (29148, AIAA G-043) ; le modèle du drone les numérote déjà. |
| 12 | **Les exigences sont transverses** : on les pose au début, et chaque couche y revient à sa sortie pour tracer (`refine`, `satisfy`, `verify`). | Le TP les a partout en texte libre, sans les tracer. |
| 13 | **Les MOE et MOP de la mission se définissent au début de la couche cycle de vie.** Chaque MOE (succès vu par la partie prenante) est porté par des MOP (performances du système), et chaque MOP par une exigence. Hypothèse : une mesure est une donnée du modèle (propriété stéréotypée, définition, unité, cible), et sa formule est du code qui l'évalue sur les traces des scénarios. Pas de diagramme paramétrique par défaut ; seulement pour une mesure d'analyse qui est une vraie équation. | Analyse de mission de 15288 (§6.4.1). Le paramétrique est lourd, et la plupart des MOP se lisent sur une trace de simulation. |
| 14 | **La couche fonctionnelle est la mission en state machine, menée par les signaux du cycle de vie** (les mêmes éléments, réutilisés). Les fonctions de service sont des activités, décomposées et raffinées en logique d'exécution au besoin. Les scénarios fonctionnels sont les scénarios du cycle de vie joués en simulation (`.scn`), sans nouveau diagramme de séquence. La couverture visée est 100 % des branches, ou des exclusions justifiées. Les chaînes fonctionnelles sont des vues générées. | Les diagrammes de séquence existent déjà au cycle de vie ; la simulation prouve que la mission les tient, branche par branche. |
| 15 | **La documentation de production (le skill, la spec, le backlog) est en anglais.** Ce cadrage reste en français. | L'anglais passe mieux pour l'IA ; le français est plus simple à relire pour toi. |
| 16 | **Tout ce qui est demandé et pas encore implémenté va dans [backlog.md](backlog.md)**, avec quoi, pourquoi, où et quand c'est fini. | Compléter et industrialiser la méthode sans rien perdre dans la conversation. |
| 17 | **La couche logique est une transition de la mission, pas un dessin.** On alloue les modes ou régions aux composants ; Logical Transition clone les états et duplique les fonctions avec «refine» et «allocate», et laisse les coupures sur `off-TO RENAME`. La table des signaux (les deux questions) résout chaque coupure. Les ports, la fusion par partenaire, la conjugaison et Auto Connect sont dérivés par les services OMF existants, appelés en Kotlin par le moteur. Le constructeur par spec JSON reste un adaptateur pour les générateurs Python existants. | Tout existe déjà dans OMF et a été éprouvé en Partie 3 ; la méthode n'a qu'à enchaîner les décisions. |
| 18 | **Une fiche de traçabilité vérifie toute la chaîne**, de la couche logique au fonctionnel, au cycle de vie et aux exigences, dans les deux sens. Elle calcule le statut de chaque exigence (ouverte → satisfaite → vérifiée → tenue) et audite les trade-offs : chaque MOE/MOP touché par le choix est un critère, chaque note a sa preuve, et les MOP mesurés après construction doivent confirmer les estimations. Le cœur pur (`omf-mbse-core`) tourne aussi dans un **service à côté**, `mbse-report`, qui lit un export JSON du modèle et les rapports de scénarios, sans Cameo. | Les liens sont posés couche par couche ; il faut une vue d'ensemble, rejouable en CI et sur un modèle archivé. |
| 19 | **Un validateur unique** lance toutes les vérifications de la méthode (règles des couches, règles de forme, traçabilité, statut des exigences, MOP, audit des trade-offs, contrôles du plugin, résultats des scénarios) et rend un verdict PASS / FAIL / INCOMPLETE. Il se lance par profil (`layer:`, `gate:`, `delivery`, `trace`) depuis MCP (`arch/validate`), depuis une suite de validation Cameo *MBSE Shepherd method*, depuis `arch.sh … validate` ou depuis `mbse-report validate`. Les exceptions acceptées sont des `waive(…)` dans le générateur, avec raison et auteur. Aucune porte ni livraison sans son verdict. | Un seul appel, un seul verdict, le même code partout ; rien n'est réduit au silence en douce. |

Ces décisions sont les miennes, prises sur tes indications. Tu peux revenir sur n'importe laquelle.

## Où est quoi

| Fichier | Contenu |
|---|---|
| [skill mbse-architecture](../.claude/skills/mbse-architecture/SKILL.md) | le déroulé, les règles strictes, le compte rendu, l'état de l'implémentation |
| [requirements.md](../.claude/skills/mbse-architecture/requirements.md) · [lifecycle.md](../.claude/skills/mbse-architecture/lifecycle.md) · [functional.md](../.claude/skills/mbse-architecture/functional.md) · [logical.md](../.claude/skills/mbse-architecture/logical.md) | pour chaque couche : concepts, étapes avec raisonnement, tables de décision, règles, extrait de générateur, correspondance avec le TP |
| [kotlin.md](../.claude/skills/mbse-architecture/kotlin.md) | écrire, compiler, planifier, appliquer un générateur |
| [traceability.md](../.claude/skills/mbse-architecture/traceability.md) | le graphe de traçabilité, le statut des exigences, l'audit des trade-offs |
| [testing.md](../.claude/skills/mbse-architecture/testing.md) | la pyramide de tests, le pont vers `mbse-scenarios` |
| [implementation.md](implementation.md) | la bibliothèque Kotlin à implémenter dans OMF (en anglais) |
| [backlog.md](backlog.md) | tout ce qui reste à faire pour compléter et industrialiser la méthode, dans l'ordre (en anglais) |
| [skill mbse-scenarios](../.claude/skills/mbse-scenarios/SKILL.md) | écrire, jouer et juger les scénarios de simulation |

## Ce qui reste à faire

Tout est dans [backlog.md](backlog.md). Le premier item (CORE-01, la boucle `arch` et le DSL logique v0) suffit
pour générer une architecture logique en Kotlin.
