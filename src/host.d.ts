import type { LuneDockHost, LuneDockProvider, LuneDockSnapshot } from "./index.js";

export interface DockContribution extends LuneDockProvider {
    onHostPresenceChange?(present: boolean): void;
}

export interface MountedContribution {
    readonly id: string;
    readonly provider: LuneDockProvider;
    snapshot: LuneDockSnapshot;
}

export interface DockHost {
    invalidate(): void;
}

/** The stable ctx.ui object isolates providers belonging to separate Pi runners. */
export interface DockRegistry {
    registerContribution(scope: object, contribution: DockContribution): () => void;
    attachHost(scope: object, host: DockHost): () => void;
    getHost(scope: object): LuneDockHost | undefined;
    hasHost(scope: object): boolean;
    getContributions(scope: object): readonly MountedContribution[];
}

export declare function createDockRegistry(): DockRegistry;
export declare function getDockRegistry(): DockRegistry;
