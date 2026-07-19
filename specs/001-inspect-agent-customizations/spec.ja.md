# 機能仕様: Agentカスタマイズの調査

[English](spec.md)

**Feature Branch**: `dev`

**Created**: 2026-07-15

**Status**: Ready for Implementation

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
- Q: そのNode.js-only制約で、filesystem raceについてどの保証が可能か？ → A: 調査対象sourceのI/Oを1つのNode.js moduleへ集約し、Node.js公開APIが示すlinkとboundary failureを拒否し、root、ancestor、candidate path、open handle、read後のidentity、canonical location、metadata snapshotを比較し、不一致の検出時は候補byteをすべて破棄する。Node.jsが公開しplatformがenforceする場合は`O_NOFOLLOW`をfinal-componentの多層防御として使用する。これらの非原子的check間でsource rootまたはancestor、あるいは有効な`O_NOFOLLOW`がない場合のfinal path componentをraceさせる敵対的なlocal processはthreat modelから除外する。Node.js公開APIはsame-device mountやreparse behaviorをすべて公開することもできない。これらの残存riskとNode.jsまたはoperating systemによる解消pathは文書化し続ける。

### Session 2026-07-17

- Q: User-global rootをSourceとしてどのように表すか？ → A: サポート対象toolごとに、admitされたGlobal rootを独立したGlobal Sourceとして表す。Codexは`CODEX_HOME`、Claudeは`CLAUDE_CONFIG_DIR`、Copilotは`COPILOT_HOME`をrootとし、sessionは0から3つのGlobal Sourceを持つ。1つのSourceは正確に1つのrootを持ち、そのroot内の異なる種別のカスタマイズファイルはそれぞれ独立して表示する。
- Q: カスタマイズファイル内のリテラルcredentialと環境変数参照をどのように表示するか？ → A: リテラルな差分を確認できるよう、source text、表示対象の宣言済みmetadata値、comparison contentはcredential maskingやreveal workflowを使わず、記述されたまま表示する。調査対象content内の環境変数参照はリテラルtextとして扱い、process上の値を解決または置換しない。文書化されたtool-home環境変数はGlobal rootを特定するためだけに使用する。ファイルを開くと機密値を含み得る完全なcontentが表示されることを警告し、operational diagnosticとlogにはsource valueを複製しない。
- Q: 明示的な再scanが致命的に失敗した場合、以前のinventoryをどう扱うか？ → A: 最後に正常commitされたsnapshotを表示したまま残し、再scan失敗によりstaleであることを示し、実行可能なfailure diagnosticを表示する。部分結果を含む失敗scanの未commit結果はすべて破棄し、後続の再scanが正常commitされた場合にだけ保持中のsnapshotを置換する。
- Q: Repository sourceとGlobal sourceに一貫して適用するpath用語は何か？ → A: カスタマイズファイルを所有するSource rootからのpathを「Source-relative path」と呼ぶ。Repository Sourceでは起動時`cwd`からの相対path、各Global Sourceではそのtoolについてadmitされたhome rootからの相対pathとする。「repository-relative path」はRepository Sourceだけを説明する場合に限って使用する。
- Q: SC-002の性能測定にはどの環境を使用するか？ → A: Release測定の前に、version付きSC-002 reference-environment profileをrepository内で確定する。Profileは、正確なoperating-system imageとversion、processor architectureとmodel、logical processor数、memory、storage mediumとfilesystem、正確なapplication-runtime version、benchmark commandとconfiguration、deterministic fixture manifestとdigestを特定する。1つのmeasurement setの全runはそのprofileに一致しなければならない。結果とともにprofile IDと実際に記録したenvironment valueを公開し、個人識別子と絶対user pathだけを省略する。Profile fieldを1つでも変更すると新しいprofileとなり、異なるprofile IDの結果を直接比較可能としてはならない。
- Q: 1つのSC-002 measurement setを何回の測定で構成するか？ → A: 変更しない1つのversion付きreference-environment profile上で正確に10回測定する。
- Q: SC-002の10回の測定のうち、何回が合格しなければならないか？ → A: 9回以上で、それぞれ1秒以内に現在のrequestに対するqualifying scan statusを表示し、10秒以内に完全な一覧を表示する。
- Q: SC-002の各測定で1つのInspector processを再利用するか、新しく起動するか？ → A: 測定runごとにInspectorを終了し、次のrunでは新しいprocessを起動して、application memory stateと以前のscan snapshotを再利用しない。
- Q: SC-002の計測開始点と終了点をどこにするか？ → A: Browserがscan requestを送信した時点で両方のtimerを開始する。1秒timerは現在のrequestに対する最初のqualifying scan statusが画面に表示されassistive technologyにも公開された時点、10秒timerは完全な一覧が表示され主要な一覧操作が可能になった時点で終了する。`npx`のdownload、installation、process起動時間は除外する。
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

### Session 2026-07-18

- Q: SC-006でprimary workflow全体のcritical usability issueをどのように評価するか？ → A: 同じ20人の参加者が、時間計測するSC-006の識別回答を提出した後、標準化されたcomparisonとGlobal consentの課題をそれぞれ実施する。Discoveryとinspectionの観察にはSC-001と時間計測するSC-006の課題を使用し、moderatorは同じヒント禁止policyに従い、4つの客観的workflow outcomeと事前定義済みsafety-event fieldを記録する。Safety eventは自動的にcriticalとする。自動的なsafety eventではない、product起因と疑われるworkflow blockerだけを固定rubricに対して2人が独立分類し、不一致は安全側に倒してcriticalとして数え、第3の裁定者は設けない。登録した全参加者と機材、環境、productの全outcomeを除外や差し替えなしで記録する。Critical issueゼロのgateは、20人全員が4つのprimary workflowすべてを実施し、自動判定またはreviewer確認済みのcritical issueが1件もない場合に限り合格とする。

### Session 2026-07-19

