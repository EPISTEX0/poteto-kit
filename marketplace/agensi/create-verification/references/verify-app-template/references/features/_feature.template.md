# {{Display name}} (`{{feature-id}}`)

{{One paragraph: what this feature is for, where it appears on screen, and how a user would describe it. End with the root selector, for example: Root: `[data-component="{{root-component}}"]`.}}

## Sub-features

One line each: a stable id, then what it is. A sub-feature that cannot be reached ends with `skip: <reason>`.

- `{{feature-id}}-toggle` — {{show or hide it; mention the shortcut}}
- `{{feature-id}}-{{sub-feature-2}}` — {{...}}
- `{{feature-id}}-{{sub-feature-3}}` — {{behind feature flag `{{FLAG_NAME}}`, if gated; add `skip: <reason>` if you cannot enable it}}
- `{{feature-id}}-empty-state` — {{what shows with no data}}
- `{{feature-id}}-error-state` — {{what shows when it fails}}

## How to get to it

User point of view, one bullet per sub-feature: the exact steps, shortcuts and the visible result that tells you that you arrived. Note edge behavior, such as a shortcut that yields to the text editor when it has focus (use the button then).

- **`{{feature-id}}-toggle`:** {{From a normal state press `Cmd/Ctrl+{{KEY}}` or click the "{{Button label}}" button in {{region}}. You arrived when {{visible result}}.}}
- **`{{feature-id}}-{{sub-feature-2}}`:** {{steps}}
- **`{{feature-id}}-empty-state`:** {{how to reach it: which data to remove or which fresh account to use}}
- **`{{feature-id}}-error-state`:** {{how to trigger it: for example block the request, or use a fixture}}

## Driving it

How to drive it with {{DRIVER}}.

- **Preconditions:** the baseline in `README.md`, plus {{extra preconditions, such as a seeded record or a specific setting}}.
- **Chords per OS:** macOS `press "Meta+Key{{KEY}}"`; Windows and Linux `press "Control+Key{{KEY}}"`.
- **Selectors:** root `[data-component="{{root-component}}"]`; {{sub-feature}}: `[aria-label="{{label}}"]`; {{sub-feature}}: `[data-action-id="{{action-id}}"]`.
- **Command ids** (documentation only; they point at the handler): `{{command.id}}`.
- **Observable end states** to poll: {{status label text, attribute value, enabled or disabled button}}.
- **Gotchas:** {{things learned the hard way, for example "the hover card opens only after the pointer leaves and re-enters the row", "an ARIA click is not enough for a double-click reset: dispatch two real clicks", "the list is virtualized: scroll before asserting"}}.
