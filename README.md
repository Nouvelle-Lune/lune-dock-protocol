# Lune Dock Protocol v1

Plugin owns presentation. Dock owns placement.

This library connects plugin-owned Pi TUI presentations to the optional Lune Dock host.
The installed Pi distribution uses `@earendil-works/pi-tui` for its native `Component` type.

## Installation

```sh
npm install @nouvelle-lune/pi-dock-protocol
```

## Core contract

```ts
import type { Component } from "@earendil-works/pi-tui";

export const LUNE_PROTOCOL_VERSION = 1;
export type LuneDockDisplayMode = "base" | "detail" | "full";

export interface LuneDockSnapshot {
    base: Component;
    detail?: Component;
    full?: Component;
}

export interface LuneDockProvider {
    readonly id: string;
    getSnapshot(): LuneDockSnapshot;
    subscribe(listener: (snapshot: LuneDockSnapshot) => void): () => void;
    activate(): void | Promise<void>;
}

export interface LuneDockHost {
    readonly protocolVersion: number;
    register(provider: LuneDockProvider): () => void;
}
```

Every supplied level MUST return exactly one physical line from `render(width)`, including
narrow widths. Levels are complete alternative presentations of the same captured state;
publishing replaces the entire snapshot, removing omitted optional levels. Dock never combines
base + detail + full. Full means the richest single-line presentation; `activate()` separately
opens the plugin's interactive UI.

Pi `Text` may wrap at narrow widths. Use a custom Component with `truncateToWidth` when needed
to honor the single-line contract. Plugins own content, markers, colors and theme usage.
Theme-dependent content must rebuild on `invalidate()` or evaluate the current theme during
rendering. Dock propagates invalidation to every current level, including hidden contributions.
Snapshot Components are passive: Dock uses `render()` and `invalidate()`, never `handleInput()`.

| Dock mode | Selected Component |
| --- | --- |
| base | base |
| detail | detail, otherwise base |
| full | full, otherwise detail, otherwise base |

Missing optional levels are valid capabilities. Visibility, ordering, display mode, width
allocation, spacing and focus belong to Dock. Snapshot schema contains no business fields,
width metadata, visibility or ordering. Snapshot Components stay in process memory and are
never persisted. Plugins restore business state before generating current snapshots.

## Optional Pi lifecycle adapter

`createDockContribution` is a convenience adapter outside the core provider schema. It keeps
existing independent UI available when the host is absent or disabled, scopes registration to
`ctx.ui`, and exposes a provider with the core contract above.

```ts
import { createDockContribution } from "@nouvelle-lune/pi-dock-protocol";
import { truncateToWidth } from "@earendil-works/pi-tui";

const dock = createDockContribution({
    id: "my-plugin",
    getSnapshot: (ctx) => ({
        base: {
            render: (width) => [truncateToWidth(ctx.ui.theme.fg("success", "● My plugin"), width)],
            invalidate() {},
        },
    }),
    activate: (ctx) => openMyPanel(ctx),
    standalone: myExistingStatusBar, // setCtx(ctx), render(), clear()
});

dock.detach({ retired: true }); // Before replacing/restoring business state.
dock.attach(ctx);               // After restoration, even when idle.
dock.refresh();                 // Publish a complete replacement on presentation changes.
dock.detach();                  // Before shutdown/reset.
```

Hidden plugins keep publishing. An idle plugin supplies a meaningful base rather than returning
undefined. `refresh({ summaryChanged: false })` skips snapshot publication for changes that do
not affect any level while still updating independent UI. `clear()` must stop standalone timers
even when its context has retired. Detachment is idempotent and ignores stale publication callbacks.

Host infrastructure is exported separately from `@nouvelle-lune/pi-dock-protocol/host`.
`getDockRegistry().getHost(ctx.ui)` discovers a compatible host with `protocolVersion` and
`register(provider)`. The adapter supports both extension startup orders using presence callbacks.
The shared discovery registry uses `Symbol.for("nouvelle-lune.lune-protocol.v1")`, isolated by
runner UI scope; duplicate IDs or active hosts throw. A host reattachment obtains current
snapshots through `getSnapshot()`. The old DockItem/status/color/order contract is removed.
