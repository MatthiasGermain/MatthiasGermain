"""Convertit le modèle 3D de l'ESP32 (GLB) en binaire compact pour le hero du portfolio.

Modèle source : « ESP32 Wroom » par TER1Z, Sketchfab, licence CC BY 4.0 (auteur à créditer,
modifications à signaler) : https://sketchfab.com/3d-models/esp32-wroom-fd714190aacc4e3f9c26b8d7e27807fc
Fichier d'origine : ESP32Wroom.glb (non versionné).

Étapes :
  1. lecture du GLB (sans bibliothèque glTF) : une primitive par matériau ;
  2. passage en millimètres et en repère « Z vers le haut », orienté pour que la
     sérigraphie se lise à l'endroit depuis l'avant (bouton BOOT/IO0 devant) ;
  3. tri des primitives : le marquage Espressif du blindage est retiré (remplacé par
     notre marquage), la sérigraphie et le texte des puces deviennent de l'« encre »
     (faces remplies en bleu nuit), le reste est dessiné au trait ;
  4. suppression des faces jamais visibles (dessous du PCB et des composants) ;
  5. fusion des sommets, calcul des arêtes vives (hors zone du marquage) ;
  6. écriture de public/models/esp32.bin.

Format de sortie (petit-boutiste) :
  u32 longueur de l'en-tête JSON | en-tête JSON |
  faces « papier » : positions Uint16 quantifiées (x, y, z) puis indices Uint16 |
  faces « encre »  : positions Uint16 quantifiées puis indices Uint16 |
  arêtes Uint16 (paires de sommets papier) | ordre de tracé Uint16 par arête

Usage :
  pip install numpy
  python tools/esp32-model/build_model.py chemin/vers/ESP32Wroom.glb [--angle 35]
"""
import argparse
import json
import struct
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]

# Rôle des primitives du GLB (une par matériau), relevé à la main sur ce modèle.
DROP = {14}  # marquage Espressif du blindage (logo Wi-Fi, ESP-WROOM-32, CE, FCC)
INK = {16, 3}  # sérigraphie du PCB (noms des broches, IO0, EN...) et texte des puces

# Repères relevés sur le GLB (mm, repère du GLB : Y vers le haut).
PCB_TOP, PCB_BOTTOM = 475.05, 473.55
HEADER_BOTTOM = 471.25  # bas du support plastique des broches
FEATURES_GLB = {
    "boot": (-143.89, 477.25, 922.2),  # bouton IO0 (BOOT)
    "en": (-143.9, 477.25, 907.96),  # bouton EN (reset)
    "led": (-134.10, 475.64, 908.01),  # LED rouge : alimentation
    "ledUser": (-134.10, 475.64, 910.48),  # LED bleue : GPIO2, celle du programme « Blink »
}

# Broches : primitive 7 (métal), jambes sous le support. Noms de la sérigraphie, en partant du côté
# USB (à gauche vu de face), comme sur une ESP32-DevKitC : rangée avant (J3) puis rangée arrière (J2).
PIN_PRIM = 7
PIN_TOP = 476.6  # haut des soudures au-dessus du PCB
PIN_NAMES = {
    "front": ["CLK", "SD0", "SD1", "P15", "P2", "P0", "P4", "P16", "P17", "P5", "P18", "P19", "GND", "P21", "RX", "TX", "P22", "P23", "GND"],
    "back": ["5V", "CMD", "SD3", "SD2", "P13", "GND", "P12", "P14", "P27", "P26", "P25", "P33", "P32", "P35", "P34", "SVN", "SVP", "EN", "3V3"],
}

CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def read_glb(path):
    data = Path(path).read_bytes()
    jl = struct.unpack("<I", data[12:16])[0]
    g = json.loads(data[20 : 20 + jl])
    bin_off = 20 + jl + 8

    def accessor(ai):
        a = g["accessors"][ai]
        bv = g["bufferViews"][a["bufferView"]]
        off = bin_off + bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        n, dt = NC[a["type"]], CT[a["componentType"]]
        size = n * np.dtype(dt).itemsize
        stride = bv.get("byteStride", 0)
        if stride and stride != size:
            raw = np.frombuffer(data, np.uint8, stride * a["count"], off).reshape(a["count"], stride)
            return raw[:, :size].copy().view(dt).reshape(a["count"], n)
        return np.frombuffer(data, dt, a["count"] * n, off).reshape(a["count"], n)

    parts = []
    for k, pr in enumerate(g["meshes"][0]["primitives"]):
        v = accessor(pr["attributes"]["POSITION"]).astype(np.float64) * 1000.0
        f = accessor(pr["indices"]).ravel() if "indices" in pr else np.arange(len(v))
        parts.append((k, v, f.reshape(-1, 3).astype(np.int64)))
    return parts


