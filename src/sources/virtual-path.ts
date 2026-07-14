import { Buffer } from 'node:buffer';

const VIRTUAL_BASE = /^[a-z][a-z0-9+.-]*:\/\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/?$/u;
const WINDOWS_DRIVE_PATH = /^[a-z]:/iu;

export const MAX_PUBLIC_PATH_CODE_UNITS = 4_096;
const MAX_VIRTUAL_BASE_CODE_UNITS = 512;

const isBidirectionalControl = (codePoint: number): boolean =>
  codePoint === 0x061c ||
  codePoint === 0x200e ||
  codePoint === 0x200f ||
  (codePoint >= 0x202a && codePoint <= 0x202e) ||
  (codePoint >= 0x2066 && codePoint <= 0x2069);

const isDisplayControl = (codePoint: number): boolean =>
  codePoint <= 0x1f ||
  (codePoint >= 0x7f && codePoint <= 0x9f) ||
  codePoint === 0x2028 ||
  codePoint === 0x2029 ||
  codePoint === 0xfeff ||
  isBidirectionalControl(codePoint);

const escapeCodePoint = (codePoint: number): string =>
  `\\u{${codePoint.toString(16).toUpperCase().padStart(4, '0')}}`;

/**
 * Returns a presentation-safe path segment without changing ordinary Unicode
 * text. Separators and invisible controls are made explicit so a filename
 * cannot visually change the surrounding path or source badge.
 */
export function escapeVirtualPathSegment(segment: string): string {
  let result = '';

  for (let index = 0; index < segment.length; index += 1) {
    const first = segment.charCodeAt(index);
    const isHighSurrogate = first >= 0xd800 && first <= 0xdbff;
    const second = isHighSurrogate ? segment.charCodeAt(index + 1) : -1;

    if (isHighSurrogate && second >= 0xdc00 && second <= 0xdfff) {
      const codePoint = segment.codePointAt(index)!;
      result += isDisplayControl(codePoint)
        ? escapeCodePoint(codePoint)
        : String.fromCodePoint(codePoint);
      index += 1;
      continue;
    }

    if (first >= 0xd800 && first <= 0xdfff) {
      result += escapeCodePoint(first);
      continue;
    }

    if (first === 0x2f || first === 0x5c || isDisplayControl(first)) {
      result += escapeCodePoint(first);
      continue;
    }

    result += segment[index];
  }

  return result;
}

const percentEncodeCodePoint = (codePoint: number): string => {
  const bytes = Buffer.from(String.fromCodePoint(codePoint), 'utf8');
  return [...bytes].map((byte) => `%${byte.toString(16).toUpperCase().padStart(2, '0')}`).join('');
};

const encodeUriSegment = (segment: string): string => {
  let result = '';

  for (let index = 0; index < segment.length; index += 1) {
    const first = segment.charCodeAt(index);
    const isHighSurrogate = first >= 0xd800 && first <= 0xdbff;
    const second = isHighSurrogate ? segment.charCodeAt(index + 1) : -1;

    if (isHighSurrogate && second >= 0xdc00 && second <= 0xdfff) {
      const codePoint = segment.codePointAt(index)!;
      result +=
        isDisplayControl(codePoint) ||
        codePoint === 0x25 ||
        codePoint === 0x23 ||
        codePoint === 0x2f ||
        codePoint === 0x3f ||
        codePoint === 0x5c
          ? percentEncodeCodePoint(codePoint)
          : String.fromCodePoint(codePoint);
      index += 1;
      continue;
    }

    if (first >= 0xd800 && first <= 0xdfff) {
      // A lone surrogate cannot be represented in UTF-8. This form remains
      // visible and collision-safe because literal percent signs are encoded.
      result += `%u${first.toString(16).toUpperCase().padStart(4, '0')}`;
      continue;
    }

    result +=
      isDisplayControl(first) ||
      first === 0x23 ||
      first === 0x25 ||
      first === 0x2f ||
      first === 0x3f ||
      first === 0x5c
        ? percentEncodeCodePoint(first)
        : segment[index];
  }

  return result;
};

const assertPathSegment = (segment: string): void => {
  if (segment.length === 0 || segment === '.' || segment === '..') {
    throw new TypeError('Virtual path segments must be non-empty and relative.');
  }
};

/**
 * Splits an untrusted portable relative path. Both POSIX and Windows
 * separators are recognized; absolute, drive-relative, UNC, device, empty,
 * and traversal forms are rejected before they can reach filesystem APIs.
 */
export function splitPortableRelativePath(relativePath: string): string[] {
  if (
    relativePath.length === 0 ||
    relativePath.length > MAX_PUBLIC_PATH_CODE_UNITS ||
    relativePath.startsWith('/') ||
    relativePath.startsWith('\\') ||
    WINDOWS_DRIVE_PATH.test(relativePath)
  ) {
    throw new TypeError('Expected a non-empty relative path.');
  }

  const segments = relativePath.split(/[\\/]/u);
  for (const segment of segments) {
    assertPathSegment(segment);
  }

  return segments;
}

export interface SafeVirtualPath {
  /** Presentation-safe, slash-separated path relative to the source root. */
  readonly relativePath: string;
  /** Presentation-safe final path component. */
  readonly basename: string;
  /** Source-qualified path with unsafe URI delimiters and controls encoded. */
  readonly virtualPath: string;
}

/**
 * Builds public path fields from already separated filesystem components.
 * Walkers should prefer this API so a literal backslash in a POSIX filename
 * cannot be mistaken for a Windows separator.
 */
export function createVirtualPathFromSegments(
  virtualBase: string,
  segments: readonly string[],
): SafeVirtualPath {
  if (virtualBase.length > MAX_VIRTUAL_BASE_CODE_UNITS || !VIRTUAL_BASE.test(virtualBase)) {
    throw new TypeError('Invalid virtual path base.');
  }
  if (segments.length === 0) {
    throw new TypeError('A virtual path requires at least one segment.');
  }

  for (const segment of segments) {
    assertPathSegment(segment);
  }

  const displaySegments = segments.map(escapeVirtualPathSegment);
  const encodedSegments = segments.map(encodeUriSegment);
  const separator = virtualBase.endsWith('://') || virtualBase.endsWith('/') ? '' : '/';

  const relativePath = displaySegments.join('/');
  const virtualPath = `${virtualBase}${separator}${encodedSegments.join('/')}`;
  if (
    relativePath.length > MAX_PUBLIC_PATH_CODE_UNITS ||
    virtualPath.length > MAX_PUBLIC_PATH_CODE_UNITS
  ) {
    throw new TypeError('The public virtual path exceeds its length limit.');
  }

  return {
    relativePath,
    basename: displaySegments.at(-1)!,
    virtualPath,
  };
}

/** Builds public path fields from a portable relative path string. */
export function createVirtualPath(virtualBase: string, relativePath: string): SafeVirtualPath {
  return createVirtualPathFromSegments(virtualBase, splitPortableRelativePath(relativePath));
}
