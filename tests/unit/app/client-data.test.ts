// @vitest-environment happy-dom
// T042: the shared client-data purge (contracts/http-api.md
// § Concurrency and lifecycle, FR-042). Proves the purge is one synchronous call site: every registered
// disposer runs before control returns, and `clientDataEpoch` advances only
// afterwards, so no caller can interleave a render between "state cleared"
// and "epoch advanced".
//
// Environment note: this suite exercises browser-side code, so it names
// happy-dom explicitly — the `coverage` project runs the same files under
// the Node environment its contract and integration members need.
import { describe, expect, it, vi } from 'vitest';

import { createClientDataPurge } from '../../../src/app/session/client-data';

describe('shared client-data purge', () => {
  it('runs every registered disposer synchronously, then increments the epoch', () => {
    const clientData = createClientDataPurge();
    const order: string[] = [];
    clientData.register((reason) => order.push(`first@${clientData.epoch()}:${reason}`));
    clientData.register((reason) => order.push(`second@${clientData.epoch()}:${reason}`));
    expect(clientData.epoch()).toBe(0);
    clientData.purge('global-content-epoch-advanced');
    // Both ran before control returned, both observed the epoch the purged
    // responses were captured under, and both received the trigger — the
    // disposer argument is the only way the reason reaches an owner.
    expect(order).toEqual([
      'first@0:global-content-epoch-advanced',
      'second@0:global-content-epoch-advanced',
    ]);
    expect(clientData.epoch()).toBe(1);
  });

  it('stops calling a disposer once it unregisters', () => {
    const clientData = createClientDataPurge();
    const disposer = vi.fn();
    const unregister = clientData.register(disposer);
    unregister();
    clientData.purge('channel-failure');
    expect(disposer).not.toHaveBeenCalled();
  });
});
