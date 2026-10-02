# Styling and accessibility

Tailwind CSS 4 is integrated through `@tailwindcss/vite`. `main.css` imports Tailwind, defines theme tokens, base focus behavior, and shared button/input/panel classes. It is not a monolithic page stylesheet. Each JSX file imports a CSS sibling with the exact same base filename.

Theme: `ink`, `muted`, `paper`, `line`, `forest`, `lime`. Typography uses DM Sans and Manrope with local sans-serif fallbacks if Google Fonts cannot load. Statuses include icons and text so color is never the only identifier. Green represents Proven/Verified, amber Partial, neutral Claimed-only, and red Gap/failure.

Layout uses responsive utility grids, wrapping actions, a desktop sidebar, and a mobile drawer. Tables remain semantic and horizontally scrollable. The evidence pipeline is a CSS/icon illustration of the process, not a fake candidate report. The distribution chart is a CSS conic gradient with an equivalent accessible description and visible counts.

Forms have labels, required fields, keyboard-operable controls, and accessible status/error regions. Focus rings are visible. Page titles use a consistent heading hierarchy. A skip link targets the main content. Reduced-motion preferences disable transitions/animations. Print rules hide navigation and nonessential controls.

Official setup reference: [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite).
