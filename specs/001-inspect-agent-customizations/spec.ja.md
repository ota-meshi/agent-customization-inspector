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

## ユーザーシナリオとテスト *(必須)*

### ユーザーストーリー1 - リポジトリのカスタマイズを発見する（優先度: P1）

開発者は意図するrepository rootへ移動して`npx`経由でInspectorを起動し、GitHub Copilot、Claude Code、OpenAI Codexが認識するカスタマイズファイルの一覧をブラウザで確認する。起動processの`cwd`は常に独立したRepository sourceとして表す。

**この優先度の理由**: Agentを実行せずに関連ファイルを見つけることが、プロダクトとして価値を持つ最小単位であり、後続workflowの前提でもある。

**独立テスト**: サポート対象、対象外、ネストしたファイル、複数ツールに認識されるファイルを含むfixtureリポジトリを`cwd`としてInspectorを起動する。調査対象パス一覧に含まれるすべてのサポート対象カスタマイズファイルが一覧に含まれ、無関係なファイルが除外され、repository source、カスタマイズファイル種別、path、認識ツールが正しく示されることを確認する。

**受け入れシナリオ**:

1. **前提** `npx`起動時の`cwd`に3ツールすべてのサポート対象カスタマイズファイルがある、**操作** ユーザーが調査を開始する、**結果** ブラウザにはそのdirectoryが1つのRepository sourceとして、ツールおよびカスタマイズファイル種別で絞り込める一覧とともに表示される。
2. **前提** 1つの物理`AGENTS.md`がCopilotとCodexの両方に認識される、**操作** 一覧を表示する、**結果** 1つのカスタマイズファイルに2つの異なるtool recognitionが付いた状態で表示される。
3. **前提** Repositoryの調査対象パス一覧に含まれないファイルがある、**操作** リポジトリをスキャンする、**結果** それらのファイルはカスタマイズファイルとして解釈も表示もされない。
4. **前提** サポート対象カスタマイズファイルがない、**操作** スキャンが完了する、**結果** エラーではなく、サポート範囲を説明する正常な空状態が表示される。

---

### ユーザーストーリー2 - カスタマイズファイルを有効化せずに調査する（優先度: P1）

開発者はカスタマイズファイルを開き、そのsource text、関連metadata、source boundary、tool recognition、文書化されたscopeまたは関係を確認する。Inspectorは不確実性を明示し、カスタマイズファイルを実行も評価もしない。

**この優先度の理由**: 信頼できないカスタマイズファイルが対象であるため、安全かつ忠実な調査は追加機能ではなく中核価値である。

**独立テスト**: 実行可能なhook command、script付きskill、MCP server定義、import、不正なdata、リテラルcredential、boundary外linkを含むfixtureを、filesystem書き込み、child process、network activityを監視しながら調査する。内容が不活性のままであり、機密値がmaskされ、diagnosticが出ても影響を受けないカスタマイズファイルを引き続き利用できることを確認する。

**受け入れシナリオ**:

1. **前提** command、hook、plugin、skill、workflow、extension、MCP serverのいずれかを宣言するカスタマイズファイルがある、**操作** ユーザーが開く、**結果** Inspectorは宣言を表示するが、起動、接続、指示の評価を行わない。
2. **前提** credentialらしい値を含むサポート対象設定がある、**操作** 表示する、**結果** 値は既定でmaskされ、明示的かつローカルでsession内に限定された操作によってのみ表示できる。
3. **前提** Claudeのimportがsource boundary外を指している、**操作** カスタマイズファイルを調査する、**結果** targetを読んだり展開したりせず、関係とboundary diagnosticを表示する。
4. **前提** 優先順位または実効動作が未知のruntime surface、version、trust decision、working directory、flag、environmentに依存する、**操作** カスタマイズファイルを調査する、**結果** Inspectorは不確実性を示し、最終的な勝者や実効設定を断定しない。
5. **前提** 調査対象パス一覧に一致する読み取り不能、不正、変更済み、または過大なファイルがある、**操作** そのファイルを処理する、**結果** Inspectorは実行可能なdiagnosticを示し、他のカスタマイズファイルを引き続き表示する。

