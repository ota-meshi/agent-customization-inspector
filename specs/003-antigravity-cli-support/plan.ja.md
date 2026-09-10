# Implementation Plan: Antigravity CLI のサポート

[English](plan.md)

**Branch**: `003-antigravity-cli-support` | **日付**: 2026-09-10 | **Spec**: [spec.ja.md](spec.ja.md)

**入力**: `specs/003-antigravity-cli-support/spec.ja.md` の機能仕様

## Summary

vendor が畳み込んだ側のツールに代えて Antigravity CLI を4つ目のサポート対象ツールにする。他の
3つが持つもの — vendor registry ディレクトリ、kind ごとの compiled unit、vendor contract、Global
member、mark、label、文書 — を与え、置き換えられるツールの record・fixture・文書を取り除いて、
このリリースがサポートしない製品をどの surface も名指さないようにする。member 集合は動かない。
5つ目の member は同じ `~/.gemini` ディレクトリである。Antigravity CLI が個人設定をそこに置く
からである。

コードの形を決める判断は2つある。skill kind は行の単位が1つの Markdown ファイルである2つ目の
compiled な形を得る。それはディレクトリの形に optional な field を足すのではなく、その隣に置く
自身の unit である (research.ja.md § 2)。そして member の root は home ディレクトリだけから
導出する。これにより、前の vendor のために存在した環境プロパティ、記述子の行、`settingNames` の
field が取り除かれる (§ 4)。他はすべて、コードベースが既に持つ形を再利用する。Markdown の
instruction unit と custom-agent unit、strict JSON の standalone carrier に対する共有の MCP
server-map の読み、共有の hook と permissions の読み、そして1つの selector に複数の recognition
を持つ settings carrier である。

## Technical Context

**Language/Version**: 親 plan の baseline のまま。Node `^24.11.0 || ^26.0.0`、TypeScript 6.0.3、
Vue 3.5.39。

**Primary Dependencies**: vendor の mark のために collection を1つ追加する。
`thesvg:antigravity-google` のための `@iconify-json/thesvg` (MIT) である。`simple-icons` は
最新の公開版でも製品の glyph を持たないからである (research.ja.md § 8)。glyph を最初に import
する変更が、icon の方針の3点セット — devDependency、notices の行、`licenses/` に置く collection
の license text — をまとめて運ぶ。`smol-toml` は command ファイルの呼び出し元を失い、Codex の
呼び出し元を保つ。range はすべて caret のまま。lockfile はその collection のためにだけ動く。

**Storage**: なし。親と同じく session memory のみ。

**Testing**: Vitest の project `unit`、`contract`、`integration`、`security`、`documentation`、
`package`。Playwright の end-to-end はエージェント実行の検証では chromium のみ、spec を名指しで
実行する。fixture builder は `tests/fixtures/repositories/` と `tests/fixtures/global-homes/`。

**Target Platform**: 変わらない。ローカル loopback host と同梱ブラウザ client。

**Project Type**: 親と同じく単一 project。

**Performance Goals**: 変わらない。リポジトリの walk は増えない。このツールのリポジトリ location
は `.agents/` 配下とリポジトリルートで、どちらも既に walk される。

**Constraints**: allowlist の規律、非実行の保証、consent モデル、閉じた kind 集合は親のもので
あり変わらない。kind は追加しない。

**Scale/Scope**: サポート対象ツール4つ、Global member 5つ、kind 11個。

## Constitution Check

*GATE: Phase 0 research の前に通ること。Phase 1 design の後に再確認する。*

- [x] **Root-cause design**: ファイルの形の skill は、ディレクトリの形の record を optional な
      field で広げるのではなく自身の unit にする (research.ja.md § 2)。member の root は共有
      agent home が既にそうしているように home ディレクトリから来るので、分岐を足すのではなく
      field を削除する (§ 4)。置き換えられる vendor の record は履歴として残すのではなく取り除く
      (§ 9)。kind も parser も package も仕組みも追加しない。
- [x] **Readable implementation**: この vendor の答えは `src/shared/registries/antigravity/` と
      `src/server/inspection/rules/**/antigravity.ts` にあり、既存3つの vendor と同じ形なので、
      1つを読んだ読み手はその知識を持ち越せる。自明でない判断には理由のコメントを置く。skill
      kind が2つの unit を持つ理由、member が環境プロパティを持たない理由、legacy の MCP key を
      注釈なしに示す理由、mark がその glyph である理由である。
- [x] **Complete verification**: compiled unit ごとの unit test と skill の両方の形の test。
      registry の件数・ID・evidence・freeze に対する contract test。near miss と、2製品・3製品が
      読むファイルを含む fixture の integration scan。hook 宣言・permission rule・MCP 宣言に対する
      security の zero-activation。containment gate。kind ごとと5つ目の member の end-to-end spec。
      新しい record に対する official-source の確認 (spec.ja.md QR-003)。
