# 機能仕様: Agentカスタマイズの調査

[English](spec.md)

**Feature Branch**: `dev`

**Created**: 2026-07-15

**Status**: Draft

**Input**: ユーザー説明: 「提供されたローカルのプロダクト説明からAgent Customization Inspectorの初期プロダクトを定義し、後で削除する一時的な入力へのリンクは残さない。」

## Clarifications

### Session 2026-07-15

- Q: Repository sourceのrootを何によって決定するか？ → A: ユーザーが`npx`を実行したprocess working directory（`cwd`）。初期リリースでは別のrepository pickerもancestor rootの探索も行わない。
- Q: 最初のプロダクト範囲をどの用語で表すか？ → A: 仕様全体で「初期リリース」を使用する。
- Q: 発見したAgentカスタマイズ用ファイルを仕様で何と呼ぶか？ → A: 仕様全体で「カスタマイズファイル」を使用する。
- Q: 調査してよいfilesystem pathの限定集合を何と呼ぶか？ → A: 仕様全体で「調査対象パス一覧」を使用する。
- Q: Vendor lookup表とその根拠をどのように構成するか？ → A: Vendor lookup behaviorをInspector matcherおよびruntime compositionから分離し、製品ごとの文書、RepositoryとUser/Globalの別表、GitHub CopilotのVS Code/CLI/Cloud別表、ならびに保守する全行のstable official-source参照を使用する。

### Session 2026-07-16

- Q: 初期リリースにどのruntime実装制約を適用するか？ → A: 実行可能なapplication codeをすべてJavaScript/TypeScriptで実装する。CLI、local host、調査対象sourceのI/OはNode.jsの公開JavaScript API上で動作し、browserには生成済みJavaScriptとdeclarativeなHTML/CSS assetを渡す。Strict JSON manifest、documentation、license fileは有効なpackage dataとする。Rust、Node-APIその他のnative addon、platform別のprebuilt native binary、package lifecycleでのcompile、package lifecycleまたはruntimeでのartifact downloadは使用しない。
- Q: そのNode.js-only制約で、filesystem raceについてどの保証が可能か？ → A: 調査対象sourceのI/Oを1つのNode.js moduleへ集約し、Node.js公開APIが示すlinkとboundary failureを拒否し、root、ancestor、candidate path、open handle、read後のidentity、canonical location、metadata snapshotを比較し、不一致の検出時は候補byteをすべて破棄する。Node.jsが公開しplatformがenforceする場合は`O_NOFOLLOW`をfinal-componentの多層防御として使用する。これらの非原子的check間でancestor、または有効な`O_NOFOLLOW`がない場合にfinal path componentをraceさせる敵対的なlocal processはthreat modelから除外する。Node.js公開APIはsame-device mountやreparse behaviorをすべて公開することもできない。これらの残存riskとNode.jsまたはoperating systemによる解消pathは文書化し続ける。

### Session 2026-07-17

