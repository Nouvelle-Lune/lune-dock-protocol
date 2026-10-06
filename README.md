# Lune Dock Protocol v1

Plugin owns presentation. Dock owns placement.

This library connects plugin-owned Pi TUI presentations to the optional Lune Dock host.
The installed Pi distribution uses `@earendil-works/pi-tui` for its native `Component` type.

## Installation

```sh
npm install lune-dock-protocol
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

## Usage

### Contribute from a Pi extension

Import `createDockContribution` from the package root. It registers the plugin's snapshots and keeps
its existing standalone UI available when the Dock host is absent or disabled.

```ts
import { createDockContribution } from "lune-dock-protocol";
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
    standalone: {
        setCtx: (ctx) => myExistingStatusBar.setCtx(ctx),
        render: () => myExistingStatusBar.render(),
        clear: () => myExistingStatusBar.clear(),
    },
});
```

Restore the plugin's state before `dock.attach(ctx)`, including when the plugin is idle. Call
`dock.refresh()` when that state changes, and `dock.detach()` before resetting or shutting down the
session. Pass `{ retired: true }` when replacing a context Pi has retired. `activate(ctx)` opens the
plugin's interactive UI; the snapshot Components only render the dock presentation.

The adapter handles host discovery and either startup order. If a host is present, it clears the
standalone UI; if the host is absent, it renders that UI. `refresh({ summaryChanged: false })` is
for changes that update the standalone UI but do not change any snapshot level.

### Implement a Dock host

Import `getDockRegistry` from the `/host` entry point. Attach the host to the current `ctx.ui`, then
read the registered contributions when rendering:

```ts
import { getDockRegistry } from "lune-dock-protocol/host";

const registry = getDockRegistry();
const releaseHost = registry.attachHost(ctx.ui, {
    invalidate: () => scheduleDockRender(),
});

function renderDock() {
    for (const { id, snapshot } of registry.getContributions(ctx.ui)) {
        renderContribution(id, snapshot);
    }
}

// Call releaseHost() when the host shuts down.
```

The host object supplies `invalidate()` to schedule a render. Each contribution has an `id` and a
complete `snapshot`; the host chooses visibility, ordering, display mode and width. `ctx.ui` scopes
registrations to one Pi runner. Use `registry.getHost(ctx.ui)` only when implementing a custom
contributor that needs to discover an attached host directly; `createDockContribution` handles that
for you.
