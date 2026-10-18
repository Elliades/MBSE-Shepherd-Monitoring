# Cameo à l'ISAE ⇄ guide sur le téléphone : solutions et tests

Objectif : Cameo (MagicDraw) sur un PC de l'ISAE, le guide web sur le téléphone de l'étudiant, synchro
dans les deux sens (signaux et état de la simulation vers le téléphone ; « Open in Cameo » et signaux
injectés vers Cameo), en passant par le serveur APPS ou non.

## Ce qu'on a constaté (17-18 octobre 2026)

| Où | Résultat | Lecture |
| --- | --- | --- |
| Cameo sur le PC ISAE → `wss://shepherd.chaos-art.fr/relay` | `1006 http connect timed out`, en wss comme en ws | La JVM de Cameo n'atteint pas le serveur : elle ne passe pas par le proxy de l'école (Edge, lui, l'utilise). |
| Edge sur le PC ISAE → `https://…/api/health`, `…/relay/v1/room/CODE` | OK | HTTPS passe par le proxy. Le domaine n'est pas bloqué. |
| Edge sur le PC ISAE → WebSocket `wss://…/relay/v1/room/CODE` | `OPEN`, puis **aucun message** | Le proxy accepte l'ouverture du WebSocket, puis garde les trames (inspection TLS ou mise en tampon). |
| Cameo du PC pro → relay en ligne | OK (salle `QISPCI`, `pluginOnline: true`) | Le serveur et le relay ne sont pas en cause. |

Conclusion provisoire : **sur le réseau de l'ISAE, le WebSocket ne passe pas, les requêtes HTTPS
classiques passent**, et Java n'utilise pas le proxy de Windows. Il reste à vérifier (pages de test
ci-dessous) : si le proxy demande une authentification (407, que Java ne sait pas fournir) ; s'il
coupe les requêtes longues ; ce que voit le téléphone sur le Wi-Fi de l'ISAE et en 4G.

## Les solutions

| # | Solution | Ce qu'il faut | Pour | Contre | État |
| --- | --- | --- | --- | --- | --- |
| S1 | WebSocket direct (actuel) | rien | temps réel, simple | bloqué à l'ISAE (constaté) | en place |
| S2 | Java passe par le proxy de Windows, et accepte les certificats de Windows | plugin 1.0.8 : options *Proxy to reach the online relay* (« Same as Windows », par défaut) et *Also trust the certificates of Windows* | corrige le `connect timed out` ; rien à faire pour l'étudiant | ne suffit pas seul si le proxy garde les trames WebSocket ; ne marche pas si le proxy exige un login NTLM (407) ; un PAC complexe n'est lu que grossièrement | **implémenté** |
| S3 | Transport HTTP : une requête longue (≤ 25 s) pour ce qui arrive, des POST pour ce qui part | relay (fait), guide (fait), plugin 1.0.8 | passe là où HTTPS passe ; mêmes trames que le WebSocket ; une salle peut mélanger HTTP et WebSocket | latence +50 à 150 ms ; ~10 requêtes/s pendant une simulation | **implémenté** (Auto : bascule toute seule) |
| S4 | **Ton idée** : Cameo encaisse le débit en local et n'envoie au serveur que le résultat, en HTTPS, < 10 req/s | c'est S3 avec la cadence plafonnée | le débit de la simulation (même 100 signaux/s) ne compte plus : les signaux d'une rafale partent dans un seul POST, **10 POST/s au plus** ; l'état est envoyé comme instantané | une vraie réduction « état seul » perdrait la suite des signaux dont le panneau de simulation a besoin pour animer : on regroupe sans rien jeter | **implémenté dans S3** (plugin et navigateur) |
| S5 | **Pont navigateur** : Cameo en mode *Local* (relay dans Cameo), une page `/bridge/` ouverte dans Edge sur le même PC relaie vers le serveur | plugin 1.0.7 suffit ; page `/bridge/` (faite) | utilise le proxy, les certificats **et le login** d'Edge : marche même si Java est bloqué (407) ; rien à installer | un onglet à laisser ouvert ; Edge peut demander l'accès au réseau local (cliquer Autoriser) | **implémenté** |
| S6 | Partage de connexion du téléphone pour le PC | rien | contourne tout le réseau ISAE ; marche aujourd'hui | data mobile, batterie, à faire par chaque étudiant, peut être interdit | possible sans code |
| S7 | Téléphone → PC en direct sur le Wi-Fi (sans serveur) | ouvrir le port 8787 du PC | aucun serveur | Wi-Fi de l'école isolé entre clients, pare-feu Windows (admin), page https → ws:// refusée | écarté |
| S8 | Server-Sent Events pour la descente | — | plus léger que la requête longue | même risque de mise en tampon que le WebSocket | **mesuré** par la page de test, pas utilisé |
| S9 | VPN / Tailscale sur le PC ISAE | droits admin | tout passe | pas sur des PC gérés | écarté |
| S10 | Demander à la DSI d'autoriser le WebSocket vers `shepherd.chaos-art.fr` | un mail, un délai | solution propre et durable | délai, pas garanti | à demander (avec les rapports) |
| S11 | Relay hébergé à l'ISAE | un serveur école | interne | dépend de l'ISAE | écarté |

