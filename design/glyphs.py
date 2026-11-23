#!/usr/bin/env python3
"""The company mark, and the mixer and chute glyphs in the status badges.

The mixer is drawn twice, once per size range:

  MixerMark   the company mark, for 27 px and up: the sidebar tile, favicon.ico's 32 and
              48 px images and the iOS home-screen icon. A computed drum (open cone at the
              rear, straight body, domed front) tilted rear-up, with one spiral fin, clear of
              the frame and the cab. Drawn in the tile's own 32-unit space.
  MixerTruck  the small glyph, for 14 and 16 px: the En route badge, the Fleet item and the
              driver's note, and on the yellow tile, the browser-tab icon (src/app/icon.svg) and
              favicon.ico's 16 px image. Placed by hand on lucide's 24 px grid with lucide's
              2 px round strokes: a capsule drum on one pedestal, the cab, two wheels, no fin.

At 14 px one pixel is 24 / 14 = 1.7 grid units. Parts closer than that merge into one dark
knot on a 1x screen, so the small glyph keeps at least 1.7 units of clear space (stroke edge
to stroke edge) between its drum, wheels, pedestal and cab, and the chute glyph between its
stream, heap and floor. main() measures those gaps and stops before writing anything if one
is too small.

Writes:
  src/components/glyphs.ts      MixerTruck and ChutePour as lucide icons, and MixerMark
  design/out/mark.svg           the mark on its rounded tile, 32 x 32: favicon.ico at 32 and 48 px
  design/out/mark-square.svg    the same on a square tile with more margin: iOS rounds the
                                home-screen icon itself and fills transparent corners with black
  design/out/mark-small.svg     the small glyph on the rounded tile: src/app/icon.svg and
                                favicon.ico at 16 px
  design/out/check-*.svg        each status glyph in its badge colours, with lucide's Factory and
                                Clock beside them, for the size checks in build.sh

Standard library only. Run from the repo root: python3 design/glyphs.py
"""

import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "design" / "out"

BRAND = "#f0b81c"  # --brand in src/app/globals.css: the tile
INK = "#14191f"  # --foreground in src/app/globals.css: the drawing on the tile
ONE_PX_AT_14 = 24 / 14  # grid units per pixel in a 14 px badge icon


def num(n: float) -> str:
    s = f"{n:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("", "-0") else s


def pt(p) -> str:
    return f"{num(p[0])} {num(p[1])}"


def to_segment(p, a, b) -> float:
    """Distance from point p to the segment a-b."""
    vx, vy = b[0] - a[0], b[1] - a[1]
    t = max(0.0, min(1.0, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy)))
    return math.hypot(a[0] + t * vx - p[0], a[1] + t * vy - p[1])


def between_segments(a, b, c, d, steps=400) -> float:
    return min(to_segment((c[0] + (d[0] - c[0]) * i / steps, c[1] + (d[1] - c[1]) * i / steps), a, b) for i in range(steps + 1))


# ---------------------------------------------------------------------------------------------
# The small glyph, placed by hand on lucide's 24 px grid (2 px strokes)

SMALL_DRUM = ((4.1, 8.9), (10.6, 10.8), 2.1)  # the capsule's axis, raised rear to front, and its radius
SMALL_AXLE = 17.5  # the frame, the cab floor and both wheel centres, as in lucide's truck
SMALL_WHEELS = (5.5, 19.0)  # rear and front wheel centres, radius 2
SMALL_PEDESTAL_X = 11.3  # the drum's one support, from the frame to the drum's front end
SMALL_CAB_X, SMALL_ROOF_Y = 16.5, 10.0


def capsule(rear, front, r) -> str:
    """A stadium shape round a straight axis: the small glyph's drum."""
    (ax, ay), (bx, by) = rear, front
    length = math.hypot(bx - ax, by - ay)
    nx, ny = (by - ay) / length * r, -(bx - ax) / length * r  # the upward normal
    top_a, top_b = (ax + nx, ay + ny), (bx + nx, by + ny)
    bottom_b, bottom_a = (bx - nx, by - ny), (ax - nx, ay - ny)
    arc = f"A{num(r)} {num(r)} 0 0 1"
    return f"M{pt(top_a)}L{pt(top_b)}{arc} {pt(bottom_b)}L{pt(bottom_a)}{arc} {pt(top_a)}Z"


