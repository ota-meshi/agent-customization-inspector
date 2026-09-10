# 実装計画: Gemini CLI のサポート

[English](plan.md)

**Branch**: `002-gemini-cli-support` | **Date**: 2026-09-09 | **Spec**: [spec.ja.md](spec.ja.md)

**Input**: `specs/002-gemini-cli-support/spec.md` の機能仕様

## Summary

Gemini CLI を4つ目のサポート対象ツールとして追加する。他の3つが持つもの — vendor registry
ディレクトリ、kind ごとの compiled unit、vendor contract、Global member、mark、label、文書 — を
与え、親仕様の「3ツール」「4メンバー」という固定の記述を 4 と 5 に改訂する。構造的に新しい
ものは何もない: Gemini CLI が使うすべての format には既に parser があり、publish する
すべての kind には既に compiled の形があり、Codex が使う configuration-read stage が
context filename の導出を走らせる場所である。コードの形を決める2つの決定は research.md § 2
— `context.fileName` は `GEMINI.md` に加えるのではなく置き換えるので、context file は既定を
自ら持つ1本の派生ルールである — と § 3 — `GEMINI_CLI_HOME` は親を指すので、member 記述子は
home の設定が root を指すか親を指すかを述べる — である。extension は除外し、Global member は
既定名の `GEMINI.md` だけを admit し、20セッション評価は指定ファイルの ground truth が変わる
ときだけ再実施し、ツールは `Gemini CLI` と名付ける (spec.md § Clarifications)。

## Technical Context

**Language/Version**: 親計画の baseline のまま — Node `^24.11.0 || ^26.0.0`、TypeScript 6.0.3、
Vue 3.5.39。

**Primary Dependencies**: 変更なし。package は追加しない: `smol-toml` が command と policy の
ファイルを、`strip-json-comments` と `JSON.parse` が settings carrier を、`vfile-matter`/`yaml`
が skill と agent の frontmatter を parse し、`@iconify-json/simple-icons` は既に `googlegemini`
glyph を持つ。すべての range は caret のまま。この機能で lockfile は動かない。

**Storage**: なし。親と同様に session memory だけ。

**Testing**: Vitest project `unit`、`contract`、`integration`、`security`、`documentation`、
`package`。Playwright end-to-end はエージェント実行の検証では Chromium だけ、名指しした spec
だけ。fixture builder は `tests/fixtures/repositories/` と `tests/fixtures/global-homes/`。

**Target Platform**: 変更なし — 認証済みの3ブラウザ、CI の3 OS 上の Node。

**Project Type**: 1つの package: `src/app/` の Nuxt SPA、`src/server/` の Node CLI と host、
`src/shared/` の共有 contract と registry。

**Performance Goals**: 特になし。scan は configuration read 1つと rule plan 8つを得るが、
すべて既に計測済みの形である。

**Constraints**: 親のもの — 実行なし、MCP 接続なし、outbound request なし、source 変更なし、
数値上限なし。vendor contract の presentation allowlist は実装開始後 digest で凍結される。
すべての Gemini CLI evidence record は `check:official-sources -- --network` が解決する heading
を引用する。

**Scale/Scope**: registry module 5本の vendor ディレクトリ1つ、compiled unit 8つと catalog
module、JSON parser の分岐1つ、member 記述子の field 1つ、label 1つと mark 1つ、両言語の
vendor contract、両言語の文書編集、fixture、test。親仕様の改訂は research.md § 10 に列挙する。

## Constitution Check

*GATE: Phase 0 research の前に pass しなければならない。Phase 1 design の後に再確認する。*

- [x] **Root-cause design**: 静的ルールと抑制の seam の代わりに1つの導出が context filename を
      持つ (research.md § 2)。capture loop の特殊分岐の代わりに member 記述子が設定の指すもの
      を述べる (§ 3)。lifecycle-rank の ladder は分岐を1つ足すのではなく member order から
      導出する (§ 4)。kind、parser、package、mechanism は追加しない。
- [x] **Readable implementation**: vendor の答えは `src/shared/registries/gemini/` と
      `src/server/inspection/rules/**/gemini.ts` に置き、既存3 vendor と同じ形なので、読者は
      1つで学んだことを持ち越せる。rationale comment を要する非自明な決定は名指しした:
      member 記述子の join、派生ルールの既定、parser entry の JSONC 計測、agent record の
      `experimental` qualifier、除外される workspace policy tier。