- Q: Child process禁止はproductのbrowser起動helperも禁止するか？ → A: いいえ。許可するproduct起動のchild processは、FR-001に基づきstartup時に使用する固定のOS browser起動helperだけとする。このhelperへinspection由来のcontent/path、authored value、user-supplied command、environmentで選択したhandlerを渡してはならない。Closedなambient platform key setだけをlaunch environmentから直接copyしてよいが、Source rootとのlexical一致はprovenanceを変えず、authorityを与えず、inspection由来valueのcopyを許可しない。自動起動を無効にした場合、非対応の場合、または失敗した場合もinspectionを利用可能にする。Customization fileのdiscovery、read、parse、display、comparison、relationship処理はchild processを開始してはならない。
- Q: FR-007でrelevantまたはknownとするdeclared metadataとrelationshipはどれか？ → A: Presentation上の各supported customization file typeは、exactな`(tool, kind)`とadmission済みsource formの組とする。維持管理するsupported-customization文書で、各rowのclosedなfield/relationship setとexact source-form extractor applicabilityを列挙する。Initial releaseは両gateを満たすauthored occurrenceだけを表示し、未記載entryを推論したりsource form間でfieldをpromoteしたりしない。
- Q: 100ミリ秒未満のinventory interaction目標をどのように測定するか？ → A: SC-002の各runで500件の完全なinventoryが操作可能になった後、標準化されたfilter actionとitem-selection actionを1回ずつ実施する。各actionはbrowserがinputをdispatchした時点から、対応するfiltered resultまたはselected-state feedbackが表示され操作可能になるまでを測定する。同じ10回のrunのうち9回以上で、両方のactionが100ミリ秒未満でなければならない。
- Q: SC-002の1秒statusとして何を認めるか？ → A: 現在のscan requestについて画面に表示されassistive technologyにも公開されるstateであり、scanがqueue済みであること、activeなscan phase名、またはcomplete、partial、failedのいずれかを明示するものをqualifying statusとする。Failureの場合は実行可能な次の手順も示す。一般的なspinnerや「loading」label、変化しないcontrol、scan stateを示さないacknowledgement、以前のscanから残ったstatusは認めない。
- Q: 初回利用者による参加者評価を誰が担当するか？ → A: Maintainer teamがinitial-release studyと、そのrecruitment、compensation funding、moderation、review、consent/privacy handling、equipmentとsession support、bilingual material、accessibility accommodationを担当する。これはrelease evidenceの義務でありpull requestごとの義務ではない。通常のcontributorへ参加者の募集、費用負担、moderation、reviewを求めない。
- Q: Originating customization fileを持たない、文書化済みruntimeまたはhosted inputをどう表現するか？ → A: 関連するSourceに紐づく、evidence付きのSource Condition Factとして表現する。これは文書化済みでread authorityを持たないfactであり、Customization FileまたはTool Recognitionではない。File ID、Source-relative path、source text、comparison target、relationship origin、local/hosted read、network requestを作成しない。調査していない現在のruntime stateはconditionalまたはunavailableのままにする。
- Q: User storyのpriorityはimplementation orderをどのように制約するか？ → A: Priorityは相対的なuser valueを表し、implementationは元のfamily-vertical delivery orderを維持する。Shared setupとblocking foundationの後、各familyでUS1 discoveryとUS2の完全で不活性なdetailを完了してからUS3 comparisonを行い、次のfamilyへ進む。正確な順序は、SKILL（Skill Metadataを含む）→ Instructions → MCP → Rules → Commands → Copilot Prompts → Custom Agents → Configuration/Settings → Output Styles → Marketplaces → Plugin Manifests → Hooksとする。その後、Repository-wide Inventory、Detail、Comparison Acceptanceをこの順で完了し、Global inspection（US4、P3）を実施する。Cross-cutting verificationとrelease evidenceは最後に行う。
- Q: Global enablementをcommitしたとき、Repository resultがunchangedであるとは何を意味するか？ → A: Repository Sourceはstableな`sourceId`を維持し、この操作ではRepositoryを再scanしないため、カスタマイズファイルのmembership、Source-relative path、readableまたはdiagnostic state、recognition、relationship、Source Condition Fact、Repository-scoped diagnostic、authored source textはsemantic上変化しない。InitialまたはretryのGlobal Source正常commitはすべてsession generationを進め、すべてのgeneration-owned graph IDを再keyし、以前のgenerationに属するすべての`FileDetail`、comparison selection/view、editor-model stateを無効化する。これらのidentityとuser-interface lifecycleの変化はRepository resultのsemanticな変化ではない。すべてのcandidateがrejectされたattemptはGlobal Source commitを生成せず、このruleの対象外とする。
- Q: 各Diagnosticはどのlocation contextを持つか？ → A: 保持する各Diagnosticは正確に1つのscopeを持つ。File-scoped Diagnosticは、fileがそのSourceに属し、pathがそのSource内での当該fileのpathである、coherentな`sourceId`、`fileId`、`sourceRelativePath` tupleを必須とする。Source-scoped Diagnosticは`sourceId`だけを必須とし、`fileId`と`sourceRelativePath`を禁止する。Session-scoped Diagnosticは3つのlocation fieldをすべて禁止する。Scopeは、Diagnosticがcommit済みgenerationまたはsession lifecycleのどちらに属するかとは独立してlocationを表す。
- Q: SC-008をどのように判定するか？ → A: WCAG 2.2のLevel AおよびAA success criterionをすべて列挙する、意味的に同等な英語・日本語のWCAG 2.2 AA applicability matrixを維持する。各rowにはapplicability、非適用の場合の理由、名称付きautomated check、manual checkまたはその両方のstable ID、expected observation、結果evidenceを記録する。Manual check IDは、packed release candidate、両locale、正確なplatform/browser/assistive-technology version、viewport/orientation/zoom/text-spacing profile、UI mode、workflow state、input profileを固定したclosed matrixで実行する。Applicableなcellをすべて記録し、frozen releaseまたはmatrix valueを変更した場合は全manual checkを再実行する。Applicableなrowをdenominatorとし、0件であってはならない。Applicableな各rowとmanual cellは、必要なmappingとevidenceをすべて備え、mappingされたcheckすべてに合格しなければならない。Row、必要な理由、mapping、cell、resultのいずれかが欠ければgateを不合格とする。SC-008はapplicable criterionのfailureが0件の場合だけ合格とし、別の「critical accessibility defect」分類は使用しない。
- Q: Repository scanが自動開始する場合、SC-002の各runではどのscanを測定するか？ → A: 自動の初回Repository scanが終了するまで待ち、その後browserから明示的なRepository rescanを1回送信する。Admission responseは不透明な`scanRequestId`を返し、qualifying status、正常commit、表示済みinventoryはすべて同じrequestを識別しなければならない。そのrequestがcommitしたgenerationだけが10秒timerを終了できるため、それ以前の自動inventoryまたはstatusがrunを満たすことはない。
- Q: 調査対象sourceのmutationには何を数えるか？ → A: Write、truncate、create、rename、delete、link、modeまたはownershipの変更、time、extended attribute、ACLの設定、またはmutation可能なflagでのopenを要求するproduct起因requestを数える。Inspectorはこれらを一切発行しない。Readだけを契機にOSが行うaccess-time更新はproduct control外であり、product起因mutationとして数えない。Testでは別に記録し、Inspectorから要求せず、Inspectorがsourceを変更した証拠にも使用しない。
- Q: Inspectorをsemantic analyzerにせず、どのstructural interpretationを許可するか？ → A: 構文だけのparsing、記述されたliteral occurrenceの正確な抽出、機械的なtyped decoding、確定済みdocumented catalogに対する分類、文書化済みorder、scope、condition、selection、reference relationshipの投影を許可する。Inventory、detail、comparison、Global control、diagnostic、Source Condition Fact、API response、CLI output、documentationの全surfaceで、natural-languageの意味を解釈またはrank付けし、正しさ、有効性、compliance、qualityを判定し、remediation adviceを提供してはならない。
- Q: Sensitive-content acknowledgementはAPI authorization factorか？ → A: いいえ。Loopbackかつsession-onlyなAPIへのcapability authenticationがaccess-control boundaryである。Acknowledgementはbundled browserで必須のpresentation invariantであり、新しく読み込んだbrowser documentとclient data purgeのたびにresetし、userがwarningを確認するまでbundled browserは完全なsourceまたはcomparison contentをrequestもrenderもしない。APIとoperational logはacknowledgementをcapability authenticationの代替として扱わない。
- Q: Inspectorはfile sizeまたはitem件数のvalidation limitを定義するか？ → A: いいえ。Fileとcollectionの容量はNode.js、parser、OS、filesystem、browser、実行環境によって決まる。Inspectorは製品固有のsizeまたはcount上限によってcustomization contentを拒否または分類しない。回復可能な環境failureはlifecycle/operational stateとしてのみ報告し、artifactをvalidまたはinvalidに分類しない。そのattemptからitem、Source、recognitionまたはderived result、scan-result record/response、generationを一切commitせず、partial generationを決して許可せず、以前のcommit済みsnapshotがあればそれだけを利用可能に保つ。明示的なfatal rescanだけが対象Sourceのstale-failure overlayを作成または置換し、自動の初回Repository failureまたは初回Global enable failureはoverlayを作らない。
- Q: Scanがpartial generationを公開してよいのはいつか？ → A: 完全なtraversalとgeneration assemblyの後、決定的かつentry-localでcapacityに起因しないfailureが1つ以上のadmit済みfileへ影響し、影響を受けないentryが完全に残る場合に限る。Capacity、resource、root、traversal、generation assembly、serialization、transport、またはauthority喪失のfailureはpartial publicationを許可しない。
- Q: 検証済みbyteをどうdecodeするか？ → A: Same-handle readとread後の全identity checkに成功した後、NUL byteを1つでも含むfileはbinaryかつdiagnostic-onlyとする。それ以外はUTF-8としてstrictにdecodeし、先頭BOMが1つあれば記録して除去する。不正なUTF-8はunsupportedかつdiagnostic-onlyとし、replacement characterへの置換や別encodingの試行は行わない。
- Q: 通常のhome外にあるabsoluteなGlobal rootは、その場所だけを理由に失敗するか？ → A: いいえ。設定済みrootがabsoluteなら、通常のhome外でもconsent後のadmission対象となる。設定が存在しない場合は文書化済みdefaultを選択する。Empty、relative、表現不能、アクセス不能、またはboundaryを検証不能なrootは下記のclosed outcomeに従い、fallback authorityを作らない。

## ユーザーシナリオとテスト *(必須)*

### ユーザーストーリー1 - リポジトリのカスタマイズを発見する（優先度: P1）

開発者は意図するrepository rootへ移動して`npx`経由でInspectorを起動し、GitHub Copilot、Claude Code、OpenAI Codexが認識するカスタマイズファイルの一覧をブラウザで確認する。起動processの`cwd`は常に独立したRepository sourceとして表す。Inventoryには、関連するfile以外または未調査runtime behaviorについて保守するSource Condition Factを、カスタマイズファイルと明確に分けて表示してよい。

**この優先度の理由**: Agentを実行せずに関連ファイルを見つけることが、プロダクトとして価値を持つ最小単位であり、後続workflowの前提でもある。

**独立テスト**: サポート対象、対象外、ネストしたファイル、複数ツールに認識されるファイルを含むfixtureリポジトリを`cwd`としてInspectorを起動する。調査対象パス一覧に含まれるすべてのサポート対象カスタマイズファイルが一覧に含まれ、無関係なファイルが除外され、repository source、カスタマイズファイル種別、Source-relative path、認識ツールが正しく示されることを確認する。

**受け入れシナリオ**:

1. **前提** `npx`起動時の`cwd`に3ツールすべてのサポート対象カスタマイズファイルがある、**操作** ユーザーが調査を開始する、**結果** ブラウザにはそのdirectoryが1つのRepository sourceとして、ツールおよびカスタマイズファイル種別で絞り込める一覧とともに表示される。
2. **前提** 1つの物理`AGENTS.md`がCopilotとCodexの両方に認識される、**操作** 一覧を表示する、**結果** 1つのカスタマイズファイルに2つの異なるtool recognitionが付いた状態で表示される。
3. **前提** Repositoryの調査対象パス一覧に含まれないファイルがある、**操作** リポジトリをスキャンする、**結果** それらのファイルはカスタマイズファイルとして解釈も表示もされない。
4. **前提** サポート対象カスタマイズファイルがない、**操作** スキャンが完了する、**結果** エラーではなく、サポート範囲を説明する正常な空状態が表示される。
5. **前提** 文書化されたCopilot Cloud behaviorがRepository sourceに関係するがlocalのoriginating fileを持たずhosted stateも調査しない、**操作** inventoryを表示する、**結果** Inspectorはtool、surface、文書化済みconditionまたはunavailable state、evidenceを持つ別labelのSource Condition Factを表示し、synthetic file、Source-relative path、source-text action、comparison target、hosted read、network requestを作成しない。

---

### ユーザーストーリー2 - カスタマイズファイルを有効化せずに調査する（優先度: P1）

開発者はカスタマイズファイルを開き、そのsource text、関連metadata、source boundary、tool recognition、文書化されたscopeまたは関係を確認する。Inspectorは不確実性を明示し、カスタマイズファイルを実行も評価もしない。

**この優先度の理由**: 信頼できないカスタマイズファイルが対象であるため、安全かつ忠実な調査は追加機能ではなく中核価値である。

**独立テスト**: 実行可能なhook command、script付きskill、MCP server定義、import、不正なdata、リテラルcredential、環境変数参照、boundary外linkを含むfixtureを、filesystem書き込み、child process、network activityを監視し、sentinel環境変数値を与えながら調査する。自動browser起動を無効にするか、許可された固定browser起動helperが完了した後にchild process監視を開始する。調査対象contentが不活性のままであり、リテラル値と参照がenvironment置換なしで記述されたまま表示され、sentinel値が表示contentへ混入せず、diagnosticが出ても影響を受けないカスタマイズファイルを引き続き利用できることを確認する。

