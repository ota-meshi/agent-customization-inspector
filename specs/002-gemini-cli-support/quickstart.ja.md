# Quickstart: Gemini CLI のサポート

[English](quickstart.md)

**Feature**: [spec.ja.md](spec.ja.md) | **Plan**: [plan.ja.md](plan.ja.md) | **Date**: 2026-09-09

4つ目のツールが動くのを見る方法と、それを証明する方法。setup、gate、一般的な起動手順は親の
もの ([001 quickstart.ja.md](../001-inspect-agent-customizations/quickstart.ja.md)) であり、
この機能が加えるものだけをここに書く。以下のすべての起動は `--no-open --port 0` を渡し
(AGENTS.md § Agent-started process policy)、起動した host はターンの終了前に止める。

## 前提

親 quickstart の install と build。end-to-end suite は `dist/cli.mjs` を起動するので、
ブラウザでの実行を信じる前に rebuild する:

```bash
pnpm run build
```

## fixture リポジトリで見る

fixture builder は Gemini CLI の tree を得、`scripts/serve-fixture.ts` は kind ごとに1行を得る。
instructions の fixture を serve し、印字された URL を開く:

```bash
pnpm run start:fixture gemini-instructions -- --no-open --port 0
```

inventory での期待: ルートの `GEMINI.md` 行は2つの mark — GitHub Copilot と Gemini CLI — を
挙げ、入れ子の `packages/api/GEMINI.md` 行は `packages/api/**` の range に Gemini CLI だけを
挙げる。legend は4プロダクトを名指しする。

```bash
pnpm run start:fixture gemini-settings -- --no-open --port 0
```

期待: `.gemini/settings.json` が settings の下に現れる。各 `mcpServers` の名前がそのファイルを
挙げる MCP 行として現れる。ファイルが hooks の下に現れる。process は spawn されず、server にも
接続しない。それを zero-activation test が assert する。

```bash
pnpm run start:fixture gemini-commands -- --no-open --port 0
```

期待: `.gemini/commands/git/commit.toml` が `git:commit` 行である。その detail は `!{...}`
block を含め TOML を書かれたとおりに示す。

```bash
pnpm run start:fixture gemini-context-filename -- --no-open --port 0
```

期待: `.gemini/settings.json` に `context.fileName: ["AGENTS.md", "CONTEXT.md"]` があるとき、
すべての `AGENTS.md` と `CONTEXT.md` が Gemini CLI の mark を持ち、ルートの `GEMINI.md` は
Copilot の mark だけを持つ。

## 5つ目のメンバーを見る

Global home の fixture を build し (builder は `gemini` member を得る)、環境をそこへ向けて
起動する:

```bash
GEMINI_CLI_HOME=/path/to/fixture-home node dist/cli.mjs --no-open --port 0
```

consent ページを開く。期待: 5つの提案ディレクトリがあり、4つ目は
`/path/to/fixture-home/.gemini` — reference が文書化する join — であり、確認後に
`Gemini home` Source が正確に `GEMINI.md`、`settings.json`、`skills/*/SKILL.md`、
`agents/*.md`、`commands/**/*.toml`、`policies/*.toml` を publish する。`GEMINI_CLI_HOME=`
(空) での起動はその entry を root なしの present-empty として示す。

## 自動検証

各変更を所有する gate を走らせる。まず unit と contract:

```bash
pnpm run test:unit
```

```bash
pnpm run test:contract
```

contract の実行は、凍結された count、digest 表、version literal、5メンバー tuple を更新する
前に失敗し、後に pass しなければならない — 失敗するのを見る (AGENTS.md § Implementation
simplicity policy)。次に4メンバー tuple を持つ suite と文書の gate:

```bash
pnpm run test:integration
```

```bash
pnpm run test:security
```

```bash
pnpm run test:docs
```

`test:docs` は containment gate を走らせる: 両方の `docs/which-files-are-listed*.md` ページが、
Gemini CLI の rule が admit するすべてのリテラル segment を名指しし、派生ルールについて
`GEMINI.md` と `context.fileName` に言及しなければならない。

end-to-end は、変更が届く spec を名指しし、Chromium だけで走らせる:

```bash
npx playwright test --project=chromium tests/e2e/gemini-instructions-inventory.spec.ts tests/e2e/gemini-instructions-detail.spec.ts tests/e2e/gemini-settings-inventory.spec.ts tests/e2e/gemini-settings-detail.spec.ts tests/e2e/gemini-commands-inventory.spec.ts tests/e2e/gemini-commands-detail.spec.ts tests/e2e/gemini-skills-list.spec.ts tests/e2e/gemini-skills-detail.spec.ts tests/e2e/gemini-custom-agents-inventory.spec.ts tests/e2e/gemini-custom-agents-detail.spec.ts tests/e2e/gemini-context-filename.spec.ts tests/e2e/gemini-same-name-skill.spec.ts tests/e2e/global-gemini-admission.spec.ts tests/e2e/global-consent-preview.spec.ts tests/e2e/inventory-rows.spec.ts
```

`inventory-rows.spec.ts` を名指しするのは、行ごとの mark 集合を pin しているからである。
legend と filter の assertion もそこにある。

## Official-source check

outbound request を行う唯一のコマンド。record を書くときに1回、リリース候補の前に再度
走らせる:

```bash
pnpm run check:official-sources -- --network
```

期待: すべての `google.gemini-cli.*` URL が `geminicli.com` で redirect なしに `200` を返し、
引用されたすべての heading が正確に1つの served heading に解決する。redirect する
(`/docs/core/policy-engine/`) か 404 の (`/docs/cli/configuration/`) 2つのパスは引用しない。

## Release evidence

outcome manifest の fixture byte が変わるので、`manifestVersion` は4へ進み、影響を受ける
すべての digest と canonical digest を再計算する:

```bash
pnpm run test:contract -- outcome-fixture-manifest
```

その後 `validation.md` に両言語で記録する: 新しい manifest version と digest、SC-003・SC-004・
SC-005 の Gemini CLI 行を含む実行した case ID、そして SC-001 と SC-006 について指定ファイルの
ground truth が変わったか、したがって再実施が要ったか (spec.md § Clarifications)。

## Package

```bash
pnpm run build && pnpm run verify:package
```

`test:package` の notices test に新しい行は要らない: Gemini の mark は bundle が既に持つ
`@iconify-json/simple-icons` から来る。