- [x] **Complete verification**: compiled unit ごとと記述子の2つの導出の unit test。registry
      (count、ID、evidence、freeze) の contract test。near miss と2ツール・3ツールのファイルを
      含む Gemini fixture の integration scan。hook command・shell-block command・MCP 宣言の
      security zero-activation。containment gate。kind ごとと5つ目のメンバーの end-to-end
      spec。新 record の official-source check (spec.md QR-002)。
- [x] **Documentation parity**: research.md § 10 と下の Project Structure に、それぞれの
      `.ja.md` と共に列挙: vendor contract、official-sources、runtime-composition、親の spec と
      data-model と http-api、readme、`docs/which-files-are-listed`、study input、
      `validation.md`。
- [x] **Safe boundaries**: Gemini CLI home は同じ preview・admission・retry・disable のルール
      の下の5つ目の consent 済みメンバーである。その下の credential、trust record、`.env`、
      session state、インストール済み extension は決して読まれない (spec.md QR-003)。trust は
      記録される condition であり recognition に投影されない。DTO の形は閉じた enum と entry
      数以外変わらず、同梱ブラウザが唯一の client である。
- [x] **Welcoming participation**: fixture launcher は `gemini-*` の行を得るので、貢献者は各
      surface を見られる。legend はプロダクトを名指しし、mark は accessible name を持ち、
      parse できない settings ファイルの diagnostic はそのファイルを名指しする。

### Post-design re-check

Phase 1 の後も6つの gate はすべて成り立つ。複雑さと読めたかもしれない1つの設計コスト —
既定を持つ派生ルール — は mechanism の追加ではなく除去である: 静的ルールと撤回の seam を
1つの plan builder で置き換える (research.md § 2)。したがって Complexity Tracking は空である。

## Project Structure

### Documentation (this feature)

```text
specs/002-gemini-cli-support/
├── plan.md / plan.ja.md
├── research.md / research.ja.md
├── data-model.md / data-model.ja.md
├── quickstart.md / quickstart.ja.md
├── spec.md / spec.ja.md
├── checklists/requirements.md / requirements.ja.md
├── contracts/vendors/gemini-cli.md / gemini-cli.ja.md   # registry と共に3つの vendor contract の隣へ移す
└── tasks.md / tasks.ja.md                               # /speckit-tasks の出力
```

vendor contract はここで設計入力として書き、registry を出荷する task が、その presentation
allowlist の digest を official-sources contract と freeze test に記録するときに、変更せず
`specs/001-inspect-agent-customizations/contracts/vendors/` へ移す。今その場所に書くと、gate
が3つを期待するディレクトリに digest のない4つ目の表を置くことになる。

### Source Code (repository root)

