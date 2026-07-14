import { Buffer } from 'node:buffer';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { TextDecoder } from 'node:util';

import type { DiagnosticCollector } from '../core/diagnostics.js';
import { hasSameFileIdentity, inspectBoundaryEntry, type FileIdentity } from './root-boundary.js';
import { isLocatorSnapshotCurrent, type DiscoveredFile, type FileSnapshot } from './walk.js';

const READ_CHUNK_BYTES = 64 * 1024;
const RESERVE_READ_BYTES = Symbol('reserveReadBytes');
const SETTLE_READ_BYTES = Symbol('settleReadBytes');

class ReadReservation {
  readonly #budget: ReadBudget;
  readonly #reservedBytes: number;
  #settled = false;

  constructor(budget: ReadBudget, reservedBytes: number) {
    this.#budget = budget;
    this.#reservedBytes = reservedBytes;
  }

  settle(bytesRead: number): void {
    if (this.#settled) {
      return;
    }
    this.#settled = true;
    this.#budget[SETTLE_READ_BYTES](this.#reservedBytes, bytesRead);
  }

  cancel(): void {
    this.settle(0);
  }
}

/**
 * Concurrency-safe-in-one-event-loop reservation budget. Reservations prevent
 * parallel reads from all observing the same remaining source/combined bytes.
 */
export class ReadBudget {
  readonly #maximumBytes: number;
  #usedBytes = 0;
  #reservedBytes = 0;

  constructor(maximumBytes: number) {
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) {
      throw new TypeError('A read budget must be a positive safe integer.');
    }
    this.#maximumBytes = maximumBytes;
  }

  get maximumBytes(): number {
    return this.#maximumBytes;
  }

  get usedBytes(): number {
    return this.#usedBytes;
  }

  get reservedBytes(): number {
    return this.#reservedBytes;
  }

  get remainingBytes(): number {
    return this.#maximumBytes - this.#usedBytes - this.#reservedBytes;
  }

  [RESERVE_READ_BYTES](byteLength: number): ReadReservation | undefined {
    if (!Number.isSafeInteger(byteLength) || byteLength < 0 || byteLength > this.remainingBytes) {
      return undefined;
    }
    this.#reservedBytes += byteLength;
    return new ReadReservation(this, byteLength);
  }

  [SETTLE_READ_BYTES](reservedBytes: number, bytesRead: number): void {
    if (!Number.isSafeInteger(bytesRead) || bytesRead < 0 || bytesRead > reservedBytes) {
      throw new TypeError('The settled byte count exceeds its reservation.');
    }
    this.#reservedBytes -= reservedBytes;
    this.#usedBytes += bytesRead;
  }
}

export interface ReadTextFileOptions {
  readonly diagnostics: DiagnosticCollector;
  readonly maxFileBytes: number;
  /** Per-source byte budget. */
  readonly sourceBudget: ReadBudget;
  /** Optional session-wide budget shared by Repository and Global. */
  readonly combinedBudget?: ReadBudget;
  readonly signal?: AbortSignal;
}

export interface ReadTextResult {
  readonly text: string;
  readonly byteLength: number;
}

/**
 * Opens and reads one discovered regular file through a no-follow descriptor
 * where supported. Identity, source containment, size, mutation, UTF-8, and
 * source/combined budgets are verified before text is returned.
 */
