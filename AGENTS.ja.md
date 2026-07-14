# リポジトリ指示

[English](AGENTS.md)

## ドキュメントの言語方針

- 人が作成するリポジトリ内のすべてのドキュメントについて、英語版と日本語版の両方を作成し、維持してください。
- 同じ変更の中で両言語版を追加または更新してください。いずれかが存在しない、または内容が古い場合、ドキュメント作業は完了していません。
- 英語版には標準の `*.md` ファイル名を使用し、日本語版には対応する `*.ja.md` ファイル名を使用してください。ツールやコミュニティの慣例によりファイル名が決まっている場合は、必須のファイル名（例: `AGENTS.md`）を維持し、同じ場所に日本語の対応ファイル（例: `AGENTS.ja.md`）を追加してください。
- 両言語版の意味を一致させてください。一語一句同じ翻訳である必要はありませんが、要件、警告、例、リンク、ステータス情報に相違があってはいけません。
- コード、コマンド、パス、パッケージ名、API 名、識別子、URL は、例そのもののローカライズに必要な場合を除き、そのまま保持してください。
- 実用的な場合は、各ドキュメントの冒頭付近から他方の言語版へ相互リンクしてください。
- ドキュメント変更を完了する前に、両言語版を比較し、欠落、古い記述、技術的な詳細の不一致がないことを確認してください。
- この方針は新規ドキュメントと、変更する時点での既存ドキュメントに適用します。生成ファイルおよびベンダー提供のサードパーティ製ドキュメントは対象外です。

## 現在のrepository状態と実装許可

- `docs/plans/initial-product-design.ja.md`のmilestone M1は、2026-07-15に明示的に承認され、`dev` branchで実装および検証されました。同日、その後にユーザーはproduction実装をすべて削除するよう指示しました。
- 現在のrepositoryには、計画documentと汎用的な開発tool設定だけを残しています。Inspector library、CLI、server、Web UI、実行可能なpreview、source test、production build、package-validation targetはありません。
- 以前のM1実装とlocal demo previewは、削除済みの履歴として扱ってください。以前の承認は、どちらかを復元する許可にはなりません。
- 新たな明示的承認なしにM1を復元したり、M2、M3、M4を開始したりしてはいけません。
- Product計画は将来のdesignとして維持してください。予定されているcontract、security primitive、adapter、interfaceを現在実装済みであるかのように記述してはいけません。

## 承認済みのプロダクト境界

- 読み取り専用のinspectorおよびviewerを構築してください。調査対象のinstruction、skill、command、hook、plugin、workflow、extensionを実行せず、MCP serverを起動または接続してはいけません。
- 調査対象のすべてのfile、filename、path、metadata value、configuration valueを信頼できない入力として扱ってください。
- Repositoryは常に有効な独立sourceとします。Globalは既定で無効な別のlocal-user sourceとし、明示的なopt-inを必須とします。
- Globalが無効な間は、user-homeまたはtool-home candidateをresolve、stat、list、readしてはいけません。Global preferenceを永続化してはいけません。
- RepositoryとGlobalのroot、identity、revision、catalog、diagnostic、limit、failureを分離してください。Merge済みのeffective configurationとして表示してはいけません。
- 明示的に解決されたroot内だけを調査し、MVPではすべてのsymbolic linkをskipして、root escapeを防止してください。
- 各Global candidateは、信頼済みのbuilt-in tool-home locator 1つだけに結び付けてください。Globalのbounded-directory candidateはtool-home rootより下から開始し、同一candidateを無関係なtool homeへ横断的にprobeしてはいけません。
- Absolute home path、tool-home environment value、秘匿化されていないsecret、source snippetを、公開diagnostic、ID、log、通常のserializationへ露出させてはいけません。
- Core contractはvendor-neutralに保ってください。Coreに固定条件分岐を追加したり、repository提供の実行可能pluginを使用したりせず、信頼済みbuilt-in adapter、fixture、metadata、testによってtoolを追加してください。

## 承認済みの技術的デフォルト

- TypeScript、ESM-only module、Node.js 22.12.0以降、npm、monorepoではない単一packageを使用してください。
- CLI milestoneが承認された場合、CLI引数parseとhelp生成には`gunshi`を使用してください。Commanderを使用してはいけません。
- Filesystemおよびcore logicを将来のpresentation layerから独立させてください。予定するUIは、plain CSSを使用するlocal React/Vite Web UIとthin CLI launcherです。
- 上限制約付きでrecoverableな処理を使用してください。不正またはアクセス不能なartifactがあってもscan全体をcrashさせず、sanitized diagnosticを生成してください。
- Catalog responseはsummaryだけにし、sourceとrevisionのcheck後に秘匿化済みdetailをon-demandで取得してください。秘匿化されていないRaw textをpublic snapshotまたは通常のserializationに保持してはいけません。
- 静的で信頼済みのadapter registrationを使用してください。調査対象repositoryから実行可能なadapterやpluginを提供することはできません。

## 必須の検証

- 現在の設定だけのrepositoryでは、残されたfileに適用されるformat、lint、typecheckを実行してください。
- Product実装が再度承認された場合、そのmilestoneの完了を宣言する前に、適切なunit、contract、integration、coverage、build、package checkを復元してください。
- 将来のproduct testでは、root containment、symlink skipping、設定済みの全limit、recoverableなfilesystemおよびadapter failure、diagnostic sanitization、source分離、Global無効時にGlobal resolverまたはfake-home filesystem callが0回であることを対象にしてください。
- Checkやcoverage thresholdの成功を完全なsecurity保証とみなさず、boundary caseと意図しないdata exposureを明示的にreviewしてください。