def to_model(p):
    """GLB (Y vers le haut) -> modèle (Z vers le haut) : rotation de +90° autour de X."""
    p = np.asarray(p, dtype=np.float64)
    return np.stack([p[..., 0], -p[..., 2], p[..., 1]], axis=-1)


def weld(v, f, decimals=3):
    """Fusionne les sommets identiques (au micron) et retire les triangles dégénérés ou doublés."""
    key, inv = np.unique(np.round(v, decimals), axis=0, return_inverse=True)
    nf = inv.ravel()[f]
    nf = nf[(nf[:, 0] != nf[:, 1]) & (nf[:, 1] != nf[:, 2]) & (nf[:, 0] != nf[:, 2])]
    _, keep = np.unique(np.sort(nf, axis=1), axis=0, return_index=True)
    nf = nf[np.sort(keep)]
    used = np.unique(nf)
    remap = np.full(len(key), -1)
    remap[used] = np.arange(used.size)
    return key[used], remap[nf]


def face_normals(v, f):
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    n = np.cross(b - a, c - a)
    area = np.linalg.norm(n, axis=1) / 2
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    lmax = np.max(np.stack([np.linalg.norm(b - a, axis=1), np.linalg.norm(c - b, axis=1), np.linalg.norm(a - c, axis=1)], 1), 1)
    return n, area, lmax


def sharp_edges(v, f, angle):
    n, area, lmax = face_normals(v, f)
    # Un triangle presque plat a une normale arbitraire : il ne décide pas seul qu'une arête est vive.
    good = area / np.maximum(lmax**2, 1e-12) > 0.004
    e = np.sort(np.concatenate([f[:, [0, 1]], f[:, [1, 2]], f[:, [2, 0]]]), axis=1)
    face_of = np.tile(np.arange(len(f)), 3)
    order = np.lexsort((e[:, 1], e[:, 0]))
    e, face_of = e[order], face_of[order]
    starts = np.r_[0, np.where(np.any(e[1:] != e[:-1], axis=1))[0] + 1]
    ends = np.r_[starts[1:], len(e)]
    cos_thr = np.cos(np.radians(angle))
    sharp = []
    for s, t in zip(starts, ends):
        faces = face_of[s:t]
        if len(faces) == 1:
            sharp.append(e[s])  # bord libre
            continue
        faces = faces[good[faces]]
        if len(faces) >= 2 and (n[faces] @ n[faces].T).min() < cos_thr:
            sharp.append(e[s])
    return np.array(sharp, dtype=np.int64)


