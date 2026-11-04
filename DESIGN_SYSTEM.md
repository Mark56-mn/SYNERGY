# SYNERGY Design System

Status: direction confirmed; exact token values below are initial implementation recommendations and should be visually reviewed.

## Brand direction
- Primary surfaces: dark navy.
- Accent/action: mint green.
- Tone: modern, welcoming, clear, trustworthy and community-oriented.
- Avoid visual clutter, excessive gradients, tiny text and dark-on-dark low contrast.

## Starter tokens (RECOMMENDED values)
```css
:root {
  --color-bg: #0B1220;
  --color-surface: #111C2E;
  --color-surface-raised: #17243A;
  --color-border: #26364D;
  --color-text: #F4F7FA;
  --color-text-muted: #A9B7C8;
  --color-primary: #63E6BE;
  --color-primary-hover: #43D6A9;
  --color-danger: #F07178;
  --color-warning: #F4C66A;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
}
```

## Interaction patterns
- Mobile-first responsive layouts; navigation must work on narrow screens.
- Clear primary action and consistent navigation.
- Buttons, inputs, cards, dialogs, tabs, menus, badges, toasts and form states should be reusable.
- Include focus-visible, hover, pressed, disabled, loading, error and success states.
- Use semantic HTML and accessible labels; keyboard navigation and screen-reader support.
- Respect reduced-motion preferences.
- Never rely on colour alone to communicate status.
- Confirm destructive actions and provide undo where practical.

## Product navigation direction
A candidate primary navigation is Home, Services, central Create (+), Market and Profile. Treat exact labels/IA as a recommended pattern until validated in the product design task.

## Design implementation rules
- Centralise tokens; do not scatter arbitrary hex values.
- Avoid one-off components when a reusable pattern exists.
- Provide empty/loading/error states for every data-driven screen.
- Use realistic content, but never real personal data.
- Capture screenshots at narrow mobile and desktop widths for major UI tasks.
- Do not claim visual approval without review evidence.