---

### ユーザーストーリー3 - カスタマイズを比較する（優先度: P2）

開発者は発見済みの任意の2つのカスタマイズファイルを選び、mask済みsource textとrecognition metadataを並べて比較し、Agentに解釈させずに重複と差分を理解する。

**この優先度の理由**: 比較によって、ファイル一覧は移行やトラブルシューティングに実用的な道具となり、同時にsemanticな判断をしない範囲を維持できる。

**独立テスト**: 異なるsourceとtoolの2つのfixtureを選択し、sourceとmetadataが並んで表示されること、正しさの評価や変更提案をせずにリテラルな差分とrecognitionの差を示すことを確認する。

**受け入れシナリオ**:

1. **前提** 読み取り可能な2つのカスタマイズファイルがある、**操作** ユーザーが比較する、**結果** 両方のmask済みsource viewと、path、source、file type、tool-recognition metadataを同時に確認できる。
2. **前提** 同じカスタマイズファイルに複数のtool recognitionがある、**操作** 別のカスタマイズファイルと比較する、**結果** 各recognitionを物理ファイルと区別したまま確認できる。
3. **前提** 2ファイルに競合する自然言語指示がある、**操作** 比較する、**結果** どちらがsemantic上正しいか、または有効かを断定せず、リテラルな差分だけを示す。

---

### ユーザーストーリー4 - User-global調査へopt-inする（優先度: P3）

開発者は、3つのサポート対象ツールについて、小さく文書化されたuser-globalの調査対象パス一覧を使用するため、独立したGlobal sourceを意図的に有効にする。Repositoryの結果は独立して識別でき、引き続き利用できる。

**この優先度の理由**: Global instructionはリポジトリファイルだけでは説明できない挙動の理解に役立つ一方、home構成の調査はprivacy riskを高めるため、任意かつ厳密に限定しなければならない。

**独立テスト**: サポート対象global fixtureが存在する状態で起動し、opt-in前に一切読み取られないことを確認する。Global調査を有効にし、指定されたinstruction pathにあるファイルだけが別sourceに現れることを確認した後、無効にしてGlobalの結果がsessionから除去されることを確認する。

**受け入れシナリオ**:

1. **前提** Global調査を有効にしていない、**操作** Inspectorを起動する、**結果** user-globalの調査対象パスにあるファイルを読み取りも表示もしない。
2. **前提** ユーザーがboundaryを確認して明示的にopt-inした、**操作** Global調査が完了する、**結果** それらのpathにあるサポート対象カスタマイズファイルが独立したGlobal sourceに現れ、Repositoryの結果は変化しない。
3. **前提** Globalの調査対象パスにあるinstruction fileの近くにcredential、log、runtime state、cache、その他対象外ファイルがある、**操作** Global調査を実行する、**結果** それらの隣接ファイルを読み取らない。
4. **前提** ユーザーがGlobal調査を無効にする、**操作** viewが更新される、**結果** Globalのカスタマイズファイルと表示済みのGlobal値をactive sessionから除去する。

### 境界事例

- `npx`起動時の`cwd`を読み取れない、起動後に利用できなくなる、またはユーザーが調査を意図したrootではない。
- 調査対象パス一覧に一致するファイルが壊れたsymbolic linkである、source boundary外へ解決される、link cycleを作る、または発見から読み取りまでの間に変化する。
- サポート対象filenameが、不正なtext encoding、不正なfrontmatterやconfiguration、極端に長い行、binary contentを含む、または文書化されたresource limitを超える。
- 複数の物理pathが同じファイルを指す、または1つのカスタマイズファイルに複数の認識済みfile typeもしくは認識ツールがある。
- カスタマイズファイルがabsolute path、`..` traversal、environment variableの文字列、またはimport chainを介して別ファイルを参照する。
- 設定されたtool homeが存在しない、空、relative、アクセス不能、またはユーザーの通常のhome外にある。
- Global override fileが存在するが空であり、文書化されたfallback fileが適用され得る。
- ブラウザを開いている間に、機密内容が新たに追加される場合を含めてファイルが変化する。
- Browser sessionがrefreshされる、または起動元とは別のhostから開かれる。
- Secret maskingが珍しいcredential形式を認識できない。Interfaceはmaskingが網羅的だと示してはならない。

