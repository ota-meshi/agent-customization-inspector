# 機能仕様: Gemini CLI のサポート

[English](spec.md)

**Feature Branch**: `002-gemini-cli-support`

**Created**: 2026-09-09

**Status**: Draft

**Input**: ユーザー説明: 「Gemini CLI を4つ目のサポート対象ツールとして追加する。そのリポジトリレベルとユーザーグローバルのカスタマイズファイル（階層的な GEMINI.md context file、.gemini/settings.json の settings・MCP server・hooks、.gemini/commands の custom command、extensions、skills）を既存の11 kind の中で認識し、~/.gemini を Global root として持たせ、inventory が Gemini CLI を「そのファイルを読むもの」として名指しできるようにする。まず、inventory が既に GitHub Copilot だけを読者として挙げているルートの GEMINI.md から。」

この仕様は [Agentカスタマイズの調査](../001-inspect-agent-customizations/spec.ja.md) を拡張する。
その仕様がサポート対象ツールに求めるすべて — allowlist の規律、非実行の保証、consent
モデル、閉じた kind 集合、evidence と文書の義務 — は Gemini CLI にもそのまま適用される。
ここに書くのは Gemini CLI が加えるもの: どのファイルを読むか、personal home がどこか、
そして親仕様の「3ツール」「4メンバー」という固定の記述のどれが 4 と 5 の記述になるかである。

## Clarifications

### Session 2026-09-09

- Q: 機能説明は認識すべき surface の中に「extensions」を挙げている。Gemini CLI が extension を文書化しているのは、home の `extensions/` ディレクトリ配下のインストール済みコピーとしてと、開発のためにそこへリンクされるローカルディレクトリとしてだけである。どの読みが scope 内か: 全面的に除外する、リポジトリ自身のルートの `gemini-extension.json` を plugin 行として認識する、インストール済みコピーも調査する。 → A: 全面的に除外する。インストール済み extension のコピーは、親仕様の FR-018 が他のすべての vendor について既に除外しているもの — ユーザーが書いたカスタマイズではなく、配布元から再現されるコピー — であり、同じ理由がここでも成り立つ。extension そのものであるリポジトリも認識しないので、plugin kind のルール、manifest reader、plugin-root census はこの機能の一部ではない。除外はその理由と共に vendor contract に記録する。
- Q: Gemini CLI home 自身の `settings.json` の `context.fileName` は、リポジトリの `.gemini/settings.json` がリポジトリのファイルに対してするように、home のどの instruction file を admit するかを変えるか？ → A: 変えない。home は `GEMINI.md` だけを admit する。Codex home が `~/.codex/config.toml` の宣言にかかわらず固定の `AGENTS.override.md`/`AGENTS.md` の組だけを admit するのと同様である。公式ページは global の場所を `~/.gemini/GEMINI.md` と述べ、設定がそれを改名するかどうかを確立していないので、そこでの導出は推論に依ることになる。設定は settings-inputs condition として vendor behavior に記録し、home のルールは vendor が global の場合を文書化したときにだけ広げる。
- Q: Gemini CLI の追加は親仕様の20セッション first-use 評価 (SC-001 と SC-006) の再実施を要するか？ → A: 評価自身の答えが変わるときだけ。4つの workflow は4つ目のツールで変わらないので、評価を再実施するのは、指定された SC-006 のファイルの ground truth — その source、認識するツール、kind — が Gemini CLI がそれを読むようになったために変わる場合だけである。そうでなければ、study input は3ツールを名指しする箇所を4ツールに更新し、`validation.md` に ground truth が変わらず再実施は不要だったと記録する。
- Q: ツールはすべての surface — filter、legend、consent surface、文書 — でどう名付けるか？ → A: `Gemini CLI`。vendor 自身の文書とリポジトリがプロダクトに使う名前で、会社名の接頭辞は付けない — `Claude Code` が付けずに名付けられているのと同様に — プロダクト名だけで一意であり、legend や行の中で短いからである。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - リポジトリのファイルの読者として Gemini CLI を見る (Priority: P1)

リポジトリに `GEMINI.md`、`.gemini/settings.json`、`.gemini/commands/` 配下の custom
command、`.gemini/skills/` または `.agents/skills/` 配下の skill、`.gemini/agents/` 配下の
sub-agent を持つ開発者が inspector を起動すると、それぞれのファイルが inventory に現れ、
Gemini CLI が読者として名指しされる — 同じファイルを読む他のツールと並んで。

**Why this priority**: inventory は既にルートの `GEMINI.md` を挙げ、その唯一の読者として
GitHub Copilot を名指ししている。`.agents/skills/` も挙げ、Codex と Copilot を名指しして
いる。どちらの記述も、Gemini CLI を使う人にとっては今日不完全である。inventory が既に
言っていることを完全にするのが、それを真にする最小の変更であり、他のすべての Gemini CLI
surface の前提になる。

