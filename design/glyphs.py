#!/usr/bin/env python3
"""The mixer-truck and chute glyphs, and the company mark built from the mixer.

Both glyphs sit on lucide's 24 px grid (no fill, 2 px round strokes), so they
line up with the lucide icons around them. The mark is the same mixer drawing on
a yellow tile, so the sidebar tile, the favicon and the home-screen icon are one
drawing at every size.

Writes:
  src/components/glyphs.ts      MixerTruck and ChutePour as lucide icons
  design/out/mark.svg           the mark on its rounded tile, 32 x 32: favicon and src/app/icon.svg
  design/out/mark-square.svg    the same on a square tile with more margin: iOS rounds the
                                home-screen icon itself and fills transparent corners with black
  design/out/check-*.svg        each glyph in its badge colours, for the size checks in build.sh

Standard library only. Run from the repo root: python3 design/glyphs.py
"""

import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "design" / "out"

BRAND = "#f0b81c"  # --brand in src/app/globals.css: the tile
INK = "#14191f"  # --foreground in src/app/globals.css: the drawing on the tile


def num(n: float) -> str:
    s = f"{n:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("", "-0") else s


def pt(p) -> str:
    return f"{num(p[0])} {num(p[1])}"


class Drum:
    """A mixer drum seen from the side: an open mouth at the rear, a cone that
    flares to the full diameter, and a domed front end. Built in drum space
    (u along the axis from the mouth, v across it), then tilted so the mouth is
    raised, the way the drum sits on a real truck."""

    def __init__(self, mouth_xy, tilt_deg, length, radius, mouth_radius, cone):
        self.ox, self.oy = mouth_xy
        self.tilt = tilt_deg
        self.L, self.R, self.m = length, radius, mouth_radius
        self.c = cone * length  # where the cone reaches full diameter
        a = math.radians(tilt_deg)
        self.cos, self.sin = math.cos(a), math.sin(a)

    def to_xy(self, u, v):
        return (self.ox + u * self.cos - v * self.sin, self.oy + u * self.sin + v * self.cos)

    def half_width(self, u):
        """Distance from the axis to the shell at u."""
        if u >= self.c:  # the dome: a quarter ellipse from the shoulder to the nose
            k = (u - self.c) / (self.L - self.c)
            return self.R * math.sqrt(max(0.0, 1 - k * k))
        # the cone is a quadratic curve from the mouth to the shoulder; find its t for this u
        lo, hi = 0.0, 1.0
        for _ in range(40):
            t = (lo + hi) / 2
            if self._cone(t)[0] < u:
                lo = t
            else:
                hi = t
        return self._cone((lo + hi) / 2)[1]

    def _cone(self, t):
        p0, p1, p2 = (0.0, self.m), (self.c * 0.5, self.R), (self.c, self.R)
        return tuple((1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * c for a, b, c in zip(p0, p1, p2))

    def edge(self, u, side):
        """A point on the shell: side -1 is the top, +1 the underside."""
        return self.to_xy(u, side * self.half_width(u))

    def outline(self) -> str:
        m, R, c, L = self.m, self.R, self.c, self.L
        x = self.to_xy
        return (
            f"M{pt(x(0, -m))}Q{pt(x(c * 0.5, -R))} {pt(x(c, -R))}"
            f"A{num(L - c)} {num(R)} {num(self.tilt)} 0 1 {pt(x(c, R))}"
            f"Q{pt(x(c * 0.5, R))} {pt(x(0, m))}Z"
        )


# The drum is the one part with curves worth computing; everything else is placed by hand.
DRUM = Drum(mouth_xy=(2.5, 8.1), tilt_deg=12, length=10.9, radius=3.35, mouth_radius=1.35, cone=0.45)
AXLE_Y = 16.5  # the frame, the cab floor and both wheel centres sit on this line, as in lucide's truck
CAB_X, NOSE_X, ROOF_Y = 15.1, 21.8, 9.2


def mixer_truck():
    """Facing right: drum over the rear wheel, cab over the front wheel."""
    fin_a = DRUM.edge(0.4 * DRUM.L, -1)
    fin_b = DRUM.edge(0.62 * DRUM.L, 1)
    return [
        ("path", {"d": DRUM.outline(), "key": "drum"}),
        ("path", {"d": f"M{pt(fin_a)}L{pt(fin_b)}", "key": "fin"}),
        ("path", {"d": f"M8.5 {num(AXLE_Y)}H{num(CAB_X)}", "key": "frame"}),
        (
            "path",
            {
                "d": (
                    f"M{num(CAB_X)} {num(AXLE_Y)}V{num(ROOF_Y + 1)}a1 1 0 0 1 1-1H18.5a1 1 0 0 1 .78.37"
                    f"l2.3 2.9a1 1 0 0 1 .22.62V{num(AXLE_Y - 1)}a1 1 0 0 1-1 1h-.6"
                ),
                "key": "cab",
            },
        ),
        ("circle", {"cx": "6.5", "cy": num(AXLE_Y), "r": "2", "key": "rear-wheel"}),
        ("circle", {"cx": "17.8", "cy": num(AXLE_Y), "r": "2", "key": "front-wheel"}),
    ]


def chute_pour():
    """Concrete coming off the end of the chute into an open form."""
    return [
        ("path", {"d": "M4 4.5 12.9 10.7l1 1.8", "key": "chute"}),
        ("path", {"d": "M5.5 15v5h15v-5", "key": "form"}),
        ("path", {"d": "M9.2 20c1.6-2.9 6.2-2.9 7.8 0", "key": "heap"}),
    ]


GLYPHS = {
    "MixerTruck": ("mixer-truck", mixer_truck(), "A ready-mix truck: the drum tilted rear-up with one spiral fin, the cab and two wheels. Also the company mark."),
    "ChutePour": ("chute-pour", chute_pour(), "Concrete coming off the chute into an open form."),
}


def svg_elements(nodes, with_keys=False) -> str:
    out = []
    for tag, attrs in nodes:
        a = " ".join(f'{k}="{v}"' for k, v in attrs.items() if with_keys or k != "key")
        out.append(f"<{tag} {a}/>")
    return "".join(out)


# Badge colours from src/components/dispatch/status.tsx (sky and teal 50 / 800).
CHECKS = {"en-route": ("MixerTruck", "#f0f9ff", "#075985"), "pouring": ("ChutePour", "#f0fdfa", "#115e59")}


def check_svg(nodes, background, color) -> str:
    """A glyph on its badge colour, as it sits in the status badge."""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
        f'<rect width="24" height="24" fill="{background}"/>'
        f'<g fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        f"{svg_elements(nodes)}</g></svg>\n"
    )


