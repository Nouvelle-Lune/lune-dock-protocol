import { getDockRegistry } from "./host.js";

export const LUNE_PROTOCOL_VERSION = 1;

/**
 * Keep the existing independent UI usable without a host. Plugins explicitly attach after
 * restoring business state and detach before resetting it, preserving their event ordering.
 * @param {import('./index.d.ts').DockDefinition} definition
 * @returns {import('./index.d.ts').DockHandle}
 */
export function createDockContribution(definition) {
    const registry = getDockRegistry();
    const standalone = definition.standalone;
    /** @type {import('@earendil-works/pi-coding-agent').ExtensionContext | undefined} */
    let ctx;
    /** @type {(() => void) | undefined} */
    let release;

    /** @type {Set<(snapshot: import('./index.d.ts').LuneDockSnapshot) => void>} */
    const listeners = new Set();
    /** @type {import('./index.d.ts').LuneDockSnapshot | undefined} */
    let snapshot;

    /** @type {import('./index.d.ts').DockHandle} */
    const handle = {
        attach(currentCtx) {
            handle.detach({ retired: true });
            ctx = currentCtx;
            standalone.setCtx(currentCtx);
            if (currentCtx.mode !== "tui") {
                standalone.render();
                return;
            }
            snapshot = definition.getSnapshot(currentCtx);
            release = registry.registerContribution(currentCtx.ui, {
                id: definition.id,
                getSnapshot: () => /** @type {import('./index.d.ts').LuneDockSnapshot} */ (snapshot),
                subscribe(listener) {
                    listeners.add(listener);
                    return () => { listeners.delete(listener); };
                },
                activate: () => definition.activate(currentCtx),
                onHostPresenceChange(present) {
                    if (present) standalone.clear();
                    else standalone.render();
                },
            });
        },
        detach(options = {}) {
            release?.();
            release = undefined;
            // Clear still stops independent UI timers when the old runner has retired its UI.
            if (options.retired) standalone.setCtx(undefined);
            if (ctx) standalone.clear();
            standalone.setCtx(undefined);
            snapshot = undefined;
            listeners.clear();
            ctx = undefined;
        },
        refresh(options = {}) {
            if (!ctx) return;
            if (options.summaryChanged !== false && release) {
                snapshot = definition.getSnapshot(ctx);
                for (const listener of listeners) listener(snapshot);
            }
            if (!release || !registry.hasHost(ctx.ui)) standalone.render();
        },
    };
    return handle;
}