**Independent Test**: Gemini CLI のリポジトリ側の場所すべてに1ファイルずつ、ルートの
`GEMINI.md`、`.agents/skills/` の skill、そして Gemini CLI が文書化していない場所の
near-miss ファイルを持つ fixture リポジトリに対して inspector を起動する。すべての Gemini
CLI ファイルが Gemini CLI を読者として挙げられ、ルートの `GEMINI.md` が1つのファイルに対する
GitHub Copilot と Gemini CLI の2つの別個の recognition を示し、`.agents/skills/` の skill が
3つを示し、near-miss ファイルが1つも挙げられないことを確認する。

**Acceptance Scenarios**:

1. **Given** ルートに `GEMINI.md` を持つリポジトリ、**When** inventory が表示される、**Then**
   そのファイルは instructions の下に1回現れ、GitHub Copilot と Gemini CLI を2つの別個の
   tool recognition として持つ。
2. **Given** `packages/api/` の `GEMINI.md`、**When** instructions inventory が表示される、
   **Then** `packages/api/**` の行に Gemini CLI を読者として現れ、Copilot の recognition は
   持たない。Copilot が文書化しているのはルートのファイルだけだからである。
3. **Given** `mcpServers` と `hooks` を宣言する `.gemini/settings.json`、**When** inventory が
   表示される、**Then** そのファイルは settings の下に現れ、宣言された各 MCP server 名は
   その宣言を挙げる MCP 行として現れ、ファイルは hooks の下にも現れる — どの server にも
   接続せず、どの hook command も実行せずに。
4. **Given** `.gemini/commands/git/commit.toml`、**When** prompts and commands inventory が
   表示される、**Then** 行の名前は `git:commit` であり、その detail は prompt 内の `!{...}`
   shell block を含め TOML ソースを書かれたとおりに示し、それは実行されない。
5. **Given** `.agents/skills/deploy/SKILL.md` にある skill、**When** skills inventory が表示
   される、**Then** `deploy` 行は1つのファイルの読者として OpenAI Codex、GitHub Copilot、
   Gemini CLI を挙げる。
6. **Given** `.gemini/agents/reviewer.md`、**When** custom agents inventory が表示される、
   **Then** その agent は宣言された名前で現れ、Gemini CLI を読者として持つ。
7. **Given** `.geminiignore`、`.gemini/.env`、`.gemini/policies/deny.toml`、または
   `.gemini/hooks/` 配下のスクリプト、**When** リポジトリが scan される、**Then** どれも
   挙げられず、開かれない。
8. **Given** tool filter、legend、empty state の scope 文、**When** いずれかが表示される、
   **Then** それぞれ Gemini CLI を含む4ツールを名指しし、読者が他の3つと見分けられる mark
   とプロダクト名を持つ。

---

### User Story 2 - Consent 後に Gemini CLI home を調査する (Priority: P2)

personal setup の調査に opt in した開発者は、consent preview に5つ目のメンバー — Gemini CLI
home — を見、admit されればその文書化されたカスタマイズファイル: global の `GEMINI.md`、
`settings.json`、personal skill、sub-agent、custom command、policy file を見る。shared agent
home の skill も、Gemini CLI を読者として名指しするようになる。

**Why this priority**: personal の `~/.gemini/GEMINI.md` や `~/.gemini/settings.json` は
あらゆるリポジトリでのあらゆる Gemini CLI セッションを形作るので、プロダクトが示せない
user-level のファイルは agent への見えない入力である — 親仕様の Global 調査が埋めるために
存在する隙間そのものである。リポジトリの story の後に来るのは、consent、preview、member
lifecycle が既にあり、メンバーが1つ増えるだけだからである。

**Independent Test**: `GEMINI_CLI_HOME` が absent で `~/.gemini` に fixture home がある状態と、
`GEMINI_CLI_HOME` を絶対ディレクトリに設定した状態でセッションを開始する。何かが読まれる前に
consent preview が5メンバーを名指しすること、opt in が Gemini CLI home を admit してその下の
文書化されたファイルだけを publish すること、隣にある credential、trust record、session
state、インストール済み extension のコピーが決して読まれないこと、disable がそのメンバーの
ファイルを他と一緒に取り除くことを確認する。

**Acceptance Scenarios**:

1. **Given** Global 調査が有効化されていない、**When** consent preview が表示される、**Then**
   5つの member root — Copilot、Claude、Codex、Gemini CLI の home と shared agent home — を
   挙げ、そのいずれの下のファイルも読まれていない。
2. **Given** `GEMINI_CLI_HOME` が absent、**When** preview が構築される、**Then** Gemini CLI の
   member root はユーザーの home directory 直下の `.gemini` ディレクトリである。
3. **Given** `GEMINI_CLI_HOME` が絶対ディレクトリを指す、**When** preview が構築される、**Then**
   Gemini CLI の member root はそのディレクトリ直下の `.gemini` ディレクトリである。この設定は
   `.gemini` そのものではなく `.gemini` の親を指すからである。
