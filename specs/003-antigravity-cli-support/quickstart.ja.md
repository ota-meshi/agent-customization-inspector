# Quickstart: Antigravity CLI のサポート

[English](quickstart.md)

**対象機能**: [spec.ja.md](spec.ja.md) | **Plan**: [plan.ja.md](plan.ja.md) | **日付**: 2026-09-10

この機能が動いているところを見る方法と、それを示す方法。コマンドはすべてリポジトリルートから
実行する。エージェントが起動する host は常に `--no-open --port 0` を取り、ターンが終わる前に
停止する (AGENTS.md § Agent-started process policy)。

## 前提

```bash
pnpm install
pnpm run build
```

end-to-end の suite は package 済みの CLI を起動するので、古い `dist/` は前の build を測る。

## fixture リポジトリで見る

fixture launcher が tree を組み立てて配信する。下に挙げる名前はこの機能が加えるものであり、
`all` はすべての tree を一度に組み立てる。

```bash
pnpm run start:fixture antigravity-skills --no-open --port 0
```

起動行が表示する URL を開き、順に確認する。

1. tool filter と legend が4つのツールを名指し、4つ目が `Antigravity CLI` で、製品名を
   accessible name として持つ自身の mark を伴う。行が描く大きさで4つの mark を並べて見る。
   新しいものが隣の3つと同じ視覚的な重さに収まり、重すぎも一段軽くもないことを確かめる。
2. skills inventory が `.agents/skills/changelog/SKILL.md` を、skill フォルダを読む3製品すべて
   （Antigravity CLI を含む）を名指し、その隣に supporting file の数を出して挙げる。
3. フラットな `.agents/skills/deploy.md` はどの行にも載らない。`deploy` の行は
   `.agents/skills/deploy/SKILL.md` だけを持つ。

続いて他の tree を見る。

```bash
pnpm run start:fixture antigravity-rules --no-open --port 0
pnpm run start:fixture antigravity-hooks --no-open --port 0
pnpm run start:fixture antigravity-mcp --no-open --port 0
pnpm run start:fixture antigravity-agents --no-open --port 0
pnpm run start:fixture antigravity-instructions --no-open --port 0
```

- rules inventory が `.agents/rules/` 配下の Markdown ファイルごとに1行を挙げ、frontmatter が
  宣言する `trigger` — `always_on`、`manual`、`model_decision`、または `globs` を伴う `glob` — を書かれたとおりに示し、
  pattern はどこにも照合しない。同じ tree の `.agent/rules/` のファイルは旧綴りとして挙がり、
  `packages/api/.agents/rules/api.md` もそれらの隣に挙がる。
- hooks inventory が `.agents/hooks.json` を、その event map、matcher group、1つの hook が持つ
  `enabled` フラグとともに挙げ、何も実行しない。

- MCP inventory が `.agents/mcp_config.json` で宣言された名前ごとに1行を挙げ、リモート server の
  `serverUrl` と legacy の `url` がどちらも書かれたとおりに現れる。
- agents inventory が `.agents/agents/<name>.md` と `.agents/agents/<name>/agent.md` を挙げる。
- ルートの `GEMINI.md` とルートの `AGENTS.md` がそれぞれ1度だけ現れ、それらを読むすべての製品を
  名指す。`packages/api/GEMINI.md` と `docs/.agents/GEMINI.md` は Antigravity CLI を名指し、
  それぞれ `packages/api/` と `docs/` を govern する。

起動時に記録した process ID で host を停止し、ポートが空いたことを確認する。

## 5つ目の member を見る

```bash
pnpm run start:fixture all --inspect-personal-setup --no-open --port 0
```

personal setup のページが、読む前に5つのディレクトリを挙げ、4つ目が `Antigravity home` と
label され、root パスがその隣に出る。環境プロパティはその root を変えない。他の3つの home 向けに
変数を設定して起動した session は、その3つを動かし、これは home ディレクトリ配下の `.gemini` の
ままにする。consent の後、home の context file・rule・MCP carrier・agents・skills・settings が挙がり、
その配下のインストール済み plugin コピーは挙がらない。

## 自動検証

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm exec vitest run
```

この機能の主張を担う suite は次のとおり。

- `unit` — vendor の rule と compiled unit。skill unit、2つの context の範囲、rules と hook
  carrier、そして各 near miss を拒む selector を含む。
- `contract` — rule・behavior・strategy・relationship の件数、Global rule-ID の一覧、
  presentation allowlist の digest、outcome manifest。
- `integration` — 各 fixture tree の scan、5 member の consent transaction、Global boundary の
  member ごとの読み取り集合。
- `security` — hook 宣言・permission rule・MCP 宣言を持つ fixture 全体で、実行ゼロ、MCP 接続
  ゼロ、外向き要求ゼロ、変更ゼロ。
- `documentation` — すべての artifact の両言語、および `docs/which-files-are-listed.md` に対する
  containment gate。
- `package` — package 済みの tree とその起動。

end-to-end は、変更が届く spec を名指しして実行する。suite 全体は走らせない。

```bash
pnpm exec playwright test --project=chromium tests/e2e/antigravity-skills-detail.spec.ts
pnpm exec playwright test --project=chromium tests/e2e/antigravity-rules-detail.spec.ts
pnpm exec playwright test --project=chromium tests/e2e/antigravity-hooks-detail.spec.ts
```

## 公式ソースの確認

```bash
pnpm run check:official-sources -- --network
```

引用したすべての Antigravity CLI の URL が `antigravity.google` 上で redirect なしに直接応答し、
引用したすべての節が解決しなければならない。消えた heading が何を意味するか、引用した本文が今も
維持している paraphrase を確立しているかは、reviewer の判断のままである。

## リリース evidence

outcome manifest は、このツールが加える `(tool, customization file type, admitted source form)`
ごとに1 case を得る。これは denominator の変更なので、
manifest version を増やし canonical digest を記録し直し、その実行を `validation.md` に両言語で
記録する。

親の初回利用評価はこの変更に対してやり直す。このツールが指定ファイルを読み、その読み手を1つ増やすためである。
`tests/usability/sc001-sc006-study-inputs/` 配下の input はこのリリースがサポートするツールを
名指し、なくなる環境プロパティを落とす。そして `validation.md` がその実行を記録する。

## Package

```bash
pnpm run build
pnpm run verify:package
```

mark が bundle の持たない collection を必要としない限り、dependency は追加しない。必要な場合は
icon の方針の3点セット — devDependency、notices の行、license text — が同じ変更で揃う。
