# Note de cadrage — Article 2 : Attaquer la couche logique (Démarche, Automatisation, Simulation)

## 1. Pitch & Intention

**Constat de départ (pour les étudiants comme pour les ingénieurs qu'on forme) :** La couche logique est trop longue à faire faire dans l'outil.
- Le concept est simple, mais la réalisation dans Cameo demande une rigueur et un temps énormes (cohérence BDD/IBD/State Machines/Activities, ports, traçabilité, règles fUML).
- En plus, la couche logique demande de produire **plusieurs architectures candidates** pour pouvoir faire des **trade-offs** (qui viendront une fois les candidats posés). Si câbler une seule architecture prend déjà des heures, c'est impossible sans outils.

**La réponse :** Résumer et outiller toute la couche logique autour d'un triptyque : **Démarche · Automatisation · Simulation**.
- Une **démarche** claire : partir de la *state machine* fonctionnelle de la mission, créer un sous-système, lui allouer ses états, faire tourner son comportement interne, puis régler ses interfaces externes, sous-système par sous-système, et enfin dérouler les *features* principales (et comparer ensuite les architectures candidates via des *trade-offs*) ;
- De l'**automatisation** (en un clic droit dans Cameo) : *Logical Transition*, *Create All Missing Signal Ports* (ports entrants pour les signaux qui font avancer la state machine, ports sortants pour les signaux envoyés par les fonctions et non consommés en interne) et *Delegate* ;
- De la **simulation incrémentale** : se connecter et valider chaque *feature* principale en rejouant **à coût zéro** les scénarios fonctionnels de la mission.

### Idées de titres
- *Dompter la couche logique en MBSE : Démarche, Automatisation, Simulation*
- *MBSE Shepherd (2/3) : Pourquoi la couche logique est trop longue à modéliser (et comment l'outiller)*
- *Connaître la syntaxe fUML n'est pas le métier d'un ingénieur système : outiller l'architecture logique*

---

## 2. Les messages clés à faire passer

1. **Le constat général : trop long à faire faire + besoin d'outiller les architectures candidates et les *trade-offs* :**
   - Que ce soit pour des étudiants ou des ingénieurs en formation, construire une couche logique simulable à la main dans SysML prend beaucoup trop de temps.
   - D'autant plus qu'en architecture logique, on ne cherche pas juste à câbler une boîte : on doit définir des concepts d'architectures candidates et faire des **trade-offs** ensuite. Sans outils pour accélérer radicalement la construction, on reste bloqué dans la plomberie.
2. **Pilier 1 — La Démarche (de la State Machine fonctionnelle aux sous-systèmes, de l'interne vers l'externe) :**
   - On définit d'abord le concept de l'architecture (le *trade-off* entre architectures candidates viendra après).
   - **Étape 1 — Identifier sous-systèmes et états à partir de la *state machine* de mission :** On reprend la machine à états fonctionnelle. On repère des patterns — par exemple les régions parallèles, qui sont souvent allouées à des sous-systèmes logiques différents. L'identification marche dans les deux sens : soit on définit d'abord un composant/sous-système et on lui alloue des états, soit on repère un groupe d'états cohérents qui fait émerger un sous-système pertinent.
   - **Étape 2 — Faire fonctionner le comportement interne d'abord :** Une fois les états alloués dans le sous-système (et les fonctions associées dupliquées), on travaille sur le comportement interne : la *state machine* du sous-système (ou celle qui jouera le rôle d'orchestrateur) et ses fonctions, pour que la machine à états interne avance proprement.
   - **Étape 3 — Se concentrer ensuite sur les interfaces externes :** Maintenant que le comportement interne tourne, on se pose la question de l'extérieur : *« Qu'est-ce que je dois recevoir et envoyer ? À qui dois-je envoyer mes signaux externes ? »*
   - **Étape 4 — Itérer par sous-système, puis par *feature* principale :** On passe au 2e sous-système, puis au 3e. Une fois qu'on a la base, on attaque les *features* principales une par une — et à chaque *feature* principale testable, on connecte et on valide.
3. **Pilier 2 — L'Automatisation (les clics droits qui absorbent la plomberie SysML/fUML) :**
   - *« Connaître la syntaxe fUML et la plomberie SysML ne fait pas partie de la mission d'un ingénieur système. »*
   - Trois assistants en **clic droit** dans Cameo (plugin OMF) :
     - **Logical Transition** : on sélectionne les états de la mission → ça copie-colle les états dans le sous-système, duplique toutes les fonctions avec la traçabilité (`refine` / `allocate`), réutilise les signaux, et crée des états trous (`off-TO RENAME`) à renommer là où l'on sort du sous-système.
     - **Create All Missing Signal Ports (from signals)** : un clic droit analyse le composant et crée automatiquement tous les ports de signaux nécessaires :
       - les ports **entrants** pour recevoir les signaux qui font avancer la *state machine* interne ;
       - les ports **sortants** pour envoyer tous les signaux émis par les fonctions qui ne sont pas consommés par la *state machine* interne.
     - **Delegate to external systems** : un clic droit permet d'envoyer un signal interne vers l'extérieur en créant automatiquement la fonction qui émet le `SendSignalAction` sur le port.
   - **Nuance méthodologique clé (pas d'allocation magique) :** L'automatisation n'est pas une « allocation magique » qui créerait l'architecture toute seule. Elle sert d'**amorce** pour initier le composant rapidement, connecter facilement les sous-systèmes entre eux et éviter la plomberie répétitive. Derrière, l'ingénieur doit impérativement **retravailler le comportement fonctionnel et logique interne de chaque sous-système** (machines d'états, activités, règles de gestion locales).
4. **Pilier 3 — La Simulation incrémentale (valider les scénarios fonctionnels de la mission à coût zéro) :**
   - Une fois que la partie interne et la partie externe d'une *feature* sont connectées (ex. le *Déploiement*), comment vérifier qu'on est bon ? On rejoue les scénarios de la mission.
   - Si le scénario passe et fait avancer la mission au même endroit qu'avant, la *feature* est validée. On passe à la *feature* suivante, et on joue les scénarios nominaux, alternatifs et dysfonctionnels.
   - **Coût zéro (simplification pédagogique) :** Comme les scénarios opérationnels et fonctionnels ont déjà été décrits et validés sur la mission en amont, leur revalidation dans la couche logique ne coûte rien. **Attention toutefois à la nuance de méthode :** ce cadre est délibérément simplifié pour le TP ; dans une démarche MBSE complète, il faut normalement **décrire des scénarios logiques dédiés pour chacun des sous-systèmes** (tests unitaires et d'intégration au niveau composant). Rejouer la mission valide l'intégration de bout en bout, mais chaque boîte doit avoir ses scénarios logiques propres.
   - C'est aussi ce qui permet, dans un second temps, de comparer concrètement plusieurs architectures candidates et de faire des **trade-offs** outillés.

---

## 3. Plan détaillé suggéré pour la rédaction

### Accroche — Pourquoi la couche logique est trop longue à faire faire (pour les étudiants comme en formation pro)
- Le constat de terrain : que l'on forme des étudiants ou des ingénieurs, la couche logique prend un temps fou dans l'outil.
- Le concept est simple, mais la rigueur exigée par SysML + la simulation fUML (ports, IBD, machines à états, activités) noie tout le monde.
- En plus, la couche logique implique de concevoir **plusieurs architectures candidates** et de faire des **trade-offs** — ce qui est impensable sans outils pour accélérer la modélisation.

### Partie 1 — Le mot d'ordre : Démarche, Automatisation, Simulation
- Poser le triptyque **Démarche · Automatisation · Simulation** comme fil conducteur.

### Partie 2 — La Démarche : de la State Machine fonctionnelle au composant (interne d'abord, externe ensuite)
- Dérouler la vraie séquence de travail d'un architecte :
  1. **Partir de la *state machine* fonctionnelle de la mission** et identifier les sous-systèmes via des patterns (ex. les régions en parallèle deviennent naturellement des sous-systèmes distincts). Ça marche dans les deux sens : définir le composant puis allouer les états, ou regrouper des états qui font émerger un composant.
  2. **Allouer et régler le comportement interne :** Dupliquer états et fonctions dans le sous-système, travailler la *state machine* (notamment celle de l'orchestrateur / du sous-système) et retravailler les fonctions pour que la machine à états interne avance.
  3. **Régler les interfaces externes :** Une fois l'interne OK, se demander ce qu'on doit envoyer vers l'extérieur et à qui.
  4. **Enchaîner sous-système par sous-système, puis *feature* par *feature* :** Poser le 2e et le 3e sous-système, puis avancer par *feature* principale testable.

### Partie 3 — L'Automatisation : les 3 clics droits qui cachent la cuisine fUML
- Détailler les automatisations qui transforment des heures de clics en secondes :
  1. **Clic droit → Logical Transition** : copie des états sélectionnés, duplication des fonctions tracées, création des états frontières à renommer.
  2. **Clic droit → Create All Missing Signal Ports** : création automatique des ports entrants (signaux qui font avancer la state machine) et des ports sortants (signaux envoyés par les fonctions mais non consommés par la state machine interne).
  3. **Clic droit → Delegate** : routage d'un signal vers l'extérieur avec génération automatique de la fonction d'envoi sur le port.
- Rappeler pourquoi c'est sain : la syntaxe fUML/SysML est cachée, la décision d'architecture reste 100 % visible.

### Partie 4 — La Simulation incrémentale (et l'ouverture sur les *trade-offs*)
- Dès qu'une *feature* principale est câblée (ex. le déploiement), on connecte et on joue le scénario fonctionnel de la mission (*Validate in Cameo*).
- Montrer l'approche incrémentale : on ajoute une *feature* logique → on joue les scénarios nominaux, alternatifs et dysfonctionnels → validation à **coût zéro** grâce au travail fait sur la mission.
- **Arrivée des *trade-offs* (orchestration et localisation de la décision) :**
  - Ne pas se limiter à compter des ports ou des boîtes : le vrai sujet est **où vit la décision**, le **couplage**, et le compromis entre **complexité d'implémentation sur l'existant (legacy)** vs **scalabilité / maintenabilité / lisibilité de la mission**.
  - Comparer les philosophies : le patch décentralisé (rapide sur l'existant, mais fort couplage point-à-point et zéro scalabilité) vs l'orchestrateur centralisé (lisibilité parfaite mais SPOF et trafic élevé) vs l'orchestrateur de modes avec fonctionnalités autonomes.
  - S'appuyer sur un vrai trade-off multicritère outillé (radar de critères + métriques réelles mesurées en simulation).

### Conclusion & Transition vers l'Article 3
- Bilan : avec *Démarche · Automatisation · Simulation*, la couche logique devient rapide, incrémentale et vérifiable — pour un étudiant comme pour un ingénieur en formation.
- **Teasing de l'Article 3 :** *« Maintenant qu'on a défini la démarche pas à pas, qu'on a les outils d'automatisation et qu'on a les scénarios de simulation pour tester… remplaçons tout ce travail mécanique par de l'IA. »*

---

## 4. Visuels / Démos à intégrer dans l'article

- **Visuel 1 (Schéma / Animation de la démarche) :** De la *state machine* de mission (et ses régions parallèles) → allocation dans un sous-système → comportement interne → ports externes.
- **Visuel 2 (GIF/Capture Cameo) :** Les clics droits **Logical Transition**, **Create All Missing Signal Ports** (entrants = déclencheurs de la STM / sortants = signaux émis non consommés en interne) et **Delegate**.
- **Visuel 3 :** Validation incrémentale d'une *feature* avec **Validate in Cameo**, puis comparaison des architectures candidates (*trade-offs*) dans le guide Part 3.