- Q: User-global rootをSourceとしてどのように表すか？ → A: サポート対象toolごとに、admitされたGlobal rootを独立したGlobal Sourceとして表す。Codexは`CODEX_HOME`、Claudeは`CLAUDE_CONFIG_DIR`、Copilotは`COPILOT_HOME`をrootとし、sessionは0から3つのGlobal Sourceを持つ。1つのSourceは正確に1つのrootを持ち、そのroot内の異なる種別のカスタマイズファイルはそれぞれ独立して表示する。
- Q: カスタマイズファイル内のリテラルcredentialと環境変数参照をどのように表示するか？ → A: リテラルな差分を確認できるよう、source text、表示対象の宣言済みmetadata値、comparison contentはcredential maskingやreveal workflowを使わず、記述されたまま表示する。調査対象content内の環境変数参照はリテラルtextとして扱い、process上の値を解決または置換しない。文書化されたtool-home環境変数はGlobal rootを特定するためだけに使用する。ファイルを開くと機密値を含み得る完全なcontentが表示されることを警告し、operational diagnosticとlogにはsource valueを複製しない。
- Q: 明示的な再scanが致命的に失敗した場合、以前のinventoryをどう扱うか？ → A: 最後に正常commitされたsnapshotを表示したまま残し、再scan失敗によりstaleであることを示し、実行可能なfailure diagnosticを表示する。部分結果を含む失敗scanの未commit結果はすべて破棄し、後続の再scanが正常commitされた場合にだけ保持中のsnapshotを置換する。
- Q: Repository sourceとGlobal sourceに一貫して適用するpath用語は何か？ → A: カスタマイズファイルを所有するSource rootからのpathを「Source-relative path」と呼ぶ。Repository Sourceでは起動時`cwd`からの相対path、各Global Sourceではそのtoolについてadmitされたhome rootからの相対pathとする。「repository-relative path」はRepository Sourceだけを説明する場合に限って使用する。
- Q: SC-002の性能測定にはどの環境を使用するか？ → A: メンテナーが指定する現在のローカル開発環境を基準とする。Ubuntuを必須とせず、具体的なmachine、operating system、hardware、runtimeの情報をrepository文書へ公開しない。1つのmeasurement setに含まれる全sampleは同じ環境で実行し、結果を別machineにも適用できる性能保証ではなく、基準環境固有の結果として扱う。
- Q: 1つのSC-002 measurement setを何回の測定で構成するか？ → A: メンテナーが指定する同じ現在のローカル基準環境で、正確に10回測定する。
- Q: SC-002の10回の測定のうち、何回が合格しなければならないか？ → A: 9回以上で、それぞれ1秒以内に進捗または意味のあるstatusを表示し、10秒以内に完全な一覧を表示する。
- Q: SC-002の各測定で1つのInspector processを再利用するか、新しく起動するか？ → A: 測定runごとにInspectorを終了し、次のrunでは新しいprocessを起動して、application memory stateと以前のscan snapshotを再利用しない。
- Q: SC-002の計測開始点と終了点をどこにするか？ → A: Browserがscan requestを送信した時点で両方のtimerを開始する。1秒timerは最初の進捗または意味のあるstatusが画面に表示された時点、10秒timerは完全な一覧が表示され主要な一覧操作が可能になった時点で終了する。`npx`のdownload、installation、process起動時間は除外する。
- Q: SC-001とSC-006の評価に何人の参加者を使用するか？ → A: 各基準を正確に20人で評価し、SC-001は19人以上、SC-006は18人以上の成功を必要とする。
- Q: SC-001とSC-006で同じ参加者を使用するか、別cohortを使用するか？ → A: 1つのevaluation sessionで同じ20人を使用し、SC-001、SC-006の順に実施する。
- Q: SC-001とSC-006の参加者にどのような経験を求めるか？ → A: 通常の開発作業でGitとcommand-line interfaceを使用しているが、Inspectorを利用したことも開発へ参加したこともない人とする。
- Q: SC-001とSC-006の実施中にmoderatorが操作ヒントを提供してよいか？ → A: Moderatorは標準化された課題文を同じ文面で読み直すことだけ可能とし、command、navigation、interface操作のヒントを提供してはならない。
- Q: 参加者評価で機材、環境、productのfailureをどのように扱うか？ → A: Task timerの開始前を含め、すべてを不成功として数え、登録済み参加者を除外または差し替えない。
- Q: SC-001の後、SC-006をどの開始状態で実施するか？ → A: SC-001の結果にかかわらず、全参加者を同じ指定カスタマイズファイルが開かれた同一の準備済みInspector stateへ置き、そのstateの準備完了後に標準化された課題文を提示した時点でSC-006 timerを開始する。
- Q: SC-006では何をcritical usability issueとして数えるか？ → A: 禁止された支援なしでprimary workflowを完了できなくする問題、または意図しない実行、調査対象sourceの変更、MCP・network接続、別machineへの調査content露出などのunsafe behaviorを起こす問題とする。
- Q: SC-002のrun間でoperating systemのfilesystem cacheを消去するか？ → A: Operating systemのfilesystem cacheは意図的にclearまたはresetせず、各runで新しいInspector processを起動しながら、自然に変化する状態で10回測定する。
- Q: SC-001の2分timerをどこで開始し、どこで終了するか？ → A: 標準化された課題文を提示した時点で開始し、発見されたカスタマイズファイル1つのsource/details viewが画面に開かれて操作可能になった時点で終了する。計測時間には、意図するrepository rootへの移動とInspectorの起動を含める。
- Q: SC-006で識別の成功をどのように記録し判定するか？ → A: Source、認識ツール、file type、実効動作がcertainかconditionalかの必須回答欄を持つ標準化されたresponse formを使用する。2分以内に4項目すべてを提出し、指定ファイルについて事前定義したground truthと全項目が一致した場合だけ成功とし、未回答または誤答が1項目でもあれば不成功とする。
- Q: SC-002の10回の測定runでperformance fixtureをどのように扱うか？ → A: 測定前にdeterministicなfixtureを1つ用意し、内容を変更せず10回すべてで再利用する。Fixtureの構築とsetupは計測時間に含めない。

## ユーザーシナリオとテスト *(必須)*

### ユーザーストーリー1 - リポジトリのカスタマイズを発見する（優先度: P1）

開発者は意図するrepository rootへ移動して`npx`経由でInspectorを起動し、GitHub Copilot、Claude Code、OpenAI Codexが認識するカスタマイズファイルの一覧をブラウザで確認する。起動processの`cwd`は常に独立したRepository sourceとして表す。

**この優先度の理由**: Agentを実行せずに関連ファイルを見つけることが、プロダクトとして価値を持つ最小単位であり、後続workflowの前提でもある。

**独立テスト**: サポート対象、対象外、ネストしたファイル、複数ツールに認識されるファイルを含むfixtureリポジトリを`cwd`としてInspectorを起動する。調査対象パス一覧に含まれるすべてのサポート対象カスタマイズファイルが一覧に含まれ、無関係なファイルが除外され、repository source、カスタマイズファイル種別、Source-relative path、認識ツールが正しく示されることを確認する。

**受け入れシナリオ**:

1. **前提** `npx`起動時の`cwd`に3ツールすべてのサポート対象カスタマイズファイルがある、**操作** ユーザーが調査を開始する、**結果** ブラウザにはそのdirectoryが1つのRepository sourceとして、ツールおよびカスタマイズファイル種別で絞り込める一覧とともに表示される。
2. **前提** 1つの物理`AGENTS.md`がCopilotとCodexの両方に認識される、**操作** 一覧を表示する、**結果** 1つのカスタマイズファイルに2つの異なるtool recognitionが付いた状態で表示される。
3. **前提** Repositoryの調査対象パス一覧に含まれないファイルがある、**操作** リポジトリをスキャンする、**結果** それらのファイルはカスタマイズファイルとして解釈も表示もされない。
4. **前提** サポート対象カスタマイズファイルがない、**操作** スキャンが完了する、**結果** エラーではなく、サポート範囲を説明する正常な空状態が表示される。

---

### ユーザーストーリー2 - カスタマイズファイルを有効化せずに調査する（優先度: P1）

開発者はカスタマイズファイルを開き、そのsource text、関連metadata、source boundary、tool recognition、文書化されたscopeまたは関係を確認する。Inspectorは不確実性を明示し、カスタマイズファイルを実行も評価もしない。

**この優先度の理由**: 信頼できないカスタマイズファイルが対象であるため、安全かつ忠実な調査は追加機能ではなく中核価値である。