```text
src/
├── shared/
│   ├── entities.ts                       # SupportedTool + 'gemini'; SUPPORTED_TOOL_ORDER; SUPPORTED_TOOL_TEXT
│   ├── api-text.ts                       # GLOBAL_MEMBER_TEXT、SOURCE_SELECTOR_TEXT の entry
│   ├── api-types.ts                      # doc comment: 5 entry
│   ├── diagnostics.ts                    # lifecycleOwnerRank を GLOBAL_MEMBER_ORDER から導出
│   ├── skill-collision.ts                # SKILL_COLLISION_POLICY の gemini entry
│   └── registries/
│       ├── identifier-types.ts           # GeminiBehaviorId、GeminiRuleId、GeminiStrategyId、GoogleSourceId
│       ├── behavior-types.ts / behavior-text.ts   # VendorSurface 'gemini-cli'
│       ├── inspection-rules.ts / vendor-behaviors.ts / runtime-composition.ts / relations.ts   # spread
│       ├── skill-resolution.ts           # SAME_NAME_SKILL_RESOLUTIONS の gemini entry
│       ├── shared/relations.ts           # managed-remote-state の除外が Gemini の system behavior を名指し
│       └── gemini/
│           ├── rules.ts
│           ├── behaviors.ts
│           ├── strategies.ts
│           ├── relations.ts
│           └── skill-collision.ts
├── server/
│   ├── host/global-consent.ts            # GLOBAL_TOOL_HOME_ORDER、settingNames 付き記述子、member port、version literal
│   ├── host/devframe-app.ts              # GLOBAL_RULES_BY_MEMBER の gemini と agents の spread
│   └── inspection/
│       ├── scan.ts                       # GEMINI_REPOSITORY_RULES の spread; readGeminiConfiguredContextPlans reader
│       ├── parsers/json.ts               # acceptsComments: Gemini 分岐
│       └── rules/
│           ├── gemini.ts                 # catalog + other-kind unit
│           ├── vendor/gemini.ts          # GeminiCompiledRule、GeminiCompiledDerivedRule
│           ├── instructions/gemini.ts    # 派生 unit + reader; Global unit
│           ├── skills/gemini.ts
│           ├── agents/gemini.ts
│           ├── mcp/gemini.ts
│           ├── hooks/gemini.ts
│           ├── prompts-and-commands/gemini.ts
│           └── permissions/gemini.ts
└── app/
    ├── components/ToolMark.vue           # googlegemini glyph、--aci-brand-gemini ルール
    ├── styles/main.css                   # --aci-brand-gemini token、forced-colors の行
    └── components/consent/GlobalConsentPreview.vue   # 5ディレクトリ; shared home の文が3つの読者を名指し

tests/
├── unit/inspection/gemini-metadata.test.ts、rules.test.ts、seed-parsers.test.ts
├── unit/shared/entities.test.ts          # 'gemini' がメンバーになる
├── contract/inspection-rules.test.ts、vendor-behaviors.test.ts、runtime-composition.test.ts、
│   presentation-allowlist-freeze.test.ts、http-api-global.test.ts、outcome-fixture-manifest.test.ts
├── integration/repository-scan.test.ts、global-boundaries.test.ts
├── security/global-zero-activation.test.ts
├── documentation/cross-artifact.test.ts  # containment gate の catalog; 派生ルールの freeze; 002 の task 数 freeze
├── e2e/gemini-*.spec.ts、global-gemini-admission.spec.ts、inventory-rows.spec.ts
└── fixtures/
    ├── repositories/build-fixtures.ts    # gemini の tree
    ├── global-homes/build-fixtures.ts    # gemini member、GEMINI_CLI_HOME の map
    ├── conformance/*.json                # 再生成
    └── outcomes/manifest.json、manifest.sha256   # version 4

scripts/serve-fixture.ts                  # gemini-* の行
docs/which-files-are-listed.md / .ja.md   # Gemini CLI の section; shared home の「読むもの」
README.md / README.ja.md                  # 4ツール; 5ディレクトリ
specs/001-inspect-agent-customizations/   # research.md § 10 の改訂; contracts/official-sources*.md の host・行・digest 行;
                                          # contracts/runtime-composition*.md の Gemini section; contracts/vendors/gemini-cli*.md (移動)
.changeset/*.md                           # minor
```

**Structure Decision**: 既存の single-package の配置を、既に3メンバーを持つすべての family で
vendor 1つ分だけ広げる。各 family が vendor 名で key する vendor ごとの `gemini/` module と
`gemini.ts` ファイルの外にディレクトリは追加しない。

## Implementation Boundaries

- **Read set**: vendor contract の Inspector 表にある selector そのもの。派生ルールの名前は
  リポジトリの `.gemini/settings.json` だけから来る。Global member の context file は
  `GEMINI.md`。`extensions/` の下、`.env`、`trustedFolders.json`、`.geminiignore`、hook
  script は何も開かない。
- **Recognition であって loading ではない**: trust、experimental な agent gate、
  `mcp.allowed`/`mcp.excluded`、`skills`/`agents` の override、extension の merge は behavior
  record 上の condition であり、recognition 上のものではない (親 FR-009)。
- **1ファイル、複数プロダクト**: ルートの `GEMINI.md` は Copilot の recognition を保ち Gemini
  CLI のものを得る。`.agents/skills/` のファイルは3つを持つ。行を Copilot だけのものと呼ぶ
  `copilot.repo.instructions.gemini-root` の comment は registry と共に削除する。
- **Freeze**: count、tuple、digest、version literal、manifest version はコードと同じ変更で
  動かし、それぞれ先に失敗するのを見る (research.md § 9)。
- **Family の変換**: すべての `Record<SupportedTool, …>` は `gemini` が入ってはじめて compile
  する。2つの order 配列はそれぞれの gate が cover する。ツールやメンバーを数える copy と
  comment の「3」「4」はすべて読み直す。research.md § 9 が gate を名指しし、copy の場所は
  consent preview、source control、mark component、source-name と detail-route の module である。

## Complexity Tracking

constitution の gate に違反はない。表は意図的に空である。