def drum_underside_at(x) -> float:
    """y of the small drum's outline under x, on its front cap: where the pedestal meets it."""
    (_, _), (bx, by), r = SMALL_DRUM
    return by + math.sqrt(r * r - (x - bx) ** 2)


def mixer_truck():
    """Facing right: a capsule drum tilted rear-up on one pedestal, the cab and two wheels.
    No fin: at 14 px it would cut the drum's inside into specks."""
    rear, front, r = SMALL_DRUM
    rw, fw = SMALL_WHEELS
    y = num(SMALL_AXLE)
    return [
        ("path", {"d": capsule(rear, front, r), "key": "drum"}),
        ("path", {"d": f"M{num(SMALL_PEDESTAL_X)} {y}V{num(drum_underside_at(SMALL_PEDESTAL_X))}", "key": "pedestal"}),
        ("path", {"d": f"M{num(rw + 2)} {y}H{num(fw - 2)}", "key": "frame"}),
        (
            "path",
            {"d": f"M{num(SMALL_CAB_X)} {y}V{num(SMALL_ROOF_Y + 1)}a1 1 0 0 1 1-1h2l2.5 3.5v3a1 1 0 0 1-1 1", "key": "cab"},
        ),
        ("circle", {"cx": num(rw), "cy": y, "r": "2", "key": "rear-wheel"}),
        ("circle", {"cx": num(fw), "cy": y, "r": "2", "key": "front-wheel"}),
    ]


def small_mixer_gaps() -> dict:
    """Clear space between the small glyph's parts, stroke edge to stroke edge, in grid units."""
    rear, front, r = SMALL_DRUM
    rw, fw = SMALL_WHEELS
    stroke, wheel = 2, 2
    cab_wall = ((SMALL_CAB_X, SMALL_AXLE), (SMALL_CAB_X, SMALL_ROOF_Y + 1))
    cab_roof = ((SMALL_CAB_X + 1, SMALL_ROOF_Y), (SMALL_CAB_X + 3, SMALL_ROOF_Y))
    pedestal = ((SMALL_PEDESTAL_X, SMALL_AXLE), (SMALL_PEDESTAL_X, drum_underside_at(SMALL_PEDESTAL_X)))
    return {
        "drum and rear wheel": to_segment((rw, SMALL_AXLE), rear, front) - r - wheel - stroke,
        "drum and cab": min(between_segments(rear, front, *cab_wall), between_segments(rear, front, *cab_roof)) - r - stroke,
        "drum and frame": between_segments(rear, front, (rw + wheel, SMALL_AXLE), (fw - wheel, SMALL_AXLE)) - r - stroke,
        "pedestal and rear wheel": to_segment((rw, SMALL_AXLE), *pedestal) - wheel - stroke,
        "pedestal and cab": SMALL_CAB_X - SMALL_PEDESTAL_X - stroke,
    }


# Concrete falls off the end of the chute onto a heap in a shallow form. The heap is what
# tells it from a download icon: an empty form under a falling line reads as an arrow into a tray.
CHUTE_TIP = (10.6, 8.4)  # the stream falls straight down from here, onto the heap's top
STREAM_END, HEAP_TOP, HEAP_HALF_WIDTH, FLOOR = 10.7, 14.5, 4.2, 19.7


def chute_pour():
    x, w, h = CHUTE_TIP[0], HEAP_HALF_WIDTH, FLOOR - HEAP_TOP
    heap = f"M{num(x - w)} {num(FLOOR)}c{num(w / 3)}-{num(0.69 * h)} {num(2 * w / 3)}-{num(h)} {num(w)}-{num(h)}s{num(2 * w / 3)} {num(0.31 * h)} {num(w)} {num(h)}"
    return [
        ("path", {"d": f"M2 3 {pt(CHUTE_TIP)}", "key": "chute"}),
        ("path", {"d": f"M{pt(CHUTE_TIP)}V{num(STREAM_END)}", "key": "stream"}),
        ("path", {"d": f"M2.5 15.7V{num(FLOOR)}h19v-4", "key": "form"}),
        ("path", {"d": heap, "key": "heap"}),
    ]


