// ESLint rule: a JSDoc block comment that documents nothing.
//
// AGENTS.md § Code commenting policy asks for a JSDoc doc comment on every
// exported declaration, interface field, closed-union member, and class
// member, "so editors surface it on hover". This rule owns the other side of
// that requirement. When the declaration a block documented is deleted or
// renamed away, the block itself stays: it still reads as documentation, but
// no symbol carries it and no hover shows it. Nothing else here notices — the
// compiler sees a well-formed comment, Prettier reformats it, and a reviewer
// reads what a comment says rather than what it is attached to.
//
// Two shapes leave a block with no subject, and this rule reports both. In the
// first, nothing follows it at all: the next token closes the construct the
// block sits in — a class or interface body, an object or array literal, a
// parameter list — or the file ends there. In the second, the next thing is
// another JSDoc block, which takes the subject they both stand in front of and
// leaves the earlier one documenting nothing; that is what a deletion between
// two documented declarations leaves behind.
//
// Anything else following a block is left alone, because the position carries
// no verdict on its own: the closed-union declarations in
// src/shared/entities.ts document each member from in front of its leading
// `|`, and a block ahead of a `return` or an assignment has a subject that
// review can judge. This rule judges only the case where there is no subject
// at all.
import type { AST, Rule, SourceCode } from 'eslint';

/**
 * The comment shape `SourceCode` publishes, named from that method so the
 * helpers below take one without this module depending on the AST type
 * package directly.
 */
type SourceComment = ReturnType<SourceCode['getAllComments']>[number];

/**
 * What a token cursor returns when comments are included: a token of the
 * program, or one of the comments between two of them.
 */
type TokenOrComment = AST.Token | SourceComment;

/**
 * The punctuators that close a construct rather than continue it. A comment
 * standing immediately before one of these is inside a body, literal, or
 * argument list that ends there, so nothing remains for it to document.
 */
const CLOSING_PUNCTUATORS: ReadonlySet<string> = new Set(['}', ']', ')']);

/**
 * Answers whether an element is a comment rather than a token of the program.
 * `Block` and `Line` are the two comment types, and no token of a program
 * carries either.
 */
function isComment(element: TokenOrComment): boolean {
  return element.type === 'Block' || element.type === 'Line';
}

/**
 * Answers whether a comment opens as JSDoc. ESLint stores a block comment's
 * text without its delimiters, so the third character of a JSDoc opener is the
 * first character of the value; an ordinary block comment and a line comment
 * make no documentation claim, and this rule says nothing about them.
 */
function isJsdocBlock(element: TokenOrComment): boolean {
  return element.type === 'Block' && element.value.startsWith('*');
}

/**
 * Answers whether anything follows the comment that it could be documenting.
 * Comments that make no documentation claim are stepped over — they stand
 * between a doc comment and its subject without taking it — so what decides is
 * the first element after them: another JSDoc block takes the subject, a
 * closing punctuator means the construct ends here, and the end of the file
 * means nothing follows at all.
 */
function hasSubjectAfterIt(sourceCode: SourceCode, comment: SourceComment): boolean {
  let next: TokenOrComment | null = sourceCode.getTokenAfter(comment, { includeComments: true });
  while (next && isComment(next)) {
    if (isJsdocBlock(next)) return false;
    next = sourceCode.getTokenAfter(next, { includeComments: true });
  }
  if (!next) return false;
  return !(next.type === 'Punctuator' && CLOSING_PUNCTUATORS.has(next.value));
}

/**
 * Reports every JSDoc block comment that documents no declaration
 * (AGENTS.md § Code commenting policy).
 */
const noUnattachedJsdoc: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow a JSDoc block comment that documents no declaration',
    },
    schema: [],
    messages: {
      unattached:
        'This JSDoc comment documents nothing: nothing it can document follows it. Move it onto what it describes, or delete it.',
    },
  },
  create(context) {
    const { sourceCode } = context;

    return {
      // Comments are not visited nodes, so the whole comment list is walked
      // once, after the program has been parsed and its tokens are available.
      'Program:exit'() {
        for (const comment of sourceCode.getAllComments()) {
          if (!isJsdocBlock(comment)) continue;
          if (hasSubjectAfterIt(sourceCode, comment)) continue;
          context.report({ loc: comment.loc!, messageId: 'unattached' });
        }
      },
    };
  },
};

export default noUnattachedJsdoc;