**独立テスト**: 実行可能なhook command、script付きskill、MCP server定義、import、不正なdata、リテラルcredential、環境変数参照、boundary外linkを含むfixtureを、filesystem書き込み、child process、network activityを監視し、sentinel環境変数値を与えながら調査する。内容が不活性のままであり、リテラル値と参照がenvironment置換なしで記述されたまま表示され、sentinel値が表示contentへ混入せず、diagnosticが出ても影響を受けないカスタマイズファイルを引き続き利用できることを確認する。

**受け入れシナリオ**:

1. **前提** command、hook、plugin、skill、workflow、extension、MCP serverのいずれかを宣言するカスタマイズファイルがある、**操作** ユーザーが開く、**結果** Inspectorは宣言を表示するが、起動、接続、指示の評価を行わない。
2. **前提** リテラルcredentialと環境変数参照を含むサポート対象設定がある、**操作** 表示または比較する、**結果** 両方をmaskせず記述されたまま表示し、環境変数参照を解決せず、reveal操作も必要としない。
3. **前提** Claudeのimportがsource boundary外を指している、**操作** カスタマイズファイルを調査する、**結果** targetを読んだり展開したりせず、関係とboundary diagnosticを表示する。
4. **前提** 優先順位または実効動作が未知のruntime surface、version、trust decision、working directory、flag、environmentに依存する、**操作** カスタマイズファイルを調査する、**結果** Inspectorは不確実性を示し、最終的な勝者や実効設定を断定しない。
5. **前提** 調査対象パス一覧に一致する読み取り不能、不正、変更済み、または過大なファイルがある、**操作** そのファイルを処理する、**結果** Inspectorは実行可能なdiagnosticを示し、他のカスタマイズファイルを引き続き表示する。

---

### ユーザーストーリー3 - カスタマイズを比較する（優先度: P2）

開発者は発見済みの任意の2つのカスタマイズファイルを選び、source textとrecognition metadataを並べて比較し、Agentに解釈させずに重複と差分を理解する。Credentialの差を隠さないよう、記述された値は表示したままにする。

**この優先度の理由**: 比較によって、ファイル一覧は移行やトラブルシューティングに実用的な道具となり、同時にsemanticな判断をしない範囲を維持できる。

**独立テスト**: 異なるsourceとtoolの2つのfixtureを選択し、sourceとmetadataが並んで表示されること、正しさの評価や変更提案をせずにリテラルな差分とrecognitionの差を示すことを確認する。

**受け入れシナリオ**:

1. **前提** 読み取り可能な2つのカスタマイズファイルがある、**操作** ユーザーが比較する、**結果** contentベースのmaskingを行わず、両方の完全なsource viewと、Source-relative path、source、file type、tool-recognition metadataを同時に確認できる。
2. **前提** 同じカスタマイズファイルに複数のtool recognitionがある、**操作** 別のカスタマイズファイルと比較する、**結果** 各recognitionを物理ファイルと区別したまま確認できる。
3. **前提** 2ファイルに競合する自然言語指示がある、**操作** 比較する、**結果** どちらがsemantic上正しいか、または有効かを断定せず、リテラルな差分だけを示す。

---

### ユーザーストーリー4 - User-global調査へopt-inする（優先度: P3）

開発者は、3つのサポート対象ツールについて、小さく文書化されたuser-globalの調査対象パス一覧を使用するため、toolごとに独立したGlobal sourceを意図的に有効にする。Repositoryの結果は独立して識別でき、引き続き利用できる。

**この優先度の理由**: Global instructionはリポジトリファイルだけでは説明できない挙動の理解に役立つ一方、home構成の調査はprivacy riskを高めるため、任意かつ厳密に限定しなければならない。

**独立テスト**: サポート対象global fixtureが存在する状態で起動し、opt-in前に一切読み取られないことを確認する。Global調査を有効にし、指定されたinstruction pathにあるファイルだけが、それぞれ正確に1つのrootを持つCodex、Claude、Copilotの別々のGlobal sourceに現れることを確認した後、無効にしてGlobalの全結果がsessionから除去されることを確認する。

**受け入れシナリオ**:

1. **前提** Global調査を有効にしていない、**操作** Inspectorを起動する、**結果** user-globalの調査対象パスにあるファイルを読み取りも表示もしない。
2. **前提** ユーザーがboundaryを確認して明示的にopt-inした、**操作** Global調査が完了する、**結果** それらのpathにあるサポート対象カスタマイズファイルが、正確に1つのrootへboundされたtool別のGlobal sourceに現れ、Repositoryの結果は変化しない。
3. **前提** Globalの調査対象パスにあるinstruction fileの近くにcredential、log、runtime state、cache、その他対象外ファイルがある、**操作** Global調査を実行する、**結果** それらの隣接ファイルを読み取らない。
4. **前提** ユーザーがGlobal調査を無効にする、**操作** viewが更新される、**結果** すべてのGlobal sourceとGlobalのカスタマイズファイルをactive sessionから除去する。

### 境界事例

- `npx`起動時の`cwd`を読み取れない、起動後に利用できなくなる、またはユーザーが調査を意図したrootではない。
- 調査対象パス一覧に一致するファイルが壊れたsymbolic linkである、source boundary外へ解決される、link cycleを作る、または発見から読み取りまでの間に変化する。
- サポート対象filenameが、不正なtext encoding、不正なfrontmatterやconfiguration、極端に長い行、binary contentを含む、または文書化されたresource limitを超える。
- 複数の物理pathが同じファイルを指す、または1つのカスタマイズファイルに複数の認識済みfile typeもしくは認識ツールがある。
- カスタマイズファイルがabsolute path、`..` traversal、environment variableの文字列、またはimport chainを介して別ファイルを参照する。
- 設定されたtool homeが存在しない、空、relative、アクセス不能、またはユーザーの通常のhome外にある。
- Global override fileが存在するが空であり、文書化されたfallback fileが適用され得る。
- ブラウザを開いている間に、機密内容が新たに追加される場合を含めてファイルが変化する。
- 明示的な再scanが部分結果を生成した後で致命的に失敗する。部分結果を破棄し、最後に正常commitされたsnapshotをstale markerとfailure diagnostic付きで表示したまま残す。
- Browser sessionがrefreshされる、または起動元とは別のhostから開かれる。
- カスタマイズファイルにリテラルcredential、またはInspector process上で値が設定済みの環境変数への参照がある。リテラルsourceはmaskせず表示し、参照は解決も置換もしない。