def chute_gaps() -> dict:
    return {"stream and heap": HEAP_TOP - STREAM_END - 2, "heap and floor": FLOOR - HEAP_TOP - 2}


# ---------------------------------------------------------------------------------------------
# The mark, in the tile's 32-unit space


class Drum:
    """A mixer drum seen from the side: an open mouth at the rear, a cone that flares to the
    full diameter, a straight body, then a domed front end. Built in drum space (u along the
    axis from the mouth, v across it), then tilted so the mouth is raised, the way the drum
    sits on a real truck."""

    def __init__(self, mouth_xy, tilt_deg, length, radius, mouth_radius, cone, body):
        self.ox, self.oy = mouth_xy
        self.tilt = tilt_deg
        self.L, self.R, self.m = length, radius, mouth_radius
        self.c = cone * length  # where the cone reaches full diameter
        self.s = (cone + body) * length  # where the straight body ends and the dome begins
        a = math.radians(tilt_deg)
        self.cos, self.sin = math.cos(a), math.sin(a)

    def to_xy(self, u, v):
        return (self.ox + u * self.cos - v * self.sin, self.oy + u * self.sin + v * self.cos)

    def half_width(self, u):
        """Distance from the axis to the shell at u."""
        if u >= self.s:  # the dome: a quarter ellipse from the end of the body to the nose
            k = (u - self.s) / (self.L - self.s)
            return self.R * math.sqrt(max(0.0, 1 - k * k))
        if u >= self.c:
            return self.R
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

    def outline_points(self, steps=400):
        pts = [self.edge(self.L * i / steps, side) for i in range(steps + 1) for side in (-1, 1)]
        return pts + [self.to_xy(0, self.m * (2 * i / 20 - 1)) for i in range(21)]  # and the mouth

    def outline(self) -> str:
        m, R, c, s, L = self.m, self.R, self.c, self.s, self.L
        x = self.to_xy
        return (
            f"M{pt(x(0, -m))}Q{pt(x(c * 0.5, -R))} {pt(x(c, -R))}L{pt(x(s, -R))}"
            f"A{num(L - s)} {num(R)} {num(self.tilt)} 0 1 {pt(x(s, R))}"
            f"L{pt(x(c, R))}Q{pt(x(c * 0.5, R))} {pt(x(0, m))}Z"
        )


MARK_STROKE = 2.6  # tile units; solid at 32 px on a 1x screen
MARK_DRUM = Drum(mouth_xy=(3.7, 11.2), tilt_deg=12, length=15.2, radius=3.35, mouth_radius=1.45, cone=0.38, body=0.22)
MARK_AXLE, MARK_WHEEL_R = 22.6, 2.2
MARK_WHEELS = (10.4, 25.3)  # the drum overhangs the rear wheel on both sides
MARK_CAB_X, MARK_ROOF_Y, MARK_NOSE_X = 22.6, 13.9, 28.5


def mixer_mark():
    """Facing right: the drum over the rear wheel with one spiral fin, the cab over the front wheel."""
    rw, fw, wr = *MARK_WHEELS, MARK_WHEEL_R
    fin_a = MARK_DRUM.edge(0.3 * MARK_DRUM.L, -1)
    fin_b = MARK_DRUM.edge(0.66 * MARK_DRUM.L, 1)
    y = num(MARK_AXLE)
    return [
        ("path", {"d": MARK_DRUM.outline(), "key": "drum"}),
        ("path", {"d": f"M{pt(fin_a)}L{pt(fin_b)}", "key": "fin"}),
        ("path", {"d": f"M{num(rw + wr)} {y}H{num(fw - wr)}", "key": "frame"}),
        (
            "path",
            {
                "d": (
                    f"M{num(MARK_CAB_X)} {y}V{num(MARK_ROOF_Y + 1.2)}a1.2 1.2 0 0 1 1.2-1.2H{num(MARK_NOSE_X - 3)}"
                    f"l3 3.6V{num(MARK_AXLE - 1.2)}a1.2 1.2 0 0 1-1.2 1.2H{num(fw + wr)}"
                ),
                "key": "cab",
            },
        ),
        ("circle", {"cx": num(rw), "cy": y, "r": num(wr), "key": "rear-wheel"}),
        ("circle", {"cx": num(fw), "cy": y, "r": num(wr), "key": "front-wheel"}),
    ]


