// The `no-unattached-jsdoc` ESLint rule (eslint-rules/no-unattached-jsdoc.ts):
// a JSDoc block comment that documents nothing. The cases are written in
// TypeScript because the central thing the rule must not report is: a closed
// union documents each member from in front of its leading `|`, which is how
// every closed union in src/shared/entities.ts is written.
import { describe, it } from 'vitest';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import rule from '../../../eslint-rules/no-unattached-jsdoc';

// `RuleTester` runs its cases through whatever test functions it is given, and
// this project's Vitest configuration declares no globals for it to find.
RuleTester.describe = describe;
RuleTester.it = it;

/**
 * The tester for this rule: the TypeScript parser, because the sources under
 * test carry type declarations, and modules, because every source in this
 * repository is one.
 */
const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 'latest', sourceType: 'module' },
});

ruleTester.run('no-unattached-jsdoc', rule, {
  valid: [
    {
      name: 'a block documenting the declaration that follows it',
      code: `/** What the exported value is. */
export const value = 1;

export interface Holder {
  /** What the field holds. */
  readonly field: string;
}

export class Owner {
  /** What the member holds. */
  readonly member = 1;
}
`,
    },
    {
      name: 'a closed union documenting each member in front of its leading pipe',
      code: `/** The closed set of supported tools. */
export type SupportedTool =
  /** GitHub Copilot. */
  | 'copilot'
  /** Claude Code. */
  | 'claude';
`,
    },
    {
      name: 'a block a line comment stands between from its declaration',
      code: `/** What the exported value is. */
// A note that makes no documentation claim.
export const value = 1;
`,
    },
    {
      name: 'an ordinary block comment and a line comment closing a body',
      code: `export class Owner {
  /* Why this body is empty. */
  // And a line comment saying the same.
}
`,
    },
  ],
  invalid: [
    {
      name: 'a block the class body ends after',
      code: `export class Owner {
  /** Left behind by a deleted member. */
}
`,
      errors: [{ messageId: 'unattached', line: 2 }],
    },
    {
      name: 'a block the array literal ends after',
      code: `export const list = [
  'first',
  /** Left behind by a deleted entry. */
];
`,
      errors: [{ messageId: 'unattached', line: 3 }],
    },
    {
      name: 'a block the parameter list ends after',
      code: `export function receive(first: string /** Left behind by a deleted parameter. */) {
  return first;
}
`,
      errors: [{ messageId: 'unattached', line: 1 }],
    },
    {
      name: 'a block the file ends after',
      code: `export const value = 1;

/** Left behind by a deleted declaration. */
`,
      errors: [{ messageId: 'unattached', line: 3 }],
    },
    {
      name: 'the earlier of two blocks in front of one declaration',
      code: `/**
 * Left behind: the block below is the one the declaration receives.
 */
/**
 * What the exported value is.
 */
export const value = 1;
`,
      errors: [{ messageId: 'unattached', line: 1 }],
    },
  ],
});
