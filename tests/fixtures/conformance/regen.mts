// Regenerates the checked-in conformance fixtures from the shipped registries.
// Not a gate: the gate is the contract suite comparing these files against the
// serializers. This exists so a deliberate registry change can re-record them
// instead of being written by hand.
//
// Run it as `node tests/fixtures/conformance/regen.mts` from the repository
// root, then `pnpm run format`: what is written here is `JSON.stringify`'s own
// two-space output, and these fixtures are Prettier's to format like every
// other file it owns (AGENTS.md § Formatting policy).
//
// The serializers are loaded through Vite rather than imported directly. Every
// module under `src/` is written for the bundler and spells its imports without
// an extension, which Node's own ESM resolver does not complete, so importing
// the serializer here made this script fail on the first `src/` specifier it
// reached. Vite is what resolves those specifiers everywhere else in this
// repository — the build, the dev server, and the vitest projects that run the
// gate — so reaching for it is taking the resolver the code was written for
// rather than writing a second one here.
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';

/** What the serializer module exports, as this script calls them. */
type Serializers = {
  serializeInspectionRules: () => unknown;
  serializeRelations: () => unknown;
  serializeRuntimeComposition: () => unknown;
  serializeVendorBehaviors: () => unknown;
};

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const serializers = (await server.ssrLoadModule(
    './tests/fixtures/conformance/serialize.ts',
  )) as Serializers;
  const outputs = {
    'inspection-rules.json': serializers.serializeInspectionRules(),
    'relations.json': serializers.serializeRelations(),
    'runtime-composition.json': serializers.serializeRuntimeComposition(),
    'vendor-behaviors.json': serializers.serializeVendorBehaviors(),
  };
  for (const [name, value] of Object.entries(outputs)) {
    writeFileSync(`tests/fixtures/conformance/${name}`, `${JSON.stringify(value, null, 2)}\n`);
    process.stdout.write(`wrote ${name}\n`);
  }
} finally {
  await server.close();
}
