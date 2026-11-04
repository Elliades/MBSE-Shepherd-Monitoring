"""The ids behind the Cameo links of Part 3: reads the four starting models of part3/assets/models/ and writes
part3/content/model-ids.js, element path -> id, per model. Run it after scripts/build-part3-models.mjs: each build gives
the elements new ids. A link whose id no longer holds still finds its element by name.

    python scripts/part3-link-ids.py
"""
import json
import pathlib
import zipfile
from xml.etree import ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODELS = {
    "mc": "UAV_Part3_Init_MissionConfiguration.mdzip",
    "1": "UAV_Part3_Init_Arch1_FeatureOrchestrator.mdzip",
    "2": "UAV_Part3_Init_Arch2_Patch.mdzip",
    "3": "UAV_Part3_Init_Arch3_CentralOrchestrator.mdzip",
}
XMI = "{http://www.omg.org/spec/XMI/20131001}"
TOP = ("3 - Logical Analysis", "TP - Logical Architecture")
# What a guide link can point to. The interfaces, the signals and the insides of a function have no link: they would only weigh the file.
KINDS = {"uml:Package", "uml:Class", "uml:StateMachine", "uml:Activity", "uml:Diagram", "uml:Port"}
SKIP = {"Interfaces", "Signals"}


def ids_of(mdzip):
    root = ET.fromstring(zipfile.ZipFile(mdzip).read("com.nomagic.magicdraw.uml_model.model"))
    found = {}

    def walk(node, path):
        name, kind, xid = node.get("name"), node.get(XMI + "type"), node.get(XMI + "id")
        if name and kind and xid and kind != "uml:Model":
            path = path + [name]
            rest = path[2:]
            if tuple(path[:2]) == TOP and rest and kind in KINDS and not SKIP.intersection(path) and not (rest[0] == "Functions" and len(rest) > 2):
                found.setdefault("/".join(rest), xid)
        for child in node:
            walk(child, path)

    walk(root, [])
    return found


def main():
    data = {key: ids_of(ROOT / "part3" / "assets" / "models" / file) for key, file in MODELS.items()}
    out = ROOT / "part3" / "content" / "model-ids.js"
    out.write_text(
        "/* Written by scripts/part3-link-ids.py: per starting model, element path -> id. */\n"
        f"window.MODEL_IDS = {json.dumps(data, indent=0, ensure_ascii=False)};\n",
        encoding="utf-8", newline="\n")
    for key, ids in data.items():
        print(key, len(ids))


if __name__ == "__main__":
    main()