4. **Given** ユーザーが opt in し、Gemini CLI home が読める directory である、**When** Global
   generation が commit される、**Then** 別個に識別された Gemini CLI の Global Source がその
   `GEMINI.md`、`settings.json`、`skills/*/SKILL.md`、`agents/*.md`、`commands/**/*.toml`、
   `policies/*.toml` を publish し、root の下のそれ以外は何も publish しない。
5. **Given** それらのパスの隣に `extensions/`、`trustedFolders.json`、`.env`、OAuth や account
   の credential file、session や history の state、一時ファイルが存在する、**When** メンバーが
   scan される、**Then** どれも読まれず、挙げられない。
6. **Given** shared agent home が `skills/review/SKILL.md` を持つ、**When** それが admit される、
   **Then** `review` 行は読者として OpenAI Codex、GitHub Copilot、Gemini CLI を名指しする。
7. **Given** 起動が `--inspect-personal-setup` を使った、**When** consent surface がその確認が
   何を対象にしたかを述べる、**Then** 5メンバーを名指しする。

---

### User Story 3 - リポジトリが Gemini CLI に使わせる名前を読む (Priority: P3)

リポジトリの `.gemini/settings.json` が `context.fileName` を設定している — `AGENTS.md` に、
あるいは `["AGENTS.md", "CONTEXT.md", "GEMINI.md"]` のようなリストに — 開発者は、Gemini CLI が
まさにそれらのファイルの読者として名指しされるのを見、2つの Gemini CLI skill が名前を共有する
ときには skills ページが文書化する同名の statement を見る。

**Why this priority**: どちらも agent が読むファイルを変える文書化された Gemini CLI の挙動で、
どちらもプロダクトに前例がある — Codex の設定された fallback filename と、各プロダクトの
同名 skill statement — ので、仕組みではなくルール1つずつのコストで済む。最後に来るのは、
既定の filename と既定の skill の場所がほとんどのリポジトリに足りるからである。

**Independent Test**: 3つの fixture — `context.fileName` が absent、1つの文字列、配列 — を
調査し、1つ目では Gemini CLI が `GEMINI.md` を、2つ目では宣言された名前だけを、3つ目では
宣言された名前群だけを読むと示されることを確認する。`.gemini/skills/` と `.agents/skills/` の
下に同名の skill を持つ fixture を調査し、行が文書化された解決を述べつつ、どのファイルが
有効かを宣言しないことを確認する。

**Acceptance Scenarios**:

1. **Given** `.gemini/settings.json` が `context.fileName` を `"AGENTS.md"` に設定する、**When**
   inventory が表示される、**Then** リポジトリ内のすべての `AGENTS.md` が Gemini CLI の
   recognition を持ち、`GEMINI.md` は Gemini CLI からの recognition を持たない — ルートのものは
   Copilot のものを保つ。
2. **Given** `.gemini/settings.json` が `context.fileName` を配列に設定する、**When** inventory
   が表示される、**Then** 挙げられた各名前が任意のディレクトリで認識され、それ以外は認識され
   ない。
3. **Given** `.gemini/settings.json` が parse できない、**When** scan が完了する、**Then**
   settings ファイルは parse diagnostic を持ち、既定の `GEMINI.md` は設定が absent であるかの
   ように認識され、他のすべてのファイルは complete である。
4. **Given** `.gemini/skills/deploy/SKILL.md` と `.agents/skills/deploy/SKILL.md`、**When**
   `deploy` 行が表示される、**Then** 両方の定義を挙げ、Gemini CLI について、workspace tier の中
   では `.agents/skills/` のコピーが優先されると述べる — vendor が文書化していることとして
   述べ、セッションがどのファイルを読み込んだかとしては述べない。

---

### Edge Cases

- `GEMINI_CLI_HOME` が present だが空、相対、または U+0000 か対になっていない surrogate を
  含む: 設定文字列は join の前に親仕様の閉じた lexical-state アルゴリズムで分類されるので、
  空の値は `present-empty`、相対の値は `relative` であり、`eligible` の値だけが `.gemini` と
  join されて member root を形成する。
- リポジトリの `.gemini/settings.json` が `context.fileName` を空文字列、空配列、非文字列を
  含む配列、または別の型の値に設定する: 宣言は何も設定せず、`GEMINI.md` が認識される名前のまま残る。文字列配列でない Codex の
  `project_doc_fallback_filenames` が何も設定しないのとまったく同様である。そのような値は parse
  失敗ではないので、diagnostic を持たない。
- `GEMINI.md` が walk が決して入らないディレクトリ — `node_modules`、`.git` — の中にある。
  そこにある `CLAUDE.md` が挙げられないのとまったく同様に、挙げられない。
- `GEMINI.md` が `@./path.md` で別のファイルを import する: import は記録される relationship で
  あり書かれたテキストであり、対象は開かれない。