## 要件 *(必須)*

### 機能要件

- **FR-001**: ユーザーは`npx`経由でプロダクトを起動し、生成されたローカル調査sessionをブラウザで開けなければならない（MUST）。起動時のprocess working directory（`cwd`）をRepository source rootとしなければならず（MUST）、初期リリースでは別のrepository pathをpromptしたり、異なるrootを求めてancestor directoryを探索したりしてはならない（MUST NOT）。ブラウザを自動で開けない場合、プロダクトは利用可能なローカルaddressを提示しなければならない（MUST）。
- **FR-002**: すべての調査には、`npx`起動時の`cwd`をrootとする、独立して識別されたRepository sourceをちょうど1つ含めなければならない（MUST）。
- **FR-003**: Inspectorは、文書化された調査対象パス一覧に含まれるpathだけからrepositoryのカスタマイズファイルを発見しなければならず（MUST）、リポジトリ内の全ファイルを無差別に解釈してはならない（MUST NOT）。
- **FR-004**: 初期リリースは、GitHub Copilot、Claude Code、OpenAI Codexについて、「初期リリースでサポートするカスタマイズファイル」に記載したrepositoryのカスタマイズファイル種別を認識しなければならない（MUST）。
- **FR-005**: 1つのファイルを複数の物理ファイルとして重複させずに、複数のtool、kind、scope、relationshipを表せるよう、物理ファイルとtool-specific recognitionを分離して表現しなければならない（MUST）。
- **FR-006**: ユーザーはsource、tool、カスタマイズファイル種別、Source-relative pathで一覧を閲覧および絞り込みできなければならない（MUST）。
- **FR-007**: 読み取り可能な各カスタマイズファイルについて、source、Source-relative path、file type、認識ツール、source text、関連する宣言済みmetadata、既知のrelationshipを表示しなければならない（MUST）。
- **FR-008**: 1 directoryごとのoverrideやfallbackを含め、決定的なdiscovery orderとscope ruleが文書化されている場合は説明し、その基礎となる物理ファイルも表示し続けなければならない（MUST）。
- **FR-009**: Runtime version、product surface、working directory、trust、flag、environment、organization policy、または文書化されていない競合解決に動作が依存する場合、conditionalまたはunknownと表示しなければならない（MUST）。
- **FR-010**: Claudeのimport relationshipは参照としてのみ表示し、import contentを自動展開してはならない（MUST NOT）。起点source boundary外への参照はdiagnosticを生成しなければならない（MUST）。
- **FR-011**: ユーザーは、contentベースのmaskingを行わない完全なsource textとrecognition metadataを含め、読み取り可能な任意の2つのカスタマイズファイルを並べて比較できなければならない（MUST）。
- **FR-012**: 比較はリテラルかつ記述的なものに限り、いずれのカスタマイズファイルもvalidate、lint、semantic rank、synchronize、convert、format、または自動修正提案してはならない（MUST NOT）。
- **FR-013**: Global調査は新規sessionごとに無効でなければならず（MUST）、Globalの調査対象パス一覧の範囲を説明した後の明示的なユーザー操作を必要としなければならない（MUST）。
- **FR-014**: Global調査を有効にした場合、toolごとに独立して識別されたGlobal sourceを0から3つ、すなわちCopilot、Claude、Codexごとに最大1つ作成しなければならない（MUST）。各Global sourceは、そのtoolについてadmitされた正確に1つのrootへboundしなければならず（MUST）、GlobalのカスタマイズファイルをRepository sourceまたは別toolのGlobal sourceへ統合してはならない（MUST NOT）。
- **FR-015**: CopilotのGlobal sourceは、`COPILOT_HOME`配下、またはその設定がない場合は文書化された既定home配下の`copilot-instructions.md`と`instructions/**/*.instructions.md`だけを調査しなければならない（MUST）。
- **FR-016**: ClaudeのGlobal sourceは、`CLAUDE_CONFIG_DIR`配下、またはその設定がない場合は文書化された既定configuration directory配下の`CLAUDE.md`だけを調査しなければならない（MUST）。
- **FR-017**: CodexのGlobal sourceは、`CODEX_HOME`における文書化されたinstruction fallbackだけを調査しなければならない（MUST）。すなわち、空でない`AGENTS.override.md`が存在すればそれを使用し、それ以外は`AGENTS.md`を使用する。その設定がない場合は文書化された既定homeを使用する。
- **FR-018**: Global調査から、追加のCopilot instruction directoryとskill directory、hostまたはorganizationの設定、Claudeの別user state fileおよびその他のconfiguration file、Codexのuser skillとstate、credential、log、cache、session data、managed policy、ならびにFR-015からFR-017にないdirectoryを除外しなければならない（MUST）。
- **FR-019**: すべてのカスタマイズファイルとそこから得た値を信頼できないdataとして扱わなければならない（MUST）。
- **FR-020**: Skill、command、hook、plugin、workflow、extension、script、handler、prompt、agent、rule、その他の調査対象contentを実行してはならない（MUST NOT）。
- **FR-021**: 調査対象contentに記載されたMCP serverを起動、接続、probe、またはrequest送信してはならない（MUST NOT）。
- **FR-022**: カスタマイズファイルの発見と表示によって、outbound network request、child-process実行、またはdynamic code evaluationを引き起こしてはならない（MUST NOT）。調査対象sourceのreadは、内部でadmitしたentryから中央集約したNode.js source-boundary moduleだけが開始しなければならない（MUST）。Clientから与えられたpath、および適用対象のlexical、canonical、link、regular-file、またはsource-boundary checkに失敗した参照先ファイルをread authorityとして受理してはならない（MUST NOT）。
- **FR-023**: 調査対象source内でfileを作成、変更、rename、または削除してはならない（MUST NOT）。
- **FR-024**: Node.js公開APIが示すsymbolic link、alias、import、参照pathをsource boundary外のカスタマイズcontentとして受理または表示してはならない（MUST NOT）。Cycle、boundary crossing、利用不能または曖昧なverification metadataは、実行可能なdiagnosticを伴って安全に失敗しなければならない（MUST）。中央集約したNode.js source-boundary moduleは、Node.jsが公開しplatformがenforceする場合、`O_NOFOLLOW`をfinal-componentの多層防御として使用しなければならない（MUST）。Enumeration時、`open`前、`open`後かつread前、上限付きsame-handle read後のcandidate verificationでは、最初にpath `lstat`でlinkまたは不正なidentity/typeを拒否し、次にcandidate `realpath`とcanonical containmentを評価し、その後path `lstat`を繰り返してcanonicalization前後のidentity一致を要求しなければならない（MUST）。適用対象phaseではroot identity、利用可能な全ancestor identity、open-handle identityとmetadataも比較しなければならない（MUST）。検出した変更または検証不能な必須checkは、候補byteを破棄し、そのread結果をpublishまたはcommitしてはならない（MUST NOT）。
- **FR-025**: Inspectorは、読み取り可能なカスタマイズファイルのsource textを、credential検出、contentベースのmasking、redaction、reveal手順なしで表示しなければならない（MUST）。表示対象の宣言済みmetadata値とcomparison contentは、credential間の差を含む差分を確認できるよう、記述されたリテラル値を維持しなければならない（MUST）。
- **FR-026**: 調査対象content内の環境変数参照はリテラルtextのままとし、Inspectorが参照先のprocess environment値を読み取り、解決、置換する契機にしてはならない（MUST NOT）。この制限は、FR-015からFR-017が明示的に文書化したtool-home環境変数をGlobal source rootの特定だけに使用することを妨げない。
- **FR-027**: ユーザーがsourceまたはcomparison contentを開く前に、Inspectorは記述された完全なcontentを表示し、機密値を含み得ることを明確に説明しなければならない（MUST）。初期リリースはcredential maskingまたはreveal workflowを提供してはならない（MUST NOT）。
- **FR-028**: 調査対象パス一覧に一致する1つのファイルの読み取りまたはparse failureが、一覧に含まれる他のファイルの発見や表示を妨げてはならない（MUST NOT）。影響を受けるitemには、ユーザーが問題を解決できるだけのSource-relative pathとsourceの文脈を残さなければならない（MUST）。
- **FR-029**: 個別file、scan全体の作業量、nesting、relationship depthのresource limitを文書化し、強制しなければならない（MUST）。Limit到達時はhangやcrashではなく、上限のあるpartial resultまたはdiagnosticを生成しなければならない（MUST）。
- **FR-030**: ユーザーはactive sourceを明示的に再scanできなければならない（MUST）。FR-029が上限付きpartial resultを許可する場合を含め、scan resultは1つのgeneration snapshotとしてatomicにcommitしなければならない（MUST）。正常なcommitは以前のsnapshotを置換しなければならない（MUST）。再scanがcommit前に致命的に失敗した場合、Inspectorは部分結果を含むそのscanの未commit結果をすべて破棄し、最後に正常commitされたsnapshotを保持して再scan失敗によりstaleであることを示し、実行可能なfailure diagnosticを表示しなければならない（MUST）。
- **FR-031**: 調査結果は既定でsession内に限定し、初期リリースではprofile、cache、repository fileとして永続化してはならない（MUST NOT）。
- **FR-032**: 初期リリースはvalidator、linter、semantic analyzer、synchronizer、converter、formatter、auto-fixerとして動作してはならない（MUST NOT）。
- **FR-033**: カスタマイズファイルのsource textと宣言済みmetadataは不活性なtextまたはdataとして表示しなければならない（MUST）。埋め込まれたmarkup、image、link、URI handler、control sequence、その他のcontentを、カスタマイズファイルの表示だけで実行、load、navigateしてはならない（MUST NOT）。
- **FR-034**: `AGENTS.md`というfilenameだけを理由にClaude Code recognitionを付与したり、`.claude/hooks`内の参照されていないscriptをhookと推測したり、単独の`.claude/prompts` directoryをサポート対象Claude Codeカスタマイズファイル種別として扱ったりしてはならない（MUST NOT）。
- **FR-035**: Codex instructionについて、各directoryで空でないinstruction fileを最大1つ選ぶ文書化されたrule、すなわち該当するoverrideを最初に選び、それ以外は通常fileと設定済みfallback nameから選ぶrule、およびGlobalからrepositoryを経由してruntime working directoryへ向かう広いscopeから狭いscopeへのorderを表さなければならない（MUST）。Working directoryまたはconfigurationが不明な場合、そのchainはconditionalのままにしなければならない（MUST）。
- **FR-036**: Claude instructionについて、文書化された広いscopeから狭いscopeへのorder、同じlevelではlocal instructionが通常instructionに続くこと、およびruntime working directoryが不明な場合はworking directoryより下のinstruction fileがconditionalであることを表さなければならない（MUST）。
- **FR-037**: 複数のCopilot instruction sourceが同時に適用され得る場合、またはprecedenceがproduct surfaceによって変わる場合、各recognitionを維持し、一般的なsemantic上の勝者を作り出してはならない（MUST NOT）。
- **FR-038**: 初期リリースの実装とpackageに含む実行可能なapplication codeは、すべてJavaScript/TypeScriptでなければならない（MUST）。CLI、local host、調査対象sourceのfilesystem layerはNode.jsの公開JavaScript API上で動作し、browser logicはJavaScript/TypeScript sourceから生成しなければならない（MUST）。Declarativeな生成済みHTML/CSS、strict JSON manifest、documentation、license fileはpackageへ含めてよい（MAY）。ProductにRust code、Node-APIその他のnative addon、prebuilt native binary、package lifecycleでのcompile、package lifecycleまたはruntimeでのartifact downloadを含めてはならない（MUST NOT）。

