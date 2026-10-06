import type { Component } from "@earendil-works/pi-tui";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export declare const LUNE_PROTOCOL_VERSION = 1;
export type LuneDockDisplayMode = "base" | "detail" | "full";

export interface LuneDockSnapshot {
    /** Required minimum-width presentation. Must render exactly one line. */
    base: Component;
    /** Optional medium-width presentation. Must render exactly one line. */
    detail?: Component;
    /** Optional maximum-information presentation. Must render exactly one line. */
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

/** Optional Pi lifecycle adapter; standalone UI is outside the snapshot contract. */
export interface IndependentDock {
    setCtx(ctx: ExtensionContext | undefined): void;
    render(): void;
    clear(): void;
}

export interface DockDefinition {
    id: string;
    getSnapshot(ctx: ExtensionContext): LuneDockSnapshot;
    activate(ctx: ExtensionContext): void | Promise<void>;
    standalone: IndependentDock;
}

export interface DockHandle {
    attach(ctx: ExtensionContext): void;
    detach(options?: { retired?: boolean }): void;
    refresh(options?: { summaryChanged?: boolean }): void;
}

export declare function createDockContribution(definition: DockDefinition): DockHandle;