- custom command ファイルが `.gemini/commands/` の直下にあり、別のものが3階層深くにある:
  両方が認識され、それぞれ `name` と `a:b:c:name` と名付けられる。
- 1つの Source 内で2つの custom command が同じ名前を導出する — 名前はファイル自身のパスなので
  不可能 — が、同じ名前がリポジトリと Gemini CLI home に存在する: 各 Source が自身の行を挙げ、
  Source をまたぐ勝者は宣言されない。
- リポジトリに `.gemini/policies/*.toml` が存在する: 挙げられない。vendor 自身の reference が
  workspace policy tier を現在は読み込まれないと文書化しているからである。Gemini CLI home の
  下の同じファイルは permissions として挙げられる。user tier は読み込まれると文書化されている
  からである。
- 他の4メンバーが存在する一方で Gemini CLI home が存在しない: メンバーは absent として記録され、
  他は commit する。今日 Codex home の欠如が扱われるとおりに。
- `.gemini/skills/` 配下の skill がディレクトリと異なる `name` を宣言する: すべてのプロダクトの
  root skill 行と同様に、行は宣言された名前で名付けられる。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Gemini CLI はサポート対象ツールでなければならない (MUST)。GitHub Copilot、
  Claude Code、OpenAI Codex に並ぶ4つ目であり、すべての surface で `Gemini CLI` と名付ける
  (§ Clarifications)。サポート対象ツールを名指しするすべての
  surface — tool filter、legend、empty state の scope、consent surface、起動オプションの
  説明、ユーザー文書 — は4つを名指ししなければならず (MUST)、3ツールと4 Global メンバーの
  ために書かれた親仕様の記述は、ツールを追加する変更の中で両言語とも4ツールと5メンバーに
  改訂されなければならない (MUST): その FR-004 のツール一覧、Supported Initial Release
  Customization Files の表、FR-013・FR-014・FR-018 のメンバー数と capture 順、User Story 4、
  Inspection Session と Source の entity、Global scope についての Assumptions。Gemini CLI の
  mark は他の3つが従う vendor-mark のルールに従わなければならない (MUST): vendor 自身の彩度を
  落とした色の単色 glyph で、accessible name としてプロダクト名を持つ。
- **FR-002**: Repository inspection path allowlist は、Gemini CLI について、選択された
  Repository root の下の正確に次の場所だけを admit しなければならない (MUST): instructions
  として、任意のディレクトリの context file。これは1本の派生ルールを通じ、その filename は
  リポジトリの `.gemini/settings.json` が `context.fileName` を宣言しない限り `GEMINI.md`、宣言する
  ときは正確に宣言された名前 (群) である (FR-004) — その導出の隣に `GEMINI.md` を admit する静的
  ルールは無い。skills として、`.gemini/skills/` の1階層下と `.agents/skills/`
  の1階層下の `SKILL.md`。custom agents として、`.gemini/agents/` の直接の子で名前が
  `/\.md$/u` に一致するもの。prompts and commands として、`.gemini/commands/` 配下の任意の
  深さで名前が `/\.toml$/u` に一致するファイル。そして settings・MCP・hook の carrier として
  `.gemini/settings.json`。上のすべての `.gemini/` と `.agents/` の場所は選択された root 自身のディレクトリである — vendor は
  プロジェクトの `.gemini` ディレクトリをプロジェクトルートに文書化し、入れ子のものは文書化して
  いない — ので、`packages/api/.gemini/` は admit されない。skill ディレクトリの companion census
  は、すべてのプロダクトの skill と同様に Gemini CLI の skill にも適用される。
- **FR-003**: Repository allowlist は、Gemini CLI について、`.gemini/policies/`、
  `.geminiignore`、`.gemini/.env`、`.gemini/hooks/` 配下のスクリプト、そして vendor が
  リポジトリと home の外に文書化する system レベルの settings・defaults・policy ディレクトリを
  admit してはならない (MUST NOT)。各除外は理由と共に vendor contract に記録されなければ
  ならない (MUST): workspace policy tier は現在読み込まれないと文書化されている。ignore file は
  カスタマイズではなく、何を挙げるかを決めるために ignore file は読まれない。environment file
  は credential である。hook script は hook 宣言が名指しする対象であって宣言ではない。system の
  場所はすべての Source の外にある。
- **FR-004**: リポジトリの `.gemini/settings.json` が `context.fileName` を空でない文字列、
  または空でない文字列の空でない配列として宣言するとき、Gemini CLI が認識する instruction 名は
  正確に宣言された名前群でなければならない (MUST) — 設定は読み込むファイル (群) を名指しする
  ので、既定に加えるのではなく置き換える。settings ファイルは walk の前に configuration として
  読まれ、同時に自身の settings 行としても publish される。それ以外の宣言値、読めない settings ファイル、その format で parse できない
  ファイルは何も設定しないので、`GEMINI.md` が認識される名前のまま残る — absent・unreadable・
  malformed・不正に宣言する `.codex/config.toml` が Codex について何も設定しないのとまったく
  同様である。parse 失敗は、settings recognition を通じた settings ファイル自身の file-confined な
  diagnostic である。vendor の読みが確立していない値は parse 失敗ではなく、diagnostic を持たない。ユーザーの
  home だけで、または system settings ファイルで宣言された `context.fileName` は Repository
  Source が読まない runtime 入力である。それは settings-inputs condition として vendor behavior
  に記録され、Repository recognition に投影されることは決してない。