### 初期リリースでサポートするカスタマイズファイル

計画phaseでは、実装前にこれらのカスタマイズファイル種別と調査対象パスをその時点の公式仕様と照合し、正確な調査対象パス一覧を確定しなければならない（MUST）。再確認によって曖昧なfilename patternを狭めてよいが、仕様変更なしに別productを追加したり、Global sourceをFR-015からFR-018より広げたりしてはならない（MUST NOT）。

| ツール | Repositoryの調査対象パスとカスタマイズファイル種別 | 明示的な対象外またはconditionalな動作 |
|---|---|---|
| GitHub Copilot | Repository全体およびpath-specific instruction、認識対象`AGENTS.md`、rootの`CLAUDE.md`と`GEMINI.md`、custom agent、`.github/skills`、`.agents/skills`、`.claude/skills`配下のskill、promptとCopilot CLI互換command、hook宣言、MCP宣言、サポート対象settingsとplugin metadata | Surfaceに依存するsupportと文書化されていないprecedenceはconditionalとして表示する。Hosted personalまたはorganization configuration、`COPILOT_CUSTOM_INSTRUCTIONS_DIRS`または`COPILOT_SKILLS_DIRS`で指定する追加directoryは初期リリース対象外 |
| Claude Code | `CLAUDE.md`、`.claude/CLAUDE.md`、`CLAUDE.local.md`、nested instruction file、`.claude/rules`、skill、legacy command、subagent、project/local settings、宣言済みhook、root MCP configuration、output style、plugin manifest | Importはrelationshipとしてのみ扱う。`AGENTS.md`をfilenameだけでは認識しない。参照されていないscriptをhookと推測しない。単独の`.claude/prompts` directory、managed settings、managed instructions、無関係なuser stateはRepository source対象外 |
| OpenAI Codex | `AGENTS.md`と`AGENTS.override.md`、`.agents/skills`、custom agent定義、project configuration、hook宣言、MCP宣言、rule、pluginとmarketplace metadata | Project trustまたはworking directoryに依存する実効設定はconditional。非推奨のuser custom promptとuser-level skillはRepository source対象外 |