## 要件 *(必須)*

### 機能要件

- **FR-001**: ユーザーは`npx`経由でプロダクトを起動し、生成されたローカル調査sessionをブラウザで開けなければならない（MUST）。起動時のprocess working directory（`cwd`）をRepository source rootとしなければならず（MUST）、初期リリースでは別のrepository pathをpromptしたり、異なるrootを求めてancestor directoryを探索したりしてはならない（MUST NOT）。ブラウザを自動で開けない場合、プロダクトは利用可能なローカルaddressを提示しなければならない（MUST）。
- **FR-002**: すべての調査には、`npx`起動時の`cwd`をrootとする、独立して識別されたRepository sourceをちょうど1つ含めなければならない（MUST）。
- **FR-003**: Inspectorは、文書化された調査対象パス一覧に含まれるpathだけからrepositoryのカスタマイズファイルを発見しなければならず（MUST）、リポジトリ内の全ファイルを無差別に解釈してはならない（MUST NOT）。
- **FR-004**: 初期リリースは、GitHub Copilot、Claude Code、OpenAI Codexについて、「初期リリースでサポートするカスタマイズファイル」に記載したrepositoryのカスタマイズファイル種別を認識しなければならない（MUST）。
- **FR-005**: 1つのファイルを複数の物理ファイルとして重複させずに、複数のtool、kind、scope、relationshipを表せるよう、物理ファイルとtool-specific recognitionを分離して表現しなければならない（MUST）。
- **FR-006**: ユーザーはsource、tool、カスタマイズファイル種別、repository-relative pathで一覧を閲覧および絞り込みできなければならない（MUST）。
- **FR-007**: 読み取り可能な各カスタマイズファイルについて、source、relative path、file type、認識ツール、source text、関連する宣言済みmetadata、既知のrelationshipを表示しなければならない（MUST）。
- **FR-008**: 1 directoryごとのoverrideやfallbackを含め、決定的なdiscovery orderとscope ruleが文書化されている場合は説明し、その基礎となる物理ファイルも表示し続けなければならない（MUST）。
- **FR-009**: Runtime version、product surface、working directory、trust、flag、environment、organization policy、または文書化されていない競合解決に動作が依存する場合、conditionalまたはunknownと表示しなければならない（MUST）。
- **FR-010**: Claudeのimport relationshipは参照としてのみ表示し、import contentを自動展開してはならない（MUST NOT）。起点source boundary外への参照はdiagnosticを生成しなければならない（MUST）。
- **FR-011**: ユーザーは、mask済みsource textとrecognition metadataを含め、読み取り可能な任意の2つのカスタマイズファイルを並べて比較できなければならない（MUST）。
- **FR-012**: 比較はリテラルかつ記述的なものに限り、いずれのカスタマイズファイルもvalidate、lint、semantic rank、synchronize、convert、format、または自動修正提案してはならない（MUST NOT）。
- **FR-013**: Global調査は新規sessionごとに無効でなければならず（MUST）、Globalの調査対象パス一覧の範囲を説明した後の明示的なユーザー操作を必要としなければならない（MUST）。
- **FR-014**: Global調査を有効にした場合、独立して識別されたGlobal sourceを作成し、GlobalのカスタマイズファイルをRepository sourceへ統合してはならない（MUST NOT）。
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
- **FR-025**: Credentialらしい値と、secretを含み得ると文書化されたfieldは、source、metadata、comparison、diagnostic、logで既定でmaskしなければならない（MUST）。
- **FR-026**: Mask済み値の表示には、その値に対する明示的な操作を必要とし、active session内のローカル操作に限定し、カスタマイズファイル、Global source、またはsessionを閉じた後に残してはならない（MUST NOT）。
- **FR-027**: 自動maskingは偶発的な露出を減らすが、すべてのsecret形式の検出を保証しないことを警告しなければならない（MUST）。
- **FR-028**: 調査対象パス一覧に一致する1つのファイルの読み取りまたはparse failureが、一覧に含まれる他のファイルの発見や表示を妨げてはならない（MUST NOT）。影響を受けるitemには、ユーザーが問題を解決できるだけのpathとsourceの文脈を残さなければならない（MUST）。
- **FR-029**: 個別file、scan全体の作業量、nesting、relationship depthのresource limitを文書化し、強制しなければならない（MUST）。Limit到達時はhangやcrashではなく、上限のあるpartial resultまたはdiagnosticを生成しなければならない（MUST）。
- **FR-030**: ユーザーはactive sourceを明示的に再scanできなければならない（MUST）。古い結果は、以前に表示した機密値を引き継がずに置換しなければならない（MUST）。
- **FR-031**: 調査結果とreveal stateは既定でsession内に限定し、初期リリースではprofile、cache、repository fileとして永続化してはならない（MUST NOT）。
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

