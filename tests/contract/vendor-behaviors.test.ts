// T052/T060: the vendor-behavior and runtime-composition half of the registry
// contract gate — stable reciprocal IDs, the evidence grammar, and the
// structure-only projection vocabulary. This gate is what the runtime relies
// on instead of re-validating the registries at scan time
// (contracts/inspection-path-allowlist.md § Common conformance requirements).
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { INSPECTION_RULES } from '../../src/shared/registries/inspection-rules';
import { RUNTIME_COMPOSITION_STRATEGIES } from '../../src/shared/registries/runtime-composition';
import { VENDOR_BEHAVIOR_STATEMENTS } from '../../src/shared/registries/vendor-behaviors';
import { RULE_RELATIONS, STRATEGY_RELATIONS } from '../../src/shared/registries/relations';
import { LIFECYCLE_QUALIFIER_ORDER } from '../../src/shared/entities';
import {
  serializeRelations,
  serializeRuntimeComposition,
  serializeVendorBehaviors,
} from '../fixtures/conformance/serialize';

const behaviors = Object.values(VENDOR_BEHAVIOR_STATEMENTS);
const strategies = Object.values(RUNTIME_COMPOSITION_STRATEGIES);

const DOCUMENTATION_STATUSES = ['documented', 'partially-documented', 'unknown', 'conflict'];

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(`tests/fixtures/conformance/${name}`, 'utf8'));
}