def mixer_centre():
    """Centre of the mixer's centre lines, so the mark can sit it in the middle of the tile."""
    xs, ys = [NOSE_X, CAB_X], [ROOF_Y, AXLE_Y + 2]
    for i in range(201):
        for side in (-1, 1):
            x, y = DRUM.edge(DRUM.L * i / 200, side)
            xs.append(x)
            ys.append(y)
    return (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2


def mark_svg(scale=1.13, radius=7, stroke=2.3) -> str:
    """The mixer in dark ink on the yellow tile, centred. 2.3 keeps the strokes solid at 16 px."""
    cx, cy = mixer_centre()
    tx, ty = 16 - cx * scale, 16 - cy * scale
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">'
        f'<rect width="32" height="32" rx="{radius}" fill="{BRAND}"/>'
        f'<g transform="translate({num(tx)} {num(ty)}) scale({scale})" fill="none" stroke="{INK}" '
        f'stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round">'
        f"{svg_elements(mixer_truck())}</g></svg>\n"
    )


def ts_module() -> str:
    lines = [
        "// Written by design/glyphs.py. Change the drawing there and run design/build.sh, not this file.",
        'import { createLucideIcon } from "lucide-react";',
        "",
    ]
    for name, (slug, nodes, doc) in GLYPHS.items():
        lines.append(f"/** {doc} */")
        lines.append(f'export const {name} = createLucideIcon("{slug}", [')
        for tag, attrs in nodes:
            body = ", ".join(f'{k}: "{v}"' for k, v in attrs.items())
            lines.append(f'  ["{tag}", {{ {body} }}],')
        lines.append("]);")
        lines.append("")
    return "\n".join(lines)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (ROOT / "src" / "components" / "glyphs.ts").write_text(ts_module())
    for status, (name, background, color) in CHECKS.items():
        (OUT / f"check-{status}.svg").write_text(check_svg(GLYPHS[name][1], background, color))
    (OUT / "mark.svg").write_text(mark_svg())
    (OUT / "mark-square.svg").write_text(mark_svg(scale=0.92, radius=0))
    print("design/glyphs.py: src/components/glyphs.ts and design/out/*.svg")


if __name__ == "__main__":
    main()