**受け入れシナリオ**:

1. **前提** command、hook、plugin、skill、workflow、extension、MCP serverのいずれかを宣言するカスタマイズファイルがある、**操作** ユーザーが開く、**結果** Inspectorは宣言を表示するが、起動、接続、指示の評価を行わない。
2. **前提** リテラルcredentialと環境変数参照を含むサポート対象設定がある、**操作** 表示または比較する、**結果** 両方をmaskせず記述されたまま表示し、環境変数参照を解決せず、reveal操作も必要としない。
3. **前提** Claudeのimportがsource boundary外を指している、**操作** カスタマイズファイルを調査する、**結果** targetを読んだり展開したりせず、関係とboundary diagnosticを表示する。
4. **前提** 優先順位または実効動作が未知のruntime surface、version、trust decision、working directory、flag、environmentに依存する、**操作** カスタマイズファイルを調査する、**結果** Inspectorは不確実性を示し、最終的な勝者や実効設定を断定しない。
5. **前提** 調査対象パス一覧に一致する読み取り不能、不正、または変更済みのファイルがある、**操作** 完全なtraversal後に決定的かつentry-localでcapacityに起因しないfailureとして分類する、**結果** Inspectorは実行可能なdiagnosticと完全な非影響fileを持つcontracted-partial outcomeだけを公開してよい。**代わりに前提** 環境resource failureが発生する、**結果** そのattemptのresultを一切公開せず、以前のcommit済みsnapshotだけを実行可能なlifecycle diagnostic付きで利用可能に保ち、validityまたはlint verdictを示さない。
6. **前提** Source Condition Factがoriginating fileを持たない、**操作** ユーザーがそのdetailを確認する、**結果** Inspectorはauthored content、file provenance、実効runtime resultを捏造せず、文書化済みbehavior、affected scope、evidence、不確実性を説明する。

---

### ユーザーストーリー3 - カスタマイズを比較する（優先度: P2）

開発者は発見済みで読み取り可能な任意の2つのカスタマイズファイルを選び、source textとrecognition metadataを並べて比較し、Agentに解釈させずに重複と差分を理解する。Credentialの差を隠さないよう、記述された値は表示したままにする。読み取り不能またはdiagnostic-onlyなitemはinventoryに残すが、comparisonの選択対象にはしない。

**この優先度の理由**: 比較によって、ファイル一覧は移行やトラブルシューティングに実用的な道具となり、同時にsemanticな判断をしない範囲を維持できる。

**独立テスト**: 異なるsourceとtoolの読み取り可能な2つのfixtureを選択し、sourceとmetadataが並んで表示されること、正しさの評価や変更提案をせずにリテラルな差分とrecognitionの差を示すことを確認する。読み取り不能またはdiagnostic-onlyなfixtureをcomparisonに選択できないことも確認する。

**受け入れシナリオ**:

1. **前提** 読み取り可能な2つのカスタマイズファイルがある、**操作** ユーザーが比較する、**結果** contentベースのmaskingを行わず、両方の完全なsource viewと、Source-relative path、source、file type、tool-recognition metadataを同時に確認できる。
2. **前提** 同じカスタマイズファイルに複数のtool recognitionがある、**操作** 別のカスタマイズファイルと比較する、**結果** 各recognitionを物理ファイルと区別したまま確認できる。
3. **前提** 2ファイルに競合する自然言語指示がある、**操作** 比較する、**結果** どちらがsemantic上正しいか、または有効かを断定せず、リテラルな差分だけを示す。
4. **前提** 発見済みのカスタマイズファイルが読み取り不能またはdiagnostic-onlyである、**操作** ユーザーがcomparisonの選択肢を確認する、**結果** そのitemはdiagnostic reviewに利用可能なままだが、comparison inputとして選択できない。

---

### ユーザーストーリー4 - User-global調査へopt-inする（優先度: P3）

開発者は、3つのサポート対象ツールについて、小さく文書化されたuser-globalの調査対象パス一覧を使用するため、toolごとに独立したGlobal sourceを意図的に有効にする。Repository Sourceはstableな`sourceId`によって独立して識別可能なままとし、すべての正常なGlobal Source commitがgeneration-owned identityを置き換え、以前のgenerationに属するdetail、comparison、editor-model stateをresetする一方で、semantic inventoryとauthored source contentを変更せず利用可能なままにする。

**この優先度の理由**: Global instructionはリポジトリファイルだけでは説明できない挙動の理解に役立つ一方、home構成の調査はprivacy riskを高めるため、任意かつ厳密に限定しなければならない。

**独立テスト**: サポート対象global fixtureが存在する状態で起動し、opt-in前に一切読み取られないことを確認する。Global調査を有効にし、指定されたinstruction pathにあるファイルだけが、それぞれ正確に1つのrootを持つCodex、Claude、Copilotの別々のGlobal sourceに現れることを確認する。Global Sourceの正常commitがsession generationを進め、すべてのgeneration-owned graph IDを再keyし、以前のgenerationに属するすべての`FileDetail`、comparison、editor-model stateを無効化すると同時に、Repository Sourceの`sourceId`、semantic inventory、authored source contentを変更せず維持することを確認する。その後でGlobal調査を無効にし、Globalの全結果がsessionから除去されることを確認する。

**受け入れシナリオ**:

1. **前提** Global調査を有効にしていない、**操作** Inspectorを起動する、**結果** user-globalの調査対象パスにあるファイルを読み取りも表示もしない。
2. **前提** ユーザーがboundaryを確認して明示的にopt-inした、**操作** Repository Sourceを再scanせずGlobal調査を正常commitする、**結果** それらのpathにあるサポート対象カスタマイズファイルが、正確に1つのrootへboundされたtool別のGlobal sourceに現れる。Commitはsession generationを進め、すべてのgeneration-owned graph IDを再keyし、以前のgenerationに属する`FileDetail`、comparison selection/view、editor-model stateをすべて無効化する。Repository Sourceは`sourceId`とsemantic上変化しないinventoryおよびauthored source contentを維持する。
3. **前提** Globalの調査対象パスにあるinstruction fileの近くにcredential、log、runtime state、cache、その他対象外ファイルがある、**操作** Global調査を実行する、**結果** それらの隣接ファイルを読み取らない。
4. **前提** ユーザーがGlobal調査を無効にする、**操作** viewが更新される、**結果** すべてのGlobal sourceとGlobalのカスタマイズファイルをactive sessionから除去する。

#### ClosedなGlobal Root Admission Outcome

| Configured-rootのinputまたはphase | Closed outcome確定前のI/O behavior | Closed outcome |
|---|---|---|
| 設定が存在しない | Filesystem I/Oを行わない | 文書化済みdefault absolute rootをlexicalにpreviewし、read authorityを作らない |
| 設定が存在するがemptyまたはrelative | Filesystem I/Oを行わない | そのtoolのpreview entryをinvalidとして報告し、fallbackせず、root、Source、scan job、generationを作らない |
| Absoluteなplatform pathとして表現しnormalizeできない | Filesystem I/Oを行わない | そのtoolのpreview entryをinvalidとして報告し、fallbackもauthorityも作らない |
| 通常のhome外を含む、表現可能なabsolute path | Filesystem I/Oを行わない | 明示的consentの対象としてpreview entryをeligibleにする。通常のhome外という場所自体はreject理由にしない |
| 送信されたconsentまたはpreview digestがstale、replayed、mismatched | Proposed-rootへのfilesystem I/Oを行わない | Requestをrejectし、authority、root、Source、scan job、generationを作らない |
| Consent済みrootが存在しない、アクセス不能、link、変化済み、自身のadmit済みboundary外、またはidentityを検証不能 | 中央集約したadmission checkだけがそのproposed rootへaccessできる | Fallbackせずそのtoolをrejectし、public Source、scan job、generationを作らない |
| Consent済みrootがlexical、canonical、link、type、containment、identity checkに成功する | Proposed root外へaccessしない | 正確にそのrootをprovisional tool jobへadmitし、許可されたatomic commitまでSourceまたはgraphを公開しない |

#### 検証済みByteのDecode Outcome

| 検証済みbyteのcondition | Encoding state | Sourceおよびcomparison outcome |
|---|---|---|
| NUL byteが1つ以上 | `binary` | Diagnostic-onlyとし、source textもcomparison eligibilityも公開しない |
| NULなし、先頭UTF-8 BOMが1つ、残りのbyteをstrictにdecode可能 | `utf-8-bom` | BOMを記録して除去し、完全にdecodeしたsourceを公開してcomparisonを許可する |
| NULもBOMもなく、全byteをstrictにdecode可能 | `utf-8` | 完全にdecodeしたsourceを公開してcomparisonを許可する |
| Strict UTF-8 decodingが失敗 | `unsupported` | Diagnostic-onlyとし、置換、別encodingでのretry、source textの公開、comparisonを行わない |

### 境界事例