- **FR-005**: Gemini CLI context file の instructions 行は、Claude Code の instruction file と
  正確に同じ方法でファイル自身のパスから applicability range を導出しなければならない (MUST)
  — root は `**` を、`packages/api/GEMINI.md` は `packages/api/**` を導出する — 末尾から
  ディレクトリを剥がすことなく。Gemini CLI は隣のファイルに対する `.gemini/GEMINI.md` という
  代替を文書化していないからである。ファイル内の `@path` import は書かれたテキストとして記録
  される relationship であり、その対象は決して開かれない。vendor 自身の階層 — global file、
  workspace ディレクトリとその親、アクセスされたディレクトリと boundary marker までのその
  祖先の just-in-time scan — は runtime-cwd と repository-root の condition として vendor
  behavior に記録されなければならず (MUST)、allowlist を選択された root の外へ広げてはならない
  (MUST NOT)。
- **FR-006**: Gemini CLI custom command 行は vendor が呼び出すとおりに名付けられなければ
  ならない (MUST): `commands/` ディレクトリに対するファイルの相対パスで、`/` を `:` に置き換え
  `.toml` 拡張子を除いたもの。したがって `.gemini/commands/git/commit.toml` は `git:commit`
  である。行の detail は `!{...}` shell block と `{{args}}` placeholder を含め TOML ソースを
  書かれたとおりに示さなければならず (MUST)、どれも評価されない。TOML parser が読めない、または `prompt` を宣言しない command ファイルは、
  そのパスが名指しする行を保ち、file-confined な parse diagnostic を持つ。path で名付ける
  すべてのプロダクトの command と同様である。
- **FR-007**: Gemini CLI skill 行は skill の書かれた frontmatter `name` で名付けられなければ
  ならず (MUST)、名前が absent か空のときは skill ディレクトリに fallback する。すべての
  プロダクトの root skill 行と同様である。文書化された同名の解決 — user skill より workspace
  skill、そして1つの tier の中では `.gemini/skills/` のコピーより `.agents/skills/` のコピー
  — は、行の同名 statement がそこから導出される runtime-composition strategy として記録され
  なければならず (MUST)、vendor が文書化していることとして述べられ、セッションがどのファイルを
  読み込んだかとしては決して述べられない。
- **FR-008**: Gemini CLI sub-agent 行はファイルの宣言された frontmatter `name` で名付けられ
  なければならず (MUST)、admit するルールが解決する agent 名ごとに1行である。宣言の
  `mcpServers`、`tools`、`model` フィールドは書かれたとおりに示され、解決も接続も検証もされない。frontmatter が parse できない、または
  `name` を宣言しないファイルは行の名前を不明のままにし、file-confined な diagnostic を持つ。
  declared-name プロダクトの agent が既にそうであるように。
- **FR-009**: `.gemini/settings.json` は settings 行として1回 publish されなければならず
  (MUST)、その `mcpServers` の下に宣言された server 名ごとに1つの MCP 行 — それぞれその宣言を
  挙げる — に寄与しなければならず (MUST)、その `hooks` object が何を宣言していても、それを admit する
  同じ matcher によって hook recognition を持たなければならない (MUST) — 1回読まれる1ファイルに
  対する3つのルールであり、`.claude/settings.json` と `.codex/config.toml` が認識されるのと同様である。宣言された server の `env` や `headers` の
  `$VAR_NAME` 参照は文字どおりのテキストであり、解決されない (親仕様 FR-026)。`mcp.allowed`、
  `mcp.excluded`、`agents`、`skills` の設定はファイルのソースの一部であり、enablement として
  解釈されない。absent・空・または object でない `mcpServers` の値は MCP 行に寄与せず、settings
  と hook の recognition をそのまま残す。
- **FR-010**: Gemini CLI Global member はその root の下の次のパスだけを調査しなければならない
  (MUST): instructions として `GEMINI.md`。settings・MCP・hook の carrier として
  `settings.json`。skills として `skills/<skill-name>/SKILL.md` (skill 名は直接の子1つ)。
  custom agents として `agents/` の直接の子で名前が `/\.md$/u` に一致するもの。prompts and
  commands として `commands/` 配下の任意の深さで名前が `/\.toml$/u` に一致するファイル。そして
  permissions として `policies/` の直接の子で名前が `/\.toml$/u` に一致するもの。root の下の
  それ以外はすべて除外しなければならず (MUST)、親仕様の FR-018 は他の vendor のものを名指し
  するのと同じ用語で Gemini CLI の managed・runtime state を名指ししなければならない (MUST):
  `extensions/` 配下のインストール済み extension のコピー、trusted-folder の記録、environment
  file、OAuth と account の credential、session と history の state、一時ファイル。 home 自身の `settings.json` の `context.fileName` は、home の
  どの instruction file を admit するかを変えてはならない (MUST NOT): ルールは `GEMINI.md` だけを
  admit する。Codex home が `config.toml` の宣言にかかわらず固定の instruction の組を admit するの
  と同様であり、設定は settings-inputs condition として vendor behavior に記録する
  (§ Clarifications)。
