# Global home fixture tree

[English](README.md)

`build-fixtures.ts` は、このプロジェクトの consent suite と Global inspection suite が
inspect する User-Global home を書き出します。1つの builder は1つの deterministic な tree
です。同じ base を与えれば同じ byte を書くため、正確な path 一覧や正確な row 順を assert する
suite を、golden file を横に置かずに再実行できます。

## これらの home の目的

Global home は repository ではなく、製品自身の設定ディレクトリです。consent が認可するのは、
その下で allowlist が名指しする customization file — 各 member の contract が admit する
instruction file、personal skill、agent、hook、settings document、MCP carrier
（spec.md FR-015〜FR-018、FR-045）— だけです。同じディレクトリにある他のすべて —
credential、session、cache、生成された memory、install 済み plugin のコピーその他の自動管理
state — は、filename がどれほど普通に見えても除外されたままです。したがって各 home は両側を持ちます。admit される
candidate は `expectedCandidatePaths`、どの rule も admit してはならない隣接 path は
`nearMissPaths` です。隣接 path が enumerate、open、read されたことを見つけた suite は、古い
fixture ではなく defect を見つけています。

fixture は、環境を build された home に向けることで使います — 3つの tool member には
`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME` を、そして `HOME` を。製品は共有 agent
home `~/.agents` を `HOME` から自身で導出します（FR-013、FR-045）。4つとも `environment` が
名前で keyed した形で返します。この製品の入力はそのプロパティだけであり、Global root を
引数として受け取ることはありません。

どの home にも2つの規則が成り立ちます。

- **書き込むのは harness だけです。** 製品は inspect する tree を変更しません（FR-023）。
  `observeTree` は各 entry の content、length、identity、link target、mode、mtime、ctime を
  記録するので、suite は session の前後で home 全体を比較できます。`observeAccessTimes` を
  分けているのは意図的です。file を読むこと自体が `atime` を動かすため、この属性だけは read が
  正当に変更しうるものであり、製品が行った変更ではありません。Node.js は安定した xattr/ACL API
  を公開していないため、content 以外の metadata が変わったことの間接的な signal は ctime です。
- **ここにあるものを製品が真実として読み直すことはありません。** `GLOBAL_HOME_SECRETS` の
  credential 形の literal と `GLOBAL_HOME_ENVIRONMENT_REFERENCES` の environment reference は、
  detail がそれらを mask せず resolve せずに表示することを suite が証明するために存在します
  （FR-025、FR-026）。`GLOBAL_HOME_SENTINELS` は、その位置に決して現れてはならない process の
  値を保持します。`hooks/pre-commit.sh` の payload は実行可能に見えて無害です。この製品は byte を
  読んで表示するだけで、読んだものを実行することはありません（FR-020）。

## builder 一覧

| Builder | 書き出すもの |
|---|---|
| `buildGlobalHomeFixture` | 3つの home すべての現実的な1組。各 home の admit される instruction file と、その隣にある設定・状態。Codex home は順序付き instruction target を両方持つため、fallback が観測可能です。 |
| `buildCodexInstructionHome` | `AGENTS.override.md` と `AGENTS.md` がそれぞれ独立に `CODEX_INSTRUCTION_CASES` の結果を取る Codex home。first-non-empty branch 用です。 |
| `buildUnreadableGlobalHome` | process が読めない home。決定的な root admission 拒否用です。admission は `R_OK \| X_OK` を検査するため、この root は拒否され Source を作りません。mode が有効だったかを返すので、tree を削除する前に `0o700` に戻してください。 |

`CODEX_INSTRUCTION_CASES` は、その branch が区別する8つの read 結果 — absent、empty、
BOM-only、whitespace-only、non-empty、replacement-decoded、binary、unreadable — であり、それ
ぞれが次の target へ進むか、Diagnostic を伴って fallback なしで branch を終えるかを述べます。
2つの target は互いに独立して case を取ります。fallback が適用されるのは override が absent か、
安全に読めて empty の場合だけであることを、それが証明するからです。

`LEXICAL_ROOT_CASES` も fixture です。何も書き出さないにもかかわらず、です。consent preview は
捕捉した文字列だけから、いかなる filesystem 操作の前に state を割り当てるため、これらの case の
ほとんどはディレクトリを名指しません。present-empty な override、NUL code unit、surrogate pair の
各半分単独、relative な綴り、そして通常の home の下にあるかどうかに関わらず eligible のままである
absolute な綴りです。

このうち2つは、実際の `process.env` を通しては駆動できません。Node 24 / darwin で計測したところ、
NUL を含む値を代入すると NUL の位置で切り詰められ、孤立 surrogate は well formed な U+FFFD として
返ってきます。したがって `invalid` state は POSIX の environment からは到達不能であり、代わりに
classifier を直接呼んで検証します。test で `process.env` にそれらを設定することは、platform が
決して渡さない値を assert することになります。

## suite が依拠してよいこと、いけないこと

- **file size / file 数の検証は存在しません。** instruction file が1つの home と100個の home は
  同じように読まれ、大きな file が reject、truncate、summarize されることはありません。製品が
  実装していない上限を suite が assert してはいけません。
- **可用性は verdict ではありません。** candidate が missing、empty、binary、unreadable である
  ことは、それ自身の Diagnostic を持つ read 結果です。妥当性の主張でも、lint 結果でも、読み手の
  設定に対する評価でもありません（FR-020、FR-028）。
- **1つの file に閉じない失敗はそのまま伝播します。** error envelope も cause 分類も存在しません。
  失敗した request が本当の error を報告し、部分的な preview、consent、root、Source、generation は
  一切作られません（contracts/http-api.md § Common results and errors）。suite は本当の error を
  assert します。製品が持つ code ではありません。
- **注入する platform 失敗は suite 側にあり、ここにはありません。** throw する `homedir()` や、
  すべての export が拒否する filesystem module は、test runner 自身の module mocking で導入します
  （`tests/unit/host/global-consent.test.ts`）。fixture 側の injector は存在しません。double は、
  test 対象の module がそれを import する前に導入されている必要があり、それは tree ではなく runner
  の仕事だからです。
- **preview は I/O を一切行いません。** consent の前に、提案された Global root の下で `stat`、
  `realpath`、enumerate、read は起きません。したがって preview の test は disk 上の home を必要と
  しません。home を build する preview test は、その home が触られなかったことを assert している
  のです。

## 新しい case が、参加する home に対して負う責任

candidate と一緒に near miss を追加してください。隣接 path が書かれていない candidate は、それを
admit した selector について何も証明しません。また、`nearMissPaths` に列挙せずに書かれた隣接 path
は、将来 selector がそこへ届いたときに suite を失敗させられません。capability に依存する case は、
repository fixture と同じ全か無かの materialization を通します。すべての link が存在して builder が
それらを述べるか、1つも存在せず builder が何も述べないかのどちらかです。