- `npx`起動時の`cwd`を読み取れない、起動後に利用できなくなる、またはユーザーが調査を意図したrootではない。
- 調査対象パス一覧に一致するファイルが壊れたsymbolic linkである、source boundary外へ解決される、link cycleを作る、または発見から読み取りまでの間に変化する。
- サポート対象filenameが、不正なtext encoding、不正なfrontmatterやconfiguration、極端に長い行、binary contentを含む、または実行環境がfile処理を継続できないと報告する。
- 複数の物理pathが同じファイルを指す、または1つのカスタマイズファイルに複数の認識済みfile typeもしくは認識ツールがある。
- カスタマイズファイルがabsolute path、`..` traversal、environment variableの文字列、またはimport chainを介して別ファイルを参照する。
- 設定されたtool homeが存在しない、空、relative、アクセス不能、またはユーザーの通常のhome外にある。
- Global override fileが存在するが空であり、文書化されたfallback fileが適用され得る。
- ブラウザを開いている間に、機密内容が新たに追加される場合を含めてファイルが変化する。
- 明示的な再scanが部分結果を生成した後で致命的に失敗する。部分結果を破棄し、最後に正常commitされたsnapshotをstale markerとfailure diagnostic付きで表示したまま残す。
- Browser sessionがrefreshされる、または起動元とは別のhostから開かれる。
- カスタマイズファイルにリテラルcredential、またはInspector process上で値が設定済みの環境変数への参照がある。リテラルsourceはmaskせず表示し、参照は解決も置換もしない。
- 文書化されたCloudまたはexternal-runtime behaviorが関係するが、現在のhosted stateを利用できずlocal fileもそのfactのoriginではない。Synthetic customization fileではなく、read authorityを持たないSource Condition Factのまま扱う。
- Inspectorがmutation可能なfilesystem requestを発行していなくても、readを契機にOSがaccess timeを更新する。そのOS side effectは別に記録し、product起因mutationのassertionをfailureにしない。
- Admission済みfilesystem operationがNode.jsまたはOSでabort、reject、その他の回復可能なfailureになる。Attemptをabortし、そのattemptからitem、scan-result record/response、generationを一切commitせず、prior committed snapshotだけを利用可能に保ち、publication authorityを取り消した後の遅延resultをすべて破棄する。

#### ClosedなScan Publication Outcome

| Terminal condition | Public status | Commitおよびresponse outcome |
|---|---|---|
| Traversalが完了し、全admit済みentryが完全な許可済みresultを持ち、generation assemblyとserializationが成功し、publication authorityがcurrentのまま | `complete` | 1つのcomplete generationをatomicにcommitし、complete responseだけを公開する |
| Traversalが完了し、generation assemblyとserializationが成功し、1つ以上のadmit済みentryだけに決定的かつentry-localでcapacityに起因しないfailureがあり、影響を受けない全entryが完全 | `partial`（`contracted-partial`） | 影響entryのdiagnosticと完全な非影響resultを持つ1つのcontracted partial generationをatomicにcommitする |
| Enumeration、read、decode、parse、extraction、coordination、assembly、serialization、またはcommit前response constructionでcapacityまたはresource failureが発生 | `failed` | Attemptをabortし、item、Source、recognitionまたはderived result、scan-result record/body、response、generationを一切commitせず、publication authorityを取り消す。以前のcommit済みsnapshotがあればそれだけを維持する。明示的なfatal rescanだけが対象Sourceのstale-failure overlayを作成または置換し、自動の初回Repository failureまたは初回Global enable failureはoverlayを作らず、既存のsnapshot stateがあればそのまま保つ |
| Capacity/resourceに起因しないrootまたはtraversal failureによりcomplete traversalが不可能、capacity/resourceに起因しないgeneration assemblyまたはserializationが失敗、または別のcapacity/resourceに起因しないfatalなcommit前scan failureが発生 | `failed` | Attemptをabortし、item、Source、recognitionまたはderived result、scan-result record/body、response、generationを一切commitしない。以前のcommit済みsnapshotがあればそれだけを維持し、実行可能なfixed-code failureを公開する。明示的なfatal rescanだけが対象Sourceのstale-failure overlayを作成または置換し、自動の初回Repository failureまたは初回Global enable failureはoverlayを作らず、既存のsnapshot stateがあればそのまま保つ。Global admissionがすべてrejectの場合はscan requestを作らず、closedな`active-no-job` control outcomeを返す |
| Disable、shutdown、supersession、failureによりpublication authorityが取り消される | 後続のsuccess statusなし | 遅延resultをすべて破棄し、取り消されたrequestから何もcommitしない |
| Atomic commit後にresponse transportが失敗 | Commit済み`complete`または`partial` statusを変更しない | Truncated responseをpartial contractとして扱わない。Clientは認証済みsession APIからcommit済みgenerationを再取得できる |

## 要件 *(必須)*

### 機能要件

