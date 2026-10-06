import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { createDockContribution, type IndependentDock } from "../src/index.js";
import { getDockRegistry } from "../src/host.js";

function fixture() {
    const writes: object[] = [];
    let ctx: ExtensionContext | undefined;
    let clears = 0;
    const standalone: IndependentDock = {
        setCtx(value) { ctx = value; },
        render() { if (ctx) writes.push(ctx.ui); },
        clear() { clears++; if (ctx) writes.push(ctx.ui); },
    };
    const handle = createDockContribution({
        id: "fixture", getSnapshot: () => ({ base: { render: () => ["fixture"], invalidate() {} } }), activate: () => undefined, standalone,
    });
    const context = (mode = "tui") => ({ ui: {}, mode }) as ExtensionContext;
    return { handle, writes, context, cleared: () => clears };
}

describe("contributor adapter", () => {
    it("preserves independent rendering and switches immediately as a host enables or disables", () => {
        // Contract: both startup orders use presence alone to select the display owner.
        const { handle, writes, context } = fixture();
        const ctx = context();
        handle.attach(ctx);
        assert.equal(writes.length, 1);
        let invalidations = 0;
        const release = getDockRegistry().attachHost(ctx.ui, { invalidate: () => invalidations++ });
        const afterActivation = writes.length;
        const initialInvalidations = invalidations;
        handle.refresh();
        assert.equal(writes.length, afterActivation);
        assert.equal(invalidations, initialInvalidations + 1);
        handle.refresh({ summaryChanged: false });
        assert.equal(invalidations, initialInvalidations + 1);
        release();
        assert.equal(writes.length, afterActivation + 1);
        handle.refresh({ summaryChanged: false });
        assert.equal(writes.length, afterActivation + 2);
        handle.detach();
    });

    it("clears independent UI when the host was loaded first and delegates panel opening", () => {
        // Contract: a contributor loaded after the host never renders an independent status row.
        const { handle, context, cleared } = fixture();
        const ctx = context();
        const release = getDockRegistry().attachHost(ctx.ui, { invalidate() {} });
        handle.attach(ctx);
        assert.equal(cleared(), 1);
        assert.equal(getDockRegistry().getContributions(ctx.ui).length, 1);
        getDockRegistry().getContributions(ctx.ui)[0]!.provider.activate();
        handle.detach();
        release();
    });

    it("replaces and retires scopes without writing to the old UI and releases twice safely", () => {
        // Contract: retiring a context still stops timers through clear, but never writes to it.
        const { handle, context, writes, cleared } = fixture();
        const first = context();
        const second = context();
        handle.attach(first);
        const previousWrites = writes.filter((ui) => ui === first.ui).length;
        handle.attach(second);
        assert.equal(writes.filter((ui) => ui === first.ui).length, previousWrites);
        assert.equal(getDockRegistry().getContributions(first.ui).length, 0);
        assert.equal(getDockRegistry().getContributions(second.ui).length, 1);
        handle.detach({ retired: true });
        assert.equal(cleared(), 2);
        const count = writes.length;
        handle.detach();
        handle.refresh();
        assert.equal(writes.length, count);
    });

    it("keeps non-TUI use independent and reports rendering failures without claiming registration", () => {
        // Contract: non-TUI contexts do not register; initialization errors propagate explicitly.
        const { handle, context } = fixture();
        const ctx = context("rpc");
        handle.attach(ctx);
        assert.equal(getDockRegistry().getContributions(ctx.ui).length, 0);
        handle.detach();
        const broken = createDockContribution({
            id: "broken", getSnapshot: () => ({ base: { render: () => ["broken"], invalidate() {} } }), activate() {},
            standalone: { setCtx() {}, render() { throw new Error("render failed"); }, clear() {} },
        });
        const tui = context();
        assert.throws(() => broken.attach(tui), /render failed/);
        assert.equal(getDockRegistry().getContributions(tui.ui).length, 0);
        broken.detach();
    });
});
