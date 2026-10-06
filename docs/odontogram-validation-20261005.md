# Odontogram work in progress — 2026-10-05

This document records the validation checkpoint prepared for publication on 2026-10-06.

## Implemented and checked locally

- Original SVG contour hit targets: 146 canine view pieces / 42 tooth IDs; 102 feline pieces / 30 tooth IDs. No nearest-label or circular fallback hit target.
- Native browser clicks painted canine 102 and feline 104; DOM inspection confirmed the same fill across their four representations.
- Equine 106 fill survived navigating to Treatments, Preview and back into the embedded chart.
- Preview displayed the captured SVG chart without toolbar and the new initial-assessment information field.
- Individual position/rotation and clinical state are preserved in structured chart history. Save confirmation checks that the new image was actually persisted.
- Embedded Next routes to the parent wizard, not a separate treatment workflow.
- Equine-specific tools are hidden for canine/feline patients. Tool instructions now reflect the active tool.
- Assessment ranges use fill bars. Tooth paint/selection has a short transition, disabled for reduced-motion users.

Run `node --test scripts/odontogram-regression.test.cjs` (11 tests at this checkpoint).

## Second checkpoint

- Fracture mode supports a schematic retained-fragment clip at 25%, 50% or 75% depth. The original vector path is retained, not overwritten; the hit target is clipped along with the tooth. Shared tooth state updates all views.
- Browser verification: equine 106 clipped in both views, Undo removed the clip, applying it again and reloading retained the cut.
- Incisor panel now supports individual translation, 5-degree rotation and restoring the selected view position with undo. Rotation of frontal 101 was verified in both the main chart and enlarged view and persisted on reload.
- Fixed zero-height anatomy container in the enlarged incisor view.

## Still requires work before declaring Pimbury parity

- Exact Pimbury presets for incisor occlusion and freehand fracture geometry have not been reproduced. Current cutting uses three schematic depths, not arbitrary cut lines or movable detached fragments.
- ATR, sharp edges, ramp, hook and wave are clipped tooth overlays; do not claim these reproduce every deformation in the reference video.
- Exhaustive visual validation of every mapped tooth/view, touch-device dragging and production-account save/reopen remains pending.
- Photos attached inside the chart and photos in the outer wizard need a unified report workflow.
- Password recovery is blocked by the configured Supabase project hostname not resolving during diagnostics. Requires the administrator to verify the live project URL; no authentication bypass was introduced.

## Regenerating contour assets

Use a Python virtual environment with `svgpathtools` and `shapely==2.1.2`. The face indices depend on the source SVG and polygonization order; review mappings if either changes.

```sh
python scripts/extract-tooth-faces.py --output-dir /tmp/vettooth-faces
python scripts/map-tooth-faces.py --faces-dir /tmp/vettooth-faces --output-dir /tmp/vettooth-contours
```

Review generated polygons against the original art before replacing the versioned assets. The extraction does not invent replacement anatomy.