def mark_gaps() -> dict:
    """Clear space between the mark's drum and the rest, in tile units (pixels at 32 px)."""
    rw, fw, wr = *MARK_WHEELS, MARK_WHEEL_R
    pts = MARK_DRUM.outline_points()
    wall = ((MARK_CAB_X, MARK_AXLE), (MARK_CAB_X, MARK_ROOF_Y + 1.2))
    corner = (MARK_CAB_X + 1.2, MARK_ROOF_Y + 1.2)  # centre of the rounded corner at the top of the wall
    return {
        "drum and rear wheel": min(math.hypot(x - rw, y - MARK_AXLE) for x, y in pts) - wr - MARK_STROKE,
        "drum and frame": min(to_segment(p, (rw + wr, MARK_AXLE), (fw - wr, MARK_AXLE)) for p in pts) - MARK_STROKE,
        "drum and cab": min(min(to_segment(p, *wall), math.hypot(p[0] - corner[0], p[1] - corner[1]) - 1.2) for p in pts) - MARK_STROKE,
    }


# ---------------------------------------------------------------------------------------------
# Output

GLYPHS = {
    "MixerTruck": (
        "mixer-truck",
        mixer_truck(),
        "A ready-mix truck for 14 and 16 px: a capsule drum tilted rear-up on one pedestal, the cab and two wheels.",
    ),
    "ChutePour": ("chute-pour", chute_pour(), "Concrete falling off the chute onto a heap in a shallow form."),
}

# lucide's Factory and Clock (ISC licence), drawn beside the two glyphs in the size check only
LUCIDE_FOR_CHECKS = {
    "Factory": [
        ("path", {"d": "M12 16h.01"}),
        ("path", {"d": "M16 16h.01"}),
        ("path", {"d": "M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"}),
        ("path", {"d": "M8 16h.01"}),
    ],
    "Clock": [("circle", {"cx": "12", "cy": "12", "r": "10"}), ("path", {"d": "M12 6v6l4 2"})],
}

# Badge colours from src/components/dispatch/status.tsx (Tailwind 4's 50 and 800 steps, as sRGB).
CHECKS = {
    "en-route": (GLYPHS["MixerTruck"][1], "#f0f9ff", "#075985"),
    "pouring": (GLYPHS["ChutePour"][1], "#f0fdfa", "#005f5a"),
    "batching": (LUCIDE_FOR_CHECKS["Factory"], "#eef2ff", "#372aac"),
    "scheduled": (LUCIDE_FOR_CHECKS["Clock"], "#f1f5f9", "#314158"),
}


def svg_elements(nodes) -> str:
    return "".join(f"<{tag} " + " ".join(f'{k}="{v}"' for k, v in attrs.items() if k != "key") + "/>" for tag, attrs in nodes)


def check_svg(nodes, background, color) -> str:
    """A glyph on its badge colour, as it sits in the status badge."""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
        f'<rect width="24" height="24" fill="{background}"/>'
        f'<g fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        f"{svg_elements(nodes)}</g></svg>\n"
    )


def tile_svg(drawing: str, radius: float) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">'
        f'<rect width="32" height="32" rx="{num(radius)}" fill="{BRAND}"/>{drawing}</svg>\n'
    )


