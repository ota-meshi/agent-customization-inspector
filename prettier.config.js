// Prettier owns code formatting; ESLint keeps only non-formatting rules.
// Every option not set here is Prettier's default on purpose: the fewer
// decisions this file records, the less there is to drift.
export default {
  // The codebase's established quote and width conventions. 100 is what the
  // hand-formatted code already used; `singleQuote` matches the
  // `@stylistic/quotes` rule, which stays in ESLint not for formatting but
  // because it forbids no-substitution template literals — a decision about
  // what a string *is* that Prettier does not make.
  printWidth: 100,
  singleQuote: true,
};