- **Inspection Session**: 1つのRepository source、任意のGlobal source、現在のscan result、comparison selection、diagnostic、reveal stateを含む一時的なユーザー活動。
- **Source**: 種別（`Repository`または`Global`）、root location、enabled state、scan statusを持つ、明示的なfilesystem trust boundary。
- **カスタマイズファイル**: Source-relative pathと安全なfile identityで識別され、readableまたはdiagnostic stateとmask済みsource textを持つ、source内で発見された1つの物理ファイル。
- **Tool Recognition**: カスタマイズファイルに付与するtool-specific interpretation。Tool、file type、文書化されたscopeまたはorder、宣言済みmetadata、不確実性を含む。
- **Relationship**: カスタマイズファイルから別pathまたは宣言済みcomponentへの、実行されない参照。Import contentを展開せず、boundaryとresolution statusを含む。
- **Diagnostic**: 空結果、read/parse failure、不確実性、limit、stale file、cycle、boundary violationについて、実行可能かつsecret-safeに説明する情報。

## 品質要件 *(必須)*

### 保守性とコードの明確さ

- **QR-001**: 調査対象パスの定義、source boundary、recognition、precedence ruleは、無関係なtoolを変更せずに1つのtoolを更新できる凝集したownershipと明示的なinvariantを持たなければならない（MUST）。自明でないsecurityまたはcompatibility判断には理由を文書化し、抽象化は実際に共通することが示された振る舞いだけに限定しなければならない（MUST）。

### テストと検証

- **QR-002**: 自動検証は、各toolの調査対象パス一覧に含まれるpathと含まれないpath、multi-tool recognition、source separation、決定的なorderとfallback、すべてのuncertainty state、comparison、opt-inとdisable flow、不正および変化するfile、encoding、resource limit、symbolic link、cycle、traversal attempt、rootとcandidateの差し替えfixture、identityとmetadataの変化、検出済みrace後の結果破棄、secret maskingとreveal reset、ならびに実行、source mutation、MCP connection、カスタマイズファイル起因network accessがゼロであることを示すregression testを扱わなければならない（MUST）。すべてのerror caseには客観的な期待結果が必要であり、end-to-end browser testは4つのuser storyすべてを扱わなければならない（MUST）。Supported-OS matrixは、stableかつ検出可能なunsafe objectの必須rejection、Node.jsが必要metadataまたはcanonicalizationを利用不能もしくは曖昧と報告した場合の`safe-fs-boundary-unverifiable`によるrejection、public Node.js APIが公開しないOS機能への明示的な`platform-unobservable` recordを区別しなければならない（MUST）。最後のcategoryをcontainmentの証明へ数えてはならない（MUST NOT）。これらのtestは、文書化したNode.js checkを検証しなければならず（MUST）、観測できない敵対的なpath-component replacement raceに対する証明と説明してはならない（MUST NOT）。

