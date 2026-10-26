---
name: saivie-editorial-illustrations
description: Create lightweight, minimal hand-drawn vector illustrations for Saivie healthcare UI, landing pages, onboarding, and empty states, matching a simple black-outline and pastel-fill editorial style. Use when the user asks for custom illustrations, decorative UI artwork, or image assets that should be implemented in a codebase.
---

# Saivie Editorial Illustration Skill

## Purpose

Create original, lightweight illustrations inspired by the supplied reference: simple everyday objects drawn with thin, slightly organic dark outlines, a few pastel or sunny-yellow fills, and generous white space. The artwork should feel warm, human, calm, and premium—not like stock clip art.

## First principle: build the illustration as SVG

- Prefer inline SVG or a standalone `.svg` file for this style. SVG stays crisp at any size, is easy to theme, and is editable in code.
- Do not use a raster image generator for artwork that can be expressed cleanly as a small set of vector paths and shapes.
- Do not add a new image-generation dependency, API call, or remote asset service unless the user explicitly requests it.
- Inspect the existing project first and follow its framework, file structure, naming, styling, and component conventions.
- If the user explicitly asks for a rendered image file rather than an in-app component, provide/export an SVG and, if the project tooling supports it, a PNG preview.

## Visual language

### Shape and composition
- Use 3–7 recognizable objects or decorative marks, not a crowded scene.
- Build from simple geometry: paths, lines, ellipses, rounded rectangles, arcs, and a small number of custom paths.
- Allow subtle hand-drawn irregularity in contour paths; avoid perfectly geometric, sterile iconography.
- Use a clear baseline or shared visual anchor when appropriate.
- Leave abundant negative space around the objects; the art should not fill every corner.
- Prefer an asymmetrical, editorial composition with a clear focal object and one or two secondary accents.
- Keep the illustration readable at small sizes; remove details that disappear when scaled down.

### Stroke
- Use a dark charcoal outline rather than pure black when it suits the reference, e.g. `#252525`.
- Use a consistent stroke width relative to the `viewBox` (usually around 2–3 units for an 800-unit-wide canvas; scale proportionally for smaller canvases).
- Prefer `stroke-linecap="round"` and `stroke-linejoin="round"`.
- Avoid heavy borders, double outlines, excessive internal detail, glossy highlights, and drop shadows.

### Color palette
- Use the Saivie colors as the default base:
  - Blush: `#E5C4DB`
  - Sage/mint: `#CFE2DC`
  - Ivory: `#FFFFFC`
- Optional accents should be restrained, such as warm sunshine yellow `#FFD50A` and charcoal `#252525` for outlines.
- Most objects should use flat fills. A very subtle two-color fill can be used when it supports the reference, but avoid elaborate gradients.
- Keep the background transparent by default so the artwork can sit naturally on a page; use ivory only when the design requires an explicit background.
- Ensure the art works on both white and ivory surfaces.

### What to avoid
- Photorealism, 3D rendering, glassmorphism, heavy shadows, complex textures, or glossy gradients.
- Generic emoji, stock-illustration appearance, excessive detail, or unnecessary decorative confetti.
- Text embedded in the illustration unless the user requests it.
- Clinical imagery that feels alarming, graphic, judgmental, or overly hospital-like.
- Copying a reference exactly; use it to understand the visual language and composition, then create original paths and object arrangements.

## Implementation rules

1. Identify the intended role: empty state, onboarding, hero artwork, feature illustration, or decorative accent.
2. Inspect the repo to determine the appropriate component location and styling conventions.
3. Create a reusable React/TypeScript component if the app uses React; otherwise use the project's native component format.
4. Prefer a standalone SVG or inline `<svg>` using `viewBox`, `width="100%"`, and a sensible `max-width` through the existing styling system.
5. Use CSS variables or component props for colors only when useful; do not over-engineer a one-off illustration.
6. Add accessibility: a meaningful `<title>` and `<desc>` plus `role="img"` when informative; use `aria-hidden="true"` when purely decorative.
7. Keep SVG paths readable and maintainable. Extract repeated colors into constants only if it makes the component clearer.
8. Avoid fixed pixel dimensions that break the surrounding responsive layout. Preserve the SVG aspect ratio.
9. Do not alter unrelated app components, layout, routes, or theme tokens.
10. Run the project's relevant lint, type-check, and build commands when available; fix errors introduced by the change.

## Suggested component pattern

Adapt to the project's conventions rather than copying this blindly:

```tsx
export function EditorialIllustration() {
  return (
    <svg
      viewBox="0 0 820 360"
      width="100%"
      role="img"
      aria-labelledby="editorial-illustration-title editorial-illustration-desc"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="editorial-illustration-title">A calm, creative workspace</title>
      <desc id="editorial-illustration-desc">
        A simple cup, pencil, and tablet drawn with dark outlines and pastel fills.
      </desc>
      {/* Draw original, minimal shapes here. */}
    </svg>
  );
}
```

For purely decorative artwork, replace the title/description pattern with `aria-hidden="true"` and remove unnecessary accessibility text.

## Workflow for every request

- Understand the subject, placement, aspect ratio, background, and whether the result must be editable.
- If the user provides an image, extract its style cues (stroke, palette, simplicity, whitespace, proportions); do not trace or reproduce it exactly.
- Implement one first version with a small number of clean SVG shapes.
- Check composition at both its intended display size and a narrower mobile width.
- Keep the output useful in the real interface: the illustration must not compete with headings, forms, or primary actions.
- Summarize which component/file changed and note any checks actually run; never claim a build or visual check succeeded unless it was performed.

## Recommended default prompt behavior

When asked to “make an illustration like the reference,” create original code-based SVG artwork with a white/transparent background, dark organic outlines, flat blush/sage/ivory fills, a small sunshine-yellow accent, and generous negative space. Preserve the site's existing design system and make the result responsive and accessible.