- **FR-001**: ユーザーは`npx`経由でプロダクトを起動し、生成されたローカル調査sessionをブラウザで開けなければならない（MUST）。起動時のprocess working directory（`cwd`）をRepository source rootとしなければならず（MUST）、初期リリースでは別のrepository pathをpromptしたり、異なるrootを求めてancestor directoryを探索したりしてはならない（MUST NOT）。ブラウザを自動で開けない場合、プロダクトは利用可能なローカルaddressを提示しなければならない（MUST）。
- **FR-002**: すべての調査には、`npx`起動時の`cwd`をrootとする、独立して識別されたRepository sourceをちょうど1つ含めなければならない（MUST）。
- **FR-003**: Inspectorは、文書化された調査対象パス一覧に含まれるpathだけからrepositoryのカスタマイズファイルを発見しなければならず（MUST）、リポジトリ内の全ファイルを無差別に解釈してはならない（MUST NOT）。
- **FR-004**: 初期リリースは、GitHub Copilot、Claude Code、OpenAI Codexについて、「初期リリースでサポートするカスタマイズファイル」に記載したrepositoryのカスタマイズファイル種別を認識しなければならない（MUST）。
- **FR-005**: 1つのファイルを複数の物理ファイルとして重複させずに、複数のtool、kind、scope、relationshipを表せるよう、物理ファイルとtool-specific recognitionを分離して表現しなければならない（MUST）。
- **FR-006**: ユーザーはsource、tool、カスタマイズファイル種別、Source-relative pathで一覧を閲覧および絞り込みできなければならない（MUST）。
- **FR-007**: 読み取り可能な各カスタマイズファイルについて、source、Source-relative path、file type、認識ツール、source text、関連する宣言済みmetadata、既知のrelationshipを表示しなければならない（MUST）。Presentation上のsupported customization file typeは、exactな`(tool, kind)` recognitionと、そのadmit済みsource formの組み合わせとする。維持管理するsupported-customization文書は、closedな`(tool, kind)` presentation allowlistと各rowの適用対象となるsupported source formを列挙しなければならない（MUST）。Entryは、fieldまたはrelationship kindがそのrowに記載され、かつadmit済みsource formのexact extractorがauthored occurrenceを認識する場合だけeligibleとする。1つのsource formについてfieldを列挙しても、別source formでそのfieldをpromoteまたはinferしてはならない（MUST NOT）。Initial releaseは未列挙のmetadataまたはrelationshipを推論してはならない（MUST NOT）。
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
- **FR-022**: カスタマイズファイルの発見と表示によって、outbound network request、dynamic code evaluation、またはcustomization content由来のchild-process実行を引き起こしてはならない（MUST NOT）。Initial releaseで許可するproduct起動のchild processは、FR-001に基づきstartup時に使用する固定のOS browser起動helperだけとする。このhelperはargumentまたはenvironmentとしてinspection由来のcontentやpathを受け取ってはならない（MUST NOT）。実装は、closed setのambient platform keyだけをlaunch environmentから直接渡してよい（MAY）。Ambient valueがSource rootとlexicalに同一でも、その値のprovenanceは変わらない。HelperはSource root、preview root、candidate path、file path、authored valueをargumentまたはenvironmentへcopyし、その値からauthorityを与え、environmentで指定されたhandlerを選択し、user-supplied commandを受け入れてはならない（MUST NOT）。自動起動を無効にした場合、非対応の場合、または失敗した場合もinspectionを利用可能にしなければならない（MUST）。Customization fileのdiscovery、read、parse、display、comparison、relationship処理はchild processを開始してはならない（MUST NOT）。調査対象sourceのreadは、内部でadmitしたentryから中央集約したNode.js source-boundary moduleだけが開始しなければならない（MUST）。Clientから与えられたpath、および適用対象のlexical、canonical、link、regular-file、またはsource-boundary checkに失敗した参照先ファイルをread authorityとして受理してはならない（MUST NOT）。
- **FR-023**: 調査対象sourceに対し、productが制御するmutation requestを一切発行してはならない（MUST NOT）。Product起因mutationには、write、truncate、create、rename、delete、link、modeまたはownershipの変更、file time、extended attribute、ACLの設定、またはmutation可能なflagでのopenを要求することを含む。Inspectorはaccess-time更新を要求してはならない（MUST NOT）。Readだけを契機にOSが行うaccess-time変更はproduct control外であり、product起因mutationとして数えたりInspectorがsourceを変更した証拠に使ったりせず、別に記録しなければならない（MUST）。
- **FR-024**: Node.js公開APIが示すsymbolic link、alias、import、参照pathをsource boundary外のカスタマイズcontentとして受理または表示してはならない（MUST NOT）。Cycle、boundary crossing、利用不能または曖昧なverification metadataは、実行可能なdiagnosticを伴って安全に失敗しなければならない（MUST）。中央集約したNode.js source-boundary moduleは、Node.jsが公開しplatformがenforceする場合、`O_NOFOLLOW`をfinal-componentの多層防御として使用しなければならない（MUST）。Enumeration時、`open`前、`open`後かつread前、same-handle read後のcandidate verificationでは、最初にpath `lstat`でlinkまたは不正なidentity/typeを拒否し、次にcandidate `realpath`とcanonical containmentを評価し、その後path `lstat`を繰り返してcanonicalization前後のidentity一致を要求しなければならない（MUST）。適用対象phaseではroot identity、利用可能な全ancestor identity、open-handle identityとmetadataも比較しなければならない（MUST）。検出した変更または検証不能な必須checkは、候補byteを破棄し、そのread結果をpublishまたはcommitしてはならない（MUST NOT）。
- **FR-025**: Inspectorは、読み取り可能なカスタマイズファイルのsource textを、credential検出、contentベースのmasking、redaction、reveal手順なしで表示しなければならない（MUST）。表示対象の宣言済みmetadata値とcomparison contentは、credential間の差を含む差分を確認できるよう、記述されたリテラル値を維持しなければならない（MUST）。完了したsame-handle readから得た検証済みbyteだけをdecodeしてよい（MAY）。NUL byteが1つでもあればitemを`binary`に分類しなければならず（MUST）、それ以外はerrorをfatalとするstrict UTF-8でdecodeしなければならない（MUST）。先頭UTF-8 BOMが1つあれば`utf-8-bom`として記録し、`sourceText`から除去しなければならない（MUST）。不正なUTF-8は`unsupported`とする。Binaryおよびunsupported itemはdiagnostic-onlyのままとし、source textを公開せず、comparison対象にしてはならない（MUST NOT）。Replacement characterへの置換、別encodingの試行、contentのsamplingまたはtruncation、製品固有のbyte、line、item上限の導入を行ってはならない（MUST NOT）。
- **FR-026**: 調査対象content内の環境変数参照はリテラルtextのままとし、Inspectorが参照先のprocess environment値を読み取り、解決、置換する契機にしてはならない（MUST NOT）。この制限は、FR-015からFR-017が明示的に文書化したtool-home環境変数をGlobal source rootの特定だけに使用することを妨げない。
- **FR-027**: ユーザーがsourceまたはcomparison contentを開く前に、Inspectorは記述された完全なcontentを表示し、機密値を含み得ることを明確に説明しなければならない（MUST）。Bundled browserはacknowledgementをmemory内だけに保持し、新しく読み込んだbrowser documentとclient-data purgeのたびにresetし、acknowledgement前に完全なsourceまたはcomparison contentをrequestもrenderもしてはならない（MUST NOT）。このpresentation acknowledgementはAPI authorization factorではなく、capability認証済みloopback session APIがaccess-control boundaryのままである。初期リリースはcredential maskingまたはreveal workflowを提供してはならない（MUST NOT）。
- **FR-028**: 完全なtraversal後、調査対象パス一覧に一致する1つのファイルについて決定的かつentry-localでcapacityに起因しないreadまたはparse failureが発生しても、contracted-partial outcomeを通じた完全な非影響fileの発見や表示を妨げてはならない（MUST NOT）。影響を受けるitemには、ユーザーが問題を解決できるだけのSource-relative pathとsourceの文脈を残さなければならない（MUST）。決定的かつcapacityに起因しないread failure、binary classification、unsupported encodingでは、影響itemをsourceもcomparison eligibilityもないdiagnostic-onlyのままにしなければならない（MUST）。Strict decodingの成功後に、決定的かつcapacityに起因しないparser、Worker、またはrecognition extractionが失敗した場合、完全で読み取り可能なsourceとcomparison eligibilityを維持し、影響を受けるrecognitionとそのderived metadataまたはrelationshipだけをatomicに失敗させなければならない（MUST）。Capacityまたは環境resource failureには代わりにFR-029を適用し、そのattemptのitemもgenerationも公開してはならない（MUST NOT）。
- **FR-029**: Inspectorはfile size、fileまたはitem件数、parser構造、requestまたはresponse size、work queue、scan duration、filesystem operation、open handle、coordinator capacityについて製品固有の数値validation limitを定義してはならない（MUST NOT）。利用可能な容量はNode.js、選択したparser、OS、filesystem、browser、実行環境から継承しなければならない（MUST）。回復可能なcapacityまたは環境resource failureはlifecycle/operational stateとして安全に報告し、customization artifactをvalidまたはinvalidに分類せず、そのattemptからitem、Source、recognitionまたはderived result、scan-result recordまたはresponse body、generationをcommitしてはならない（MUST NOT）。最後のcommit済みsnapshotだけを利用可能に保ち、失敗したattemptが明示的rescanならstaleとして表示しなければならない（MUST）。Disable、shutdown、supersession、failureによってrequestがpublication authorityを失った後にworkが完了した場合、遅延resultをすべて破棄しなければならない（MUST）。回復不能なengineまたはOS終了は環境上のlimitationであり、製品保証として表現してはならない（MUST NOT）。
- **FR-030**: ユーザーはactive sourceを明示的に再scanできなければならない（MUST）。Admission済みscan commandには不透明な`scanRequestId`を割り当て、queued、active、complete、partial、failedの全statusがそのrequestを識別し、正常なgenerationがcommit元requestを記録しなければならない（MUST）。以前のstatus、snapshot、generationが新しいrequestの完了条件を満たしてはならない（MUST NOT）。Publicな`partial`は「ClosedなScan Publication Outcome」tableの`contracted-partial`だけを意味し、他の不完全stateを公開してはならない（MUST NOT）。Scan resultは1つのgeneration snapshotとしてatomicにcommitしなければならない（MUST）。正常なcompleteまたはcontracted-partial commitは以前のsnapshotを置換しなければならない（MUST）。再scanがcommit前に致命的に失敗した場合、Inspectorは部分結果を含むそのscanの未commit結果をすべて破棄し、最後に正常commitされたsnapshotを保持して再scan失敗によりstaleであることを示し、実行可能なfailure diagnosticを表示しなければならない（MUST）。Repository Sourceを再scanしないinitialまたはretryのGlobal Source正常commitはすべて、そのSourceのstableな`sourceId`を維持し、semantic inventoryとauthored source contentを変更せずに引き継ぎ（MUST）、session generationを進め（MUST）、すべてのgeneration-owned graph IDを再keyし（MUST）、以前のgenerationに属するすべての`FileDetail`、comparison selection/view、editor-model stateを無効化しなければならず（MUST）、stale responseから復元してはならない（MUST NOT）。すべてのGlobal candidateがrejectされたattemptはGlobal Source commitを生成してはならず（MUST NOT）、したがってこのruleによってgenerationを進めてはならない（MUST NOT）。
- **FR-031**: 調査結果は既定でsession内に限定し、初期リリースではprofile、cache、repository fileとして永続化してはならない（MUST NOT）。
- **FR-032**: Inventory、detail、comparison、Global control、diagnostic、Source Condition Fact、API response、CLI output、documentationの全surfaceで、初期リリースはvalidator、linter、natural-language semantic analyzerまたはranker、synchronizer、converter、formatter、auto-fixer、policy engine、remediation adviserとして動作してはならない（MUST NOT）。構文だけのparsing、記述されたliteral occurrenceの正確な抽出、機械的なtyped decoding、確定済みdocumented field/ruleに対する分類、文書化済みorder、scope、condition、selection、reference relationshipの投影だけを行ってよい（MAY）。これらの操作は、確定済みcatalogを超える正しさ、有効性、compliance、quality、supportを判定または示唆してはならず（MUST NOT）、parse diagnosticはvalidation findingではなくdescriptive failureのままにしなければならない（MUST）。
- **FR-033**: カスタマイズファイルのsource textと宣言済みmetadataは不活性なtextまたはdataとして表示しなければならない（MUST）。埋め込まれたmarkup、image、link、URI handler、control sequence、その他のcontentを、カスタマイズファイルの表示だけで実行、load、navigateしてはならない（MUST NOT）。
- **FR-034**: `AGENTS.md`というfilenameだけを理由にClaude Code recognitionを付与したり、`.claude/hooks`内の参照されていないscriptをhookと推測したり、単独の`.claude/prompts` directoryをサポート対象Claude Codeカスタマイズファイル種別として扱ったりしてはならない（MUST NOT）。
- **FR-035**: Codex instructionについて、各directoryで空でないinstruction fileを最大1つ選ぶ文書化されたrule、すなわち該当するoverrideを最初に選び、それ以外は通常fileと設定済みfallback nameから選ぶrule、およびGlobalからrepositoryを経由してruntime working directoryへ向かう広いscopeから狭いscopeへのorderを表さなければならない（MUST）。Working directoryまたはconfigurationが不明な場合、そのchainはconditionalのままにしなければならない（MUST）。
- **FR-036**: Claude instructionについて、文書化された広いscopeから狭いscopeへのorder、同じlevelではlocal instructionが通常instructionに続くこと、およびruntime working directoryが不明な場合はworking directoryより下のinstruction fileがconditionalであることを表さなければならない（MUST）。
- **FR-037**: 複数のCopilot instruction sourceが同時に適用され得る場合、またはprecedenceがproduct surfaceによって変わる場合、各recognitionを維持し、一般的なsemantic上の勝者を作り出してはならない（MUST NOT）。
- **FR-038**: 初期リリースの実装とpackageに含む実行可能なapplication codeは、すべてJavaScript/TypeScriptでなければならない（MUST）。CLI、local host、調査対象sourceのfilesystem layerはNode.jsの公開JavaScript API上で動作し、browser logicはJavaScript/TypeScript sourceから生成しなければならない（MUST）。Declarativeな生成済みHTML/CSS、strict JSON manifest、documentation、license fileはpackageへ含めてよい（MAY）。ProductにRust code、Node-APIその他のnative addon、prebuilt native binary、package lifecycleでのcompile、package lifecycleまたはruntimeでのartifact downloadを含めてはならない（MUST NOT）。
- **FR-039**: Inspectorは、originating customization fileを持たない、保守対象の文書化済みnon-file behaviorと、excluded、hosted、runtime inputを、関連するSourceに紐づくevidence付きSource Condition Factとして表さなければならない（MUST）。各factはtool、product surface、文書化済みconditionまたはavailability state、affected scope、不確実性、stable evidenceを特定しなければならない（MUST）。Customization FileおよびTool Recognitionと分離し、file identity、Source-relative path、authored source text、comparison eligibility、relationship origin、read authority、local/hosted read、network requestを作成してはならない（MUST NOT）。Inspectorが観測しない現在のstateは推論せず、conditionalまたはunavailableのままにしなければならない（MUST）。
- **FR-040**: Operational logとtelemetryのevent recordには、stableな固定codeと不透明なsession、source、file、scan-request、operation IDだけを含めなければならない（MUST）。調査対象contentまたはmetadata、authored/displayed value、source-relativeまたはabsolute path、root、filename、capability、requestまたはresponse body、生のparser、exception、system errorを含めてはならない（MUST NOT）。固定CLI help/version text、必須のlaunch-URL presentation line 1行、固定された実行可能なstartup warningはoperational event recordではなくpresentation outputとするが、調査対象content、調査対象path、authored valueを含めてはならない（MUST NOT）。認証済みsession diagnosticはfile固有の問題を解決するために必要最小限のsource-relative pathとmetadataだけを表示してよい（MAY）。それらのfieldをoperational logまたはtelemetryへ複製してはならない（MUST NOT）。