### セキュリティとプライバシー

- **QR-003**: Viewing sessionは既定で起動元machineからのみ到達可能でなければならない（MUST）。最小権限のfilesystem access、1つに集約したNode.js調査対象I/O boundary、lexicalとcanonicalのcontainment check、linkと非regular-fileの拒否、公開かつ有効な場合の`O_NOFOLLOW`、enumerationからopenまでのidentity check、root/ancestor/candidate/open-handleのread後再検証、上限のあるresource use、secret-safeなdiagnosticとlogging、すべての検出済みまたは報告済み検証不能file raceに対する結果破棄を使用しなければならない（MUST）。調査対象contentや機密値を別machineへ送信したり、既定でsession後に保持したりしてはならない（MUST NOT）。Node.jsの公開APIはcross-platformなdirectory-handle-relative openを提供せず、same-device mountまたはreparse behaviorをすべて公開しないため、productはancestorまたは非対応final path componentを同時に差し替える敵対的なlocal processや、Node.jsが観測できないOS indirectionに対してkernelが強制するcontainmentを提供しないことを文書化しなければならない（MUST）。将来の解消には、適切なNode.js公開APIまたはoperating systemが強制するread-only boundaryを必要とする。

### ドキュメントと参加しやすさ

- **QR-004**: 英語・日本語のユーザー文書とContributor文書は意味的に同等であり、launchとsetup、`cwd`から決まるRepository root、正確な調査対象パス一覧、source boundaryとGlobal consent、conditional interpretation、secret-maskingの限界、resource limit、diagnostic、対象外動作を説明しなければならない（MUST）。主要なdiscovery、inspection、comparison、consent、secret-reveal workflowはkeyboardで操作でき、意味のあるlabelとfocus stateを提供し、ローカルbrowser interfaceに適用されるWCAG 2.2 AA基準を満たさなければならない（MUST）。Error messageは問題と実用的な次の手順の両方を示さなければならない（MUST）。
- **QR-005**: 保守するすべてのvendor behavior、Inspector rule、runtime-composition strategyは、canonicalな第一者documentation URL、正確なreview済みsection、review dateへ解決する1つ以上のstable source IDを参照しなければならない（MUST）。Vendor lookup behavior、Inspector matcher、runtime compositionはownershipを分離し、各製品は独自のbehavior文書を持ち、Repository behaviorとUser/Global behaviorは別表を使用し、GitHub CopilotのVS Code、CLI、Cloud behaviorは別表を使用しなければならない（MUST）。すべてのRepository matcherはBase、Relative selector、Expansionを独立して示し、正確なlaunch-root boundaryを`./`で表記し、bare `**/` prefixを拒否しなければならない（MUST）。自動documentation checkは、英日parity、identifier uniqueness、相互参照、bounded official-source driftを検証し、behavior、rule、strategyを自動変更してはならない（MUST NOT）。

## 成功基準 *(必須)*

### 測定可能な成果

