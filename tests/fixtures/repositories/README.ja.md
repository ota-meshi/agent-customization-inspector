# Repository fixture tree

[English](README.md)

`build-fixtures.ts` は、このプロジェクトの suite が inspect する repository をすべて書き出
します。1つの builder は1つの deterministic な tree です。同じ root を与えれば同じ byte を
書くため、正確な path 一覧・正確な digest・正確な row 順を assert する suite を、golden file
を横に置かずに再実行できます。

## これらの tree の目的

Allowlist は製品の読み取り権限のすべてであるため、fixture はその境界を仮定ではなく観測可能に
するために存在します。tree 内の admit される path には、必ず1 segment 隣に **near miss** が
あります — `.claude/skills/deploy/SKILL.md` の隣の `.claude/skills/SKILL.md`、`.mcp.json` の隣の
`.mcp.json.bak`、`.codex/config.toml` の隣の `packages/api/.codex/config.toml`。selector が1
segment でも緩ければ、読み手の repository を contract 以上に静かに inventory するのではなく、
test が失敗します。

near miss は product ごとです。allowlist が product ごとだからです。`docs/AGENTS.md` は、root の
file だけを読む Codex にとっては near miss であり、同じ filename をどの深さでも読む CLI を持つ
Copilot にとっては admit される instruction file です。結果型は、tree 全体に対してではなく、
外れる rule に対して各 near miss を名指します。near miss はこの module の要点であり、builder の結果型がそれを名前で公開して
（`nearMissPaths`）、何も admit しなかったことを suite が assert できるようにしています。

どの tree にも2つの規則が成り立ちます。

- **書き込むのは harness だけです。** 製品は inspect する tree を変更しません（FR-023）。
  scan の後に tree が変わっていることを見つけた suite は、古い fixture ではなく defect を
  見つけています。
- **ここにあるものを製品が真実として読み直すことはありません。** credential 形の literal
  (`FIXTURE_SECRET_LITERAL`) と environment reference (`FIXTURE_ENVIRONMENT_REFERENCE`) は、
  inventory の row にも summary にも解決済みの値にも到達しないことを test が証明できるよう
  意図して書かれています。製品はそれらを、detail が明示的に要求された場所でだけ表示します
  （FR-025、FR-026、FR-027）。

## family

| Family | Builder | tree が観測可能にするもの |
| --- | --- | --- |
| All-supported | `buildAllCustomizationKindFixture` | このリリースが公開する全 kind を1つの root に。`pnpm run start:fixture` が既定で配信する tree。比較 surface を持つ各 kind に Global homes fixture と対になる cross-Source グループを1つずつ含み、`--inspect-personal-setup` でそれらの row に比較エントリが2つ表示される |
| Multi-tool | `buildAllToolSkillFixture`、`buildAllVendorInstructionFixture`、`buildUnifiedHookFixture`、`buildUnifiedPluginFixture`、`buildPriorityMcpFixture` | 2つまたは3つの product が読む1つの物理 file: 1回の read、product ごとに1つの recognition、そしてそれらすべてを名指す1つの row（FR-004） |
| Cross-source | `buildCrossSourceGroupFixture` | 比較 surface を持つ各 kind について、ここに Repository の file 2つ、Global homes fixture に個人側の file 2つで綴られる1つのグループ名。personal setup を有効にすると、その row の各 family block が自身の比較エントリを提供する（`pnpm run start:fixture cross-source`） |
| Per-vendor | `buildCodex*`、`buildClaude*`、`buildCopilot*` | 1つの product の、1つの kind についての documented location と、その product 自身の near miss |
| Near-miss | 各 builder の `nearMissPaths` | admit される path から1 segment の位置にあり、どの rule も admit してはならない path — subdirectory の複製、`.bak` 接尾辞、入れ子の `SKILL.md`、repository 内の User scope 用 filename |
| Empty | `buildAllToolSkillFixture`（`.agents/skills/empty/SKILL.md`）、`buildCodexHookFixture` | admit され read されたが何も宣言しない file: 不在ではなく、それ自身の row を持つ finding |
| Derived | `buildCodexInstructionFixture`、`buildAllVendorInstructionFixture` | 設定された fallback 名。walk へ入る経路は configuration read だけであり、filename からの推論では決してない |
| Malformed | `buildUnifiedHookFixture`（`.github/hooks/draft.json`）、`buildCopilotSettingsFixture` と `buildClaudePermissionsFixture`（それぞれの `malformedRoot` tree）、`buildCodexMcpFixture`（table ではない `mcp_servers` entry） | all-or-nothing で失敗する extraction: その file は `partial` generation の中で自身の diagnostic を保ち、影響を受けない file はすべて完全なまま（FR-028）。parse できる document の中の malformed な宣言は丸ごと省かれる |
| Secret | `buildAllToolSkillFixture`（`.agents/skills/secretive/`）、hook と MCP の builder | authored content の中の literal な credential と、未解決の `${VAR}` reference |
| Performance | `tests/performance/harness.ts`（`buildSc002Fixture`） | SC-002 の測定 tree — 100,000 entry、うち 500 が matching file。checked-in の manifest から生成し、run の前後に digest で検証する |

Performance の tree はここに置いていません。`tests/performance/sc002-fixture-manifest.json`
から生成され、その manifest の canonical digest に束縛されます。内容は authored な repository
ではなく測定の入力だからです。

## tree の使い方

suite からは builder を呼び、後で片付けます。

```ts
const fixture = buildAllToolSkillFixture('aci-my-suite');
// … `fixture.root` を scan し、`fixture.expectedSkillPaths` に対して assert する …
await rm(fixture.root, { recursive: true, force: true });
```

どの builder も optional な prefix と optional な root を取ります。root を与えなければ OS の
一時 directory の下に作り、与えればその directory へ書きます。後者は composite な builder が
複数の family を1つの tree へ重ねるための仕組みです。

製品で tree を見るには、配信します。

```bash
pnpm run build && pnpm run start:fixture all
```

`scripts/serve-fixture.ts` は受け付ける名前をすべて列挙します。書き出した tree は
`.tmp/fixtures/<name>/` に残り、同じ名前で次に launch するまで検査できます。

## tree への追加

- positive case とその near miss は同じ変更で追加し、near miss を builder の結果型に名前で
  載せてください。near miss の無い positive case は、製品がその file を読むことを test して
  いるだけで、その file だけを読むことは test していません。
- byte は deterministic に保ってください。timestamp も、乱数の名前も、file 内容の中の host
  path も入れないでください。
- builder を `buildAllCustomizationKindFixture` へ composite するときは、書き出す path を
  既にそこにある builder の path と照合してください。2つの builder が1つの path へ書く場合
  （`.claude/settings*.json` の pair、`.codex/config.toml` の layer）、composite 側がどちらの
  write を tree が示すものとするか、その理由とともに述べています。