Avec ou sans le serveur APPS : S1-S5 passent par APPS (`shepherd.chaos-art.fr`) ; S6 aussi (seul le
chemin réseau change) ; seul S7 s'en passe, et il est écarté. Le serveur reste donc nécessaire tant
que le téléphone n'est pas sur le même réseau que le PC.

## Ce qui est en place pour tester

- **`/diag/`** (navigateur, PC ou téléphone) : 11 tests (HTTPS, proxy vu par le serveur, POST 32 Ko,
  WebSocket avec détection « ouvert mais muet », SSE, requête de 20 s, lien Cameo complet en HTTP et en
  WebSocket avec latence et pertes, relay de Cameo en mode Local, salle d'un code), un verdict et une
  recommandation. Le rapport part au serveur.
- **Cameo, menu ISAE > Relay network check** (plugin 1.0.8) : mêmes tests depuis la JVM, sur chaque
  chemin trouvé (sans proxy, proxy Java, proxy Windows, proxys du fichier PAC), avec et sans les
  certificats Windows ; détecte le 407. Bouton **Apply the recommendation** (transport + proxy).
  Rapport envoyé au serveur et gardé dans `~/.omf/`.
- **`/diag/reports.html`** : tous les rapports, une ligne par appareil, un verdict par voie.
- **`/bridge/`** : le pont navigateur (S5).
- Le guide (bouton Cameo > Relay) montre le lien utilisé (WebSocket ou HTTP) et permet de le forcer ;
  `?transport=http` dans l'adresse aussi.
- Pour reproduire le proxy de l'ISAE chez soi : `node scripts/dev-server.mjs 5181 --silent-ws` (le
  WebSocket s'ouvre et reste muet) ; le guide et le plugin y basculent en HTTP en 6 à 8 s.

## Procédure sur place (15 minutes)

1. **PC ISAE, Edge** : ouvrir `https://shepherd.chaos-art.fr/diag/`, nom « PC ISAE Edge », lancer.
2. **Téléphone sur le Wi-Fi ISAE**, puis **en 4G** : même page, noms « Tel Wi-Fi ISAE » / « Tel 4G ».
3. **Cameo 1.0.8 sur le PC ISAE** : menu ISAE > *Relay network check*, lancer, puis *Apply the
   recommendation*. Menu ISAE > *Relay pairing code* : le lien doit être « HTTP requests » et le code
   s'afficher.
4. Sur le téléphone, ouvrir le guide, taper le code : il doit passer à « Following Cameo ». Lancer la
   simulation, vérifier le panneau ; tester un « Open in Cameo ».
5. Si l'étape 3 échoue (407, rien ne passe depuis Java) : Cameo en mode *This computer*, ouvrir
   `https://shepherd.chaos-art.fr/bridge/` dans Edge sur le PC, taper le code de Cameo, et utiliser
   le **code en ligne** affiché sur le téléphone.
6. Comparer sur `https://shepherd.chaos-art.fr/diag/reports.html`.

## Comment choisir

- Le test Cameo dit *WebSocket works* → rien à faire (S2 suffisait).
- Il dit *Use HTTP requests* → **S3/S4** : laisser le transport en Auto (le plugin bascule seul), ou
  appliquer la recommandation pour gagner les 8 s de bascule.
- Rien ne passe depuis Java mais `/diag/` dans Edge recommande le lien HTTP → **S5** (pont navigateur).
- Rien ne passe nulle part → **S6** pour la séance, et **S10** avec les rapports en pièce jointe.