### 主要Entity

- **Inspection Session**: 正確に1つのRepository source、0から3つのtool別Global source、現在のscan result、comparison selection、diagnosticを含む一時的なユーザー活動。
- **Source**: 種別（`Repository`または`Global`）、正確に1つのroot location、enabled state、scan statusを持つ、明示的なfilesystem trust boundary。Global sourceはさらに正確に1つのサポート対象toolで識別し、そのroot内にある異なる種別のカスタマイズファイルは別々のinventory itemとして扱う。
- **Source-relative Path**: カスタマイズファイルを所有するSourceの1つのrootを基準にした表示・絞り込み用path。Repository Sourceの場合に限り起動時`cwd`からのrepository-relative pathとなり、Global Sourceではtool homeからの相対pathとなる。
- **カスタマイズファイル**: Source-relative pathと安全なfile identityで識別され、readableまたはdiagnostic stateとcontentベースのmaskingを行わない完全なsource textを持つ、source内で発見された1つの物理ファイル。
- **Tool Recognition**: カスタマイズファイルに付与するtool-specific interpretation。Tool、file type、文書化されたscopeまたはorder、宣言済みmetadata、不確実性を含む。
- **Relationship**: カスタマイズファイルから別pathまたは宣言済みcomponentへの、実行されない参照。Import contentを展開せず、boundaryとresolution statusを含む。
- **Diagnostic**: カスタマイズsource valueを複製せず、影響を受けたsourceとSource-relative locationを特定して、空結果、read/parse failure、不確実性、limit、stale file、cycle、boundary violationを実行可能に説明する情報。

## 品質要件 *(必須)*

### 保守性とコードの明確さ

- **QR-001**: 調査対象パスの定義、source boundary、recognition、precedence ruleは、無関係なtoolを変更せずに1つのtoolを更新できる凝集したownershipと明示的なinvariantを持たなければならない（MUST）。自明でないsecurityまたはcompatibility判断には理由を文書化し、抽象化は実際に共通することが示された振る舞いだけに限定しなければならない（MUST）。

### テストと検証

- **QR-002**: 自動検証は、各toolの調査対象パス一覧に含まれるpathと含まれないpath、multi-tool recognition、source separation、決定的なorderとfallback、すべてのuncertainty state、comparison、opt-inとdisable flow、不正および変化するfile、encoding、resource limit、symbolic link、cycle、traversal attempt、rootとcandidateの差し替えfixture、identityとmetadataの変化、検出済みrace後の結果破棄、最後にcommitされたsnapshotへの致命的な再scanのrollback、リテラルcredentialの正確な表示、環境変数参照の非解決、ならびに実行、source mutation、MCP connection、カスタマイズファイル起因network accessがゼロであることを示すregression testを扱わなければならない（MUST）。すべてのerror caseには客観的な期待結果が必要であり、end-to-end browser testは4つのuser storyすべてを扱わなければならない（MUST）。Supported-OS matrixは、stableかつ検出可能なunsafe objectの必須rejection、Node.jsが必要metadataまたはcanonicalizationを利用不能もしくは曖昧と報告した場合の`safe-fs-boundary-unverifiable`によるrejection、public Node.js APIが公開しないOS機能への明示的な`platform-unobservable` recordを区別しなければならない（MUST）。最後のcategoryをcontainmentの証明へ数えてはならない（MUST NOT）。これらのtestは、文書化したNode.js checkを検証しなければならず（MUST）、観測できない敵対的なpath-component replacement raceに対する証明と説明してはならない（MUST NOT）。