### 初期リリースでサポートするカスタマイズファイル

計画phaseでは、実装前にこれらのカスタマイズファイル種別と調査対象パスをその時点の公式仕様と照合し、正確な調査対象パス一覧を確定しなければならない（MUST）。再確認によって曖昧なfilename patternを狭めてよいが、仕様変更なしに別productを追加したり、Global sourceをFR-015からFR-018より広げたりしてはならない（MUST NOT）。

| ツール | Repositoryの調査対象パスとカスタマイズファイル種別 | 明示的な対象外またはconditionalな動作 |
|---|---|---|
| GitHub Copilot | Repository全体およびpath-specific instruction、認識対象`AGENTS.md`、rootの`CLAUDE.md`と`GEMINI.md`、custom agent、`.github/skills`、`.agents/skills`、`.claude/skills`配下のskill、promptとCopilot CLI互換command、hook宣言、MCP宣言、サポート対象settingsとplugin metadata | Surfaceに依存するsupportと文書化されていないprecedenceはconditionalとして表示する。Hosted personalまたはorganization configuration、`COPILOT_CUSTOM_INSTRUCTIONS_DIRS`または`COPILOT_SKILLS_DIRS`で指定する追加directoryは初期リリース対象外。Local originを持たない文書化済みCloud/runtime behaviorはread authorityを持たないSource Condition Factとしてだけ表示でき、hosted stateとconfigurationは調査しない |
| Claude Code | `CLAUDE.md`、`.claude/CLAUDE.md`、`CLAUDE.local.md`、nested instruction file、`.claude/rules`、skill、legacy command、subagent、project/local settings、宣言済みhook、root MCP configuration、output style、marketplace catalog、plugin manifest | Importはrelationshipとしてのみ扱う。`AGENTS.md`をfilenameだけでは認識しない。参照されていないscriptをhookと推測しない。単独の`.claude/prompts` directory、managed settings、managed instructions、無関係なuser stateはRepository source対象外 |
| OpenAI Codex | `AGENTS.md`と`AGENTS.override.md`、`.agents/skills`、custom agent定義、project configuration、hook宣言、MCP宣言、rule、pluginとmarketplace metadata | Project trustまたはworking directoryに依存する実効設定はconditional。非推奨のuser custom promptとuser-level skillはRepository source対象外 |

### 主要Entity

- **Inspection Session**: 正確に1つのRepository source、0から3つのtool別Global source、現在のscan result、source condition fact、comparison selection、diagnosticを含む一時的なユーザー活動。
- **Scan Request**: 不透明な`scanRequestId`で識別する、1つのadmission済みinitial scanまたは明示的rescan。以前のsnapshotまたはstatusが新しいrequestを満たさないよう、そのstatusと正常commitしたgenerationをrequestに対応付けたままにする。
- **Source**: 種別（`Repository`または`Global`）、正確に1つのroot location、enabled state、scan status、0件以上のSource Condition Factを持つ、明示的なfilesystem trust boundary。Global sourceはさらに正確に1つのサポート対象toolで識別し、そのroot内にある異なる種別のカスタマイズファイルは別々のinventory itemとして扱う。
- **Source-relative Path**: カスタマイズファイルを所有するSourceの1つのrootを基準にした表示・絞り込み用path。Repository Sourceの場合に限り起動時`cwd`からのrepository-relative pathとなり、Global Sourceではtool homeからの相対pathとなる。
- **カスタマイズファイル**: Source-relative pathと安全なfile identityで識別され、readableまたはdiagnostic stateとcontentベースのmaskingを行わない完全なsource textを持つ、source内で発見された1つの物理ファイル。
- **Tool Recognition**: カスタマイズファイルに付与するtool-specific interpretation。Tool、file type、文書化されたscopeまたはorder、宣言済みmetadata、不確実性を含む。
- **Relationship**: カスタマイズファイルから別pathまたは宣言済みcomponentへの、実行されない参照。Import contentを展開せず、boundaryとresolution statusを含む。
- **Source Condition Fact**: Originating customization fileを持たない、文書化済みnon-file behaviorまたはexcluded、hosted、runtime inputについての、evidence付きsource-scoped statement。関連toolとsurface、conditionまたはavailability、affected scope、不確実性、evidenceを特定するが、file identity、Source-relative Path、authored source text、comparison eligibility、Relationship origin、read authorityを持たない。Localまたはhosted I/Oを発生させず、未観測の現在stateはconditionalまたはunavailableのままにする。
- **Diagnostic**: カスタマイズsource valueを複製せず、operational logへそのまま複製しない、認証済みsession内だけの情報であり、空結果、read/parse failure、不確実性、環境failure、stale file、cycle、boundary violationを実行可能に説明し、正確に1つのlocation scopeを持つ。File-scoped Diagnosticはcoherentな`sourceId`、`fileId`、`sourceRelativePath` tupleを必須とし（MUST）、fileは特定したSourceに属し、pathはそのSource内での当該fileのpathでなければならない（MUST）。Source-scoped Diagnosticは`sourceId`だけを必須とし（MUST）、`fileId`と`sourceRelativePath`を禁止しなければならない（MUST）。Session-scoped Diagnosticは`sourceId`、`fileId`、`sourceRelativePath`をすべて禁止しなければならない（MUST）。このlocation scopeは、Diagnosticがcommit済みgenerationまたはsession lifecycleのどちらに属するかとは独立する。

## 品質要件 *(必須)*

### 保守性とコードの明確さ

- **QR-001**: 調査対象パスの定義、source boundary、recognition、precedence ruleは、無関係なtoolを変更せずに1つのtoolを更新できる凝集したownershipと明示的なinvariantを持たなければならない（MUST）。自明でないsecurityまたはcompatibility判断には理由を文書化し、抽象化は実際に共通することが示された振る舞いだけに限定しなければならない（MUST）。

### テストと検証

- **QR-002**: 自動検証は、各toolの調査対象パス一覧に含まれるpathと含まれないpath、multi-tool recognition、source separation、決定的なorderとfallback、すべてのuncertainty state、comparison、opt-inとdisable flow、不正および変化するfile、encoding、回復可能な環境/runtime failure、symbolic link、cycle、traversal attempt、rootとcandidateの差し替えfixture、identityとmetadataの変化、検出済みrace後の結果破棄、最後にcommitされたsnapshotへの致命的な再scanのrollback、リテラルcredentialの正確な表示、環境変数参照の非解決、ならびに実行、source mutation、MCP connection、カスタマイズファイル起因network accessがゼロであることを示すregression testを扱わなければならない（MUST）。さらにSC-002のreference profileとfixture digestのvalidation、現在のrequestに対する客観的なqualifying-status assertion、origin-file-less Source Condition Factについて正しいsource、tool、surface、status、evidenceを保ったfile分離とsynthetic fileゼロ・local/hosted I/Oゼロを検証しなければならない（MUST）。すべてのerror caseには客観的な期待結果が必要であり、end-to-end browser testは4つのuser storyすべてを扱わなければならない（MUST）。Diagnosticの検証はclosedなfile、source、session scope unionを扱わなければならない（MUST）。File scopeはcoherentな`sourceId`/`fileId`/`sourceRelativePath` tupleを必須とし、source scopeは`sourceId`だけを必須として`fileId`/`sourceRelativePath`を禁止し、session scopeは3つすべてを禁止する。これらのDiagnostic entity invariantに違反する、欠落、余分、Source間で不整合、または捏造されたlocation tupleをすべて拒否しなければならず（MUST）、commit済みgenerationとsession-lifecycleのどちらに属するかは直交するlifetime上の問題として扱わなければならない（MUST）。Supported-OS matrixは、stableかつ検出可能なunsafe objectの必須rejection、Node.jsが必要metadataまたはcanonicalizationを利用不能もしくは曖昧と報告した場合の`safe-fs-boundary-unverifiable`によるrejection、public Node.js APIが公開しないOS機能への明示的な`platform-unobservable` recordを区別しなければならない（MUST）。最後のcategoryをcontainmentの証明へ数えてはならない（MUST NOT）。これらのtestは、文書化したNode.js checkを検証しなければならず（MUST）、観測できない敵対的なpath-component replacement raceに対する証明と説明してはならない（MUST NOT）。
  検証はproductのfilesystem requestを計測してmutation可能なoperationが0件であること、および観測可能なcontent、length、identity、link state、mode、modification/change time、extended attributeまたはACLが変化しないことを示し、OSだけによるaccess-time変更を別に記録しなければならない（MUST）。製品がfile size、item件数、parser構造、request/response size、queue、時間、concurrencyのvalidation上限を定義しないこと、supported engineまたは環境が報告する回復可能なcapacity failureを安全に処理すること、適用時にpublication authorityを取り消すこと、遅延resultをsnapshotへ取り込まないことを検証しなければならない（MUST）。Operational-log testは、禁止するpath、調査対象value、metadata、capability、body、生errorの全fieldを拒否し、認証済みdiagnosticには許可された最小限のfieldだけを残さなければならない（MUST）。Cross-surface negative contract/browser/CLI-output/documentation testは、Inventory、Detail、Comparison、Global control、Diagnostic、Source Condition Fact、API response、CLI output、documentationがvalidationまたはlint、natural-languageの意味解釈またはrank付け、正しさ・有効性・compliance・qualityの判定、contentのsynchronization、conversion、formatting、fixing、policy engineとしての動作、remediation adviceを行わないことを示さなければならない（MUST）。SC-002検証は、自動の初回Repository scan終了を待ち、明示的Repository rescanを1回送信し、qualifying statusとtimerを止める表示済みinventoryのgenerationで同じ`scanRequestId`を要求しなければならない（MUST）。

