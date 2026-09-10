// Regenerates the checked-in conformance fixtures from the shipped registries.
// Not a gate: the gate is the contract suite comparing these files against the
// serializers. This exists so a deliberate registry change can re-record them
// in one step instead of by hand.
import { writeFileSync } from 'node:fs';
import {
  serializeInspectionRules,
  serializeRelations,
  serializeRuntimeComposition,
  serializeVendorBehaviors,
} from './serialize';

const outputs = {
  'inspection-rules.json': serializeInspectionRules(),
  'relations.json': serializeRelations(),
  'runtime-composition.json': serializeRuntimeComposition(),
  'vendor-behaviors.json': serializeVendorBehaviors(),
};
for (const [name, value] of Object.entries(outputs)) {
  writeFileSync(`tests/fixtures/conformance/${name}`, `${JSON.stringify(value, null, 2)}\n`);
  process.stdout.write(`wrote ${name}\n`);
}
