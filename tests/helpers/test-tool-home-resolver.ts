import type { SourceRoot, ToolHomeResolver } from '../../src/sources/tool-homes.js';

export type TestRootFactory = (
  signal: AbortSignal,
) => readonly SourceRoot[] | Promise<readonly SourceRoot[]>;

/** Test-only resolver whose factory is not evaluated until Global is enabled. */
export class TestToolHomeResolver implements ToolHomeResolver {
  readonly #factory: TestRootFactory;
  calls = 0;

  constructor(factory: TestRootFactory) {
    this.#factory = factory;
  }

  async resolve(signal: AbortSignal): Promise<readonly SourceRoot[]> {
    this.calls += 1;
    signal.throwIfAborted();
    return this.#factory(signal);
  }
}