def stroked(nodes, width, transform="") -> str:
    t = f' transform="{transform}"' if transform else ""
    return (
        f'<g{t} fill="none" stroke="{INK}" stroke-width="{num(width)}" stroke-linecap="round" '
        f'stroke-linejoin="round">{svg_elements(nodes)}</g>'
    )


def mark_svg(radius=7.0, scale=1.0) -> str:
    """The mark in dark ink on the yellow tile; scale < 1 shrinks it about the centre for more margin."""
    transform = "" if scale == 1 else f"translate({num(16 - 16 * scale)} {num(16 - 16 * scale)}) scale({scale})"
    return tile_svg(stroked(mixer_mark(), MARK_STROKE / scale, transform), radius)


def small_mark_svg(scale=1.15) -> str:
    """The small glyph centred on the tile, for the 16 px tab icon. It keeps its 2-unit stroke,
    so its gaps stay 1.7 units: one pixel at 16 px."""
    (rear_x, rear_y), _, r = SMALL_DRUM
    left, right = rear_x - r - 1, SMALL_CAB_X + 5.5 + 1  # the drum's rear to the cab's front, stroke edges
    top, bottom = rear_y - r - 1, SMALL_AXLE + 3  # the drum's top to the wheels' bottoms
    cx, cy = (left + right) / 2, (top + bottom) / 2
    transform = f"translate({num(16 - cx * scale)} {num(16 - cy * scale)}) scale({scale})"
    return tile_svg(stroked(mixer_truck(), 2, transform), 7)


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
            lines.append(f'  ["{tag}", {{ ' + ", ".join(f'{k}: "{v}"' for k, v in attrs.items()) + " }],")
        lines.append("]);")
        lines.append("")
    lines.append("/** Stroke width of the mark, in its 32-unit tile. */")
    lines.append(f"export const MARK_STROKE = {num(MARK_STROKE)};")
    lines.append("")
    lines.append("/** The company mark's drawing for 27 px and up, in the 32-unit space of its tile. Draw it with MARK_STROKE. */")
    lines.append('export const MixerMark = createLucideIcon({')
    lines.append('  name: "mixer-mark",')
    lines.append("  size: 32,")
    lines.append("  node: [")
    for tag, attrs in mixer_mark():
        lines.append(f'    ["{tag}", {{ ' + ", ".join(f'{k}: "{v}"' for k, v in attrs.items()) + " }],")
    lines.append("  ],")
    lines.append("});")
    lines.append("")
    return "\n".join(lines)


def check_gaps():
    """Stops the build when a gap is too small to survive the size it is drawn for."""
    problems = []
    for name, gap in {**small_mixer_gaps(), **chute_gaps()}.items():
        if gap < ONE_PX_AT_14 - 0.02:  # 1.7 units, with room for rounding to two decimals
            problems.append(f"{name}: {gap:.2f} grid units, needs {ONE_PX_AT_14:.2f} (1 px at 14 px)")
    for name, gap in mark_gaps().items():
        if gap < 1.2:
            problems.append(f"mark, {name}: {gap:.2f} px at 32 px, needs 1.2")
    if problems:
        raise SystemExit("design/glyphs.py: gaps too small\n  " + "\n  ".join(problems))


def main():
    check_gaps()
    OUT.mkdir(parents=True, exist_ok=True)
    (ROOT / "src" / "components" / "glyphs.ts").write_text(ts_module())
    for status, (nodes, background, color) in CHECKS.items():
        (OUT / f"check-{status}.svg").write_text(check_svg(nodes, background, color))
    (OUT / "mark.svg").write_text(mark_svg())
    (OUT / "mark-square.svg").write_text(mark_svg(radius=0, scale=0.84))
    (OUT / "mark-small.svg").write_text(small_mark_svg())
    gaps = {**small_mixer_gaps(), **chute_gaps()}
    print("design/glyphs.py: smallest gap " + f"{min(gaps.values()):.2f} grid units (" + min(gaps, key=gaps.get) + ")")
    print("design/glyphs.py: src/components/glyphs.ts and design/out/*.svg")


if __name__ == "__main__":
    main()