- [x] **Documentation parity**: research.ja.md § 11 と下の § Project Structure に列挙し、
      それぞれ `.ja.md` を伴う。vendor contract、official-sources、runtime-composition、親の
      spec と data-model と http-api、readme、`docs/which-files-are-listed`、study input、
      `validation.md`。
- [x] **Safe boundaries**: home は同じ preview・admission・retry・disable のルールの下の consent
      済み member である。その配下の credential、session と history の state、インストール済み
      plugin コピーは決して読まない (spec.ja.md QR-005)。DTO の形は変わらない。member enum は5つの
      値を保ち、そのうち1つの名前が変わるだけであり、同梱ブラウザが唯一の client である。
- [x] **Welcoming participation**: fixture launcher は `antigravity-*` の行を得るので、貢献者は
      各 surface を見られる。legend はプロダクトを名指し、mark は accessible name を持ち、parse
      できない carrier の diagnostic はそのファイルを名指しする。

### Post-design re-check

Phase 1 の後も6つの gate はすべて成り立つ。複雑さと読めたかもしれない1つの設計コスト — 1つの
kind に2つ目の compiled な形 — は、著者が選んだ追加ではなく行の単位の規則が求めるものであり、
足すより多くを取り除く。記述子の field、環境プロパティ、置き換えられる vendor が必要とした導出が
すべて消える。したがって Complexity Tracking は空である。

## Project Structure

### Documentation (this feature)

```text
specs/003-antigravity-cli-support/
├── spec.md, spec.ja.md
├── plan.md, plan.ja.md
├── research.md, research.ja.md
├── data-model.md, data-model.ja.md
├── quickstart.md, quickstart.ja.md
├── contracts/vendors/antigravity-cli.md, antigravity-cli.ja.md
└── checklists/requirements.md, requirements.ja.md
```

vendor contract はここで書き、rule を出荷する変更で
`specs/001-inspect-agent-customizations/contracts/vendors/` へ移す。そこが出荷済み vendor
contract の置き場であり、gate が読む場所である。置き換えられる vendor の contract は同じ変更で
削除する。

### Source Code (repository root)

```text
src/shared/registries/
├── antigravity/          # rule、behavior、strategy、relation、skill collision
└── (gemini/ は削除)
src/server/inspection/rules/
├── skills/               # ディレクトリの unit の隣にファイルの形の compiled unit を得る
├── instructions/, agents/, mcp/, hooks/, permissions/, settings/
└── **/antigravity.ts     # この vendor の unit。**/gemini.ts は削除
src/server/host/global-consent.ts   # 環境プロパティ3つ。settingNames の field は無し
src/shared/entities.ts, api-text.ts, registries/behavior-text.ts  # label と順序
src/app/components/ToolMark.vue     # vendor の mark
src/app/pages/skills/detail/…       # ファイルの形の skill の panel だけの detail
docs/which-files-are-listed.md, .ja.md
tests/fixtures/repositories/, tests/fixtures/global-homes/, tests/fixtures/outcomes/
```

## Implementation Boundaries

- **Read set**: vendor contract の Inspector の表にある selector だけ。`antigravity-cli/plugins/`
  配下のものと、credential・session・history・cache のファイルは開かない。このリリースが出荷する
  どの rule も、リポジトリの `.gemini/` 配下のパスを開かない。
- **Recognition, not loading**: permission rule、hook 宣言、legacy の MCP key は、ファイルが宣言
  するものとして記録し、評価も解決もせず、vendor が受け付けるものとして分類もしない (親 FR-009)。
- **One file, several products**: ルートの `GEMINI.md` は Copilot の recognition を保ち、この
  ツールのものを得る。ルートの `AGENTS.md` は Copilot と Codex のものの隣にそれを得る。
  `.agents/skills/` は2つの形を抱えるようになり、名前が同じなら行を共有する。
- **Removal is part of the change**: 置き換えられる vendor の module、contract、record、fixture、
  label、mark、文書の節、evidence entry、凍結された件数、outcome manifest の case は、この vendor
  を加えるのと同じ変更で消える。`specs/002-gemini-cli-support` と未公開の changeset も一緒に消える。
  その feature ディレクトリを引用する親の artifact は、こちらへ付け替える。
- **Freezes**: 件数、tuple、digest、version の literal、manifest version はコードと同じ変更で動き、
  それぞれ先に落ちるところを確認する。
- **Family conversion**: すべての `Record<SupportedTool, …>` は member の名前が変わって初めて
  compile が通る。順序の配列は自身の gate が覆う。copy とコメントにあるツール数・member 数の記述は
  すべて読み直す。

## Complexity Tracking

憲章の gate に違反はない。表は意図的に空である。
