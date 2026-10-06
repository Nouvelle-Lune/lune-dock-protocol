/** @typedef {import('./host.d.ts').DockRegistry} DockRegistry */
/** @typedef {import('./host.d.ts').DockContribution} DockContribution */
/** @typedef {import('./host.d.ts').MountedContribution & { unsubscribe: () => void }} Mounted */
/** @typedef {import('./host.d.ts').DockHost} DockHost */

const REGISTRY_KEY = Symbol.for("nouvelle-lune.lune-protocol.v1");

/**
 * Each runner owns a stable UI context. Weak scopes keep separate sessions from seeing
 * each other's contributions while permitting several installed copies of this package.
 * @returns {DockRegistry}
 */
export function createDockRegistry() {
    /** @type {WeakMap<object, { contributions: Map<string, DockContribution>, mounted: Map<string, Mounted>, host?: DockHost }>} */
    const scopes = new WeakMap();

    /** @param {object} scope */
    const stateFor = (scope) => {
        let state = scopes.get(scope);
        if (!state) {
            state = { contributions: new Map(), mounted: new Map() };
            scopes.set(scope, state);
        }
        return state;
    };

    /**
     * Notify every owner before propagating errors; one faulty renderer must not leave
     * the other contributors unaware of a host transition.
     * @param {Iterable<DockContribution>} contributions
     * @param {boolean} present
     */
    const notifyPresence = (contributions, present) => {
        /** @type {unknown[]} */
        const errors = [];
        for (const contribution of contributions) {
            try {
                contribution.onHostPresenceChange?.(present);
            } catch (error) {
                errors.push(error);
            }
        }
        if (errors.length > 0) {
            throw new AggregateError(errors, "Lune dock host transition failed");
        }
    };

    return {
        registerContribution(scope, contribution) {
            const state = stateFor(scope);
            if (state.contributions.has(contribution.id)) {
                throw new Error(`Duplicate Lune dock contribution: ${contribution.id}`);
            }
            const mounted = {
                id: contribution.id,
                provider: contribution,
                snapshot: contribution.getSnapshot(),
                unsubscribe: () => {},
            };
            state.contributions.set(contribution.id, contribution);
            state.mounted.set(contribution.id, mounted);
            try {
                mounted.unsubscribe = contribution.subscribe((snapshot) => {
                    if (state.mounted.get(contribution.id) !== mounted) return;
                    mounted.snapshot = snapshot;
                    state.host?.invalidate();
                });
                contribution.onHostPresenceChange?.(state.host !== undefined);
            } catch (error) {
                state.contributions.delete(contribution.id);
                state.mounted.delete(contribution.id);
                mounted.unsubscribe();
                throw error;
            }
            state.host?.invalidate();
            return () => {
                // An old release handle cannot remove a later registration with the same ID.
                if (state.contributions.get(contribution.id) !== contribution) return;
                state.contributions.delete(contribution.id);
                state.mounted.delete(contribution.id);
                mounted.unsubscribe();
                state.host?.invalidate();
            };
        },
        attachHost(scope, host) {
            const state = stateFor(scope);
            if (state.host) throw new Error("A Lune dock host is already attached to this UI");
            state.host = host;
            try {
                for (const mounted of state.mounted.values()) {
                    mounted.snapshot = mounted.provider.getSnapshot();
                }
                notifyPresence(state.contributions.values(), true);
                host.invalidate();
            } catch (error) {
                // Failed initialization must not leak ownership when no release handle was
                // returned. The error still propagates; render failures never detach a live host.
                state.host = undefined;
                try {
                    notifyPresence(state.contributions.values(), false);
                } catch (cleanupError) {
                    throw new AggregateError([error, cleanupError], "Lune dock host attachment and cleanup failed");
                }
                throw error;
            }
            return () => {
                if (state.host !== host) return;
                state.host = undefined;
                notifyPresence(state.contributions.values(), false);
            };
        },
        hasHost(scope) {
            return scopes.get(scope)?.host !== undefined;
        },
        getHost(scope) {
            if (!scopes.get(scope)?.host) return undefined;
            return {
                protocolVersion: 1,
                register: (provider) => this.registerContribution(scope, provider),
            };
        },
        getContributions(scope) {
            return [...stateFor(scope).mounted.values()];
        },
    };
}

/** @returns {DockRegistry} */
export function getDockRegistry() {
    /** @type {Record<symbol, { version: number, registry: DockRegistry } | undefined>} */
    const globals = /** @type {Record<symbol, { version: number, registry: DockRegistry } | undefined>} */ (
        /** @type {unknown} */ (globalThis)
    );
    const existing = globals[REGISTRY_KEY];
    if (existing) {
        if (existing.version !== 1) throw new Error("Incompatible Lune dock protocol registry");
        return existing.registry;
    }
    const registry = createDockRegistry();
    Object.defineProperty(globalThis, REGISTRY_KEY, { value: { version: 1, registry } });
    return registry;
}