export async function readTextFile(
  file: DiscoveredFile,
  options: ReadTextFileOptions,
): Promise<ReadTextResult | undefined> {
  if (options.signal?.aborted) {
    return undefined;
  }

  const pathForDiagnostic = file.entry.virtualPath;
  const inspected = await inspectBoundaryEntry(
    file.locator.boundary,
    file.locator.absolutePath,
    options.signal,
  );

  if (!inspected.ok) {
    if (inspected.reason !== 'aborted') {
      options.diagnostics.add({
        code:
          inspected.reason === 'symlink'
            ? 'DISCOVERY_SYMLINK_SKIPPED'
            : inspected.reason === 'outside-root'
              ? 'DISCOVERY_OUTSIDE_ROOT_SKIPPED'
              : 'DISCOVERY_FILE_CHANGED',
        severity: inspected.reason === 'outside-root' ? 'error' : 'warning',
        message:
          inspected.reason === 'symlink'
            ? 'A symbolic link was skipped.'
            : inspected.reason === 'outside-root'
              ? 'A file outside the canonical source root was skipped.'
              : 'A file changed before it could be read and was skipped.',
        virtualPath: pathForDiagnostic,
      });
    }
    return undefined;
  }

  const currentSnapshot = snapshotFromStats(
    inspected.identity,
    inspected.stats.size,
    inspected.stats.mtimeNs,
    inspected.stats.ctimeNs,
  );
  if (!isLocatorSnapshotCurrent(file.locator, currentSnapshot)) {
    options.diagnostics.add({
      code: 'DISCOVERY_FILE_CHANGED',
      severity: 'warning',
      message: 'A file changed before it could be read and was skipped.',
      virtualPath: pathForDiagnostic,
    });
    return undefined;
  }

  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let reservations: ReadReservation[] = [];
  let bytesRead = 0;

  try {
    const noFollow = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;
    handle = await open(inspected.canonicalPath, constants.O_RDONLY | noFollow);
    options.signal?.throwIfAborted();

    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile()) {
      options.diagnostics.add({
        code: 'DISCOVERY_NON_REGULAR_FILE_SKIPPED',
        severity: 'warning',
        message: 'A non-regular filesystem entry was skipped.',
        virtualPath: pathForDiagnostic,
      });
      return undefined;
    }

    const openedSnapshot = snapshotFromStats(
      { device: opened.dev, inode: opened.ino },
      opened.size,
      opened.mtimeNs,
      opened.ctimeNs,
    );
    if (!isLocatorSnapshotCurrent(file.locator, openedSnapshot)) {
      options.diagnostics.add({
        code: 'DISCOVERY_FILE_CHANGED',
        severity: 'warning',
        message: 'A file changed before it could be read and was skipped.',
        virtualPath: pathForDiagnostic,
      });
      return undefined;
    }

    if (opened.size > BigInt(options.maxFileBytes)) {
      options.diagnostics.add({
        code: 'DISCOVERY_FILE_SIZE_LIMIT_REACHED',
        severity: 'warning',
        message: 'A file exceeded the per-file byte limit and was skipped.',
        virtualPath: pathForDiagnostic,
      });
      return undefined;
    }

    const expectedBytes = Number(opened.size);
    const budgets = [options.sourceBudget, options.combinedBudget].filter(
      (budget, index, all): budget is ReadBudget =>
        budget !== undefined && all.indexOf(budget) === index,
    );
    reservations = reserveAll(budgets, expectedBytes);
    if (reservations.length !== budgets.length) {
      options.diagnostics.add({
        code: 'DISCOVERY_TOTAL_BYTE_LIMIT_REACHED',
        severity: 'warning',
        message: 'The source or combined read-byte limit was reached.',
        virtualPath: pathForDiagnostic,
      });
      return undefined;
    }

    const chunks: Buffer[] = [];
    while (bytesRead < expectedBytes) {
      options.signal?.throwIfAborted();
      const requested = Math.min(READ_CHUNK_BYTES, expectedBytes - bytesRead);
      const buffer = Buffer.allocUnsafe(requested);
      const result = await handle.read(buffer, 0, requested, bytesRead);
      if (result.bytesRead === 0) {
        break;
      }
      chunks.push(buffer.subarray(0, result.bytesRead));
      bytesRead += result.bytesRead;
    }

    settleAll(reservations, bytesRead);
    reservations = [];

    const afterRead = await handle.stat({ bigint: true });
    const afterSnapshot = snapshotFromStats(
      { device: afterRead.dev, inode: afterRead.ino },
      afterRead.size,
      afterRead.mtimeNs,
      afterRead.ctimeNs,
    );
    if (
      bytesRead !== expectedBytes ||
      !hasSameFileIdentity(openedSnapshot.identity, afterSnapshot.identity) ||
      openedSnapshot.byteLength !== afterSnapshot.byteLength ||
      openedSnapshot.modifiedNanoseconds !== afterSnapshot.modifiedNanoseconds ||
      openedSnapshot.changedNanoseconds !== afterSnapshot.changedNanoseconds
    ) {
      options.diagnostics.add({
        code: 'DISCOVERY_FILE_CHANGED',
        severity: 'warning',
        message: 'A file changed while it was being read and was skipped.',
        virtualPath: pathForDiagnostic,
      });
      return undefined;
    }

    const verified = await inspectBoundaryEntry(
      file.locator.boundary,
      file.locator.absolutePath,
      options.signal,
    );
    if (!verified.ok || !hasSameFileIdentity(openedSnapshot.identity, verified.identity)) {
      if (verified.ok || verified.reason !== 'aborted') {
        options.diagnostics.add({
          code: 'DISCOVERY_FILE_CHANGED',
          severity: 'warning',
          message: 'A file changed while it was being read and was skipped.',
          virtualPath: pathForDiagnostic,
        });
      }
      return undefined;
    }

    const bytes = Buffer.concat(chunks, bytesRead);
    let text: string;
    try {
      text = new TextDecoder('utf-8', {
        fatal: true,
        ignoreBOM: true,
      }).decode(bytes);
    } catch {
      options.diagnostics.add({
        code: 'DISCOVERY_INVALID_UTF8',
        severity: 'warning',
        message: 'A file was not valid UTF-8 text and was skipped.',
        virtualPath: pathForDiagnostic,
      });
      return undefined;
    }

    return { text, byteLength: bytesRead };
  } catch (error: unknown) {
    if (!options.signal?.aborted && !isAbortError(error)) {
      options.diagnostics.add({
        code: 'DISCOVERY_FILE_UNREADABLE',
        severity: 'warning',
        message: 'A file could not be read and was skipped.',
        virtualPath: pathForDiagnostic,
      });
    }
    return undefined;
  } finally {
    for (const reservation of reservations) {
      reservation.settle(bytesRead);
    }
    await handle?.close().catch(() => undefined);
  }
}

const reserveAll = (budgets: readonly ReadBudget[], byteLength: number): ReadReservation[] => {
  const reservations: ReadReservation[] = [];
  for (const budget of budgets) {
    const reservation = budget[RESERVE_READ_BYTES](byteLength);
    if (reservation === undefined) {
      for (const current of reservations) {
        current.cancel();
      }
      return [];
    }
    reservations.push(reservation);
  }
  return reservations;
};

const settleAll = (reservations: readonly ReadReservation[], bytesRead: number): void => {
  for (const reservation of reservations) {
    reservation.settle(bytesRead);
  }
};

const snapshotFromStats = (
  identity: FileIdentity,
  byteLength: bigint,
  modifiedNanoseconds: bigint,
  changedNanoseconds: bigint,
): FileSnapshot => ({
  identity,
  byteLength,
  modifiedNanoseconds,
  changedNanoseconds,
});

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