- **SC-001**: 初めて利用する参加者の95%以上が、提供されたproduct guidanceだけを使い、2分以内に意図するrepository rootへ移動し、その場所でInspectorを起動して、発見されたカスタマイズファイルを1つ開ける。
- **SC-002**: 文書化されたsize limit内で、filesystem entryが100,000件、該当するカスタマイズファイルが500件あるリポジトリについて、基準評価環境では10秒以内に完全な一覧を受け取り、1秒以内に進捗または意味のあるstatusを確認できる。
- **SC-003**: Conformance fixture集合において、調査対象パス一覧に含まれるサポート対象カスタマイズファイルの認識率100%、一覧外のファイルを解釈する件数0、共有物理ファイルに対するmulti-tool attributionの正解率100%を達成する。
- **SC-004**: 文書化したNode.js-only threat model内で維持するsafety suite全体において、カスタマイズファイル由来のcommandまたはcode execution、child process、MCP connection、outbound request、調査対象sourceのmutationがすべて0件である。有効なsource boundary外として拒否されたselectorに対する意図的なread requestが0件であり、read中にlink、identity、canonical location、または関連metadataが検出可能な形で変化するすべてのfixtureで、publishまたはcommitされるbyteが0である。
- **SC-005**: 維持管理するsecret fixture集合のすべてのcredential値が、すべてのdefault view、comparison、diagnostic、logでmaskされ、カスタマイズファイル、source、sessionを閉じたときにreveal stateが100%消去される。
- **SC-006**: 参加者の90%以上が、2分以内にカスタマイズファイルのsource、認識ツール、file type、実効動作がcertainかconditionalかを識別でき、主要workflowにcriticalなusability issueがない。
- **SC-007**: 維持管理するread不能、不正、過大、cycle、stale、boundary-crossing fixtureの100%で、影響を受けないカスタマイズファイルを引き続き利用でき、影響を受けたitemに実行可能かつsecret-safeなdiagnosticがある。
- **SC-008**: すべての主要workflowをkeyboardだけで完了でき、適用されるWCAG 2.2 AAの自動および手動acceptance checkにcriticalなaccessibility defectなしで合格する。

## 前提

- 初期リリースはローカルのsingle-user inspection sessionである。Remote hosting、collaboration、account、durable profileは対象外とする。
- 初期リリースの実行可能なapplication codeはすべてJavaScript/TypeScriptで実装する。Browserは生成済みclient logicとdeclarative assetを実行し、それ以外のproduct codeはすべてNode.js上で実行する。Strict manifest、documentation、license fileはnon-executable package dataのままとする。Contributorとuserは、Rust toolchain、native compiler、native addon、platform別prebuilt binary、またはpackage lifecycle/runtimeでのartifact downloadを必要としない。
- 調査対象のRepository rootとopt-in済みGlobal rootは、起動したuserが管理する通常のlocal pathである。通常の同時editは想定し、文書化したNode.js checkが変更を検出した場合、または必要なverification dataを利用不能と報告した場合はfail closedしなければならない。現行のNode.js公開APIはcross-platformな原子的directory-handle-relative openを公開しないため、check間でancestor、または有効な`O_NOFOLLOW`がないplatformのfinal path componentをraceさせる敵対的なlocal processは初期リリースのthreat modelから除外する。PlatformがNode.js経由で公開しないsame-device mountとreparse behaviorも残存limitationである。これらの制約は、検出可能または報告済み検証不能caseでlink、containment、identity、metadata、結果破棄、diagnosticの要件を緩和しない。
- `npx`起動時の`cwd`は調査boundaryであり、いずれかのcoding agentが使用する実効working directoryの証明ではない。Subdirectoryから起動した場合、Repository sourceはそのsubtreeに限定される。より広いscopeを調査するには、意図するrootからcommandを再実行する。
- 公式のカスタマイズ形式は変化し得る。正確な調査対象パス、filename、extensionは計画時に再確認して確定し、公開したうえでconformance fixtureによって検証する。
- Global調査はFR-015からFR-017のinstruction pathだけを対象とする。追加のuser-global skill、agent、settings、MCP定義、plugin、managed configuration、remote configurationには、別の同意と将来の仕様作業が必要である。
- Source textは調査に有用であるため、ユーザーは個別のmask済み値を意図的に表示できる。一括でのsecret表示とreveal choiceの永続化は対象外とする。
- Inspectorは宣言済みmetadataとreferenceをlabel付けするために必要な範囲で構造をparseしてよいが、parse diagnosticはvalidation resultではなく、Inspectorをvalidatorにするものでもない。
- 初期リリースで一度に比較できるのは2つのカスタマイズファイルに限定し、contentのmergeやeditは行わない。
- プロダクト文書とサポート対象一覧は公式vendor documentationを規範となる外部dependencyとして使用し、文書化されていない動作は明示的にuncertainなまま扱う。