### セキュリティとプライバシー

- **QR-003**: Viewing sessionは既定で起動元machineからのみ到達可能でなければならない（MUST）。最小権限のfilesystem access、1つに集約したNode.js調査対象I/O boundary、lexicalとcanonicalのcontainment check、linkと非regular-fileの拒否、公開かつ有効な場合の`O_NOFOLLOW`、enumerationからopenまでのidentity check、root/ancestor/candidate/open-handleのread後再検証、上限のあるresource use、カスタマイズsource valueを複製しないoperational diagnosticとlog、すべての検出済みまたは報告済み検証不能file raceに対する結果破棄を使用しなければならない（MUST）。調査対象contentや表示した値を別machineへ送信したり、既定でsession後に保持したりしてはならない（MUST NOT）。Node.jsの公開APIはcross-platformなdirectory-handle-relative openを提供せず、same-device mountまたはreparse behaviorをすべて公開しないため、productはancestorまたは非対応final path componentを同時に差し替える敵対的なlocal processや、Node.jsが観測できないOS indirectionに対してkernelが強制するcontainmentを提供しないことを文書化しなければならない（MUST）。将来の解消には、適切なNode.js公開APIまたはoperating systemが強制するread-only boundaryを必要とする。

### ドキュメントと参加しやすさ

- **QR-004**: 英語・日本語のユーザー文書とContributor文書は意味的に同等であり、launchとsetup、`cwd`から決まるRepository root、正確な調査対象パス一覧、source boundaryとGlobal consent、conditional interpretation、完全なsource表示と機密値に関する警告、環境変数参照を解決しないこと、resource limit、diagnostic、対象外動作を説明しなければならない（MUST）。主要なdiscovery、inspection、comparison、consent workflowはkeyboardで操作でき、意味のあるlabelとfocus stateを提供し、ローカルbrowser interfaceに適用されるWCAG 2.2 AA基準を満たさなければならない（MUST）。Error messageは問題と実用的な次の手順の両方を示さなければならない（MUST）。
- **QR-005**: 保守するすべてのvendor behavior、Inspector rule、runtime-composition strategyは、canonicalな第一者documentation URL、正確なreview済みsection、review dateへ解決する1つ以上のstable source IDを参照しなければならない（MUST）。Vendor lookup behavior、Inspector matcher、runtime compositionはownershipを分離し、各製品は独自のbehavior文書を持ち、Repository behaviorとUser/Global behaviorは別表を使用し、GitHub CopilotのVS Code、CLI、Cloud behaviorは別表を使用しなければならない（MUST）。すべてのRepository matcherはBase、Relative selector、Expansionを独立して示し、正確なlaunch-root boundaryを`./`で表記し、bare `**/` prefixを拒否しなければならない（MUST）。自動documentation checkは、英日parity、identifier uniqueness、相互参照、bounded official-source driftを検証し、behavior、rule、strategyを自動変更してはならない（MUST NOT）。

## 成功基準 *(必須)*

### 測定可能な成果

