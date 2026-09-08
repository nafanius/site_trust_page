# VisaPlace UI Example

A high-fidelity, isolated frontend reproduction of [visaplace.com](https://www.visaplace.com/) — a professional US & Canadian immigration law firm website.

## Design Philosophy

**Reading this as:** A trust-first, corporate legal services marketing site. Clean, authoritative, and approachable. Heavy emphasis on professionalism, credibility, and clear calls-to-action.

**Key Design Dials:**
- **Variance:** 4 — Professional but not cold. Uses warm coral accent against deep navy.
- **Motion:** 3 — Subtle, purposeful transitions (dropdowns, cards, buttons). No excessive animation.
- **Density:** 4 — Information-rich but well-spaced. Clear visual hierarchy.

## Visual Language

### Color Palette
| Token          | Value      | Usage                          |
|----------------|------------|--------------------------------|
| `--vp-primary` | `#055a96`  | Primary links, headings, focus |
| `--vp-navy`    | `#243E58`  | Hero, dark sections, strong text |
| `--vp-accent`  | `#f9794c`  | CTAs, highlights, buttons      |
| `--vp-text`    | `#45464d`  | Body text                      |
| `--vp-text-muted` | `#939598` | Secondary text, captions     |
| Light bg       | `#f9f9f9`  | Section backgrounds            |

### Typography
- **Primary:** Montserrat (headings + UI)
- **Body:** System UI stack (clean, readable)
- Strong use of negative letter-spacing on large headings for a premium feel.

### Components Replicated
- Sticky professional header with mega menus
- Large hero with gradient overlay + country selector
- Service cards with subtle hover states
- Tabbed content + native `<details>` accordions
- Resource/article cards
- High-fidelity contact form with validation
- Modal confirmation flow
- Responsive mobile drawer

## Project Structure

```
example/
├── index.html          # Complete UI playground + homepage replica
├── css/
│   ├── input.css       # Design tokens + custom component styles
│   └── output.css      # Compiled + hand-crafted production CSS
├── js/
│   └── main.js         # All interactions (menu, tabs, form, modal, a11y)
├── assets/             # Placeholder for future images/icons
└── README.md
```

## Running the Example

Simply open `index.html` in any modern browser. No build step required.

All assets are self-contained (uses Tailwind Play CDN + static `output.css`).

## Key Interactions Implemented

| Feature                  | Implementation                              | States Covered                  |
|--------------------------|---------------------------------------------|---------------------------------|
| Desktop Navigation       | CSS group-hover + JS focus management       | Hover, focus, keyboard          |
| Mega Menus               | Dropdowns for US / Canada                   | Open, close, escape, outside click |
| Mobile Drawer            | Slide-in panel                              | Open, close, backdrop, escape   |
| Tabs                     | US vs Canada pathways                       | Active, keyboard arrows         |
| Accordions               | Native `<details>` + custom styling         | Open/closed                     |
| Form Validation          | Real-time + on-submit                       | Error states, success           |
| Modal                    | Thank-you confirmation                      | Open, close, focus trap         |
| Buttons                  | `.button-new` matching reference            | Hover, active, disabled         |

## Accessibility Notes

- Full keyboard navigation
- Focus visible states
- ARIA attributes on menus and drawers
- Proper heading hierarchy
- Form labels and error association
- Skip link included

## How This Matches the Original

- **Header:** Logo + multi-level navigation + prominent phone CTA
- **Hero:** Large headline, subtext, dual CTAs, country selector strip
- **Trust signals:** Professional bar + client logos style
- **Content blocks:** Service cards, testimonials, resource grid
- **Form:** Matches the serious, conversion-focused style
- **Footer:** Comprehensive link structure

## Customization

All design tokens live in:
- `:root` in `css/output.css`
- Custom classes in `css/input.css`

To modify the accent color, change `--vp-accent` and the corresponding Tailwind classes.

## Notes

This is a **high-fidelity frontend example**, not a pixel-perfect clone. It captures the spirit, layout patterns, component language, and interaction model of VisaPlace while being fully self-contained and easy to iterate on.

Built following the design-taste-frontend skill guidelines.