- **FR-011**: Gemini CLI の member root は、親仕様の1回の capture の中で、`CODEX_HOME` の後、
  shared agent home の前に、セッション開始時に導出されなければならない (MUST)。
  `GEMINI_CLI_HOME` を正確に1回読み、`undefined` だけを absent と扱う。present な値は他の設定と
  同様に閉じた lexical-state アルゴリズムで分類される。`eligible` な値は active platform の
  `node:path.join` で固定 suffix `.gemini` と join されて root を形成する。vendor はこの設定を、
  `.gemini` フォルダそのものではなく `.gemini` フォルダが作られるディレクトリとして文書化して
  いるからである。absent な値は `node:path.join(capturedHomedir, '.gemini')` を導出する。FR-013
  と FR-014 の preview・consent・admission・retry・disable のルールはこのメンバーにそのまま
  適用される。固定の member tuple は5 entry を持ち、`retryableTools` は5つすべてにわたって
  導出される。
- **FR-012**: shared agent home member の `skills/<skill-name>/SKILL.md` ルールは Gemini CLI の
  recognition を持たなければならない (MUST)。vendor が `~/.agents/skills/` を自身の user skill
  ディレクトリの alias として文書化しており、親仕様の FR-045 が既に、そこで admit された
  ファイルは一致したパスを文書が名指しするすべてのツールの recognition を持つと述べている
  からである。既存の Codex と Copilot の recognition は変わらない。
- **FR-013**: GitHub Copilot によるルートの `GEMINI.md` の recognition は正確に今のままで
  なければならない (MUST)。ファイルは2つ目の recognition を得て何も失わない。そして — registry
  の comment や contract の中で — ルートの `GEMINI.md` が Copilot だけの行だとするあらゆる記述は
  同じ変更の中で訂正されなければならない (MUST)。それは真でなくなるからである。
- **FR-014**: Gemini CLI は親仕様が与えるすべての保証の下で調査されなければならない (MUST):
  hook command、custom command、skill script は実行されない (その FR-020)。宣言された MCP
  server は起動も接続もされない (FR-021)。outbound request は発行されない (FR-022)。調査対象の
  ソースは変更されない (FR-023)。recognition は Gemini CLI がファイルを読み込んだ、選択した、
  有効化した、信頼したとは決して述べない (FR-009)。フォルダが信頼されているか、したがって
  project settings・hooks・commands・skills がそもそも読み込まれるかは、vendor behavior に
  記録される trust condition であり、recognition に投影されることは決してない。
- **FR-015**: すべての Gemini CLI vendor behavior、Inspector rule、runtime-composition strategy
  は既存の evidence record を通じて公式の Gemini CLI 文書を引用しなければならず (MUST)、正確な
  rendered section heading と `reviewedOn` 日付を持ち、自身の `documentationStatus` と
  `lifecycleQualifiers` を持たなければならない (MUST) (親仕様 QR-005)。変更が完了する前に、
  official-source check が新しい record 群に対して pass しなければならない (MUST)。
- **FR-016**: Gemini CLI の extension は、文書化されたどちらの場所でも認識されてはならない
  (MUST NOT): home の `extensions/` ディレクトリ配下のインストール済みコピーは、親仕様の
  FR-018 が他のすべての vendor のものを除外するのとまったく同様に、インストール済みコピー
  として FR-010 が除外する。そしてルートに `gemini-extension.json` を持つリポジトリ — その
  ディレクトリへリンクされた開発中の extension — は plugin として認識されないので、その
  manifest と同梱の `commands/`、`skills/`、`agents/`、`hooks/hooks.json`、`policies/`、
  context file はその manifest からルール・recognition・行を一切得ない。vendor contract は
  両方の除外を理由と共に記録しなければならない (MUST): インストール済みコピーは書かれたもの
  ではなく配布元から再現されるものであり、リポジトリルートの manifest を vendor が読むのは
  そのようなコピーを通じてだけである。

### Key Entities

- **Supported Tool**: inventory が読者として名指しするプロダクトの閉じた集合 — GitHub
  Copilot、Claude Code、OpenAI Codex、Gemini CLI。メンバーの追加はこの集合を列挙するすべての
  surface への変更であり、それを強制するのが label table の網羅性である。