### セキュリティとプライバシー

- **QR-003**: Viewing sessionは既定で起動元machineからのみ到達可能でなければならない（MUST）。最小権限のfilesystem access、1つに集約したNode.js調査対象I/O boundary、lexicalとcanonicalのcontainment check、linkと非regular-fileの拒否、公開かつ有効な場合の`O_NOFOLLOW`、enumerationからopenまでのidentity check、root/ancestor/candidate/open-handleのread後再検証、製品固有の数値validation limitを持たない環境由来のresource容量、すべての検出済み、報告済み検証不能、revoked、または遅延file operationに対する結果破棄を使用しなければならない（MUST）。完全なauthored contentはcapability認証済みloopback session APIだけから意図的に返してよく（MAY）、bundled browserではmemory内のacknowledgement後だけ表示してよい（MAY）。Contentは不活性かつsession内だけに保ち、永続化、別machineまたはremote serviceへの送信、logまたはtelemetryへの複製をしてはならない（MUST NOT）。Operational logとtelemetryはFR-040で定義するpath/content-freeでなければならず（MUST）、認証済みdiagnosticは実行可能な最小限のlocation fieldだけを持ってよい（MAY）。Node.jsの公開APIはcross-platformなdirectory-handle-relative openを提供せず、pending filesystem promiseをすべて強制cancelできず、same-device mountまたはreparse behaviorをすべて公開しないため、productはsource rootまたはancestor、あるいは非対応final path componentを同時に差し替える敵対的なlocal processに対するkernel強制containment、stallしたkernel I/Oの物理的cancel保証、Node.jsが観測できないOS indirectionの可視性を提供しないことを文書化しなければならない（MUST）。将来の解消には、適切なNode.js公開APIまたはoperating systemが強制するread-only boundaryを必要とする。

### ドキュメントと参加しやすさ

- **QR-004**: 英語・日本語のユーザー文書とContributor文書は意味的に同等であり、launchとsetup、`cwd`から決まるRepository root、正確な調査対象パス一覧、source boundaryとGlobal consent、conditional interpretation、完全なsource表示と機密値に関する警告、環境変数参照を解決しないこと、環境由来のresource behavior、diagnostic、対象外動作を説明しなければならない（MUST）。主要なdiscovery、inspection、comparison、consent workflowはkeyboardで操作でき、意味のあるlabelとfocus stateを提供し、ローカルbrowser interfaceに適用されるWCAG 2.2 AA基準を満たさなければならない（MUST）。Maintainerは、WCAG 2.2のLevel AおよびAA success criterionをすべて列挙する、意味的に同等な英語・日本語のWCAG 2.2 AA applicability/acceptance matrixを維持しなければならない（MUST）。各criterion rowはapplicableかどうかを示し、非適用のrowはcriterion固有の理由を示さなければならない（MUST）。Applicableな各rowは、必要なautomated check、manual checkまたはその両方をstable IDで名称付きにし、expected resultと記録済みevidenceを示さなければならない（MUST）。Matrixはpacked release candidate、両locale、正確にfreezeしたplatform/browser/assistive-technology version、viewport/orientation/zoom/text-spacing profile、UI mode、workflow state、input profileを使うclosed manual execution matrixを定義し、applicableなmanual cellをすべて記録しなければならない（MUST）。Frozen releaseまたはmatrixを変更した場合は全manual checkを再実行しなければならない（MUST）。Error messageは問題と実用的な次の手順の両方を示さなければならない（MUST）。
- **QR-005**: 保守するすべてのvendor behavior、Inspector rule、runtime-composition strategyは、canonicalな第一者documentation URL、正確なreview済みsection、review dateへ解決する1つ以上のstable source IDを参照しなければならない（MUST）。Vendor lookup behavior、Inspector matcher、runtime compositionはownershipを分離し、各製品は独自のbehavior文書を持ち、Repository behaviorとUser/Global behaviorは別表を使用し、GitHub CopilotのVS Code、CLI、Cloud behaviorは別表を使用しなければならない（MUST）。すべてのRepository matcherはBase、Relative selector、Expansionを独立して示し、正確なlaunch-root boundaryを`./`で表記し、bare `**/` prefixを拒否しなければならない（MUST）。自動documentation checkは、英日parity、identifier uniqueness、相互参照、controlled official-source driftを検証し、behavior、rule、strategyを自動変更してはならない（MUST NOT）。

## 成功基準 *(必須)*

### 測定可能な成果

**初回利用者評価のガバナンス**

20人による評価はinitial-release candidateについて1回実施する。自動checkとprojectに詳しいcontributorだけでは、project contextを持たない初回利用者が発見と正しい解釈を行えることを確認できないためである。固定denominatorは観測した19/20と18/20のthresholdを明示するためのものであり、population-levelの統計的主張ではない。重複recruitmentを避けるため、SC-001とSC-006では同じcohortとsessionを再利用しなければならない（MUST）。

このrelease evidenceはmaintainer teamが担当する。Pull requestごとの義務ではなく、通常のcontributorへ参加者のrecruit、費用負担、moderation、reviewを求めてはならない（MUST NOT）。Enrollment前にmaintainerは、accountable study owner、recruitmentとparticipant-compensationのfunding owner、moderatorとreviewer、scheduleとcontact/support path、consent/privacyと匿名化retention procedure、提供するtest repositoryとequipment/session support、合理的なaccessibility accommodationを示すbilingual study planを公開しなければならない（MUST）。Participantにpersonal repository、paid product、personal expenditureを要求してはならない（MUST NOT）。Study resourceが不足する場合はinitial-release claimをblockするが、それ以外は適合するcontributionのreviewをblockしない。Primary workflow、提供guidance、evaluation fixture、scoring rubricのいずれかにmaterial changeがあった場合に限り、studyを再実施しなければならない（MUST）。