def find_pins(parts):
    """Centres des 38 broches (repère du modèle), nommés d'après la sérigraphie."""
    v = next(v for k, v, _ in parts if k == PIN_PRIM)
    legs = v[v[:, 1] < HEADER_BOTTOM - 0.5][:, [0, 2]]
    centers = []
    for p in legs[np.argsort(legs[:, 0])]:
        for c in centers:
            if np.hypot(*(c[0] / c[1] - p)) < 1.0:
                c[0] += p
                c[1] += 1
                break
        else:
            centers.append([p.copy(), 1])
    xz = np.array([c[0] / c[1] for c in centers])
    assert len(xz) == 38, f"{len(xz)} broches trouvées au lieu de 38"
    pins = []
    # Rangée avant = la plus proche de la caméra, c'est-à-dire le plus grand Z du GLB.
    for row, z_side in (("front", xz[:, 1].max()), ("back", xz[:, 1].min())):
        r = xz[np.abs(xz[:, 1] - z_side) < 1.5]
        r = r[np.argsort(r[:, 0])]
        for i, (name, (x, z)) in enumerate(zip(PIN_NAMES[row], r)):
            pins.append({"name": name, "row": row, "index": i, "pos": to_model((x, PIN_TOP, z)).round(3).tolist()})
    return pins


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", help="fichier .glb du modèle")
    ap.add_argument("--angle", type=float, default=35.0, help="seuil d'arête vive (degrés)")
    ap.add_argument("--out", default=str(ROOT / "public" / "models" / "esp32.bin"))
    args = ap.parse_args()

    parts = read_glb(args.source)
    print(f"source : {sum(len(f) for _, _, f in parts)} triangles, {len(parts)} primitives")

    pcb_bottom = PCB_BOTTOM  # (Z du modèle = Y du GLB)
    paper_v, paper_f, ink_v, ink_f = [], [], [], []
    for k, v, f in parts:
        if k in DROP:
            continue
        mv = to_model(v)
        n, _, _ = face_normals(mv, f)
        cz = mv[f].mean(1)[:, 2]
        # Faces jamais visibles depuis l'avant et le dessus : dessous du PCB et des composants posés dessous
        hidden = (n[:, 2] < -0.5) & (cz >= pcb_bottom - 0.05)
        if k in INK:
            hidden |= cz < pcb_bottom + 0.1  # sérigraphie de la face arrière
        f = f[~hidden]
        target_v, target_f = (ink_v, ink_f) if k in INK else (paper_v, paper_f)
        offset = sum(len(x) for x in target_v)
        target_v.append(mv)
        target_f.append(f + offset)

    pv, pf = weld(np.concatenate(paper_v), np.concatenate(paper_f))
    iv, inf_ = weld(np.concatenate(ink_v), np.concatenate(ink_f))
    assert len(pv) < 65536 and len(iv) < 65536, "trop de sommets pour des indices Uint16"
    print(f"papier : {len(pv)} sommets, {len(pf)} triangles | encre : {len(iv)} sommets, {len(inf_)} triangles")

    sharp = sharp_edges(pv, pf, args.angle)

    # Dessus du blindage (zone du marquage) : les arêtes qui s'y trouvent seraient cachées
    # sous le marquage, mais le décalage des traits les ferait ressortir. On les retire.
    shield_min = to_model((-123.17, 478.05, 922.81))
    shield_max = to_model((-105.67, 478.05, 907.31))
    smin = np.minimum(shield_min, shield_max)
    smax = np.maximum(shield_min, shield_max)
    p0, p1 = pv[sharp[:, 0]], pv[sharp[:, 1]]

    def inside(q, inset=0.4):
        return (
            (q[:, 0] > smin[0] + inset) & (q[:, 0] < smax[0] - inset)
            & (q[:, 1] > smin[1] + inset) & (q[:, 1] < smax[1] - inset) & (q[:, 2] > smax[2] - 0.5)
        )

    hidden = inside(p0) & inside(p1)
    sharp = sharp[~hidden]
    print(f"arêtes vives : {len(sharp)} ({hidden.sum()} sous le marquage retirées)")

    # Ordre de tracé : depuis le centre du module (la puce) vers l'extérieur
    center = (smin[:2] + smax[:2]) / 2
    mid = (pv[sharp[:, 0]] + pv[sharp[:, 1]]) / 2
    dist = np.linalg.norm(mid[:, :2] - center, axis=1)
    radius = float(dist.max())
    reveal = np.round(dist / radius * 65535).astype(np.uint16)

    allv = np.concatenate([pv, iv])
    lo, hi = allv.min(0), allv.max(0)
    q = lambda x: np.round((x - lo) / (hi - lo) * 65535).astype(np.uint16)

    features = {k: to_model(p).round(3).tolist() for k, p in FEATURES_GLB.items()}
    header = {
        "unit": "mm",
        "source": "ESP32 Wroom par TER1Z (Sketchfab), CC BY, modifié",
        "bbox": {"min": lo.round(4).tolist(), "max": hi.round(4).tolist()},
        "paper": {"vertices": int(len(pv)), "triangles": int(len(pf))},
        "ink": {"vertices": int(len(iv)), "triangles": int(len(inf_))},
        "edges": int(len(sharp)),
        "shieldTop": {"min": smin.round(3).tolist(), "max": smax.round(3).tolist()},
        "pcb": {"top": PCB_TOP, "bottom": PCB_BOTTOM},
        "pinsBelow": HEADER_BOTTOM - 0.05,
        "features": features,
        "pins": find_pins(parts),
        "reveal": {"center": center.round(3).tolist(), "radius": round(radius, 3)},
    }
    hb = json.dumps(header).encode("utf-8")
    pad = (-(4 + len(hb))) % 4
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "wb") as fh:
        fh.write(np.uint32(len(hb) + pad).tobytes())
        fh.write(hb + b" " * pad)
        for arr in (q(pv), pf.astype(np.uint16), q(iv), inf_.astype(np.uint16), sharp.astype(np.uint16), reveal):
            fh.write(arr.tobytes())
    print(f"écrit : {out} ({out.stat().st_size / 1024:.0f} Ko)")


if __name__ == "__main__":
    main()
