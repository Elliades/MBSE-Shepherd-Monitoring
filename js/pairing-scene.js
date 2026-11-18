/* The scene "Link this guide to Cameo", the same in the four parts. Loaded before content/scenes.js:
     window.PAIRING_SCENE({ ch: "setup" })   the scene object, to put in COURSE.scenes
   Its animation (pairFlow) and its live check (pairCheck) are widgets of js/widgets.js.
   What it says comes from the plugin's pairing window (BridgePanel.kt of OMF: menu Webapp Relay >
   Relay pairing code, modes Auto / Online / This computer, "Open the browser bridge") and from
   bridge/ (the browser bridge page). */
(function () {
  window.PAIRING_SCENE = function (o) {
    o = o || {};
    return {
      id: o.id || "pair-cameo", ch: o.ch || "setup", kind: "do",
      title: "Link this guide to Cameo",
      lead: "The plugin joins Cameo and this guide through a small **relay**. Once they are paired, **Open in Cameo** selects the element in your model, and the drone of the guide follows your simulation.",
      blocks: [
        {
          tabs: [
            {
              label: "On this computer", sub: "the guide next to Cameo",
              blocks: [
                { widget: "pairFlow", opts: { mode: "pc" } },
                {
                  steps: [
                    "In Cameo, open the menu {{Webapp Relay > Relay pairing code}}. Leave the relay on {{Auto}}.",
                    "Copy the code with the copy icon next to it, or read its 6 letters.",
                    "In this guide, click the **Cameo** button at the top right, paste or type the code, then click {{Connect}}. Spaces and dashes do not matter: only the letters count."
                  ]
                },
                {
                  label: "Check", start: 4,
                  steps: [
                    { t: "In this guide, the Cameo dialog says **Following Cameo** and the dot of the **Cameo** button is green. The box below says the same, live.", widget: "pairCheck" },
                    "In Cameo, the pairing window says **Connected** and **1 guide follows this Cameo**."
                  ]
                }
              ]
            },
            {
              label: "On another device", sub: "a phone or a laptop",
              blocks: [
                { widget: "pairFlow", opts: { mode: "phone" } },
                { p: "A phone or a second laptop reaches the **online** relay only. On the school PCs, Cameo cannot go online but the browser can: the **browser bridge** is a tab of this site, on the computer of Cameo, that carries Cameo online for the other device." },
                {
                  steps: [
                    { t: "In Cameo, open {{Webapp Relay > Relay pairing code}} and look at the **Relay** line.", note: "It shows an online address (wss://…)? Then the other device needs no bridge: type the same code in the guide there, and go to the checks. It shows **Inside this Cameo**: go on." },
                    "Click {{Open the browser bridge}}. Your browser opens the bridge page with the code of Cameo filled in, and starts it.",
                    "On the bridge page, wait for **Bridge is up** with a green dot. It then shows an **online code** and a QR code.",
                    "On a phone, scan the QR code: the guide opens already paired. On a laptop, or a phone without a scanner, open the guide and type the **online code** of the bridge page (not the code of Cameo) in its **Cameo** button."
                  ]
                },
                {
                  label: "Check", start: 5,
                  steps: [
                    { t: "On the other device, the dot of the **Cameo** button is green and its dialog says **Following Cameo**. Open this scene there: the box below says it too.", widget: "pairCheck" },
                    "On the bridge page, **Guides** counts your device (1 or more), and the traffic counters move when you tap a signal or **Open in Cameo**."
                  ]
                },
                {
                  callout: {
                    tone: "warn", title: "Keep the bridge tab open",
                    text: "The other device follows Cameo only while the bridge tab is open. Leave it in its own browser window (minimised is fine), and do not close the browser. If it shows **Bridge is down**, click {{Start}} again: the online code stays the same."
                  }
                }
              ]
            }
          ]
        },
        {
          callout: {
            tone: "tip", title: "It stays paired",
            text: "Closing the pairing window of Cameo does not cut the link. Cameo keeps the same code from one run to the next, and the guide remembers it: reopen both and they find each other again. A phone that locked its screen reconnects as soon as the guide is back on screen."
          }
        },
        {
          tip: {
            label: "It does not turn green",
            blocks: [
              {
                list: [
                  "**A code is 6 letters**: check what you typed. Pasting \"A B C D E F\" from Cameo is fine.",
                  "**Waiting for Cameo**: the guide is on the relay but Cameo is not. Is Cameo open, and is its pairing window on **Connected**? In the guide dialog, open **Relay**: both must use the same address.",
                  "**Cannot reach the relay**: the network holds the link. Run the **Network check** of the guide dialog, or {{Webapp Relay > Relay network check}} in Cameo.",
                  "**Another Cameo took this code** (in Cameo): click {{Connect}} there to take it back.",
                  "**This relay does not know that code**: on the other device, use the online code of the bridge page, not the code of Cameo.",
                  "Cameo on **This computer** and the guide in Safari: Safari blocks it. Use Chrome, Edge or Firefox."
                ]
              }
            ]
          }
        }
      ]
    };
  };
})();
