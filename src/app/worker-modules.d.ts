// Ambient types for Vite's `?worker` import suffix.
//
// Vite compiles a `?worker` import into a constructor that builds a same-origin
// `Worker` from an emitted asset. Its types live in `vite/client`, which the
// Nuxt application tsconfig deliberately does not add to `types` (that would
// also pull in Vite's ambient asset and env declarations for the whole
// project). Declaring only the suffix this application actually uses keeps the
// build's one worker import typed without widening the ambient surface.
declare module '*?worker' {
  /** Constructs the emitted same-origin worker; no URL is assembled at runtime. */
  const WorkerConstructor: new () => Worker;
  export default WorkerConstructor;
}