- **SC-001**: 通常の開発作業でGitとcommand-line interfaceを使用しているがInspectorを利用したことも開発へ参加したこともない初回利用者を正確に20人とする評価で、19人以上が提供されたproduct guidanceだけを使い、2分以内に意図するrepository rootへ移動し、その場所でInspectorを起動して、発見されたカスタマイズファイルを1つ開ける。2分timerは標準化された課題文を提示した時点で開始し（MUST）、発見されたカスタマイズファイル1つのsource/details viewが画面に開かれて操作可能になった時点で終了しなければならない（MUST）。したがって、計測時間には意図するrepository rootへの移動とInspectorの起動を含む。同じevaluation sessionでSC-006にも同じparticipant cohortを使用し（MUST）、SC-001を先に実施しなければならない（MUST）。Moderatorは標準化された課題文を同じ文面で読み直してよいが（MAY）、いずれの基準でもcommand、navigation、interface操作のヒントを提供してはならない（MUST NOT）。参加者を20人のcohortへ登録した後は、基準の実施を妨げる、または中断する機材、環境、productのfailureを、そのtask timerの開始前に発生した場合も含めて当該基準の不成功として数えなければならず（MUST）、参加者を除外または差し替えてはならない（MUST NOT）。
- **SC-002**: 文書化されたsize limit内で、filesystem entryが100,000件、該当するカスタマイズファイルが500件あるリポジトリについて、メンテナーが指定する現在のローカル基準環境では10秒以内に完全な一覧を受け取り、1秒以内に進捗または意味のあるstatusを確認できる。このworkloadに一致するdeterministicなfixtureを測定前に1つ用意し（MUST）、内容を変更せず10回の測定runすべてで再利用しなければならない（MUST）。Fixtureの構築とsetupは計測時間に含めてはならない（MUST NOT）。両方のtimerはBrowserがscan requestを送信した時点で開始しなければならない（MUST）。1秒timerは最初の進捗または意味のあるstatusが画面に表示された時点、10秒timerは完全な一覧が表示され主要な一覧操作が可能になった時点で終了しなければならない（MUST）。`npx`のdownload、installation、process起動時間はこれらのtimerに含めてはならない（MUST NOT）。1つのmeasurement setは、その同じ環境で正確に10回測定して構成し（MUST）、9回以上が2つの時間基準をrunごとに満たさなければならない（MUST）。各測定runは以前のprocess終了後に新しいInspector processを起動し（MUST）、application memory stateまたは以前のscan snapshotを再利用してはならない（MUST NOT）。Operating systemのfilesystem cacheはrun間で意図的にclearまたはresetしてはならず（MUST NOT）、10回のrunは自然に変化するcache stateを使用しなければならない（MUST）。この結果は別machineにも適用できる性能保証ではなく基準環境固有であり、repository文書は基準環境の具体的なmachine、operating system、hardware、runtime情報を公開してはならない（MUST NOT）。
- **SC-003**: Conformance fixture集合において、調査対象パス一覧に含まれるサポート対象カスタマイズファイルの認識率100%、一覧外のファイルを解釈する件数0、共有物理ファイルに対するmulti-tool attributionの正解率100%を達成する。
- **SC-004**: 文書化したNode.js-only threat model内で維持するsafety suite全体において、カスタマイズファイル由来のcommandまたはcode execution、child process、MCP connection、outbound request、調査対象sourceのmutationがすべて0件である。有効なsource boundary外として拒否されたselectorに対する意図的なread requestが0件であり、read中にlink、identity、canonical location、または関連metadataが検出可能な形で変化するすべてのfixtureで、publishまたはcommitされるbyteが0である。
- **SC-005**: 維持管理するexact-display fixtureの100%で、リテラルcredential値と環境変数参照textがsource viewとcomparison viewにmaskされず変更なしで表示され、参照先のprocess environment値が表示contentへ混入せず、maskまたはreveal controlも表示されない。
- **SC-006**: SC-001を実施した後、同じevaluation sessionの同じ初回利用者20人がSC-006を実施する。SC-001の結果にかかわらず、全参加者は同じ指定カスタマイズファイルが開かれた同一の準備済みInspector stateからSC-006を開始しなければならない（MUST）。2分timerは、そのstateの準備が完了し、標準化された課題文を提示した時点で開始しなければならない（MUST）。各参加者は、カスタマイズファイルのsource、認識ツール、file type、実効動作がcertainかconditionalかの必須回答欄を持つ標準化されたresponse formへ回答を記録しなければならない（MUST）。2分以内に4項目すべてを提出し、指定ファイルについて事前定義したground truthと全項目が一致した場合を成功とし、未回答または誤答が1項目でもあれば不成功として数えなければならない（MUST）。18人以上が、提供されたproduct guidanceとSC-001で定義したmoderator policyだけを使って成功しなければならない（MUST）。Primary workflow全体でcritical usability issueは0件でなければならない（MUST）。禁止された支援なしでworkflowを完了できなくする問題、または意図しない実行、調査対象sourceの変更、MCP・network接続、別machineへの調査content露出を起こす問題をcriticalとする。
- **SC-007**: 維持管理するread不能、不正、過大、cycle、stale、boundary-crossing、fatal-rescan fixtureの100%で、影響を受けないカスタマイズファイルを引き続き利用でき、影響を受けたitemにカスタマイズsource valueを複製しない実行可能なdiagnosticがある。すべての致命的な再scanで部分結果のpublish件数が0となり、最後に正常commitされたsnapshotがstale表示付きで残る。
- **SC-008**: すべての主要workflowをkeyboardだけで完了でき、適用されるWCAG 2.2 AAの自動および手動acceptance checkにcriticalなaccessibility defectなしで合格する。

## 前提

- 初期リリースはローカルのsingle-user inspection sessionである。Remote hosting、collaboration、account、durable profileは対象外とする。
- 初期リリースの実行可能なapplication codeはすべてJavaScript/TypeScriptで実装する。Browserは生成済みclient logicとdeclarative assetを実行し、それ以外のproduct codeはすべてNode.js上で実行する。Strict manifest、documentation、license fileはnon-executable package dataのままとする。Contributorとuserは、Rust toolchain、native compiler、native addon、platform別prebuilt binary、またはpackage lifecycle/runtimeでのartifact downloadを必要としない。
- 調査対象のRepository rootとopt-in済みGlobal rootは、起動したuserが管理する通常のlocal pathである。通常の同時editは想定し、文書化したNode.js checkが変更を検出した場合、または必要なverification dataを利用不能と報告した場合はfail closedしなければならない。現行のNode.js公開APIはcross-platformな原子的directory-handle-relative openを公開しないため、check間でancestor、または有効な`O_NOFOLLOW`がないplatformのfinal path componentをraceさせる敵対的なlocal processは初期リリースのthreat modelから除外する。PlatformがNode.js経由で公開しないsame-device mountとreparse behaviorも残存limitationである。これらの制約は、検出可能または報告済み検証不能caseでlink、containment、identity、metadata、結果破棄、diagnosticの要件を緩和しない。
- `npx`起動時の`cwd`は調査boundaryであり、いずれかのcoding agentが使用する実効working directoryの証明ではない。Subdirectoryから起動した場合、Repository sourceはそのsubtreeに限定される。より広いscopeを調査するには、意図するrootからcommandを再実行する。
- 公式のカスタマイズ形式は変化し得る。正確な調査対象パス、filename、extensionは計画時に再確認して確定し、公開したうえでconformance fixtureによって検証する。
- Global調査はFR-015からFR-017のinstruction pathだけを対象とする。追加のuser-global skill、agent、settings、MCP定義、plugin、managed configuration、remote configurationには、別の同意と将来の仕様作業が必要である。
- Source text、表示対象の宣言済みmetadata値、comparison contentは、記述された差分を確認できるようcredential maskingなしで表示する。調査対象content内の環境変数参照はリテラルのままとし、解決しない。Productはreveal workflowを持たない。ファイルを開くと完全なcontentが露出するため、interfaceと文書は機密値が表示され得ることを示し、operational diagnosticとlogにはカスタマイズsource valueを複製しない。
- Inspectorは宣言済みmetadataとreferenceをlabel付けするために必要な範囲で構造をparseしてよいが、parse diagnosticはvalidation resultではなく、Inspectorをvalidatorにするものでもない。
- 初期リリースで一度に比較できるのは2つのカスタマイズファイルに限定し、contentのmergeやeditは行わない。
- プロダクト文書とサポート対象一覧は公式vendor documentationを規範となる外部dependencyとして使用し、文書化されていない動作は明示的にuncertainなまま扱う。