- **SC-001**: 通常の開発作業でGitとcommand-line interfaceを使用しているがInspectorを利用したことも開発へ参加したこともない初回利用者を正確に20人とする評価で、19人以上が提供されたproduct guidanceだけを使い、2分以内に意図するrepository rootへ移動し、その場所でInspectorを起動して、発見されたカスタマイズファイルを1つ開ける。2分timerは標準化された課題文を提示した時点で開始し（MUST）、発見されたカスタマイズファイル1つのsource/details viewが画面に開かれて操作可能になった時点で終了しなければならない（MUST）。したがって、計測時間には意図するrepository rootへの移動とInspectorの起動を含む。同じevaluation sessionでSC-006にも同じparticipant cohortを使用し（MUST）、SC-001を先に実施しなければならない（MUST）。Moderatorは標準化された課題文を同じ文面で読み直してよいが（MAY）、いずれの基準でもcommand、navigation、interface操作のヒントを提供してはならない（MUST NOT）。参加者を20人のcohortへ登録した後は、基準の実施を妨げる、または中断する機材、環境、productのfailureを、そのtask timerの開始前に発生した場合も含めて当該基準の不成功として数えなければならず（MUST）、参加者を除外または差し替えてはならない（MUST NOT）。
- **SC-002**: Filesystem entryが100,000件、該当するカスタマイズファイルが500件あるリポジトリについて、version付きで公開したSC-002 reference-environment profile上で、10秒以内に完全な一覧を受け取り、1秒以内に現在のrequestに対するqualifying scan statusを確認できる。このworkloadに一致するdeterministicなfixtureを測定前に1つ用意し（MUST）、内容を変更せず10回の測定runすべてで再利用しなければならない（MUST）。Fixtureの構築とsetupは計測時間に含めてはならない（MUST NOT）。各runは、その新しいprocessの自動初回Repository scanがterminal stateになるまで待ち、その後browserから正確に1回の明示的Repository rescanを送信しなければならない（MUST）。両方のtimerはBrowserがそのrescan requestをdispatchした時点で開始しなければならない（MUST）。Admission responseは不透明な`scanRequestId`を返さなければならない（MUST）。1秒timerは、Clarificationsで定義したqualifying statusが画面に表示されassistive technologyにも公開され、同じrequestを識別した時点だけで終了しなければならない（MUST）。10秒timerは、同じrequestがcommitしたgenerationの完全なinventoryが表示され主要な一覧操作が可能になった時点だけで終了し、それ以前のstatus、snapshot、自動scan generationがいずれかの停止条件を満たしてはならない（MUST NOT）。各runでそのrequest-correlatedな完全inventoryが操作可能になった後、標準化されたfilter actionとitem-selection actionを1回ずつ実施しなければならない（MUST）。各interaction timerはBrowserが対応するinputをdispatchした時点で開始し、filtered resultまたはselected-state feedbackが表示され操作可能になった時点で終了しなければならない（MUST）。`npx`のdownload、installation、process起動時間、自動初回scanはこれらのtimerに含めてはならない（MUST NOT）。1つのmeasurement setは同じprofileで正確に10回測定して構成し（MUST）、9回以上が2つのscan時間基準をrunごとに満たし、かつ標準化された両interactionを100ミリ秒未満に保たなければならない（MUST）。各測定runは以前のprocess終了後に新しいInspector processを起動し（MUST）、別runのapplication memory stateまたは以前のscan snapshotを再利用してはならない（MUST NOT）。Operating systemのfilesystem cacheはrun間で意図的にclearまたはresetしてはならず（MUST NOT）、10回のrunは自然に変化するcache stateを使用しなければならない（MUST）。Measurement recordはprofile ID、fixture digest、request ID、commit済みgeneration、実際のenvironment valueを記載しなければならない（MUST）。Profileを変更すると新しい直接比較不能なmeasurement setを開始する。この結果は公開したprofile固有であり、別環境へ適用できる性能保証ではない。
- **SC-003**: Conformance fixture集合において、調査対象パス一覧に含まれるサポート対象カスタマイズファイルの認識率100%、一覧外のファイルを解釈する件数0、共有物理ファイルに対するmulti-tool attributionの正解率100%を達成する。
- **SC-004**: 文書化したNode.js-only threat model内で維持するsafety suite全体において、カスタマイズファイル由来のcommandまたはcode execution、child process、MCP connection、outbound request、product起因の調査対象source mutationがすべて0件である。有効なsource boundary外として拒否されたselectorに対する意図的なread requestが0件であり、read中にlink、identity、canonical location、または関連metadataが検出可能な形で変化するすべてのfixtureで、publishまたはcommitされるbyteが0である。Mutation assertionはproductのfilesystem operationを計測し、platformが公開する範囲でcontent、length、identity、link state、mode、modification/change time、extended attributeまたはACLが変化しないことを観測しなければならない（MUST）。OSのread semanticsだけに起因するaccess-time変更は別に記録し、このcriterionをfailureにせず、product起因mutationの証拠にもしてはならない（MUST NOT）。
- **SC-005**: 維持管理するexact-display fixtureの100%で、リテラルcredential値と環境変数参照textがsource viewとcomparison viewにmaskされず変更なしで表示され、参照先のprocess environment値が表示contentへ混入せず、maskまたはreveal controlも表示されない。
- **SC-006**: SC-001を実施した後、同じevaluation sessionの同じ初回利用者20人がSC-006を実施する。SC-001の結果にかかわらず、全参加者は同じ指定カスタマイズファイルが開かれた同一の準備済みInspector stateからSC-006を開始しなければならない（MUST）。2分timerは、そのstateの準備が完了し、標準化された課題文を提示した時点で開始しなければならない（MUST）。各参加者は、カスタマイズファイルのsource、認識ツール、file type、実効動作がcertainかconditionalかの必須回答欄を持つ標準化されたresponse formへ回答を記録しなければならない（MUST）。2分以内に4項目すべてを提出し、指定ファイルについて事前定義したground truthと全項目が一致した場合を成功とし、未回答または誤答が1項目でもあれば不成功として数えなければならない（MUST）。18人以上が、提供されたproduct guidanceとSC-001で定義したmoderator policyだけを使って成功しなければならない（MUST）。時間計測した回答を提出した後、20人全員が同じヒント禁止のmoderator policyの下で、標準化されたcomparisonとGlobal consentの課題をそれぞれ実施しなければならない（MUST）。これらの課題とSC-001のdiscovery観察および時間計測するSC-006のinspection観察を合わせ、4つのprimary workflowすべてを対象としなければならない（MUST）。登録した全参加者と機材、環境、productの全outcomeを除外や差し替えなしで記録しなければならない（MUST）。Moderatorは4つの客観的workflow-completion outcomeと事前定義済みsafety-event fieldを記録しなければならない（MUST）。意図しない実行、調査対象sourceの変更、MCP・network接続、別machineへの調査content露出は自動的にcriticalとする。自動的なsafety triggerではない、product起因と疑われるworkflow blockerだけを固定rubricに対して2人が独立分類しなければならず（MUST）、不一致は安全側に倒してconfirmed critical issueとして数え、第3の裁定者は設けない。Critical issueゼロのgateは、20人全員が4つのprimary workflowすべてを実施し、自動判定またはreviewer確認済みのcritical issueが1件もない場合に限り合格しなければならない（MUST）。Safety以外では、禁止された支援なしでworkflowを完了できなくする問題をcriticalとする。
- **SC-007**: 維持管理するread不能、不正、環境resource failure、cycle、stale、boundary-crossing、fatal-rescan fixtureの100%で、許可されたcomplete/contracted-partial commit、または環境resourceその他のfatal attemptでは最後に正常commitされたsnapshotだけを通じて、影響を受けないカスタマイズファイルを引き続き利用できる。すべてのcaseでカスタマイズsource valueを複製しない実行可能なdiagnosticを示す。環境resourceその他のfatal conditionで失敗した明示rescanはnew resultもpartial resultも0件publishし、最後に正常commitされたsnapshotをstale表示付きで残す。自動の初回Repository failureまたは初回Global enable failureはstale overlayを作らず、既存のsnapshot stateがあればそのまま保つ。
- **SC-008**: 4つのprimary workflowすべてをkeyboardだけで完了できる。維持管理するbilingual WCAG 2.2 AA matrixでは、local browser interfaceにapplicableとしたLevel AおよびAA success criterionの0件ではない件数をdenominatorとする。Non-applicable criterionは、そのrowに必要なcriterion固有の理由がある場合だけdenominatorから除外する。Applicable criterionは、そのrowで必須としたstable-ID automated/manual checkのすべてに記録済みresultがあり、closed manual execution matrixのapplicableな全cellで合格した場合だけ合格とする。Criterion row、必要な理由、check ID/mapping、manual cell、frozen environment value、evidence、resultのいずれかが欠ければgateを不合格とする。SC-008はapplicable criterionのfailureが0件で、英語・日本語matrixが意味的に同等な場合だけ合格とし、defectのseverityによってこの合否ruleを変更しない。
- **SC-009**: 維持管理するorigin-file-less Source Condition Fact fixtureの100%で、各factを正しいSource、tool、product surfaceの下にexpected documented conditionまたはunavailable stateおよびevidenceとともに表示し、physical/synthetic file、file ID、Source-relative Path、authored source text、comparison target、relationship origin、local/hosted read、network requestを作成するfactを0件にする。

## 前提

- 初期リリースはローカルのsingle-user inspection sessionである。Remote hosting、collaboration、account、durable profileは対象外とする。
- 初期リリースの実行可能なapplication codeはすべてJavaScript/TypeScriptで実装する。Browserは生成済みclient logicとdeclarative assetを実行し、それ以外のproduct codeはすべてNode.js上で実行する。Strict manifest、documentation、license fileはnon-executable package dataのままとする。Contributorとuserは、Rust toolchain、native compiler、native addon、platform別prebuilt binary、またはpackage lifecycle/runtimeでのartifact downloadを必要としない。
- 調査対象のRepository rootとopt-in済みGlobal rootは、起動したuserが管理する通常のlocal pathである。通常の同時editは想定し、文書化したNode.js checkが変更を検出した場合、または必要なverification dataを利用不能と報告した場合はfail closedしなければならない。現行のNode.js公開APIはcross-platformな原子的directory-handle-relative openを公開しないため、check間でsource rootまたはancestor、あるいは有効な`O_NOFOLLOW`がないplatformのfinal path componentをraceさせる敵対的なlocal processは初期リリースのthreat modelから除外する。PlatformがNode.js経由で公開しないsame-device mountとreparse behaviorも残存limitationである。これらの制約は、検出可能または報告済み検証不能caseでlink、containment、identity、metadata、結果破棄、diagnosticの要件を緩和しない。
- Product起因source mutationは、OSのaccess-time policyではなく、mutation可能なfilesystem requestと観測可能なsource propertyによって測定する。Inspectorはaccess-time変更を要求しない。OSだけによるread-side access-time更新は別に記録し、product mutationの成立根拠にしない。
- `npx`起動時の`cwd`は調査boundaryであり、いずれかのcoding agentが使用する実効working directoryの証明ではない。Subdirectoryから起動した場合、Repository sourceはそのsubtreeに限定される。より広いscopeを調査するには、意図するrootからcommandを再実行する。
- 公式のカスタマイズ形式は変化し得る。正確な調査対象パス、filename、extensionは計画時に再確認して確定し、公開したうえでconformance fixtureによって検証する。
- Global調査はFR-015からFR-017のinstruction pathだけを対象とする。追加のuser-global skill、agent、settings、MCP定義、plugin、managed configuration、remote configurationには、別の同意と将来の仕様作業が必要である。この除外は、文書化済みhosted/runtime behaviorについて保守するread authorityを持たないSource Condition Factの表示を妨げない。そのfactはremote configurationを調査も公開もしない。
- Source text、表示対象の宣言済みmetadata値、comparison contentは、記述された差分を確認できるようcredential maskingなしで表示する。調査対象content内の環境変数参照はリテラルのままとし、解決しない。Productはreveal workflowを持たない。Capability authenticationをAPI access boundaryとし、bundled-browser warning acknowledgementは各document loadとclient-data purgeでresetするmemory内presentation invariantとする。Operational event recordには固定codeと不透明IDだけを含め、固定CLI help/version、1行のlaunch URL、固定startup warningはpresentation outputとする。認証済みsession diagnosticは別のproduct surfaceであり、実行可能な最小限のlocation fieldだけを持ってよい。
- Inspectorは、構文だけのparsing、正確なliteral抽出、機械的なtyped decoding、frozen catalogに対する分類、文書化済みstructural order、scope、condition、selection、reference relationshipの投影を行ってよい。Natural-languageの意味を解釈せず、正しさ、有効性、compliance、qualityを判定せず、contentをrank付けせず、remediationを助言しない。Parse diagnosticはvalidation resultではなくdescriptive failureである。
- File、collection、parser、transport、queue、時間、concurrencyの容量は、Node.js、parser、OS、filesystem、browser、実行環境から継承する。Inspectorは数値capacity上限を定義せず、環境capacity failureを使ってcustomization contentをvalidまたはinvalidに分類しない。
- Node.js公開APIのfilesystem promiseは強制cancelできない場合がある。Disable、shutdown、supersession、または回復可能なoperation failureではpublication authorityを取り消して遅延resultを破棄するが、productはkernel I/Oの物理的cancelを保証しない。
- 初期リリースで一度に比較できるのは2つのカスタマイズファイルに限定し、contentのmergeやeditは行わない。
- プロダクト文書とサポート対象一覧は公式vendor documentationを規範となる外部dependencyとして使用し、文書化されていない動作は明示的にuncertainなまま扱う。