- **Gemini CLI Global Member**: 5つ目の consent preview entry。その root は、`GEMINI_CLI_HOME` が
  eligible のときはその直下の、そうでなければ capture された home directory 直下の `.gemini`
  ディレクトリである。tool home とまったく同様に consent・admit・retry・disable され、他の4
  メンバーとは別個に識別される。
- **Context Filename Declaration**: リポジトリの `.gemini/settings.json` が `context.fileName`
  に与える値 — 1つの名前かリスト — で、Gemini CLI がどの instruction filename で認識されるかを
  決めるために walk の前に configuration として読まれる。vendor の読みが確立していない値は何も
  導出せず、`GEMINI.md` が残る。
- **Command Name**: custom command の呼び出し名。`commands/` ディレクトリの下のパスから、
  ディレクトリ segment を `:` でつないで導出される。1つの Source 内での prompt/command 行の
  単位である。

## Quality Requirements _(mandatory)_

### Maintainability and Code Clarity

- **QR-001**: Gemini CLI の rule・behavior・strategy・relation は、既存の3つと同じ形の、自身の
  vendor module と vendor contract に置かれなければならない (MUST)。maintainer が他の vendor に
  触れずに Gemini CLI を更新できるように。他 vendor の record への編集は FR-012 と FR-013 が
  名指しするものだけ — shared agent home の skill ルールが recognition を1つ得ることと、Copilot
  のルート `GEMINI.md` の記述が訂正されること。4つ目の vendor が加わるすべての family — tool
  label table、vendor mark、compiled-rule subclass、同名 statement の導出、which-files の散文 —
  は丸ごと変換されなければならない (MUST): この変更の後に3ツールを名指しする surface は
  未完の変更である。

### Testing and Verification

- **QR-002**: 自動検証は Gemini CLI について次を cover しなければならない (MUST): admit される
  すべての Repository・Global の場所への positive fixture と、すべての selector family への
  reject される near-miss。2 recognition を持つ1ファイルとしてのルート `GEMINI.md` と、3
  recognition を持つ1ファイルとしての `.agents/skills/` の skill。`context.fileName` が absent、
  文字列、配列、および何も導出しない各値。直接の子と入れ子のパスから導出される command 名。
  `GEMINI_CLI_HOME` が absent・eligible・present-empty・relative のときの5メンバー preview。
  Gemini CLI の recognition を持つ shared agent home の skill。FR-003 と FR-010 が名指しする
  除外。そして hook command、shell-block command、MCP 宣言を持つ fixture にわたる、実行・MCP
  接続・outbound request・変更のゼロ。親仕様の SC-003・SC-004・SC-005 の release-evidence
  manifest は、ツールが加える `(tool, customization file type, admitted source form)` ごとに
  Gemini CLI の行を得なければならず (MUST)、Release-Evidence Fixture Governance の下でそれは
  manifest version を増やし新しい measurement set を開始する。end-to-end のブラウザ coverage は
  legend、tool filter、Gemini CLI の detail に届かなければならない (MUST)。ブラウザ suite 全体を
  このために再実行はしない。 親仕様の20セッション評価は、指定された SC-006 の
  ファイルの ground truth が Gemini CLI がそれを読むために変わる場合にだけ再実施する。変わら
  ないときは study input を4ツールを名指しするように更新し、`validation.md` に ground truth が
  変わらず再実施は不要だったと記録する (§ Clarifications)。

### Security and Privacy

- **QR-003**: Gemini CLI home は同じ session-wide consent の後にだけ、FR-010 が名指しするパス
  だけで調査される。root の下の OAuth と account の credential、trusted-folder の記録、
  environment file、session と history の state、インストール済み extension のコピーは決して
  読まれない。リポジトリの `.gemini/.env` ファイルは決して読まれない。示されるものはすべて
  read-only、inert、session-only、loopback-local である。親仕様の QR-003 がすべての source に
  求めるとおりに。

### Documentation and Participation

- **QR-004**: readme は両言語とも、3ツールを名指しするあらゆる箇所で4ツールを名指ししなければ
  ならず (MUST)、`docs/which-files-are-listed.md` とその日本語版は、リポジトリの下に Gemini CLI
  の section を、personal setup の下に Gemini CLI home の section を、shared agent home の「読む
  もの」列に Gemini CLI を得なければならない (MUST) — 散文で、出荷される rule が admit する
  すべてのリテラル segment を名指しし、そのページを正直に保つ containment gate が pass する
  ように。新しい vendor contract `contracts/vendors/gemini-cli.md` が既存の3つの contract と同じ
  section を持って両言語で存在しなければならず (MUST)、official-sources contract はそれが引用
  する Gemini CLI の source ID を挙げなければならない (MUST)。Gemini CLI の mark は accessible
  name としてプロダクト名を持たなければならず (MUST)、legend はそれを名指ししなければならない
  (MUST)。level `minor` の changeset entry が変更に伴わなければならない (MUST)。4つ目のツールはユーザーが
  受け取る behavior であり、既存の behavior は変わらないからである。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: FR-002 が admit するすべての Gemini CLI リポジトリの場所に1ファイルずつ持つ fixture
  リポジトリに対して、それらのファイルの 100% が Gemini CLI を読者として挙げられ、ルートの
  `GEMINI.md` は正確に2 recognition を持って1回挙げられ、`.agents/skills/` の skill は正確に3
  recognition を持って1回挙げられる。