describe('evidence citations', () => {
  // QR-005: every maintained behavior, rule, and strategy cites one or more
  // stable source IDs resolving to a canonical first-party URL, exact reviewed
  // sections, and a review date. These assertions are what make the citation an
  // identity rather than a loose URL — the contract's allowlist of official
  // hosts is a document, so the gate here is that a citation cannot disagree
  // with itself or with another citation of the same page.
  const citations = [
    ...behaviors.flatMap((record) => record.evidence),
    ...Object.values(RUNTIME_COMPOSITION_STRATEGIES).flatMap((record) => record.evidence),
    ...Object.values(INSPECTION_RULES).flatMap((record) => record.evidence),
  ];

  it('states a source ID, an HTTPS URL on its own host, sections, and a review date', () => {
    expect(citations.length).toBeGreaterThan(0);
    for (const citation of citations) {
      expect(citation.sourceId.length).toBeGreaterThan(0);
      const url = new URL(citation.url);
      expect(url.protocol).toBe('https:');
      // The host is the citation's own claim about where the page lives, so it
      // must be the URL's host rather than a sibling or a parent domain.
      expect(citation.officialHost).toBe(url.host);
      // No credentials, query, or fragment: a citation names a page, not a
      // request, and an anchor is not how a section is identified here.
      expect(url.username).toBe('');
      expect(url.search).toBe('');
      expect(url.hash).toBe('');
      expect(citation.sections.length).toBeGreaterThan(0);
      expect(citation.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      expect(citation.establishes.length).toBeGreaterThan(0);
    }
  });

  /**
   * The official-sources contract rows, parsed from the normative page. The
   * table is the single normative row per reviewed page; a citation is its
   * implementation counterpart, so resolving one against the other is what
   * makes the citation an identity rather than a copy that can drift — which it
   * already did once, when a page moved host and the allowlist above it did
   * not follow.
   */
  function parseSourceRows(path: string) {
    const rows = new Map<string, { url: string; host: string; sections: string[]; reviewedOn: string }>();
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = /^\| `([a-z0-9.-]+)` \| <(https:\/\/[^>]+)> \| `([^`]+)` \| (.+?) \| `(\d{4}-\d{2}-\d{2})` \|$/u.exec(
        line,
      );
      if (match === null) {
        continue;
      }
      // A duplicate row is a contract error, not a last-one-wins merge: two
      // rows for one page can disagree, and silently keeping the second would
      // hide exactly that.
      expect(rows.has(match[1]!), `duplicate official-sources row for ${match[1]}`).toBe(false);
      rows.set(match[1]!, {
        url: match[2]!,
        host: match[3]!,
        sections: [...match[4]!.matchAll(/`([^`]+)`/gu)].map((section) => section[1]!),
        reviewedOn: match[5]!,
      });
    }
    return rows;
  }

  /**
   * The hosts the contract allows, parsed from its vendor table. Checking a
   * citation against the rows alone would pass a host nobody allowed, as long
   * as the row and the citation were edited together — which is how the one
   * host that slipped through got there.
   */
  function parseAllowedHosts(path: string) {
    const byVendor = new Map<string, Set<string>>();
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = /^\| (GitHub|Microsoft|Anthropic|OpenAI) \| (.+) \|$/u.exec(line);
      if (match === null) {
        continue;
      }
      expect(byVendor.has(match[1]!), `duplicate host row for ${match[1]}`).toBe(false);
      byVendor.set(
        match[1]!,
        new Set([...match[2]!.matchAll(/`([^`]+)`/gu)].map((host) => host[1]!)),
      );
    }
    return byVendor;
  }

  /** Whether `value` is the calendar date it spells, not merely digit-shaped. */
  function isRealDate(value: string): boolean {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  it('resolves every citation to its normative official-sources row', () => {
    const rows = parseSourceRows('specs/001-inspect-agent-customizations/contracts/official-sources.md');
    expect(rows.size).toBeGreaterThan(0);
    for (const citation of citations) {
      const row = rows.get(citation.sourceId);
      expect(row, `no official-sources row for ${citation.sourceId}`).toBeDefined();
      // A moved page changes the row; a citation left behind fails here rather
      // than pointing at a URL the contract no longer lists.
      expect(citation.url).toBe(row!.url);
      expect(citation.officialHost).toBe(row!.host);
      // A citation may rest on some of a page's reviewed sections, never on a
      // heading the row does not list.
      for (const section of citation.sections) {
        expect(row!.sections).toContain(section);
      }
      // One review updates the row and every citation of it together, so a
      // citation left at an older date is a review that did not finish.
      expect(citation.reviewedOn).toBe(row!.reviewedOn);
    }
  });

  it('cites only a host its own vendor is allowed', () => {
    // Checking against the union of every vendor's hosts would pass an OpenAI
    // page served from GitHub's host. A source ID's first segment names the
    // vendor that owns the page, so each host must come from that vendor's own
    // row — and every page sharing a prefix must land in one vendor's set, or
    // the prefix would name two owners.
    const byVendor = parseAllowedHosts(
      'specs/001-inspect-agent-customizations/contracts/official-sources.md',
    );
    expect(byVendor.size).toBeGreaterThan(0);
    const rows = parseSourceRows('specs/001-inspect-agent-customizations/contracts/official-sources.md');
    const vendorByPrefix = new Map<string, string>();
    for (const [sourceId, row] of rows) {
      const owners = [...byVendor].filter(([, hosts]) => hosts.has(row.host)).map(([name]) => name);
      expect(owners, `no vendor allows ${row.host} (${sourceId})`).toHaveLength(1);
      const prefix = sourceId.split('.')[0]!;
      const seen = vendorByPrefix.get(prefix);
      if (seen === undefined) {
        vendorByPrefix.set(prefix, owners[0]!);
      } else {
        expect(owners[0], `${prefix}.* spans two vendors`).toBe(seen);
      }
      expect(isRealDate(row.reviewedOn), `${sourceId} reviewed on ${row.reviewedOn}`).toBe(true);
    }
    for (const citation of citations) {
      const vendor = vendorByPrefix.get(citation.sourceId.split('.')[0]!);
      expect(vendor, `no vendor for ${citation.sourceId}`).toBeDefined();
      expect([...byVendor.get(vendor!)!]).toContain(citation.officialHost);
      expect(isRealDate(citation.reviewedOn)).toBe(true);
    }
  });

  it('states the same host allowlist in both languages', () => {
    const english = parseAllowedHosts(
      'specs/001-inspect-agent-customizations/contracts/official-sources.md',
    );
    const japanese = parseAllowedHosts(
      'specs/001-inspect-agent-customizations/contracts/official-sources.ja.md',
    );
    expect([...japanese].map(([name, hosts]) => [name, [...hosts].sort()])).toEqual(
      [...english].map(([name, hosts]) => [name, [...hosts].sort()]),
    );
  });

  it('states each cited row identically in both languages', () => {
    // The Japanese contract is a translation, not a second source of truth, so
    // a cited row must be byte-identical in the operational columns.
    const english = parseSourceRows('specs/001-inspect-agent-customizations/contracts/official-sources.md');
    const japanese = parseSourceRows(
      'specs/001-inspect-agent-customizations/contracts/official-sources.ja.md',
    );
    for (const citation of citations) {
      expect(japanese.get(citation.sourceId)).toEqual(english.get(citation.sourceId));
    }
  });

  it('resolves one source ID to exactly one page', () => {
    // The ID is the page's stable identity, so two records citing it must agree
    // on where it is. Disagreement means one of them was left behind when the
    // page moved — which has already happened once.
    const byId = new Map<string, string>();
    for (const citation of citations) {
      const seen = byId.get(citation.sourceId);
      if (seen === undefined) {
        byId.set(citation.sourceId, citation.url);
      } else {
        expect(citation.url).toBe(seen);
      }
    }
  });
});

describe('vendor behavior statements', () => {
  it('names at least one surface, because there is no implicit "all"', () => {
    for (const statement of behaviors) {
      expect(statement.surfaces.length).toBeGreaterThan(0);
    }
  });

  it('carries no cross-registry reference on the record itself', () => {
    // A record says what the thing is; the edges live in the relations
    // registry (data-model.md § RegistryRelations).
    for (const statement of behaviors) {
      expect(Object.keys(statement)).not.toContain('sourceRefs');
      expect(Object.keys(statement)).not.toContain('strategyRefs');
    }
  });

  it('separates lookup base, relative selector, and traversal', () => {
    // The registry never encodes an ancestor walk as a recursive matcher
    // token: a vendor locator is documentation, not an Inspector selector
    // (contracts/inspection-path-allowlist.md § "Vendor locators are not
    // Inspector matchers").
    for (const statement of behaviors) {
      expect(statement.locator?.relativeSelector ?? '').not.toMatch(/\*\*/u);
    }
  });
});

describe('runtime composition strategies', () => {
  it('names at least one documented operation', () => {
    for (const strategy of strategies) {
      expect(strategy.operations.length).toBeGreaterThan(0);
    }
  });

  it('carries no cross-registry reference on the record itself', () => {
    for (const strategy of strategies) {
      expect(Object.keys(strategy)).not.toContain('inputBehaviorRefs');
      expect(Object.keys(strategy)).not.toContain('sourceRefs');
    }
  });
});

describe('evidence grammar', () => {
  it('uses only the closed documentation-status values', () => {
    for (const subject of [...behaviors, ...strategies, ...Object.values(INSPECTION_RULES)]) {
      expect(DOCUMENTATION_STATUSES).toContain(subject.documentationStatus);
      // `documentation-conflict` is a runtime ConditionFact status, never a
      // DocumentationStatus alias (data-model.md § DocumentationStatus).
      expect(subject.documentationStatus).not.toBe('documentation-conflict');
    }
  });

  it('keeps lifecycle qualifiers unique and in the fixed order', () => {
    for (const subject of [...behaviors, ...strategies, ...Object.values(INSPECTION_RULES)]) {
      const qualifiers = subject.lifecycleQualifiers;
      expect(new Set(qualifiers).size).toBe(qualifiers.length);
      expect(qualifiers).toEqual(
        LIFECYCLE_QUALIFIER_ORDER.filter((candidate) => qualifiers.includes(candidate)),
      );
      // An empty array means only that no lifecycle claim is maintained; a
      // fabricated `stable` would turn missing documentation into a positive
      // claim (QR-005).
      expect(qualifiers).not.toContain('stable');
    }
  });
});

describe('evidence citations', () => {
  // Every maintained record cites the reviewed sections it was checked
  // against, inside the record itself. The suite runs with citations present;
  // the packaged CLI folds them away, which the package suite asserts against
  // the built artifact (see `src/shared/registries/evidence-types.ts`).
  const cited = [...behaviors, ...strategies, ...Object.values(INSPECTION_RULES)];

  it('gives every maintained record at least one citation', () => {
    // A maintained interpretation with no cited basis is an opinion.
    for (const record of cited) {
      expect(record.evidence.length).toBeGreaterThan(0);
    }
  });

  it('uses exact HTTPS URLs on the cited host with no credentials, query, or fragment', () => {
    for (const record of cited) {
      for (const citation of record.evidence) {
        const url = new URL(citation.url);
        expect(url.protocol).toBe('https:');
        expect(url.host).toBe(citation.officialHost);
        expect(url.username).toBe('');
        expect(url.password).toBe('');
        expect(url.search).toBe('');
        expect(url.hash).toBe('');
      }
    }
  });

  it('names exact rendered headings rather than selectors or URL fragments', () => {
    for (const record of cited) {
      for (const citation of record.evidence) {
        expect(citation.sections.length).toBeGreaterThan(0);
        for (const section of citation.sections) {
          expect(section.trim()).toBe(section);
          expect(section).not.toMatch(/^[#.[]/u);
        }
      }
    }
  });

  it('records a review date and a paraphrase, never copied page text', () => {
    for (const record of cited) {
      for (const citation of record.evidence) {
        expect(citation.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
        expect(citation.establishes.trim().length).toBeGreaterThan(0);
        // A paraphrase states one maintained claim; a pasted section would
        // carry markup, list bullets, or heading syntax.
        expect(citation.establishes).not.toMatch(/^[#\-*|]|\n/u);
      }
    }
  });
});

describe('registry composition', () => {
  // Each vendor owns one directory holding its three record catalogs plus the
  // relation edges between them, so a new product is a new directory rather
  // than an edit inside growing literals. That layout has one failure mode of
  // its own: a catalog file that exists but was
  // never spread into its aggregate simply does not ship, and nothing else
  // notices — for the inspection-rule registry that means a whole product's
  // files silently missing from every inventory. This suite walks the
  // directories on disk so the omission fails here instead.
  const CATALOG_FILES: readonly {
    file: string;
    aggregate: Readonly<Record<string, unknown>>;
    idField: string;
  }[] = [
    { file: 'behaviors.ts', aggregate: VENDOR_BEHAVIOR_STATEMENTS, idField: 'behaviorId' },
    { file: 'strategies.ts', aggregate: RUNTIME_COMPOSITION_STRATEGIES, idField: 'strategyId' },
    { file: 'rules.ts', aggregate: INSPECTION_RULES, idField: 'ruleId' },
  ];

  /** The reference layer, keyed by subject rather than self-identifying. */
  const REFERENCE_AGGREGATES: readonly Readonly<Record<string, unknown>>[] = [
    STRATEGY_RELATIONS,
    RULE_RELATIONS,
  ];

  // Every vendor catalog, loaded statically so the check sees the files on
  // disk rather than the ones somebody remembered to wire up.
  const CATALOG_MODULES = import.meta.glob<Record<string, unknown>>(
    '../../src/shared/registries/*/*.ts',
    { eager: true },
  );

  const vendorDirectories = readdirSync('src/shared/registries', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  it('gives every vendor directory exactly its three catalogs and its relations', () => {
    expect(vendorDirectories.length).toBeGreaterThan(0);
    for (const vendor of vendorDirectories) {
      expect(readdirSync(`src/shared/registries/${vendor}`).sort()).toEqual(
        [...CATALOG_FILES.map((catalog) => catalog.file), 'relations.ts'].sort(),
      );
    }
  });

  it.each(CATALOG_FILES)('publishes every vendor $file through its aggregate', ({ file, aggregate, idField }) => {
    let published = 0;
    for (const vendor of vendorDirectories) {
      const specifier = `../../src/shared/registries/${vendor}/${file}`;
      const catalogModule = CATALOG_MODULES[specifier];
      expect(catalogModule, `${vendor}/${file} was not loaded`).toBeDefined();
      const catalogs = Object.values(catalogModule!).filter(
        (value): value is Record<string, Record<string, unknown>> =>
          typeof value === 'object' &&
          value !== null &&
          Object.keys(value).length > 0 &&
          Object.values(value).every(
            (record) => typeof record === 'object' && record !== null && idField in record,
          ),
      );
      expect(catalogs.length, `${vendor}/${file} exports no record catalog`).toBe(1);
      for (const [id, record] of Object.entries(catalogs[0]!)) {
        expect(aggregate[id], `${vendor}/${file} record ${id} is not published`).toBe(record);
        published += 1;
      }
    }
    // Every aggregate entry comes from a vendor catalog and vice versa, so a
    // record cannot be added straight to the aggregate either.
    expect(published).toBe(Object.keys(aggregate).length);
  });

  it.each(['relations.ts'])('publishes every vendor %s through its aggregates', (file) => {
    let published = 0;
    for (const vendor of vendorDirectories) {
      const catalogModule = CATALOG_MODULES[`../../src/shared/registries/${vendor}/${file}`];
      expect(catalogModule, `${vendor}/${file} was not loaded`).toBeDefined();
      for (const catalog of Object.values(catalogModule!)) {
        for (const [id, edges] of Object.entries(catalog as Record<string, unknown>)) {
          const owner = REFERENCE_AGGREGATES.find(
            (aggregate) => id in aggregate && aggregate[id] === edges,
          );
          expect(owner, `${vendor}/${file} entry ${id} is not published`).toBeDefined();
          published += 1;
        }
      }
    }
    expect(published).toBeGreaterThan(0);
  });

  it('declares a relation for every record that has one', () => {
    // Completeness comes from the compiler — each aggregate is annotated
    // `Record<Id, …>` over its closed catalog — so what is left to check is
    // that the layer covers exactly the shipped records. A behavior has no
    // relation at all: its only outgoing reference was a citation, and a
    // citation now lives on the record itself.
    expect(Object.keys(STRATEGY_RELATIONS).sort()).toEqual(
      Object.keys(RUNTIME_COMPOSITION_STRATEGIES).sort(),
    );
    expect(Object.keys(RULE_RELATIONS).sort()).toEqual(Object.keys(INSPECTION_RULES).sort());
    for (const edges of Object.values(STRATEGY_RELATIONS)) {
      expect(edges.consumesBehaviors.length).toBeGreaterThan(0);
      expect(Object.keys(edges)).toEqual(['consumesBehaviors']);
    }
    for (const edges of Object.values(RULE_RELATIONS)) {
      expect(Object.keys(edges).sort()).toEqual(['basedOnBehaviors', 'explainedByStrategies']);
    }
  });

  it('holds the published record on every edge, never an equal-looking copy', () => {
    // An edge is typed by the record's shape, so the compiler cannot tell a
    // registry record from a fabricated duplicate. Identity is what makes a
    // reference *the* record, so the gate checks it here — and the same pass
    // proves each array is ordered by identifier, which the materialized
    // fixture depends on.
    const ordered = (ids: readonly string[]): void => {
      expect(ids).toEqual([...ids].sort());
    };
    for (const edges of Object.values(STRATEGY_RELATIONS)) {
      for (const behavior of edges.consumesBehaviors) {
        expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
      }
      ordered(edges.consumesBehaviors.map((behavior) => behavior.behaviorId));
    }
    for (const edges of Object.values(RULE_RELATIONS)) {
      for (const behavior of edges.basedOnBehaviors) {
        expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
      }
      for (const strategy of edges.explainedByStrategies) {
        expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
      }
      ordered(edges.basedOnBehaviors.map((behavior) => behavior.behaviorId));
      ordered(edges.explainedByStrategies.map((strategy) => strategy.strategyId));
    }
  });
});

describe('conformance fixtures materialize the shipped registries', () => {
  it('matches the checked-in vendor-behavior and strategy rows', () => {
    expect(readFixture('vendor-behaviors.json')).toEqual(
      JSON.parse(JSON.stringify(serializeVendorBehaviors())),
    );
    expect(readFixture('runtime-composition.json')).toEqual(
      JSON.parse(JSON.stringify(serializeRuntimeComposition())),
    );
    expect(readFixture('relations.json')).toEqual(
      JSON.parse(JSON.stringify(serializeRelations())),
    );
  });

});
