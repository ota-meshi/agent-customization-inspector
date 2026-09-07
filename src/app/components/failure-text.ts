// What a surface says when its own request did not complete: the statement it
// words for what could not be loaded, and the message the request carried
// after it.
//
// One rule rather than one per surface, because the two halves are always
// joined the same way and the difference is only in the statement — which is
// the surface's, since what could not be loaded is what the kind is about. A
// request can also end with nothing to add: a newer-generation refresh that
// could not adopt leaves its message to the shell, and the statement then
// stands alone rather than trailing an empty clause.

/**
 * The statement with the request's message after it, or the statement alone
 * where the request carried none.
 */
export function failureTextOf(statement: string, errorMessage: string | null): string {
  return errorMessage === null ? statement : `${statement} ${errorMessage}`;
}