- **SC-002**: FR-003 と FR-010 が除外するすべての場所にファイルを持ち、Gemini CLI の selector
  family ごとに1つの near-miss — 入れ子の `packages/api/.gemini/settings.json`、
  `.gemini/policies/deny.toml`、`.geminiignore`、`.gemini/.env`、`.gemini/hooks/` 配下の
  スクリプト、ルートの `gemini-extension.json`、`.gemini/skills/` の2階層下の `SKILL.md`、
  `.gemini/agents/` の下に入れ子になった agent ファイル、そして home の `extensions/`、
  `trustedFolders.json`、`.env` — を持つ fixture に対して、それらのファイルのゼロ個が挙げられ、
  それらへの read request はゼロ発行される。
- **SC-003**: `GEMINI_CLI_HOME` が absent・eligible・present-empty・relative で開始された
  セッションにわたって、consent preview の 100% が5メンバーを挙げ、Gemini CLI entry の root と
  分類はすべての場合でその入力に対する閉じた outcome に一致する。
- **SC-004**: Gemini CLI の hook command、shell-block custom command、MCP 宣言を持つ fixture に
  わたって、調査は command 実行、child process、MCP 接続、outbound request、調査対象ソースの
  変更をゼロ引き起こす。
- **SC-005**: `docs/which-files-are-listed.md` の両言語が、出荷される Gemini CLI の rule が
  admit するすべてのリテラルなパス segment を、既存の containment gate が測るとおりに名指しし、
  readme・legend・filter・consent surface はそれぞれ両言語で4ツールを名指しする。
- **SC-006**: official-source check は、Gemini CLI record の 100% について、引用されたすべての
  Gemini CLI URL が公式 host で直接応答し、引用されたすべての section が解決すると報告する。

## Assumptions

- 上の Gemini CLI surface は 2026-09-09 に `https://geminicli.com/docs/` の公式文書 — settings、
  GEMINI.md、custom commands、skills、sub-agents、hooks、MCP server、extensions、policy engine、
  trusted folders、ignore file の各ページ — から読んだ。planning は各パスをそれらのページに対して
  再検証し、正確な section heading を記録し、pattern を狭めることはある。仕様変更なしに surface
  を追加はしない。
- 文書化された user-level ディレクトリはユーザーの home 直下の `.gemini` であり、
  `GEMINI_CLI_HOME` は `.gemini` が作られるディレクトリを指す。これは home そのものを指す
  `CODEX_HOME`、`CLAUDE_CONFIG_DIR`、`COPILOT_HOME` と異なるので、`.gemini` との join はメンバーの
  導出の一部であり、類推に任せず FR-011 に明記する。
- `context.fileName` は既定の filename に加えるのではなく置き換える。reference がそれを「the name
  of the context file or files to load into memory」と文書化しているからである。それのために
  読まれるのはリポジトリ自身の `.gemini/settings.json` だけである。Codex の fallback 名のために
  リポジトリの `.codex/config.toml` だけが読まれるのと同様に、user-level の設定は Repository
  Source が見ない runtime 入力である。
- workspace policy tier はリポジトリから除外する。vendor 自身の reference がそれを現在は
  読み込まれないと文書化しているからである。そのページが変われば除外は再導出される。それは
  official-source review が既に求めることである。
- すべての Gemini CLI surface は既存の11 kind — instructions、skills、MCP、custom agents、
  prompts and commands、permissions、hooks、settings — に収まるので、kind は追加しない。
  extension は kind を与えるのではなく除外する (FR-016)。
- 固定 tuple のメンバー順は、設定が capture される順の4つの tool home — Copilot、Claude、
  Codex、Gemini CLI — の後に shared agent home であり、shared home は今日と同様に最後に留まる。
- Gemini CLI の settings ファイルはコメント付き JSON として読まれる。vendor 自身の settings loader が
  parse の前にコメントを剥がすからである — configuration reference はコメントについて何も述べない
  ので、source の計測であり、parser entry にそのように記録する — したがってプロダクトがコメント
  付き JSON に既に使っている parser を再利用する。vendor は trailing comma を剥がさず、Inspector の
  lenient な読みは剥がす。その差異は記録されたより穏当な誤りである (research.md § 6)。
- sub-agent と hook は vendor が文書化する lifecycle qualifier を持ちうる — sub-agent は
  `experimental` 設定の下で toggle される — が、それは仕様がここで決めるのではなく evidence
  record が subject ごとに述べる。
