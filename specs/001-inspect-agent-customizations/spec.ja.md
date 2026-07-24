# 機能仕様: Agentカスタマイズの調査

[English](spec.md)

**Feature Branch**: `dev`

**Created**: 2026-07-15

**Status**: Ready for Implementation

**Input**: ユーザー説明: 「提供されたローカルのプロダクト説明からAgent Customization Inspectorの初期プロダクトを定義し、後で削除する一時的な入力へのリンクは残さない。」

## Clarifications

### Session 2026-07-15

- Q: Repository sourceのrootを何によって決定するか？ → A: 選択済みRepository rootとする。`--cwd`を省略した場合は1回の`process.cwd()` captureが返すexact process working directory、指定した場合はその1つの`--cwd`値を使用する。値がabsoluteならそのまま保持し、relativeならactive platformの`node:path.resolve`でcaptureに対してlexicalにresolveする。Root selection自体はfilesystem/network I/Oを0件とし、`package.json.bin`はbootstrap readなしでpackaged CLIへ直接mapする（superseded 2026-07-22: Windows pre-rejectionのリスト、shared `LexicalAbsoluteRootParts` parser、package-integrity bootstrapはadmission layerとdefensive checkの整理で削除された）。RejectされたselectionはInvocationの`cwd`、`--cwd`、Repository rootからderiveした、またはそれらを対象とするI/O、およびDNS、SMB、outbound-network callを0件とする。初期リリースでは別のrepository pickerもancestor rootの探索も行わない。
- Q: 最初のプロダクト範囲をどの用語で表すか？ → A: 仕様全体で「初期リリース」を使用する。
- Q: 発見したAgentカスタマイズ用ファイルを仕様で何と呼ぶか？ → A: 仕様全体で「カスタマイズファイル」を使用する。
- Q: 調査してよいfilesystem pathの限定集合を何と呼ぶか？ → A: 仕様全体で「調査対象パス一覧」を使用する。
- Q: Vendor lookup表とその根拠をどのように構成するか？ → A: Vendor lookup behaviorをInspector matcherおよびruntime compositionから分離し、製品ごとの文書、RepositoryとUser/Globalの別表、GitHub CopilotのVS Code/CLI/Cloud別表、ならびに保守する全行のstable official-source参照を使用する。

### Session 2026-07-16

- Q: 初期リリースにどのruntime実装制約を適用するか？ → A: 実行可能なapplication codeをすべてJavaScript/TypeScriptで実装する。CLI、local host、調査対象sourceのI/OはNode.jsの公開JavaScript API上で動作し、browserには生成済みJavaScriptとdeclarativeなHTML/CSS assetを渡す。Strict JSON manifest、documentation、license fileは有効なpackage dataとする。Rust、Node-APIその他のnative addon、platform別のprebuilt native binary、package lifecycleでのcompile、package lifecycleまたはruntimeでのartifact downloadは使用しない。
- Q: そのNode.js-only制約で、filesystem raceについてどの保証が可能か？ → A: 調査対象sourceのI/Oを1つのNode.js moduleへ集約し、Node.js公開APIが示すlinkとboundary failureを拒否し、root、ancestor、candidate path、open handle、read後のidentity、canonical location、metadata snapshotを比較し、不一致の検出時は候補byteをすべて破棄する。Node.jsが公開しplatformがenforceする場合は`O_NOFOLLOW`をfinal-componentの多層防御として使用する。これらの非原子的check間でsource rootまたはancestor、あるいは有効な`O_NOFOLLOW`がない場合のfinal path componentをraceさせる敵対的なlocal processはthreat modelから除外する。Node.js公開APIはsame-device mountやreparse behaviorをすべて公開することもできない。これらの残存riskとNode.jsまたはoperating systemによる解消pathは文書化し続ける。

### Session 2026-07-17

- Q: User-global rootをSourceとしてどのように表すか？ → A: サポート対象toolごとに、admitされたGlobal rootを独立したGlobal Sourceとして表す。Codexは`CODEX_HOME`、Claudeは`CLAUDE_CONFIG_DIR`、Copilotは`COPILOT_HOME`をrootとし、sessionは0から3つのGlobal Sourceを持つ。1つのSourceは正確に1つのrootを持ち、そのroot内の異なる種別のカスタマイズファイルはそれぞれ独立して表示する。
- Q: カスタマイズファイル内のリテラルcredentialと環境変数参照をどのように表示するか？ → A: リテラルな差分を確認できるよう、source text、表示対象の宣言済みmetadata値、authored relationship target、comparison contentはcredential maskingやreveal workflowを使わず、記述されたまま表示する。調査対象content内の環境変数参照はリテラルtextとして扱い、process上の値を解決または置換しない。文書化されたtool-home環境変数はGlobal rootを特定するためだけに使用する。ファイルを開くと機密値を含み得る完全なcontentが表示されることを警告し、operational diagnosticとlogにはsource valueを複製しない。
- Q: 明示的な再scanが致命的に失敗した場合、以前のinventoryをどう扱うか？ → A: 最後に正常commitされたsnapshotを表示したまま残し、再scan失敗によりstaleであることを示し、実行可能なfailure diagnosticを表示する。部分結果を含む失敗scanの未commit結果はすべて破棄し、後続の再scanが正常commitされた場合にだけ保持中のsnapshotを置換する。
- Q: Repository sourceとGlobal sourceに一貫して適用するpath用語は何か？ → A: カスタマイズファイルを所有するSource rootからのpathを「Source-relative path」と呼ぶ。Repository Sourceでは選択済みRepository rootからの相対path、各Global Sourceではそのtoolについてadmitされたhome rootからの相対pathとする。「repository-relative path」はRepository Sourceだけを説明する場合に限って使用する。
- Q: SC-002の性能測定にはどの環境を使用するか？ → A: Release測定の前に、version付きSC-002 reference-environment profileをrepository内で確定する。Profileは、正確なoperating-system imageとversion、processor architectureとmodel、logical processor数、memory、storage mediumとfilesystem、正確なapplication-runtime version、benchmark commandとconfiguration、deterministic fixture manifestとdigestを特定する。1つのmeasurement setの全runはそのprofileに一致しなければならない。結果とともにprofile IDと実際に記録したenvironment valueを公開し、個人識別子と絶対user pathだけを省略する。Profile fieldを1つでも変更すると新しいprofileとなり、異なるprofile IDの結果を直接比較可能としてはならない。
- Q: 1つのSC-002 measurement setを何回の測定で構成するか？ → A: 変更しない1つのversion付きreference-environment profile上で正確に10回測定する。
- Q: SC-002の10回の測定のうち、何回が合格しなければならないか？ → A: 9回以上で、それぞれ1秒以内に現在のrequestに対するqualifying scan statusを表示し、10秒以内に完全な一覧を表示する。このscan-timing thresholdは、100ミリ秒未満のinteraction thresholdと合わせてSC-002の単一のjoint per-run gateを構成する。正確に10回のrunのうち共通する9回以上の同一subsetが4つのthresholdすべてを個別に満たさなければならず、thresholdごとに別々の9/10 subsetでは合格しない。
- Q: SC-002の各測定で1つのInspector processを再利用するか、新しく起動するか？ → A: 測定runごとにInspectorを終了し、次のrunでは新しいprocessを起動して、application memory stateと以前のscan snapshotを再利用しない。
- Q: SC-002の計測開始点と終了点をどこにするか？ → A: Browserがscan requestを送信した時点で両方のtimerを開始する。1秒timerは現在のrequestに対する最初のqualifying scan statusが画面に表示されassistive technologyにも公開された時点、10秒timerは完全な一覧が表示され主要な一覧操作が可能になった時点で終了する。`npx`のdownload、installation、process起動時間は除外する。
- Q: SC-001とSC-006の評価に何人の参加者を使用するか？ → A: 各基準を正確に20人で評価し、SC-001は19人以上、SC-006は18人以上の成功を必要とする。
- Q: SC-001とSC-006で同じ参加者を使用するか、別cohortを使用するか？ → A: 1つのevaluation sessionで同じ20人を使用し、SC-001、SC-006の順に実施する。
- Q: SC-001とSC-006の参加者にどのような経験を求めるか？ → A: 通常の開発作業でGitとcommand-line interfaceを使用しているが、Inspectorを利用したことも開発へ参加したこともない人とする。
- Q: SC-001とSC-006の実施中にmoderatorが操作ヒントを提供してよいか？ → A: Moderatorは標準化された課題文を同じ文面で読み直すことだけ可能とし、command、navigation、interface操作のヒントを提供してはならない。
- Q: 参加者評価で機材、環境、productのfailureをどのように扱うか？ → A: Enrollment済みparticipantは全員fixed denominatorに残し、置き換えない。Task timer開始前を含め、failureがcriterion completionをpreventまたはinterruptする場合はunsuccessfulとする。唯一のscoring区分はhandled SC-001 automatic-browser-opening failureである。そのconditionを記録し、pin済みcertified browserでprinted-URL fallbackを要求するが、prohibited hintなしでoriginal 2-minute interval内にparticipantが完了した場合、そのconditionだけをunsuccessfulとしない。Timerはpauseもrestartもせず、fallbackを完了できない、または途中でinterruptされた場合はunsuccessfulのままとする。
- Q: SC-001の後、SC-006をどの開始状態で実施するか？ → A: SC-001の結果にかかわらず、全参加者を同じ指定カスタマイズファイルが開かれた同一の準備済みInspector stateへ置き、そのstateの準備完了後に標準化された課題文を提示した時点でSC-006 timerを開始する。
- Q: SC-006では何をcritical usability issueとして数えるか？ → A: 禁止された支援なしでprimary workflowを完了できなくする問題、または意図しない実行、調査対象sourceの変更、FR-022で定義した禁止対象のdirect product-issued outbound requestまたはMCP connection、別machineへの調査content露出などのunsafe behaviorを起こす問題とする。FR-022が認可するexactな2つのinternal loopback HTTP classはoutboundでもMCP connectionでもなく、このautomatic eventには含めない。記録済みpre-mounted/mapped sourceのOS-mediated trafficは、このautomatic connection eventではなくFR-022のplatform/environment limitationとして扱う。
- Q: SC-002のrun間でoperating systemのfilesystem cacheを消去するか？ → A: Operating systemのfilesystem cacheは意図的にclearまたはresetせず、各runで新しいInspector processを起動しながら、自然に変化する状態で10回測定する。
- Q: SC-001の2分timerをどこで開始し、どこで終了するか？ → A: 標準化された課題文を提示した時点で開始し、発見されたカスタマイズファイル1つのsource/details viewが画面に開かれて操作可能になった時点で終了する。計測時間には、意図するRepository rootからのInspector起動と、終了条件に至るまでの以後のすべてのparticipant操作を含める。統制されたstudyでは機材が固定launch commandのworking directoryとして意図するRepository rootを準備するため、root選択は独立した計測対象のparticipant操作ではない。移動または`--cwd`によるroot選択は、automatedなUser Story 1テストで検証されるproduct capabilityとして維持する。
- Q: SC-006で識別の成功をどのように記録し判定するか？ → A: Source、認識ツール、file type、実効動作がcertainかconditionalかの必須回答欄を持つ標準化されたresponse formを使用する。2分以内に4項目すべてを提出し、指定ファイルについて事前定義したground truthと全項目が一致した場合だけ成功とし、未回答または誤答が1項目でもあれば不成功とする。
- Q: SC-002の10回の測定runでperformance fixtureをどのように扱うか？ → A: 測定前にdeterministicなfixtureを1つ用意し、内容を変更せず10回すべてで再利用する。Fixtureの構築とsetupは計測時間に含めない。

### Session 2026-07-18

- Q: SC-006でprimary workflow全体のcritical usability issueをどのように評価するか？ → A: 同じ20人の参加者が、時間計測するSC-006の識別回答を提出した後、標準化されたcomparisonとGlobal consentの課題をそれぞれ実施する。Discoveryとinspectionの観察にはSC-001と時間計測するSC-006の課題を使用する。ACK済みcontext correlationはfailure用eligible linkにすぎず、successはsubmissionのlink/review fieldを全N/Aのままautomatic issueを別countし、eligible candidateがあるfailureはexact `automatic-critical` linkをreviewなしで必須とし、candidate-free failureだけがisolated/hidden/one-use reviewer vote 2件を受ける。両`product-caused-blocker`は`reviewer-confirmed-critical`、両`not-product-caused-blocker`は`reviewer-cleared`、一方ずつは`reviewer-disagreement-critical`とする。Published governance planはrequired reviewer rosterを示し、repository bundle/work root/candidate/capture/evidence/runtime IPC外のaccess-controlled administrative assignment recordだけがcaseごとのunique human pairをauditしてconsent-retention policyに従いdestroyされる。Reviewer identity/assignment/note/communication/reuse/第三reviewerをruntime collector、repository study input、capture、evidenceへ入れない。Issue IDは`automatic:<correlationId>`と`reviewer:<subjectId>:<workflowClass>`からderiveする。Final sealはそのtagged/deduplicated unionをautomatic-linked rowの二重計上なしで再計算する。登録済み全outcomeを残し、exact 20×4 terminal set completeかつunion emptyの場合だけgateをpassする。19/20・18/20 thresholdは独立とする。

### Session 2026-07-19

直前のreviewer回答にある「reuse」はhuman、collector process/component-run identity、case assignmentのreuseを指す。Literal reviewer slot labelとsanitized terminal-equipment surfaceはdrain/resetしてlater caseへfresh mappingしてよい。

- Q: Child process禁止はproductのbrowser起動helperも禁止するか？ → A: いいえ。許可するproduct起動のchild processは、FR-001に基づきstartup時に使用する固定のOS browser起動helperだけとする。このhelperへinspection由来のcontent/path、authored value、user-supplied command、environmentで選択したhandlerを渡してはならない。Closedなambient platform key setだけをlaunch environmentから直接copyしてよいが、Source rootとのlexical一致はprovenanceを変えず、authorityを与えず、inspection由来valueのcopyを許可しない。自動起動を無効にした場合、非対応の場合、または失敗した場合もinspectionを利用可能にする。Customization fileのdiscovery、read、parse、display、comparison、relationship処理はchild processを開始してはならない。
- Q: FR-007でrelevantまたはknownとするdeclared metadataとrelationshipはどれか？ → A: Presentation上の各supported customization file typeは、exactな`(tool, kind)`とadmission済みsource formの組とする。維持管理するsupported-customization文書で、各rowのclosedなfield/relationship setとexact source-form extractor applicabilityを列挙する。Initial releaseは両gateを満たすauthored occurrenceだけを表示し、未記載entryを推論したりsource form間でfieldをpromoteしたりしない。
- Q: 100ミリ秒未満のinventory interaction目標をどのように測定するか？ → A: SC-002の各runで500件の完全なinventoryが操作可能になった後、標準化されたfilter actionとitem-selection actionを1回ずつ実施する。各actionはbrowserがinputをdispatchした時点から、対応するfiltered resultまたはselected-state feedbackが表示され操作可能になるまでを測定する。同じ10回のrunのうち9回以上で、両方のactionが100ミリ秒未満でなければならない。これはscan-timing thresholdと合わせたSC-002の単一のjoint per-run gateであり、正確に10回のrunのうち共通する9回以上の同一subsetが4つのthresholdすべてを個別に満たさなければならず、thresholdごとに別々の9/10 subsetでは合格しない。
- Q: SC-002の1秒statusとして何を認めるか？ → A: 現在のscan requestについて画面に表示されassistive technologyにも公開されるstateであり、scanがqueue済みであること、activeなscan phase名、またはcomplete、partial、failedのいずれかを明示するものをqualifying statusとする。Failureの場合は実行可能な次の手順も示す。一般的なspinnerや「loading」label、変化しないcontrol、scan stateを示さないacknowledgement、以前のscanから残ったstatusは認めない。
- Q: 初回利用者による参加者評価を誰が担当するか？ → A: Maintainer teamがinitial-release studyと、そのrecruitment、compensation funding、moderation、review、consent/privacy handling、equipmentとsession support、bilingual material、accessibility accommodationを担当する。これはrelease evidenceの義務でありpull requestごとの義務ではない。通常のcontributorへ参加者の募集、費用負担、moderation、reviewを求めない。
- Q: Originating customization fileを持たない、文書化済みruntimeまたはhosted inputをどう表現するか？ → A: 関連するSourceに紐づく、evidence付きのSource Condition Factとして表現する。これは文書化済みでread authorityを持たないfactであり、Customization FileまたはTool Recognitionではない。File ID、Source-relative path、source text、comparison target、relationship origin、local/hosted read、network requestを作成しない。調査していない現在のruntime stateはconditionalまたはunavailableのままにする。
- Q: User storyのpriorityはimplementation orderをどのように制約するか？ → A: Priorityは相対的なuser valueを表し、implementationは元のfamily-vertical delivery orderを維持する。Shared setupとblocking foundationの後、各familyでUS1 discoveryとUS2の完全で不活性なdetailを完了してからUS3 comparisonを行い、次のfamilyへ進む。正確な順序は、SKILL（Skill Metadataを含む）→ Instructions → MCP → Rules → Commands → Copilot Prompts → Custom Agents → Configuration/Settings → Output Styles → Marketplaces → Plugin Manifests → Hooksとする。その後、Repository-wide Inventory、Detail、Comparison Acceptanceをこの順で完了し、Global inspection（US4、P3）を実施する。Cross-cutting verificationとrelease evidenceは最後に行う。
- Q: Global enablementをcommitしたとき、Repository resultがunchangedであるとは何を意味するか？ → A: Repository Sourceはstableな`sourceId`を維持し、この操作ではRepositoryを再scanしないため、カスタマイズファイルのmembership、Source-relative path、readableまたはdiagnostic state、recognition、relationship、Source Condition Fact、Repository-scoped diagnostic、authored source textはsemantic上変化しない。InitialまたはretryのGlobal Source正常commitはGlobal sequenceのgenerationだけを進め、そのsequenceのgeneration-owned graph IDだけを再keyし、そのsequenceの以前のgenerationに属する`FileDetail`、comparison selection/view、editor-model stateだけを無効化する。Repository sequenceのIDとviewは再keyも無効化もされない（FR-030）。これらGlobal sequenceのidentityとuser-interface lifecycleの変化はRepository resultのsemanticな変化ではない。すべてのcandidateがrejectされたattemptはGlobal Source commitを生成せず、このruleの対象外とする。
- Q: 各Diagnosticはどのlocation contextを持つか？ → A: 保持する各Diagnosticは正確に1つのscopeを持つ。File-scoped Diagnosticは、fileがそのSourceに属し、pathがそのSource内での当該fileのpathである、coherentな`sourceId`、`fileId`、`sourceRelativePath` tupleを必須とする。Source-scoped Diagnosticは`sourceId`だけを必須とし、`fileId`と`sourceRelativePath`を禁止する。Session-scoped Diagnosticは3つのlocation fieldをすべて禁止する。Scopeは、Diagnosticがcommit済みgenerationまたはsession lifecycleのどちらに属するかとは独立してlocationを表す。
- Q: SC-008をどのように判定するか？ → A: WCAG 2.2のLevel AおよびAA success criterionをすべて列挙する、意味的に同等な英語・日本語のWCAG 2.2 AA applicability matrixを維持する。各rowにはapplicability、非適用の場合の理由、名称付きautomated check、manual checkまたはその両方のstable ID、expected observation、結果evidenceを記録する。Manual check IDは、packed release candidate、両locale、正確なplatform/browser/assistive-technology version、viewport/orientation/zoom/text-spacing profile、UI mode、workflow state、input profileを固定したclosed matrixで実行する。Applicableなcellをすべて記録し、frozen releaseまたはmatrix valueを変更した場合は全manual checkを再実行する。Applicableなrowをdenominatorとし、0件であってはならない。Applicableな各rowとmanual cellは、必要なmappingとevidenceをすべて備え、mappingされたcheckすべてに合格しなければならない。Row、必要な理由、mapping、cell、resultのいずれかが欠ければgateを不合格とする。SC-008はapplicable criterionのfailureが0件の場合だけ合格とし、別の「critical accessibility defect」分類は使用しない。
- Q: Repository scanが自動開始する場合、SC-002の各runではどのscanを測定するか？ → A: 自動の初回Repository scanが終了するまで待ち、その後browserから明示的なRepository rescanを1回送信する。Admission responseは不透明な`scanRequestId`を返し、qualifying status、正常commit、表示済みinventoryはすべて同じrequestを識別しなければならない。そのrequestがcommitしたgenerationだけが10秒timerを終了できるため、それ以前の自動inventoryまたはstatusがrunを満たすことはない。
- Q: 調査対象sourceのmutationには何を数えるか？ → A: Write、truncate、create、rename、delete、link、modeまたはownershipの変更、time、extended attribute、ACLの設定、またはmutation可能なflagでのopenを要求するproduct起因requestを数える。Inspectorはこれらを一切発行しない。Readだけを契機にOSが行うaccess-time更新はproduct control外であり、product起因mutationとして数えない。Testでは別に記録し、Inspectorから要求せず、Inspectorがsourceを変更した証拠にも使用しない。
- Q: Inspectorをsemantic analyzerにせず、どのstructural interpretationを許可するか？ → A: 構文だけのparsing、記述されたliteral occurrenceの正確な抽出、機械的なtyped decoding、確定済みdocumented catalogに対する分類、文書化済みorder、scope、condition、selection、reference relationshipの投影を許可する。Inventory、detail、comparison、Global control、diagnostic、Source Condition Fact、API response、CLI output、documentationの全surfaceで、natural-languageの意味を解釈またはrank付けし、正しさ、有効性、compliance、qualityを判定し、remediation adviceを提供してはならない。
- Q: Sensitive-content acknowledgementはAPI authorization factorか？ → A: いいえ。認証なしsession hostのloopback限定bindがaccess-control boundaryである（2026-07-22にsupersede: capability authenticationはdevframe host決定とともに削除、憲章v3.0.0）。Acknowledgementはbundled browserで必須のpresentation invariantであり、新しく読み込んだbrowser documentとclient-data purgeのたびにresetし、userがwarningを確認するまでbundled browserは`FileDetail`を一切requestせずcomparisonを構築しない。このgateは完全なsource text、記述されたdeclared-metadata value、authored relationship target、comparisonの両sideを扱う。Client-data purgeは、document-liveness failureまたは同等のterminal reset後にinventory、detail、comparison、editor model、memory内metadata、acknowledgementをclearする中央のfull-session client resetである。Global-disable actionはrequest送信前にこのpurgeを実行し、より大きいGlobal content epochまたはnon-null disable fenceの観測時にもrender前に繰り返さなければならない（MUST）。Route close、通常のfileまたはSourceのremove、generation changeは対象modelだけをdisposeでき、それ自体はclient-data purgeではないため、読み込み済みdocumentではacknowledgementを維持できる。APIはacknowledgementをaccess-control factorとして扱わない。
- Q: Inspectorはfile sizeまたはitem件数のvalidation limitを定義するか？ → A: いいえ。Fileとcollectionの容量はNode.js、parser、OS、filesystem、browser、実行環境によって決まる。Inspectorは製品固有のsizeまたはcount上限によってcustomization contentを拒否または分類しない。1 fileに閉じたfailureはそのfileのDiagnosticとして表面化する（FR-028）。それ以外のthrown exceptionまたはrejected operationは、その原因がcapacity、resource、operationalのどれかをfileまたはscan layerで分類せず、対象publication attemptをabortする。そのattemptからitem、Source、recognitionまたはderived result、scan-result record、success response、generationを一切commitせず、partial generationを決して許可せず、以前のcommit済みsnapshotがあればそれだけを利用可能に保つ（2026-07-22にsupersede: FR-041のcarve-outはFR-041自体とともに削除）。
- Q: Scanがpartial generationを公開してよいのはいつか？ → A: 完全なtraversalとgeneration assemblyの後、1つ以上のadmit済みentryがFR-028の対象となる決定的でthrowしないentry-local outcomeをdataとして返し、影響を受けないentryが完全に残る場合に限る。Readableな`utf-8-replaced` textなどのcomplete outcomeは、そのpartial conditionから明示的に除外する。単一ファイル境界でのread、decode、parse、extractionの失敗は、原因を調べるのではなく失敗が起きた場所によって分類され、そのファイルの契約済みentry-local outcomeになる（FR-024/FR-028とClosedなScan Publication Outcomes表）。その単一ファイル境界の外で発生したexceptionまたはrejected operation—coordination、assembly、serialization、transport、またはauthority喪失によるもの—はentry outcomeへ変換してはならず、partial publicationを許可しない。回復可能なenvironment/resource failureは、publication attempt全体をabortし、何も公開しない（Constitution § Quality and Safety Standards）。
- Q: 検証済みbyteをどうdecodeするか？ → A: Same-handle readとread後の全identity checkに成功した後、NUL byteを1つでも含むfileはbinaryかつdiagnostic-onlyとする。それ以外はUTF-8 replacement semanticsで1回decodeし、先頭BOMが1つあれば記録して除去する。不正byte sequenceが`U+FFFD`へ置換された場合は`utf-8-replaced`を記録し、その文字化けしたdecoded stringをそのままdisplay、parse、extraction、comparisonへ渡す。別encodingを検出またはretryしない。
- Q: 通常のhome外にあるabsoluteなGlobal rootは、その場所だけを理由に失敗するか？ → A: いいえ。Absoluteな設定済みroot（active platformの`node:path.isAbsolute`）は、通常のhome外でもconsent後のadmission対象となる。設定が存在しない場合は文書化済みdefaultを選択する。Empty、relative、invalid、またはアクセス不能なrootは下記のclosed outcomeに従い、fallback authorityを作らない（superseded 2026-07-22: shared `LexicalAbsoluteRootParts` parser stageは削除された）。
- Q: SC-003、SC-004、SC-005、SC-007、SC-009のrelease-evidence denominatorをどのようにfreezeするか？ → A: Check-inしたversion付きrelease-evidence fixture manifestが、stable case ID、required class、fixtureまたはbuilder reference、expected outcome、content digestをこれらのcriterionへ割り当てる。Manifest versionとdigestがrelease candidateに使う正確なdenominatorを識別し、case欠落、未実行case、digest不一致、required classの空集合は該当criterionをfailureにする。Caseのremove/reclassify、required-class定義の変更、expected outcomeの変更は、denominatorを黙って弱めるのではなく、明示的なmanifest versionのincrementとreviewを必要とする。Fixture byteだけを変更する場合は、代わりに参照fixture digestとcanonical manifest digestの両方を変更する。どちらの変更も新しい直接比較不能なmeasurement setを開始する。

### Session 2026-07-20

- Q: Generation 0でRepository Sourceが存在する前にfilesystem admissionが必要か？ → A: いいえ。Session bootstrapは、`process.cwd()`から起動時working directoryを取得し、その文字列または有効な`--cwd`値からlexical path operationだけでRepository rootを選択し、filesystem I/Oを一切行わず同期的にRepository Sourceを正確に1つ作成しなければならない（MUST）。Escaped root labelとstable `sourceId`はauthorityを持たないsession identityにすぎず、最初のscanは保持したraw selected rootをそのままreadする — 別途のadmission layerは存在しない（2026-07-22にsupersede: 中央のsource-boundary admission moduleはtrusted-workspace決定とともに削除）。決定的なscan failure — 存在しない、またはdirectoryとしてreadできないrootを含む — では同じSourceをfailed scan statusで保持し、source-scopedな`root-unreadable` Diagnosticを保持し（FR-002）、customization fileまたはgenerationを公開しない。Thrownまたはrejectedなautomatic-startup operationはprocess top levelまで伝播し、processまたはsessionが終了してよい。
- Q: ユーザーは起動時working directory以外のRepository rootをどう選択できるか？ → A: CLIは`--cwd <path>`を受け付けなければならない（MUST）。省略時は1回の`process.cwd()` captureから得たexact stringを選択済みRepository rootとする。Absolute optionはそのまま保持し、relative optionはactive platformの`node:path.resolve`でcapture済みinvocation directoryに対してlexicalにresolveする。`--cwd`を複数回指定した場合は引数parserのlast value（決定的なlast-wins）を採用し、別途rejectしない（superseded 2026-07-23:「最大1回、重複はMUSTエラー」ruleは削除した — 引数の反復ポリシーは引数parserが所有する）。値の欠落またはemptyは、固定された実行可能なstartup errorを出し、session作成またはbrowser起動より前に終了しなければならない（MUST）。Root selection自体はfilesystem/network I/Oを0件とし、rejectされたlaunchは起動時`cwd`、`--cwd`、selected rootからderiveしたI/OとDNS、SMB、outbound-network callを0件としなければならない（MUST）。選択済みrootのreadabilityは初回scanだけが確定し、rootが存在しないかdirectoryとしてreadできない場合はsource-scopedな`root-unreadable` Diagnosticでそのscanが失敗する（superseded 2026-07-22: Windows pre-rejectionのリスト、shared `LexicalAbsoluteRootParts` parser、中央source-boundary admissionは削除された）。
- Q: 1回のGlobal調査consentでどのtoolを有効にするか？ → A: Consentはsession-wideであり、toolを個別選択しない。Consent前はproposed rootに対するfilesystem I/Oを一切行わない。1回の明示的なGlobal opt-in後、1つのtransactionがfrozen previewの3 entryすべてを試行し、structuralに存在してadmissionに成功したrootをすべて自動的に含めなければならない（MUST）。ユーザーはtoolを個別に選択または解除できない。Lexicalにinvalidなroot、正確なstructural `lstat` absence、または決定的なlink/type/boundary rejectionからSourceを作成せず、admit済みsubsetのcommitを妨げない。Admit済みSourceはすべて1つのatomic generationとして一緒に公開する。1 fileに閉じないthrownまたはrejected operationは、失敗したrequestの通常のerrorとしてそのtransactionをabortし、subsetを一切commitしない。Rootを1件もadmitできず、operationのthrowまたはrejectもない場合は、文書化済みall-rejected outcomeを使用する。
- Q: 3つのGlobal root inputをplatform間で一貫してどうcaptureするか？ → A: New unconsented previewを作るrequestごとに、`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`をこの固定順で正確に1回ずつreadする。Capture値が`undefined`の場合だけabsentとし、empty stringはpresent overrideとする。1つでもabsentなら、そのrequestでimport済み`node:os.homedir()`を正確に1回callし、対応するabsent valueについてactive platformの`node:path.join`で`.copilot`、`.claude`、`.codex`をlexicalにappendする。`HOME`、`USERPROFILE`その他のplatform variableを別途選択しない。このcaptureはfilesystem operationもexistence checkも行わない。Environment capture、`homedir()`、join、retention、escape、preview serialization中のthrow/rejectionは、そのinvocationをsession RPC boundaryで通常のreal errorとしてfailさせ、previewもauthorityも作らない（2026-07-22にsupersede: generic Operation Error envelopeはFR-040/FR-041とともに削除）。正常作成したpreviewは3つのexact stringをfreezeし、active consentが使う間は再captureしない。
- Q: Unicodeまたはescape ambiguityなしにroot stringをどうclassify、display、bindするか？ → A: Global stateは次の順でassignする。Present environment stringがlength zeroなら`present-empty`、U+0000またはunpaired UTF-16 surrogateを含めば`invalid`、それ以外でactive-platform `node:path.isAbsolute`がfalseなら`relative`、残るabsolute spellingは`eligible`とする（superseded 2026-07-22: shared `LexicalAbsoluteRootParts` parser stageは削除された。Spellingのsemanticsはplatform自身のpath処理が所有する）。Repository/Global root labelはnormalizationせずexact UTF-16 code unitをiterateし、ASCII letter、digit、`.`, `/`, `:`, `_`, `-`だけをcopyし、その他の全code unitを各surrogate halfとbackslashも含め4桁uppercase hexの`\uXXXX`にする。そのASCII resultをHTMLでなくtextとしてrenderし、I/O用にdecodeしない。Previewはserverが保持するopaque `previewId`で識別する唯一のrecordであり、admitted root配下で何をreadするかはdigestなしの`allowlistVersion`/`traversalPlanVersion` pairがbindする（superseded: canonical HMAC preview-digest encodingはself-verificationの整理で削除された。Serverは自身が保持するstateをcryptographicに再検証しない）。
- Q: Runtimeのfile-read errorは誰が処理するか？ → A: 1 fileに閉じたfailureはそのfileのper-file Diagnosticになる（FR-024/FR-028）。それ以外のrejectされたNode.js operationは、file、parser、recognition、scan layerが分類・retry・recoveryのためにcatchせず、triggerを所有するexecution boundaryまで伝播する。Session API所有のoperationでは、failed requestがreal errorを通常どおり報告し — request accept前なら直接、accept済みjobならFR-030に従いterminal errorとして保持 — processと以前のcommit済みsnapshotを利用可能に保つ。Request ownerを持たないautomatic startup operationではprocess top levelまで伝播し、productはprocess survivalを保証しない。どちらも失敗attemptのitem、result body、generationをcommitしない（2026-07-22にsupersede: path/content-freeなerror envelopeとlog内容規制はFR-040/FR-041とともに削除。Errorは通常どおり報告する）。
- Q: 期待されるabsenceとruntime-ownedなfile-read errorをどのように両立するか？ → A: Contractで宣言したexact target（Codexのoverride/fallback対を含むGlobal exact-file rule）のprobeだけが、missing entry（existence probeの`ENOENT`/`ENOTDIR`）をclosedな`absent` outcomeとして扱ってよい（MAY）。この限定的な変換はmessageを調べ、別の原因を推論し、他のcodeまたはoperationへ適用してはならない（MUST NOT）。発見後のread failure — broken symbolic linkを含む — はそのfileの`file-unreadable` Diagnosticである（FR-024）。`entry-disappeared`やrace-detectionのtaxonomyは存在しない（2026-07-22にsupersede: trusted-workspace決定とFR-041削除で除去）。
- Q: NULを含まないbyteがvalid UTF-8でない場合はどうするか？ → A: 文字化けのまま処理する。UTF-8 replacement semanticsで1回decodeし、生成された全`U+FFFD`を`sourceText`に維持し、encodingを`utf-8-replaced`とlabel付けして、通常のparse、extraction、display、comparisonを続行する。このdecode outcomeだけではpartialにしない。Source charsetを推測せず、2つ目のdecoderを試さない。NULを含むfileは`binary`、diagnostic-only、file-confinedな`partial` outcomeのままとする。
- Q: Unicode normalization collisionと複数のhard-link pathをどう表すか？ → A: Enumerated pathでは`Dirent.name`が返した正確なraw entry-name segmentを保持し、parent enumerationを意図的に行わないtargeted fixed pathではimmutable registryのexact target spellingを保持する。そのprovenance固有spellingだけをfilesystem operationへ使い、publicなmatchingとdisplayにはcollision-freeなNFC Source-relative Pathを別に導出する。1つのSource内で異なるenumerated raw pathが同じNFC pathへnormalizeされる場合、どのmemberもopenする前にcollision group全体をrejectし、曖昧でないpublic pathが存在しないためpathless session-scoped Diagnosticを1件だけ生成する。同じ物理fileへのhard linkであるcollision-freeなallowlisted path同士は、通常の独立したfileである。Physical-identity grouping、primary-path選択、alias listは存在せず、各pathがそれぞれのCustomization Fileを公開する（FR-024。2026-07-22にsupersede: primary-path/alias統合はtrusted-workspace決定とともに削除）。Symbolic linkは透過的にreadし、Sourceをまたいでidentityをmergeしない。
- Q: Codex overrideのfallback selectionでemptyとは正確に何か？ → A: 安全にverifyしてreadできたnon-binaryな`AGENTS.override.md`について、任意の先頭UTF-8 BOMを1つ記録して除去した後のdecoded stringが`String.prototype.trim().length === 0`である場合に限りemptyとする。Whitespace-only textはemptyである。安全にreadした`utf-8-replaced` stringにも同じtestを適用するため、保持した`U+FFFD`が1つでもあればnon-emptyになる。Missingなinitial target（existence probeの`ENOENT`/`ENOTDIR`）だけをabsentとしてfallbackを許可する。Unreadableまたはbinaryなoverride — broken linkやprobe後にfailするreadを含む — はそのfile Diagnostic（`file-unreadable`または`file-content-binary`）でbranchを終了し、fallbackしない（2026-07-22にsupersede: FR-041 carve-out framingはFR-041とともに削除）。
- Q: Current MCP guideがまだ省略しているVS Code 1.118以降のworkspace root `.mcp.json`をどう扱うか？ → A: CLI recognitionの対象でもある同一physical fileへ、2つ目のcompatibleなCopilot/MCP provenanceとしてexact root fileをadmitする。1.118 release noteが確立するのはVS Code pathとmost-specific same-name ruleだけで、current guideは`.vscode/mcp.json`をworkspaceの`servers` fileとして文書化し続け、root file schemaまたはtotal orderを確立しない。`documentationStatus: conflict`を保持し、VS Code所有root extractor fieldを追加せず、direct official documentationが解消するまでselectionをunknownのままにする。

### Session 2026-07-21

- Q: Active-consent Global retryは何を対象とし、どのstateを置換できるか？ → A: 同じfrozen preview、consent record、fixed ordered tuple `[copilot, claude, codex]`を再利用する。Matching previewを検証済み、`globalEnableInProgress`がnull、`pendingTools`がempty、`retryableTools`がnonemptyの場合だけretryを提示する。Serverはnon-pending unpublished `admitted` controlと`retryDisposition: same-preview`の`rejected` controlからなるfixed-order `retryableTools` set全体をderiveし、published、pending、lexicalな`new-preview-required` controlを除外する。UI/APIはtargetを追加、omit、reorderできない。Tentative validation/admission中に新たにvisibleとなるのはauthority-freeな`globalEnableInProgress`だけで、既存Repository/Global Source、control、batch/diagnostic field、`pendingTools`、`retryableTools`、prior committed snapshotはexact pre-operation projectionを維持する。Retry対象がすべてdeterministically rejectedならcontrolをatomicに更新して`active-no-job`を返し、`scanRequestId`、scan job、Source、generationを作らず、既存Sourceを置換しない。1つ以上をadmitした場合はatomic queued acceptanceで正確に1つの`GlobalBatchScan`と1つの`scanRequestId`を作り、`pendingTools`をmatching `batchStatus`と同じadmitted subsetへ変更し、既存Sourceを維持して新規admit済みSourceを1つのatomic generationで一緒にpublishする。Thrownまたはrejected operationは失敗したrequestの通常のerrorとして報告し、正確なpre-operation stateを復元する。
- Q: 固定study launch protocolの下でSC-001はどのように適用されるか？ → A: study機材はshellなしで、検証済み配布物の`repository/` working directoryにおいて固定fd6 launch行`npx --no-install agent-customization-inspector --no-open`をspawnする。したがって機材が意図するRepository rootを準備し、participantはdirectory変更も`--cwd`指定も行わない。これらの選択形式は計測対象のparticipant操作ではなく、automatedなUser Story 1テストで検証されるproduct capabilityとして維持する。固定行が`--no-open`を含むため、すべてのstudy attemptは意図的に、文書化されたpin済みcertified browserでのprinted-URL fallbackを使用する。この条件は全attemptで一律に記録され、それ自体では不成功とならない。これはhandled automatic-opening条件が既に規定するとおりである。

### Session 2026-07-22

- Q: 調査対象のカスタマイズファイルは、productが防御すべき敵か？ → A: いいえ。このツールはユーザーが既に信頼しているworkspaceで実行され、AIエージェントが読み込むものを単純に表示する。敵対的file modelに由来する要件（TOCTOU checkpointの再検証、race taxonomy、hard-linkのread-once grouping、structural-`lstat` carve-out doctrine）は、通常のtraversalとper-file diagnosticへ置き換えられた。過去のclarification entryは履歴として残す。維持する義務: 調査対象contentは決して実行しない、loopback sessionを他originから保護する、表示contentはinertにrenderする。
- Q: Symlinkされたカスタマイズファイルはreadするのか、報告だけか？ → A: 他のfileと同じように透過的にreadする。Agentはcustomization fileをloadするときsymbolic linkを解決するので、忠実なinspectionはlink先のcontentを表示しなければならない。Targetがmissingまたはunreadableなlinkは通常のper-file diagnosticになり、recursiveなtraversalはreal pathで訪問済みdirectoryを追跡してlink cycleがscanの終了を妨げないようにする。暫定のsymlink非追跡ruleとその`file-symlink` diagnosticは削除された。
- Q: Local hostは何で実装し、sessionはどう保護するか？ → A: Productはeslint/config-inspectorと同じ基盤であるdevframe local-tool frameworkを、static asset配信とlocal session API channelのために採用し、devframeの認証は無効にする。保護はloopback bindingのみとする。Hostはloopback interfaceにbindし、sessionを起動元machineの外へ決して公開しない。SessionごとのtokenとOriginチェック、手書きのHTTP routerは削除する。認証なしloopback hostの残存露出（他のlocal process、DNS rebinding）は文書化したlimitationとする。憲章v3.0.0が改定後の義務を記録する。
- Q: Operational logの内容規制とgeneric error envelopeはまだ必要か？ → A: いいえ。FR-040とFR-041は削除された。Productにtelemetryは存在せず（FR-022がoutbound通信を禁止済み）、terminalとUIの出力を読むのは調査対象fileを所有する本人であり、認証なしのsession APIは既にfileの完全な内容を返す。したがってerrorの原因を隠しても何も守られず、failureをdebug不能にするだけだった。Errorは通常どおり報告し（実際のmessage、通常の伝播）、closedな`OperationError` entityは削除する。Failureのsemanticsは既存の所有者に残る: per-file分離はFR-028、atomic commitとstale snapshotのruleはFR-030とscan-publication表。憲章v4.0.0がこの削除を記録する。
- Q: RepositoryとGlobalの調査は1本のgeneration sequenceを共有するか？ → A: いいえ。両者のlifecycleは独立している—Repository Sourceは常に存在し、Global sourceはenableからdisableまでしか存在しない—ため、それぞれが独自のatomic generation sequenceを保持する。Repository sequenceはbootstrap generation 0から、Global sequenceはenable commitが作成しdisableが破棄する（disableは何もcommitしない）。Commitは自分のsequenceのIDとviewだけを再keyし無効化する。従来のcarry-forward rule—Global commitがRepository inventoryを変えずに引き継ぎながらsession全体のIDを再keyする—は削除された。Source間comparisonは影響を受けない。比較は常に各sourceの最後のcommit済みstate同士で行われる。

### Session 2026-07-23

- Q: Local session hostはどのhost名でbindし表示するか？ → A: 固定のhost名`localhost`とする。Hostはこれを通じてloopback interfaceへbindし（platformのresolverがIPv4 `127.0.0.1`またはIPv6 `::1`として解決する）、表示および自動オープンするURLは、数値addressよりuserが認識しやすい`http://localhost:<port>/`とする。どのconfigurationやflagも`0.0.0.0`、LAN address、Unix socketをbindしない。Bind・表示URL・発行済みinternal-loopback authorityの従来のexact `127.0.0.1`表記はこれに置き換える。Usability studyのbrowser-proxy authorityはproduct hostではなくstudy equipmentの設定であるため、exactな`127.0.0.1:<port>`のまま維持する。

## ユーザーシナリオとテスト *(必須)*

### ユーザーストーリー1 - リポジトリのカスタマイズを発見する（優先度: P1）

開発者は意図するRepository rootへ移動するか`--cwd <path>`で指定してから`npx`経由でInspectorを起動し、GitHub Copilot、Claude Code、OpenAI Codexが認識するカスタマイズファイルの一覧をブラウザで確認する。選択済みRepository rootは常に独立したRepository Sourceとして表す。Inventoryには、関連するfile以外または未調査runtime behaviorについて保守するSource Condition Factを、カスタマイズファイルと明確に分けて表示してよい。

**この優先度の理由**: Agentを実行せずに関連ファイルを見つけることが、プロダクトとして価値を持つ最小単位であり、後続workflowの前提でもある。

**独立テスト**: サポート対象、対象外、ネストしたファイル、複数ツールに認識されるファイルを含むfixtureリポジトリを起動時`cwd`として1回、別directoryからrelativeな`--cwd`でそのfixtureを選択して1回Inspectorを起動する。両runが同じRepository rootを選択し、調査対象パス一覧に含まれるすべてのサポート対象カスタマイズファイルが一覧に含まれ、無関係なファイルが除外され、Repository Source、カスタマイズファイル種別、Source-relative path、認識ツールが正しく示されることを確認する。

**受け入れシナリオ**:

1. **前提** `--cwd`を省略し、起動時`cwd`に3ツールすべてのサポート対象カスタマイズファイルがある、**操作** ユーザーが調査を開始する、**結果** ブラウザにはそのdirectoryが1つのRepository Sourceとして、toolおよびカスタマイズファイル種別で絞り込める一覧とともに表示される。
2. **前提** ユーザーが別directoryから起動し、relativeまたはabsoluteな`--cwd`を指定する、**操作** ユーザーが調査を開始する、**結果** 選択済みrootが1つのRepository Sourceとして表示され、process working directoryは変更されない。
3. **前提** `--cwd`がnon-emptyな値を持たない、**操作** startupがcommand lineをparseする、**結果** 固定された実行可能なerrorを出し、session作成またはbrowser起動より前に終了する。
4. **前提** 1つの物理`AGENTS.md`がCopilotとCodexの両方に認識される、**操作** 一覧を表示する、**結果** 1つのカスタマイズファイルに2つの異なるtool recognitionが付いた状態で表示される。
5. **前提** Repositoryの調査対象パス一覧に含まれないファイルがある、**操作** リポジトリをスキャンする、**結果** それらのファイルはカスタマイズファイルとして解釈も表示もされない。
6. **前提** サポート対象カスタマイズファイルがない、**操作** スキャンが完了する、**結果** エラーではなく、サポート範囲を説明する正常な空状態が表示される。
7. **前提** 文書化されたCopilot Cloud behaviorがRepository Sourceに関係するがlocalのoriginating fileを持たずhosted stateも調査しない、**操作** inventoryを表示する、**結果** Inspectorはtool、surface、文書化済みconditionまたはunavailable state、evidenceを持つ別labelのSource Condition Factを表示し、synthetic file、Source-relative path、source-text action、comparison target、hosted read、network requestを作成しない。

---

### ユーザーストーリー2 - カスタマイズファイルを有効化せずに調査する（優先度: P1）

開発者はカスタマイズファイルを開き、そのsource text、関連metadata、source boundary、tool recognition、文書化されたscopeまたは関係を確認する。Inspectorは不確実性を明示し、カスタマイズファイルを実行も評価もしない。

**この優先度の理由**: Agentが読み込むものをまったく有効化せずに正確に表示することがこのプロダクトの価値であり、忠実で実行しない調査は追加機能ではなく中核機能である。

**独立テスト**: 実行可能なhook command、script付きskill、MCP server定義、import、不正なdata、リテラルcredential、環境変数参照、boundary外linkを含むfixtureを、filesystem書き込み、child process、network activityを監視し、sentinel環境変数値を与えながら調査する。自動browser起動を無効にするか、許可された固定browser起動helperが完了した後にchild process監視を開始する。調査対象contentが不活性のままであり、リテラル値と参照がenvironment置換なしで記述されたまま表示され、sentinel値が表示contentへ混入せず、diagnosticが出ても影響を受けないカスタマイズファイルを引き続き利用できることを確認する。

**受け入れシナリオ**:

1. **前提** command、hook、plugin、skill、workflow、extension、MCP serverのいずれかを宣言するカスタマイズファイルがある、**操作** ユーザーが開く、**結果** Inspectorは宣言を表示するが、起動、接続、指示の評価を行わない。
2. **前提** リテラルcredentialと環境変数参照を含むサポート対象設定がある、**操作** 表示または比較する、**結果** 両方をmaskせず記述されたまま表示し、環境変数参照を解決せず、reveal操作も必要としない。
3. **前提** Claudeのimportがsource boundary外を指している、**操作** カスタマイズファイルを調査する、**結果** targetを読んだり展開したりせず、関係とboundary diagnosticを表示する。
4. **前提** 優先順位または実効動作が未知のruntime surface、version、trust decision、working directory、flag、environmentに依存する、**操作** カスタマイズファイルを調査する、**結果** Inspectorは不確実性を示し、最終的な勝者や実効設定を断定しない。
5. **前提** 完全なtraversal後、1つのfileだけがunreadable、binary、またはparse failureであり、他のすべてのfileが完全である、**操作** scanがresultをassembleする、**結果** Inspectorはそのfileの実行可能なdiagnosticと完全な非影響fileを含むpartial generationをpublishする。NULを含まないinvalid UTF-8だけの場合は代わりにreadableな`utf-8-replaced` resultを生成し、scanをpartialにしない。**代わりに前提** attemptが単一fileの外で失敗する、**結果** 何もcommitせず、失敗を通常のerrorとして報告し、prior committed snapshotがあれば維持し、validityまたはlintのverdictを出さない。
6. **前提** Source Condition Factがoriginating fileを持たない、**操作** ユーザーがそのdetailを確認する、**結果** Inspectorはauthored content、file provenance、実効runtime resultを捏造せず、文書化済みbehavior、affected scope、evidence、不確実性を説明する。

---

### ユーザーストーリー3 - カスタマイズを比較する（優先度: P2）

開発者は発見済みで読み取り可能な任意の2つのdistinctなカスタマイズファイルを選び、source textとrecognition metadataを並べて比較し、Agentに解釈させずに重複と差分を理解する。Credentialの差を隠さないよう、記述された値は表示したままにする。決定的なdiagnostic-only itemはinventoryに残すが、comparisonの選択対象にはしない。Thrownまたはrejectedなreadからは、そのようなitemを作成しない。

**この優先度の理由**: 比較によって、ファイル一覧は移行やトラブルシューティングに実用的な道具となり、同時にsemanticな判断をしない範囲を維持できる。

**独立テスト**: 同じRepository Sourceに属し異なるtool recognitionを持つ読み取り可能な2つのdistinct fixtureを選択し、sourceとmetadataが並んで表示されること、正しさの評価や変更提案をせずにリテラルな差分とrecognitionの差を示すことを確認する。決定的なdiagnostic-only Repository fixtureをcomparisonに選択できず、rejected readからitemを作成しないことも確認する。このtestはGlobal調査より前に完了するRepository workだけを必要とする。

**受け入れシナリオ**:

1. **前提** 読み取り可能な2つのdistinctなカスタマイズファイルがある、**操作** ユーザーが比較する、**結果** contentベースのmaskingを行わず、両方の完全なsource viewと、Source-relative path、source、file type、tool-recognition metadataを同時に確認できる。
2. **前提** 同じカスタマイズファイルに複数のtool recognitionがある、**操作** 別のカスタマイズファイルと比較する、**結果** 各recognitionを物理ファイルと区別したまま確認できる。
3. **前提** 2ファイルに競合する自然言語指示がある、**操作** 比較する、**結果** どちらがsemantic上正しいか、または有効かを断定せず、リテラルな差分だけを示す。
4. **前提** 発見済みのカスタマイズファイルが決定的なdiagnostic-only outcomeを持つ、**操作** ユーザーがcomparisonの選択肢を確認する、**結果** そのitemはdiagnostic reviewに利用可能なままだが、comparison inputとして選択できない。Readがthrowまたはrejectしたfileはattemptがcommitされないため存在しない。

---

### ユーザーストーリー4 - User-global調査へopt-inする（優先度: P3）

開発者は、小さく文書化されたuser-globalの調査対象パス一覧を使用するため、session-wideなconsentを1回明示的に与える。Productは3つのサポート対象tool rootすべてを試行し、存在してadmissionに成功したrootをすべて自動的に含め、toolごとのselectorを提供しない。Repository Sourceとそのviewは、Globalのlifecycle変化に影響されない。Global調査は独自のgeneration sequenceを持つため、Global sourceの有効化・再scan・無効化がRepository stateを無効化することはない。

**この優先度の理由**: Global instructionはリポジトリファイルだけでは説明できない挙動の理解に役立つ一方、home構成の調査はprivacy riskを高めるため、任意かつ厳密に限定しなければならない。

**独立テスト**: 2つのサポート対象Global rootが存在し、1つがmissingな状態で起動し、opt-in前に一切probeまたはreadされないことを確認する。Consent UIがall-tools actionを1つだけ提供し、toolごとのselectorを持たないことを確認する。Global調査を有効にし、productが3つのfrozen preview entryすべてを試行し、missing rootをfallbackなしでrejectし、指定されたinstruction pathにあるファイルだけを、それぞれ正確に1つのrootを持つ2つのadmit済みGlobal Sourceとしてatomicに公開することを確認する。読み取り可能なRepository file 1つとGlobal file 1つを比較し、両方が独立して識別されたowning SourceとSource-relative Pathにboundされたまま、ユーザーストーリー3で要求するliteralかつnon-semanticなbehaviorを維持することを確認する。正常なadmitted-subset commitがRepositoryのviewとstateへ一切触れずにGlobal generationを作成することを確認する。その後でGlobal調査を無効にし、Globalの全結果がsessionから除去されることを確認する。

**受け入れシナリオ**:

1. **前提** Global調査を有効にしていない、**操作** Inspectorを起動する、**結果** user-globalの調査対象パスにあるファイルを読み取りも表示もしない。
2. **前提** ユーザーが完全な3-tool previewを確認して1回明示的にopt-inした、**操作** Repository Sourceを再scanせずGlobal調査を実行する、**結果** productはtool selectorを受け付けずpreview済みtool rootすべてを試行し、missingまたはunreadableなrootを除外し、admit済みtool rootすべてを正確に1つのrootへboundされた別々のGlobal Sourceとしてatomicに公開する。予期しないfailureは代わりにtransaction全体をabortする。正常commitはGlobal generationを作成し、自分のgeneration-owned IDだけを再keyする。Repositoryのstateとviewは影響を受けない。
3. **前提** Globalの調査対象パスにあるinstruction fileの近くにcredential、log、runtime state、cache、その他対象外ファイルがある、**操作** Global調査を実行する、**結果** それらの隣接ファイルを読み取らない。
4. **前提** ユーザーがGlobal調査を無効にする、**操作** disable barrierが正常完了してauthoritative snapshotからviewを更新する、**結果** すべてのGlobal sourceとGlobalのカスタマイズファイルをactive sessionから除去する。
5. **前提** Non-no-op disable barrierがaccept済みである、**操作** drainまたはcloseが失敗する、**結果** processはliveなまま、全inspection dataはfenceされclientからpurge済みのまま、retry/join controlを利用でき、cleanupをconfirmできない場合はrestartをfallbackとして示す。以前のGlobal contentを復元しない。
6. **前提** 読み取り可能なRepository fileとGlobal fileがactiveである、**操作** ユーザーが両者を比較する、**結果** rootを統合せず、semanticな判定や変更提案を行わず、各fileを独立して識別されたowning SourceとSource-relative Pathの下に表示する。
7. **前提** Active Global consentにenable operation/pending workがなくmatching previewを検証済みで、FR-013が定義するserver-derived `retryableTools` setがnonemptyである、**操作** ユーザーがGlobal retryを実行する、**結果** serverはselectorを受け付けず同じfrozen previewに対してFR-013でderiveしたfixed-order projection全体を正確にretryする。Tentativeな間は全既存Sourceとexact pre-operation control/snapshot projectionを維持し、全対象を再びrejectした場合はrequest/generationなしの`active-no-job`を返すか、accepted batchのadmitted subsetだけをpendingとしてatomicに公開し、新規admit済みSourceすべてを正確に1つのrequest、batch、generationで一緒にpublishする。

#### ClosedなGlobal Root Admission Outcome

| Configured-rootのinputまたはphase | Closed outcome |
|---|---|
| 設定が存在しない | 文書化済みdefault stringを導出して下記rowでclassifyする。Consent前はI/Oを行わない |
| Capture済みenvironment設定のlengthが0 | `present-empty`。Root、Source、scan jobなしでinvalid preview entryを保持する |
| StringがU+0000またはunpaired UTF-16 surrogateを含む | `invalid`。Authorityを保持しない |
| Active-platform `node:path.isAbsolute`がfalse | `relative`。Resolveもfallbackもしない |
| それ以外 | `eligible`。Exact stringをpreviewへfreezeし、consentまでread authorityを持たない |
| 送信されたconsentがcurrent frozen previewと一致しない | Requestをrejectし、authority、root、Source、scan jobを作らない |
| Consent済みrootがmissing、またはreadableなdirectoryではない | 他toolのcommitを妨げずに、そのtoolをabsentまたはfailedとして記録する |
| 1つ以上のconsent済みrootがreadableなdirectory | 各rootをadmitし、そのGlobal Sourceを単一のatomic batch generationでcommitする |

#### Byte Decode Outcome

| Byteのcondition | Encoding state | Sourceおよびcomparison outcome |
|---|---|---|
| NUL byteが1つ以上 | `binary` | Diagnostic-onlyとし、source textもcomparison eligibilityも公開せず、それ以外はpublish可能なgenerationを`partial`にする |
| NULなし、全byteがvalid UTF-8 | `utf-8` | 先頭BOMが1つあれば記録して除去し、完全にdecodeしたsourceを公開してcomparisonを許可する |
| NULなし、invalid UTF-8 byte sequenceが1つ以上 | `utf-8-replaced` | Replacement semanticsで1回decodeし、先頭BOMが1つあれば記録して除去し、挿入された全`U+FFFD`を含む文字化けした結果を維持して通常のparse、extraction、source display、comparisonを続行する。別encodingを検出またはretryしない |

### 境界事例

- 選択済みRepository rootをreadできない、startup後に利用できなくなる、またはユーザーが調査を意図したrootではない。`process.cwd()`で取得する前に起動時`cwd`自体が利用不能になる場合もある。
- 調査対象パス一覧に一致するfileがsymbolic linkである（他のfileと同じようにtargetを透過的にreadする。壊れたlinkはper-file diagnosticになる）、または発見から読み取りまでの間に消える（per-file diagnostic）。
- サポート対象filenameが、不正なtext encoding、不正なfrontmatterやconfiguration、極端に長い行、binary contentを含む、または実行環境がfile処理を継続できないと報告する。
- 1つのカスタマイズファイルに複数の認識済みfile typeまたは認識ツールがある。
- カスタマイズファイルがabsolute path、`..` traversal、environment variableの文字列、またはimport chainを介して別ファイルを参照する。
- 設定されたtool homeが存在しない、空、relative、アクセス不能、またはユーザーの通常のhome外にある。
- Global override fileが存在するが空であり、文書化されたfallback fileが適用され得る。
- ブラウザを開いている間に、機密内容が新たに追加される場合を含めてファイルが変化する。
- 明示的な再scanが部分結果を生成した後で致命的に失敗する。部分結果を破棄し、最後に正常commitされたsnapshotをstale markerとfailure diagnostic付きで表示したまま残す。
- Browser sessionがrefreshされる、または起動元とは別のhostから開かれる。
- カスタマイズファイルにリテラルcredential、またはInspector process上で値が設定済みの環境変数への参照がある。リテラルsourceはmaskせず表示し、参照は解決も置換もしない。
- 文書化されたCloudまたはexternal-runtime behaviorが関係するが、現在のhosted stateを利用できずlocal fileもそのfactのoriginではない。Synthetic customization fileではなく、read authorityを持たないSource Condition Factのまま扱う。
- Inspectorがmutation可能なfilesystem requestを発行していなくても、readを契機にOSがaccess timeを更新する。そのOS side effectは別に記録し、product起因mutationのassertionをfailureにしない。
- Admission済みoperationがI/O、decode、parse、assembly、transport中に予期せず失敗する。1つのfileに限定されるfailureはそのfileのdiagnosticになり（FR-028）、それ以外はattemptをfailさせて失敗を通常のerrorとして報告し、最後にcommitされたsnapshotを表示したまま残す。

#### ClosedなScan Publication Outcome

| Terminal condition | Public status | Commitおよびresponse outcome |
|---|---|---|
| Traversalが完了し、readableな`utf-8-replaced` resultを含めて全fileが完全なresultを持つ | `complete` | 1つのcomplete generationをatomicにcommitする |
| Traversalが完了し、1つ以上のfileがfile-confined outcome（unreadable、binary、parse failure）だけを持ち、影響を受けない全fileが完全 | `partial` | 影響fileのdiagnosticと完全な非影響resultを持つ1つのgenerationをatomicにcommitする |
| Attemptがcommit前に失敗する | その`scanRequestId`について`failed` | Attemptから何もcommitせず、失敗を通常のerrorとして報告し、prior committed snapshotがあれば維持する。明示rescanの場合に限り、維持したsnapshotをそのSourceについてstaleとしてmarkする |
| Disable、shutdown、supersessionがpublication authorityを取り消す | 後続のsuccess statusなし | 遅延resultをすべて破棄し、取り消されたrequestから何もcommitしない |
| Atomic commit後にresponse transportが失敗 | Commit済みstatusを変更しない | Clientはsession APIからcommit済みgenerationを再取得する |

## 要件 *(必須)*

### 機能要件

- **FR-001**: ユーザーは`npx`経由でプロダクトを起動し、生成されたローカル調査sessionをブラウザで開けなければならない（MUST）。CLIは`process.cwd()`を正確に1回captureし、`--cwd <path>`を受け付けなければならない（MUST）。Absolute optionはそのまま保持し、relative optionはcapture済み起動directoryに対してresolveし、その結果を選択済みRepository rootとする。`--cwd`を複数回指定した場合は引数parserのlast value（決定的なlast-wins）を選択rootとし、別途rejectしない（superseded 2026-07-23:「最大1回、重複はMUSTエラー」要件は削除した — 反復引数のポリシーは引数parserが所有し、Gunshiは反復scalar optionを最後の値へ解決する）。値の欠落またはemptyは、session作成またはbrowser起動より前に固定された実行可能なstartup errorを生成しなければならない（MUST）。CLIは`process.chdir()`を呼んではならない（MUST NOT）。初期リリースは別のrepository pathをpromptしたり、別rootを求めてancestor directoryを探索したりしてはならない（MUST NOT）。Certification baselineとは、release candidateの自動browser/accessibility certification suiteの実行対象として、そのrelease candidateのrelease evidenceに記録された、有限のversion付きexact browser buildの集合である。これはsupported user browserのexhaustiveな一覧ではなく再現可能なcertification集合であり、pin済みcertified browserはその集合の1 memberである。Productはresolved handlerのbrowser family/versionをselect、probe、verifyしてはならず（MUST NOT）、自動起動はbest-effortにとどまり、helper呼び出しの成功はcompatibilityの証拠ではない。Resolved browserがcertification baseline外かどうかは、記録済み環境に基づきoperatorまたはstudy equipmentが判定するのであって、product発行のinspectionで判定してはならない。Browserの自動起動がdisabled、unsupported、failure、unavailable/unidentifiable、またはcertification baseline外へ解決された場合、productはpin済みcertified-browser fallback用の利用可能なprinted local addressを提供しなければならない（MUST）。
- **FR-002**: すべての調査には、FR-001の選択済みRepository rootをrootとし、session bootstrap時に不透明でstableな`sourceId`とescaped root labelを付けて作成したRepository Sourceを正確に1つ含めなければならない（MUST）。選択済みrootが存在しない、またはdirectoryとしてreadできない場合、sessionを利用可能に保ったまま、scanを実行可能なdiagnosticとともにfailさせなければならず（MUST）、そのattemptのpartial inventoryをpublishしてはならない（MUST NOT）。
- **FR-003**: Inspectorは、文書化された調査対象パス一覧に含まれるpathだけからrepositoryのカスタマイズファイルを発見しなければならず（MUST）、リポジトリ内の全ファイルを無差別に解釈してはならない（MUST NOT）。
- **FR-004**: 初期リリースは、GitHub Copilot、Claude Code、OpenAI Codexについて、「初期リリースでサポートするカスタマイズファイル」に記載したrepositoryのカスタマイズファイル種別を認識しなければならない（MUST）。
- **FR-005**: 1つのファイルを複数の物理ファイルとして重複させずに、複数のtool、kind、scope、relationshipを表せるよう、物理ファイルとtool-specific recognitionを分離して表現しなければならない（MUST）。
- **FR-006**: ユーザーはsource、tool、カスタマイズファイル種別、Source-relative pathで一覧を閲覧および絞り込みできなければならない（MUST）。
- **FR-007**: 読み取り可能な各カスタマイズファイルについて、source、Source-relative path、file type、認識ツール、source text、関連する宣言済みmetadata、既知のrelationshipを表示しなければならない（MUST）。Presentation上のsupported customization file typeは、exactな`(tool, kind)` recognitionと、そのadmit済みsource formの組み合わせとする。維持管理するsupported-customization文書は、closedな`(tool, kind)` presentation allowlistと各rowの適用対象となるsupported source formを列挙しなければならない（MUST）。Entryは、fieldまたはrelationship kindがそのrowに記載され、かつadmit済みsource formのexact extractorがauthored occurrenceを認識する場合だけeligibleとする。1つのsource formについてfieldを列挙しても、別source formでそのfieldをpromoteまたはinferしてはならない（MUST NOT）。Initial releaseは未列挙のmetadataまたはrelationshipを推論してはならない（MUST NOT）。
- **FR-008**: 1 directoryごとのoverrideやfallbackを含め、決定的なdiscovery orderとscope ruleが文書化されている場合は説明し、その基礎となる物理ファイルも表示し続けなければならない（MUST）。
- **FR-009**: Runtime version、product surface、working directory、trust、flag、environment、organization policy、または文書化されていない競合解決に動作が依存する場合、conditionalまたはunknownと表示しなければならない（MUST）。
- **FR-010**: Claudeのimport relationshipは参照としてのみ表示し、import contentを自動展開してはならない（MUST NOT）。起点source boundary外への参照はdiagnosticを生成しなければならない（MUST）。
- **FR-011**: ユーザーは、contentベースのmaskingを行わない完全なsource textとrecognition metadataを含め、読み取り可能な任意の2つのdistinctなカスタマイズファイルを並べて比較できなければならない（MUST）。複数recognitionを持つ場合でも、同じfileをcomparisonの両inputへ受け付けてはならない（MUST NOT）。
- **FR-012**: 比較はリテラルかつ記述的なものに限り、いずれのカスタマイズファイルもvalidate、lint、semantic rank、synchronize、convert、format、または自動修正提案してはならない（MUST NOT）。
- **FR-013**: Global調査は新規sessionごとに無効でなければならず（MUST）、完全な3-tool scopeとfrozen root previewを説明した後に、session-wideなユーザー操作を1回明示的に必要としなければならない（MUST）。UIとAPIはtoolごとのselectorを受け付けてはならない（MUST NOT）。その操作より前にproposed-root filesystem I/Oを行ってはならない（MUST NOT）。New unconsented previewごとに`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`をこの順で正確に1回ずつcaptureし、`undefined`だけをabsentとして、1つでもabsentならimport済み`node:os.homedir()`を正確に1回callしなければならない（MUST）。Absent defaultはactive platformの`node:path.join`と固定suffix `.copilot`、`.claude`、`.codex`でderiveしなければならず（MUST）、`HOME`、`USERPROFILE`その他のhome sourceを独自選択してはならない（MUST NOT）。結果の3 exact stringをfreezeしなければならない（MUST）。Closed ordered lexical-state algorithm（`present-empty`、U+0000またはunpaired surrogateなら`invalid`、`node:path.isAbsolute`により`relative`、それ以外は`eligible`）でclassifyし、全Repository/Global root labelをdata model定義のexact injective UTF-16-code-unit escapingでencodeしなければならない（MUST）。Normalization、raw stringのUTF-8 replacement、presentation-to-path decode、HTML renderingを使ってはならない（MUST NOT）。Previewはserverが保持するopaque `previewId`で識別する唯一のrecordであり、`allowlistVersion`/`traversalPlanVersion`によってshipped allowlistへbindされる。Capture/construction/retention/escape/serializationのthrow/rejectionはrequestを通常のerrorとしてfailさせ、previewもauthorityも作ってはならない（MUST NOT）。Consent後、coordinatorは3つのfrozen preview entryすべてについてadmissionを試行し、clientにeligible toolを省略させてはならない（MUST NOT）。Active-consent retryは同じfrozen preview、consent record、fixed ordered 3-tool tupleを再利用しなければならず（MUST）、matching `previewId`を確認済み、`globalEnableInProgress`がnull、`pendingTools`がempty、`retryableTools`がnonemptyの場合だけ提示しなければならない（MUST）。Serverはnon-pending unpublished `admitted` controlと`retryDisposition: same-preview`の`rejected` controlからfixed-order `retryableTools` set全体をderiveしなければならず（MUST）、published、pending、lexicalな`new-preview-required` controlを除外し、UI/APIがretry targetを追加、omit、reorderできないようにしなければならない（MUST）。
- **FR-014**: Initial Global-enable operationは、完全な3-tool previewを1つのtransactionとして処理し、Copilot、Claude、Codexについてそれぞれ最大1つ、0から3つの独立して識別されたtool別Global Sourceを1つのgenerationでatomicに作成しなければならない（MUST）。Preview済みrootがmissingまたはunreadableなtoolはSourceを作成せず、他toolのcommitを妨げてはならない（MUST NOT）。Active-consent retryは同じfrozen previewとconsent recordを再利用し、すべての既存Sourceとcommitted snapshotを維持し、新規admit済みSourceを1つのatomic generationでpublishしなければならない（MUST）。各Global Sourceはtoolについて正確に1つのrootへboundしなければならず（MUST）、Global customization fileをRepository Sourceまたは別toolのGlobal Sourceへmergeしてはならない（MUST NOT）。
- **FR-015**: CopilotのGlobal sourceは、capture済み`COPILOT_HOME`配下、またはその設定がabsentなら`node:path.join(capturedHomedir, '.copilot')`配下の、`copilot-instructions.md`と、`instructions/`以下の任意の深さにある名前が`/\.instructions\.md$/u`にmatchするfileだけを調査しなければならない（MUST）。
- **FR-016**: ClaudeのGlobal sourceは、capture済み`CLAUDE_CONFIG_DIR`配下、またはその設定がabsentなら`node:path.join(capturedHomedir, '.claude')`配下の`CLAUDE.md`だけを調査しなければならない（MUST）。
- **FR-017**: CodexのGlobal sourceは、capture済み`CODEX_HOME`、またはその設定がabsentなら`node:path.join(capturedHomedir, '.codex')`における文書化されたinstruction fallbackだけを調査しなければならない（MUST）。まず`AGENTS.override.md`を対象とし、FR-035の定義どおりoverrideがabsentまたはemptyの場合に限り`AGENTS.md`へfallbackする。
- **FR-018**: Global調査から、追加のCopilot instruction directoryとskill directory、hostまたはorganizationの設定、Claudeの別user state fileおよびその他のconfiguration file、Codexのuser skillとstate、credential、log、cache、session data、managed policy、ならびにFR-015からFR-017にないdirectoryを除外しなければならない（MUST）。
- **FR-019**: Inspectorはユーザーが既に信頼しているworkspaceで実行される。その目的はAIエージェントが読み込むものを表示することであり、調査対象customization fileを敵としてモデル化しない。Readとtraversalは通常のfilesystem operationを使用し、operation間の反復的なidentity再検証、race-detection taxonomy、physical-identityによるread-once groupingのような敵対的入力向けの機構をproductへ追加してはならない（MUST NOT）。
- **FR-020**: Skill、command、hook、plugin、workflow、extension、script、handler、prompt、agent、rule、その他の調査対象contentを実行してはならない（MUST NOT）。
- **FR-021**: 調査対象contentに記載されたMCP serverを起動、接続、probe、またはrequest送信してはならない（MUST NOT）。
- **FR-022**: カスタマイズファイルの発見と表示によって、product発行のoutbound network request、dynamic code evaluation、またはcustomization content由来のchild-process実行を引き起こしてはならない（MUST NOT）。Local loopback hostは固定のhost名`localhost`（platformのresolverがIPv4 `127.0.0.1`またはIPv6 `::1`として解決する）を通じてloopback interfaceだけにbindし、packaged UI assetとlocal session API channelだけを配信し、調査contentから選択されたdestinationを使用したり、調査contentを別machineへ送信したりしてはならない（MUST NOT）。初期リリースで唯一のproduct起動child processは、FR-001に基づきstartup時に使用する固定のOS browser起動helperである。このhelperはinspection由来のcontentやpathを受け取ってはならず（MUST NOT）、自動起動がdisabled、unsupported、または失敗した場合もinspectionを利用可能に保たなければならない（MUST）。
- **FR-023**: 調査対象sourceに対し、productが制御するmutation requestを一切発行してはならない（MUST NOT）。Product起因mutationには、write、truncate、create、rename、delete、link、modeまたはownershipの変更、file time、extended attribute、ACLの設定、またはmutation可能なflagでのopenを要求することを含む。Inspectorはaccess-time更新を要求してはならない（MUST NOT）。Readだけを契機にOSが行うaccess-time変更はproduct control外であり、product起因mutationとして数えたりInspectorがsourceを変更した証拠に使ったりせず、別に記録しなければならない（MUST）。
- **FR-024**: Traversalとreadはsymbolic linkを透過的にfollowする。Inspectorは同じpathをreadするagentが見るものを表示するからである。Targetがmissingまたはunreadableなlinkはそのfileのper-file diagnosticを生成し、recursiveなtraversalはreal pathで訪問済みdirectoryを追跡して、link cycleがscanの終了を妨げないようにする。Hard linkは通常のfileであり、physical-identityによるgroupingを必要としない。PublicなSource-relative PathはNFCのdisplay segmentを使用し、filesystem operationはraw entry nameを使用する。Readできないfileは他のfileへ影響せず、per-file diagnosticを生成する。
- **FR-025**: Inspectorは、credential detection、contentベースのmasking、redaction、reveal stepなしで、読み取り可能なカスタマイズファイルのsource textを表示しなければならない（MUST）。Valid UTF-8では、表示する宣言済みmetadata値とcomparison contentはauthoredなliteral値を維持し、credential間の差を含む差分を確認できるようにしなければならない（MUST）。NUL byteが1つでもあればそのitemを`binary`に分類しなければならない（MUST）。そのitemはdiagnostic-onlyのままsource textを公開せず、comparisonの対象外とし、それ以外はpublish可能なgenerationを`partial`にする。NULを含まないすべてのfileはUTF-8 replacement semanticsで正確に1回decodeしなければならない（MUST）。Decodeが1つ以上の`U+FFFD`を挿入した場合、encoding stateは`utf-8-replaced`としなければならず（MUST）、その結果のexactな文字化けstringが`sourceText`となり、それ自体でscanをpartialにせず、通常のparse、extraction、display、comparisonを続行しなければならない（MUST）。先頭のUTF-8 BOMが1つある場合は別に記録して`sourceText`から除去しなければならない（MUST）。Inspectorは別encodingの推測またはretry、replacement characterの除去または隠蔽、contentのsamplingまたはtruncation、product定義のbyte、行、item上限の導入をしてはならない（MUST NOT）。
- **FR-026**: 調査対象content内の環境変数参照はリテラルtextのままとし、Inspectorが参照先のprocess environment値を読み取り、解決、置換する契機にしてはならない（MUST NOT）。この制限は、FR-015からFR-017が明示的に文書化したtool-home環境変数をGlobal source rootの特定だけに使用することを妨げない。
- **FR-027**: ユーザーがauthored valueを公開し得るdetailまたはcomparison surfaceを開く前に、Inspectorは記述された完全なcontentを表示し、機密値を含み得ることを明確に説明しなければならない（MUST）。Bundled browserはacknowledgementをmemory内だけに保持し、新しく読み込んだbrowser documentとclient-data purgeのたびにresetし、acknowledgement前に`FileDetail`を一切requestせずcomparisonを構築してはならない（MUST NOT）。このgateは完全なsource text、記述されたdeclared-metadata value、authored relationship target、comparisonの両sideを扱わなければならない（MUST）。Client-data purgeは、document-liveness failureまたは同等のterminal reset後にinventory、detail、comparison、editor model、memory内metadata、acknowledgementをclearする中央のfull-session client resetでなければならない（MUST）。Global-disable actionはrequest送信前にこのpurgeを実行し、より大きい`globalContentEpoch`またはnon-null `globalDisableInProgress`の観測後はrender前に繰り返さなければならない（MUST）。Route close、通常のfileまたはSourceのremove、generation changeでは、client-data purgeを構成せず、読み込み済みdocumentのacknowledgementをresetせずに、対象scopeのmodelをdisposeしてよい（MAY）。このpresentation acknowledgementはaccess-control factorではなく、session APIへはloopback-boundなlocal hostを通じてのみ到達できる。初期リリースはcredential maskingまたはreveal workflowを提供してはならない（MUST NOT）。
- **FR-028**: 1つのfileに限定される問題—unreadableなfile、binary content、またはparser/extractorのfailure—が、他のfileの発見や表示を妨げてはならない（MUST NOT）。影響itemには、ユーザーが問題を解決できるだけのsource-relative pathとSource contextを残さなければならない（MUST）。Parser/extractorのfailureでは、（あればreplacement characterを含む）完全でreadableなsourceを表示可能かつcomparison-eligibleのまま維持し、影響recognitionのderived metadataまたはrelationshipだけを省略しなければならない（MUST）。
- **FR-029**: Inspectorはfile size、fileまたはitemの件数、parser構造、requestまたはresponse size、work queue、scan時間、filesystem operation、open handle、coordinator容量について、product固有の数値validation limitを定義してはならない（MUST NOT）。利用可能な容量はNode.js、選択したparser、OS、filesystem、browser、実行環境から継承しなければならない（MUST）。Applicationは予期しないfailureをcapacity、resource、operationalの原因で分類してはならない（MUST NOT）。1つのfileに限定されないfailureは影響attemptをfailさせ、そのattemptはitem、Source、recognitionまたはderived result、scan-result body、success response、generationを一切commitしない。Requestがdisable、shutdown、supersession、failureによってpublication authorityを失った後に完了したworkは、その遅延resultをすべて破棄しなければならない（MUST）。EngineまたはOSによる終了はenvironment limitationであり、product guaranteeとして表現してはならない（MUST NOT）。
- **FR-030**: ユーザーはactiveなsourceを明示的に再scanできなければならない（MUST）。Admit済みの各scan commandは不透明な`scanRequestId`を受け取らなければならず（MUST）、queued、active、complete、partial、failedの各statusはそのrequestを識別し、成功したgenerationはcommitしたrequestを記録しなければならない（MUST）。以前のstatus、snapshot、generationが新しいrequestの完了を満たしてはならない（MUST NOT）。Publicな`partial`はClosedなScan Publication Outcome表のfile-confinedな`partial` outcomeだけを意味しなければならず（MUST）、他のincomplete stateをpublishしてはならない。RepositoryとGlobalの調査は、lifecycleが独立しているため独立したgeneration sequenceを保持する。Repository sequenceはbootstrap generation 0から始まり、Global sequenceはそれを作るenable commitからdisableが破棄するまでだけ存在する。Scan resultは所属するsequenceの1つのgeneration snapshotとしてatomicにcommitしなければならない（MUST）。成功したcompleteまたはpartialのcommitはそのsequenceの以前のsnapshotを置換し、そのsequenceのgeneration-owned graph IDをすべて再keyし、そのsequenceの以前のgenerationに属する`FileDetail`、comparison selection/view、editor-model stateを無効化しなければならず（MUST）、stale responseからそれらを復元してはならない（MUST NOT）。Commitはもう一方のsequenceのstateを変更も無効化もしてはならない（MUST NOT）。Rescanがcommit前に致命的に失敗した場合、Inspectorはそのscanの未commit resultをpartial resultを含めてすべて破棄し、最後に正常commitされたsnapshotを維持し、そのSourceについてrescan失敗を理由にstaleとしてmarkし、失敗requestのerrorを表示しなければならない（MUST）。All-rejectedなGlobal attemptはcommitを生成してはならない（MUST NOT）。
- **FR-031**: 調査結果は既定でsession内に限定し、初期リリースではprofile、cache、repository fileとして永続化してはならない（MUST NOT）。
- **FR-032**: Inventory、detail、comparison、Global control、diagnostic、Source Condition Fact、API response、CLI output、documentationの全surfaceで、初期リリースはvalidator、linter、natural-language semantic analyzerまたはranker、synchronizer、converter、formatter、auto-fixer、policy engine、remediation adviserとして動作してはならない（MUST NOT）。構文だけのparsing、記述されたliteral occurrenceの正確な抽出、機械的なtyped decoding、確定済みdocumented field/ruleに対する分類、文書化済みorder、scope、condition、selection、reference relationshipの投影だけを行ってよい（MAY）。これらの操作は、確定済みcatalogを超える正しさ、有効性、compliance、quality、supportを判定または示唆してはならず（MUST NOT）、parse diagnosticはvalidation findingではなくdescriptive failureのままにしなければならない（MUST）。
- **FR-033**: カスタマイズファイルのsource textと宣言済みmetadataは不活性なtextまたはdataとして表示しなければならない（MUST）。埋め込まれたmarkup、image、link、URI handler、control sequence、その他のcontentを、カスタマイズファイルの表示だけで実行、load、navigateしてはならない（MUST NOT）。
- **FR-034**: `AGENTS.md`というfilenameだけを理由にClaude Code recognitionを付与したり、`.claude/hooks`内の参照されていないscriptをhookと推測したり、単独の`.claude/prompts` directoryをサポート対象Claude Codeカスタマイズファイル種別として扱ったりしてはならない（MUST NOT）。
- **FR-035**: Codex instructionについて、Inspectorは各directoryで空でないinstruction fileを最大1つ選ぶ文書化されたrule—該当するoverrideを最初に、それ以外は通常fileと設定済みfallback name—および、Globalからrepositoryを経由してruntime working directoryへ向かう広いscopeから狭いscopeへのorderを表さなければならない（MUST）。Globalの`AGENTS.override.md`/`AGENTS.md` branchでは、decodeしたnon-binary stringについて、任意の先頭UTF-8 BOMを1つ除去した後に`String.prototype.trim().length === 0`となる場合をemptyとしなければならない（MUST）。Whitespace-only textはemptyであり、保持した`U+FFFD`はnon-whitespaceである。Fallbackはoverrideがabsentまたはemptyの場合に適用する。Binaryまたはunreadableなoverrideは、そのdiagnosticとともにbranchを終了し、fallbackしない。Working directoryまたはconfigurationが不明な場合、そのchainはconditionalのままにしなければならない（MUST）。
- **FR-036**: Claude instructionについて、文書化された広いscopeから狭いscopeへのorder、同じlevelではlocal instructionが通常instructionに続くこと、およびruntime working directoryが不明な場合はworking directoryより下のinstruction fileがconditionalであることを表さなければならない（MUST）。
- **FR-037**: 複数のCopilot instruction sourceが同時に適用され得る場合、またはprecedenceがproduct surfaceによって変わる場合、各recognitionを維持し、一般的なsemantic上の勝者を作り出してはならない（MUST NOT）。
- **FR-038**: 初期リリースの実装とpackageに含む実行可能なapplication codeは、すべてJavaScript/TypeScriptでなければならない（MUST）。CLI、local host、調査対象sourceのfilesystem layerはNode.jsの公開JavaScript API上で動作し、browser logicはJavaScript/TypeScript sourceから生成しなければならない（MUST）。Declarativeな生成済みHTML/CSS、strict JSON manifest、documentation、license fileはpackageへ含めてよい（MAY）。ProductにRust code、Node-APIその他のnative addon、prebuilt native binary、package lifecycleでのcompile、package lifecycleまたはruntimeでのartifact downloadを含めてはならない（MUST NOT）。
- **FR-039**: Inspectorは、originating customization fileを持たない、保守対象の文書化済みnon-file behaviorと、excluded、hosted、runtime inputを、関連するSourceに紐づくevidence付きSource Condition Factとして表さなければならない（MUST）。各factはtool、product surface、文書化済みconditionまたはavailability state、affected scope、不確実性、stable evidenceを特定しなければならない（MUST）。Customization FileおよびTool Recognitionと分離し、file identity、Source-relative path、authored source text、comparison eligibility、relationship origin、read authority、local/hosted read、network requestを作成してはならない（MUST NOT）。Inspectorが観測しない現在のstateは推論せず、conditionalまたはunavailableのままにしなければならない（MUST）。
- **FR-042**: Global disableはscoped client-model disposalではなく、recover可能なcoordinator barrierでなければならない（MUST）。Bundled browserはdisable request送信前にFR-027のfull client-data purgeを実行しなければならない（MUST）。Non-no-op barrierの最初のaccept時、serverは`globalContentEpoch`をatomicにincrementし、non-null `globalDisableInProgress`をinstallし、publication authorityをrevokeし、全inspection-data routeを固定conflictでfenceしなければならない（MUST）。Fence中のsession routeはcontrol/errorだけの`GlobalFenceRecoverySnapshot`だけを返さなければならない（MUST）。各inspection-data successはcaptureしたepochへbindし、responseの最終publish時にepoch不変かつfence nullを再checkしなければならない（MUST）。各liveness successは代わりに、最終response publish時の1つのcurrent coordinator-lock snapshotからexactな`{ sessionId, globalContentEpoch, globalDisableInProgress }`値へbindし、current fenceがnon-nullなら抑制せず報告しなければならない（MUST）。より大きいepochまたはnon-null fenceを観測したclientはrender前にpurgeし、control-only recoveryへ入らなければならない（MUST）。Accept後failureではfence、失敗requestのerror、retry/join controlを保持し、process livenessを維持し、purge済みcontentをrestoreしてはならない（MUST NOT）。Cleanupを確認できない場合はprocess restartをfallbackとする。Accept前failureまたはtrue no-opではfenceをnullのままにし、purge済みclientがfresh full snapshotを直ちに取得可能にしなければならない（MUST）。PublicなGlobal consent、control、Source stateのいずれかが存在する場合、`remove-active-state`成功ではGlobal generation sequence全体とそのSourceを破棄しなければならない（MUST）。Repository sequence、そのgeneration、そのIDは影響を受けない。未公開のoperation-local initial-enable stateだけのcleanupでのみ`cleanup-only`を使用してよく、そのsuccessはcommit済みstateを一切変えずにfenceをremoveしなければならない（MUST）。

### 初期リリースでサポートするカスタマイズファイル

計画phaseでは、実装前にこれらのカスタマイズファイル種別と調査対象パスをその時点の公式仕様と照合し、正確な調査対象パス一覧を確定しなければならない（MUST）。再確認によって曖昧なfilename patternを狭めてよいが、仕様変更なしに別productを追加したり、Global sourceをFR-015からFR-018より広げたりしてはならない（MUST NOT）。確定後のrevalidationはrecurringかつmaintainer所有とする。Maintainerは、すべてのfrozen release candidate前と、supported surfaceへのmaterialなupstream変更を認知した時点で、controlledなofficial-source drift reviewを実行しなければならない（MUST）。Reviewは、reverse-indexされた全affected recordと両言語版のreview、paraphrased assertionとfingerprintの明示更新、`reviewedOn`の前進をもってのみ完了する。

| ツール | Repositoryの調査対象パスとカスタマイズファイル種別 | 明示的な対象外またはconditionalな動作 |
|---|---|---|
| GitHub Copilot | Repository全体およびpath-specific instruction、認識対象`AGENTS.md`、rootの`CLAUDE.md`と`GEMINI.md`、custom agent、`.github/skills`、`.agents/skills`、`.claude/skills`配下のskill、promptとCopilot CLI互換command、hook宣言、exactなVS Code `.vscode/mcp.json`とVS Code 1.118以降のexact workspace root `.mcp.json`を含むMCP宣言、サポート対象settingsとplugin metadata | Surfaceに依存するsupportと文書化されていないprecedenceはconditionalとして表示する。1.118 root `.mcp.json` release assertionはcurrent guideの網羅的location listとconflictし、そのVS Code schemaとtotal same-name orderはunknownのままとするため、このprovenanceはpath/surface-onlyとし、同じphysical fileの独立CLI extractionを分離して保持する。Hosted personalまたはorganization configuration、`COPILOT_CUSTOM_INSTRUCTIONS_DIRS`または`COPILOT_SKILLS_DIRS`で指定する追加directoryは初期リリース対象外。Local originを持たない文書化済みCloud/runtime behaviorはread authorityを持たないSource Condition Factとしてだけ表示でき、hosted stateとconfigurationは調査しない |
| Claude Code | `CLAUDE.md`、`.claude/CLAUDE.md`、`CLAUDE.local.md`、nested instruction file、`.claude/rules`、skill、legacy command、subagent、project/local settings、宣言済みhook、root MCP configuration、output style、marketplace catalog、plugin manifest | Importはrelationshipとしてのみ扱う。`AGENTS.md`をfilenameだけでは認識しない。参照されていないscriptをhookと推測しない。単独の`.claude/prompts` directory、managed settings、managed instructions、無関係なuser stateはRepository source対象外 |
| OpenAI Codex | `AGENTS.md`と`AGENTS.override.md`、`.agents/skills`、custom agent定義、project configuration、hook宣言、MCP宣言、rule、pluginとmarketplace metadata | Project trustまたはworking directoryに依存する実効設定はconditional。非推奨のuser custom promptとuser-level skillはRepository source対象外 |

### 主要Entity

- **Inspection Session**: FR-001で定義した選択済みRepository rootからfilesystem I/Oを行わずbootstrap時に作成したRepository Sourceを正確に1つ、0から3つのtool別Global Source、現在のscan result、source condition fact、comparison selection、diagnosticを含む一時的なユーザー活動。
- **Scan Request**: 不透明な`scanRequestId` 1つで識別する、1つのadmission済みRepository initial scan/明示的rescan、またはnonemptyなinitial-enable/retry `GlobalBatchScan`。決定的なall-rejected Global initial attempt/retryは`active-no-job`でありScan Requestを作らない。Global batchはSourceごとではなく全admit済みtool rootに1 requestを使う。以前のsnapshotまたはstatusが新しいrequestを満たさないよう、すべてのScan Requestのstatusと正常commitしたgenerationをrequestに対応付けたままにする。
- **Source**: 種別（`Repository`または`Global`）、正確に1つのroot location、enabled state、scan status、0件以上のSource Condition Factを持つ、明示的なsource identity。Repository Sourceはstableな`sourceId`とescaped root labelを備えてsession bootstrap時から存在する。Global Sourceはconsent後のatomic commitによってのみ作成し、さらに正確に1つのサポート対象toolで識別する。そのroot内にある異なる種別のcustomization fileは別々のinventory itemとして扱う。
- **Source-relative Path**: カスタマイズファイルを所有するSourceの1つのrootを基準にした、NFCのdisplay、filtering、lookup、selection用path。Repository Sourceの場合に限り選択済みRepository rootからのrepository-relative pathとなり、各Global Sourceは自身のrootとnamespaceを使用する。
- **カスタマイズファイル**: Source-relative Pathで識別される、Source内で発見された1つのfile。Encoding（導出されるread stateもこれが決める）、readableな場合の完全なsource text、recognition、relationship、diagnosticを持つ。
- **Tool Recognition**: カスタマイズファイルに付与するtool-specific interpretation。Tool、file type、文書化されたscopeまたはorder、宣言済みmetadata、不確実性を含む。
- **Evidence Assessment**: 1つのexactなbehavior、rule、strategy subjectに対するatomicなevidence state。Closedなdocumentation completenessとordered lifecycle qualifierを分離する。ProvenanceとRelationship recordは、直接参照するsubjectごとにsort/deduplicate済みassessmentを1件保持し、単一scalarまたはqualifier unionで置換しない。
- **Relationship**: カスタマイズファイルから別pathまたは宣言済みcomponentへの、実行されない参照。Import contentを展開せず、boundaryとresolution status、およびrecord単位のevidence assessmentを含む。
- **Source Condition Fact**: Originating customization fileを持たない、文書化済みnon-file behaviorまたはexcluded、hosted、runtime inputについての、evidence付きsource-scoped statement。関連toolとsurface、conditionまたはavailability、affected scope、不確実性、evidenceを特定するが、file identity、Source-relative Path、authored source text、comparison eligibility、Relationship origin、read authorityを持たない。Localまたはhosted I/Oを発生させず、未観測の現在stateはconditionalまたはunavailableのままにする。
- **Diagnostic**: カスタマイズsource valueを複製しない、session内だけの情報であり、空結果、決定的なmalformedまたはbinary content outcome、不確実性、stale file、cycle、boundary violationを実行可能に説明し、正確に1つのlocation scopeを持つ。File-scoped Diagnosticはcoherentな`sourceId`、`fileId`、`sourceRelativePath` tupleを必須とし（MUST）、fileは特定したSourceに属し、pathはそのSource内での当該fileのpathでなければならない（MUST）。Source-scoped Diagnosticは`sourceId`だけを必須とし（MUST）、`fileId`と`sourceRelativePath`を禁止しなければならない（MUST）。Session-scoped Diagnosticは`sourceId`、`fileId`、`sourceRelativePath`をすべて禁止しなければならない（MUST）。このlocation scopeは、Diagnosticがcommit済みgenerationまたはsession lifecycleのどちらに属するかとは独立する。1つのfileに限定されない予期しないfailureは通常のerrorとして表面化し、Diagnosticにはならない。

## 品質要件 *(必須)*

### 保守性とコードの明確さ

- **QR-001**: 調査対象パスの定義、source boundary、recognition、precedence ruleは、無関係なtoolを変更せずに1つのtoolを更新できる凝集したownershipと明示的なinvariantを持たなければならない（MUST）。自明でないsecurityまたはcompatibility判断には理由を文書化し、抽象化は実際に共通することが示された振る舞いだけに限定しなければならない（MUST）。

### テストと検証

- **QR-002**: 自動検証は、各toolの調査対象パス一覧に含まれるpathと含まれないpath、multi-tool recognition、source separation、決定的なorderとfallback、すべてのuncertainty state、comparison、opt-inとdisable flow、不正なfile、encoding、回復可能な環境/runtime failure、symlinkの透過的なread、最後にcommitされたsnapshotへの致命的な再scanのrollback、リテラルcredentialの正確な表示、環境変数参照の非解決、ならびに実行、source mutation、MCP connection、禁止対象のカスタマイズファイル起因network accessがゼロであることを示すregression testを扱わなければならない（MUST）。Network verificationは、loopback host自身のstatic assetとlocal session API以外のproduct発行requestが0件であることを要求しなければならない（MUST）。さらにSC-002のreference profileとfixture digestのvalidation、現在のrequestに対する客観的なqualifying-status assertion、origin-file-less Source Condition Factについて正しいsource、tool、surface、status、evidenceを保った分離とsynthetic fileゼロ・local/hosted I/Oゼロも検証しなければならない（MUST）。SC-003、SC-004、SC-005、SC-007、SC-009のcheck-in済みrelease-evidence fixture manifestについて、schema、version、再現可能なmanifest digest、一意でstableなcase ID、criterionとrequired-classのmembership、fixtureまたは決定的builderへのreference、客観的expected outcome、参照fixtureのcontent digestを検証しなければならない（MUST）。すべてのrequired classは空でなく、参照された全caseが存在して実行され、measurement recordは正確なmanifest version、manifest digest、実行済みcase IDを識別しなければならない（MUST）。すべてのerror caseには客観的な期待結果が必要であり、end-to-end browser testは4つのuser storyすべてを扱わなければならない（MUST）。Diagnosticの検証はclosedなfile、source、session scope unionを扱わなければならない（MUST）。File scopeはcoherentな`sourceId`/`fileId`/`sourceRelativePath` tupleを必須とし、source scopeは`sourceId`だけを必須として`fileId`/`sourceRelativePath`を禁止し、session scopeは3つすべてを禁止する。これらのDiagnostic entity invariantに違反する、欠落、余分、Source間で不整合、または捏造されたlocation tupleをすべて拒否しなければならず（MUST）、commit済みgenerationとsession-lifecycleのどちらに属するかは直交するlifetime上の問題として扱わなければならない（MUST）。
  検証はproductのfilesystem requestを計測して、mutation可能なoperationが0件であること、および観測可能な範囲でcontent、length、identity、link state、mode、modification/change time、extended attributeまたはACLが変化しないことを証明し、OSだけによるaccess-time変更を別に記録しなければならない（MUST）。Node.jsには安定したextended-attribute/ACL APIが存在しないため、それらの属性については直接のbefore/after snapshotではなく変更時刻（`ctime`）の観測が文書化された間接signalとなる。製品がfile size、item件数、parser構造、request/response size、queue、時間、concurrencyのvalidation上限を定義しないこと、失敗したrequestがsessionを利用可能なまま残すこと、適用時にpublication authorityが取り消されること、破棄された遅延resultがsnapshotへ決して入らないことを検証しなければならない（MUST）。Cross-surface negative contract/browser/CLI-output/documentation testは、Inventory、Detail、Comparison、Global control、Diagnostic、Source Condition Fact、API response、CLI output、documentationがvalidationまたはlint、natural-languageの意味解釈またはrank付け、正しさ・有効性・compliance・qualityの判定、contentのsynchronization、conversion、formatting、fixing、policy engineとしての動作、remediation adviceを行わないことを証明しなければならない（MUST）。SC-002検証は、自動の初回Repository scanの完了を待ち、明示的Repository rescanを1回送信し、qualifying statusと、timerを止めるinventoryをrenderするgenerationとで同じ`scanRequestId`を要求しなければならない（MUST）。

  Evidence検証は、behavior、rule、strategy subjectごとにassessmentを正確に1件要求し、closed enum外のdocumentation-status value、重複または順序違反のlifecycle qualifier、`documentation-conflict`のdocumentation statusとしての使用をすべてrejectし、provenanceとRelationship DTOがsort/deduplicate済みrecord単位の`EvidenceAssessment[]`をscalarまたはunionへ縮約せず保持することを証明しなければならない（MUST）。

### セキュリティとプライバシー

- **QR-003**: Viewing sessionは起動元machineからのみ到達可能でなければならない（MUST）。Hostはloopbackだけにbindし、その外へ公開してはならない（MUST NOT）。配信contentにはユーザー自身のsecretが含まれ得るからである。Session hostはそのbindingの内側で認証なしに動作し、他のlocal processおよびDNS rebinding経由の悪意あるweb pageがInspector実行中にsessionへ到達し得る残存limitationをdocumentationに明記しなければならない（MUST）。調査対象sourceのI/Oは単一のinspection moduleにとどめ、read-onlyとする。完全なauthored contentはloopback session APIだけから返してよく（MAY）、bundled browserではmemory内acknowledgementの後にだけ表示する。Contentはinertかつsession内だけに保ち、永続化、別machineまたはremote serviceへの送信、logまたはtelemetryへの複製をしてはならない（MUST NOT）。

### ドキュメントと参加しやすさ

- **QR-004**: 英語・日本語のユーザー文書とContributor文書は意味的に同等であり、launchとsetup、既定の`process.cwd()` Repository rootと任意の`--cwd <path>`選択semantics、正確な調査対象パス一覧、source boundaryとsession-wide all-tools Global consent、conditional interpretation、完全なsource表示と機密値に関する警告、環境変数参照を解決しないこと、環境由来のresource behavior、diagnostic、対象外動作を説明しなければならない（MUST）。主要なdiscovery、inspection、comparison、consent workflowはkeyboardで操作でき、意味のあるlabelとfocus stateを提供し、ローカルbrowser interfaceに適用されるWCAG 2.2 AA基準を満たさなければならない（MUST）。Maintainerは、WCAG 2.2のLevel AおよびAA success criterionをすべて列挙する、意味的に同等な英語・日本語のWCAG 2.2 AA applicability/acceptance matrixを維持しなければならない（MUST）。各criterion rowはapplicableかどうかを示し、非適用のrowはcriterion固有の理由を示さなければならない（MUST）。Applicableな各rowは、必要なautomated check、manual checkまたはその両方をstable IDで名称付きにし、expected resultと記録済みevidenceを示さなければならない（MUST）。Matrixはpacked release candidate、両locale、正確にfreezeしたplatform/browser/assistive-technology version、viewport/orientation/zoom/text-spacing profile、UI mode、workflow state、input profileを使うclosed manual execution matrixを定義し、applicableなmanual cellをすべて記録しなければならない（MUST）。Frozen releaseまたはmatrixを変更した場合は全manual checkを再実行しなければならない（MUST）。Error messageは問題と実用的な次の手順の両方を示さなければならない（MUST）。
- **QR-005**: 保守するすべてのvendor behavior、Inspector rule、runtime-composition strategyは、canonicalな第一者documentation URL、正確なreview済みsection、review dateへ解決する1つ以上のstable source IDを参照しなければならない（MUST）。Atomicなbehavior、rule、strategy assertionはそれぞれ、正確な`subjectKind`、`subjectId`、`documentationStatus`、`lifecycleQualifiers`を持つ1件の`EvidenceAssessment`を所有しなければならない（MUST）。複数assertionに依存するprovenanceとrelationship recordは、決定的なrecord単位の`EvidenceAssessment[]`を維持し、subjectとの対応を失う単一scalar、best/worst status、またはunionへ平坦化してはならない（MUST NOT）。`documentationStatus`はclosed enum `documented | partially-documented | unknown | conflict`とする。`documented`は引用したofficial sectionが保守対象assertionを完全に確立すること、`partially-documented`は一部だけを確立すること、`unknown`はそのassertionについて決定を確立しないこと、`conflict`は保持したofficial assertionに互換性がないことを表す。`lifecycleQualifiers`は`preview`、`experimental`、`deprecated`の固定順で重複のないarrayとする。Empty arrayはlifecycle claimがないことだけを表し、`stable`として表示してはならない（MUST NOT）。保守するpath、schema、またはprecedence assertionがそのsurfaceの全review済みversionで有効ではない場合、所有rowはversion gateを明示しなければならず（MUST）、upstreamがversion tokenを公開する場合は正確なtoken（例: `VS Code 1.118+`）で示し、公開しない場合は未解決の`engine-version` condition factを名指しし、そのgateを確立するversion付きrelease noteまたはchangelog sectionを引用しなければならない（MUST）。そのgateのeffective dateは、引用したreleaseが公開する場合にだけ存在する。日付なしまたはrollingなpageでversion gateを確立してはならず（MUST NOT）、引用したassertionを超えるrollout stateは推測せず`documentationStatus`と`lifecycleQualifiers`に保持しなければならない（MUST）。`documentation-conflict`はruntime projectionで使う`ConditionFact.status`の値のままとし、`documentationStatus`のaliasにしてはならない（MUST NOT）。Vendor lookup behavior、Inspector matcher、runtime compositionはownershipを分離し、各製品は独自のbehavior文書を持ち、Repository behaviorとUser/Global behaviorは別表を使用し、GitHub CopilotのVS Code、CLI、Cloud behaviorは別表を使用しなければならない（MUST）。すべてのRepository matcherは、selectorをauthorしたtyped segment array program — selected Repository rootを基点とするliteral、regex、非隣接recursive-directory segment — として示さなければならず（MUST）、globのように見えるrendered string形式を持たない。自動documentation checkは、closed assessment enumと順序、record単位のsubject identity、英日parity、identifier uniqueness、相互参照、controlled official-source driftを検証し、behavior、rule、strategyを自動変更してはならない（MUST NOT）。

## 成功基準 *(必須)*

### 測定可能な成果

**初回利用者評価のガバナンス**

20人による評価はinitial-release candidateについて1回実施する。自動checkとprojectに詳しいcontributorだけでは、project contextを持たない初回利用者が発見と正しい解釈を行えることを確認できないためである。固定denominatorは観測した19/20と18/20のthresholdを明示するためのものであり、population-levelの統計的主張ではない。重複recruitmentを避けるため、SC-001とSC-006では同じcohortとsessionを再利用しなければならない（MUST）。

このrelease evidenceはmaintainer teamが担当する。Pull requestごとの義務ではなく、通常のcontributorへ参加者のrecruit、費用負担、moderation、reviewを求めてはならない（MUST NOT）。Enrollment前にmaintainerは、accountable study owner、recruitmentとparticipant-compensationのfunding owner、moderatorとrequired reviewer roster、scheduleとcontact/support path、consent/privacyと匿名化retention procedure、提供するtest repositoryとequipment/session support、合理的なaccessibility accommodationを示すbilingual study planを公開しなければならない（MUST）。Repository bundle、work root、candidate、capture、evidence、runtime IPC外のseparately governed access-controlled administrative assignment recordはcaseごとのunique human reviewer pairをauditし、scoring byteへ影響またはruntime/evidenceへcrossせず、published consent-retention policyに従いdestroyしなければならない（MUST）。Participantにpersonal repository、paid product、personal expenditureを要求してはならない（MUST NOT）。Study resourceが不足する場合はinitial-release claimをblockするが、それ以外は適合するcontributionのreviewをblockしない。SC-001開始前にstudy recordは、全participantが使用するexact packed release-candidate tarballのSHA-256 digestと、exact bilingual guidance、task prompt、evaluation fixture、prepared state、response form、ground truth、scoring rubricを列挙するcanonical study-input digestをfreezeしなければならない（MUST）。SC-001/SC-006 evidenceはこの2つのdigestだけに対して有効である。Primary workflowまたは列挙済みstudy inputへのmaterial change後はstudyを再実施しなければならず（MUST）、packed candidateのbyteが1つでも変われば、このevidenceに対してmaterialとして扱い、以前のresultを無効にしなければならない（MUST）。Release approvalではfinal packed-candidate digestを有効なstudy recordへbindするか、そのfinal candidateに対して完全なSC-001/SC-006 protocolを再実施しなければならない（MUST）。

Study-input digestは、check-in済みでversion付きのmanifest 1件とclosed bundle root
`tests/usability/sc001-sc006-study-inputs/` 1件から再現可能でなければならない（MUST）。別にdigest-bindするcandidate tarballとstudy
equipment/runtimeを除き、participant、moderator、scorerが使用する全byteはrepository-owned builderだけから得て、構造的に独立した
verifierがacceptしなければならず（MUST）、追加のlocal、remote、printed、ad hoc materialを認めてはならない（MUST NOT）。
`manifestVersion`は1から始まるpositive safe integer、`bundleRoot`は末尾`/`を含むそのexact literal、`inputs`はnonempty、closed input
roleはすべてnonzero coverageでなければならない（MUST）。Manifestは、bundle内でrecursiveに発見した全regular fileをunique stable input
ID、closed input role、`bundleRoot`配下のuniqueな`/`-normalized repository-relative path、そのfileのlowercase SHA-256 digestで列挙しなければならず
（MUST）、bilingual materialはlanguage別entryを持たなければならない（MUST）。Recursive bundle regular-file setとmanifest path setはexactに
一致しなければならない（MUST）。Symbolic link、junction、non-regular object、hard-link alias、使用不能なidentity/link metadata、path
escape、source/derived/destinationのmissing/extra file、verified builder/bundle以外のdelivery pathはenrollment前にfailureにしなければならない
（MUST）。Canonical byteは`Buffer.from(JSON.stringify(canonicalValue, null, 2) + '\n', 'utf8')`とし、`canonicalValue`はUnicode
normalizationなしで新規構築し、root propertyを`manifestVersion`、`bundleRoot`、`inputs`、各entry propertyを`inputId`、`role`、`path`、
`sha256`の順にinsertし、entryを`inputId`のraw UTF-16 code-unit順にsortしなければならない（MUST）。このexact Node.js 24/26
`JSON.stringify` procedureでstring escaping/number spellingを固定し、parse equivalenceでなくbyte-for-byte比較でcanonicalityを判定しなければ
ならない（MUST）。Companion fileはexact manifest byteのlowercase SHA-256と末尾LF正確に1件を含まなければならない（MUST）。Manifest/inputの
missing、extra、duplicate、unordered、unreadable、non-canonical、invalid path、empty role、digest mismatch、またはunmanifested supplied byteは、
enrollment前に両criterionをfailureにしなければならない（MUST）。Study-kit authoringはcandidate-independent bundle/manifest/companionを
materializeしてexact-set contractをpassさせなければならない（MUST）。SC-001直前にbuilderはexactly 20件のfresh distributionをmaterializeし、
verifierはsource bundleと20件すべてをrewriteせず再列挙し、candidate authority/byteをread、stat、hash、freezeしてはならない（MUST NOT）。
成功した`verify -- inputs`がfreezeするのはverified canonical study-input-manifest digestとexact-set stateだけとする。
`capture -- start`をcandidate authorityをreadする最初のphaseとし、capture開始前にcandidateをreopen、stat、hashしてidentityとSHA-256を
freezeし、既にverifiedなmanifest digestへbindしなければならない（MUST）。

各distribution rootはdirect-child directory `study-inputs/`と`repository/`のexact 2件だけを含み、他のdirect childを含めてはならない
（MUST NOT）。`study-inputs/`はverified source bundleとbyte-for-byte一致するexact 16 bundle memberだけをdirect-child nameのまま含める。
`repository/`は該当descriptor outputが定義するregular fileとimplied directoryだけを含める。別にbindするcandidateとequipment/runtimeは
distribution root外に置かなければならない（MUST）。Cross-namespace collision、extra top-level member/sidecar、alias、reused file identity、
root escapeはenrollment前にfailureにしなければならない（MUST）。

Pairの`evaluation-fixture.json` bundle memberは、`repository/`を基準にmaterializeするparticipant-repositoryの全output path、encoding、
exact byte representation、lowercase digestをclosedにしなければならない（MUST）。Repository-ownedでdigest-boundなbuilder/verifierだけが
derived fixture byteをmaterializeでき、20件すべてのactual distributionがdescriptorのexact set/byteを再現しなければならない（MUST）。
Derived outputのmissing、extra、alias、driftは同じpre-enrollment exact-set gateをfailureにしなければならない（MUST）。

**Release-Evidence Fixtureのガバナンス**

Release candidateごとに、SC-003、SC-004、SC-005、SC-007、SC-009は測定前にfreezeしたcheck-in済みでversion付きのrelease-evidence fixture manifestを1つ使用しなければならない（MUST）。Manifestの各caseは、一意でstableなcase ID、criterionとrequired-classのmembership、fixtureまたは決定的builderへのreference、客観的expected outcome、参照するすべてのfixture byteのdigestを持たなければならない（MUST）。各evidence recordはmanifest versionと再現可能なdigestを識別し、実行した正確なcase IDを記録し、該当criterionが指定するrequired classごとに0件ではない件数を示さなければならない（MUST）。Caseのremove/reclassify、required-class定義の変更、expected outcomeの変更は、manifest versionをincrementし、明示的なreviewを受け、新しい直接比較不能なmeasurement setを開始しなければならない（MUST）。参照fixture byteだけを変更する場合は、影響する全fixture digestとcanonical manifest digestを更新し、その場合も新しい直接比較不能なmeasurement setを開始しなければならない（MUST）。Digestの変更だけでdenominator semanticsの変更を認可してはならない（MUST NOT）。Manifestの欠落、空、read不能、digest不一致、caseの欠落または重複、required classの空集合、参照fixtureの欠落、result未記録、manifest記載caseの省略は、影響するすべてのcriterionをfailureにしなければならず（MUST）、release denominatorを黙って減らしてはならない（MUST NOT）。

実際にdenominator semanticsを変更する場合、release validationは変更前後のmanifest version、変更したcase ID、required-class定義またはexpected outcome、明示的なreviewer decisionまたはreview referenceを記録しなければならない（MUST）。Automated contract testはtable-drivenなprevious/current manifest revision pairに対してversion/digest transition ruleを検証しなければならないが（MUST）、そのtestがhuman reviewを立証すると主張してはならない（MUST NOT）。初回manifest作成にはprior revisionがないことを明記しなければならない（MUST）。

- **SC-001**: 通常の開発作業でGitとcommand-line interfaceを使用しているがInspectorを利用したことも開発へ参加したこともない初回利用者を正確に20人とする評価で、19人以上が提供されたproduct guidanceだけを使い、準備済みの意図するRepository rootからInspectorを起動して、2分以内に発見されたカスタマイズファイルを1つ開ける。2分timerは標準化された課題文を提示した時点で開始し（MUST）、発見されたカスタマイズファイル1つのsource/details viewが画面に開かれて操作可能になった時点で終了しなければならない（MUST）。したがって、計測時間には固定launch commandの入力と、機材が準備した意図するRepository rootからのInspector起動を含む。移動または`--cwd`によるroot選択は、この評価における計測対象のparticipant操作ではなく、automatedなUser Story 1テストで検証されるproduct capabilityである。Automatic browser openingがdisabled、unsupported、failure、unavailable/unidentifiable、またはcertification baseline外へ解決された場合、pin済みcertified browserでprinted URLを使うfallbackは提供済みproduct guidanceの一部とし、使用・記録しなければならず（MUST）、timerをpauseまたはrestartしてはならない（MUST NOT）。Automatic-opening failureだけを理由に不成功としてはならず（MUST NOT）、participantが禁止されたhintなしで元の2分以内にfallbackを完了すればsuccessとする。Completionを妨げる、または中断する機材、環境、product failureは引き続き不成功として数える。同じevaluation sessionでSC-006にも同じparticipant cohortを使用し（MUST）、SC-001を先に実施しなければならない（MUST）。Moderatorは標準化された課題文を同じ文面で読み直してよいが（MAY）、いずれの基準でもcommand、navigation、interface操作のヒントを提供してはならない（MUST NOT）。参加者を20人のcohortへ登録した後は、基準の実施を妨げる、または中断する機材、環境、productのfailureを、そのtask timerの開始前に発生した場合も含めて当該基準の不成功として数えなければならず（MUST）、参加者を除外または差し替えてはならない（MUST NOT）。
- **SC-002**: Filesystem entryが100,000件、該当するカスタマイズファイルが500件あるリポジトリについて、version付きで公開したSC-002 reference-environment profile上で、10秒以内に完全な一覧を受け取り、1秒以内に現在のrequestに対するqualifying scan statusを確認できる。このworkloadに一致するdeterministicなfixtureを測定前に1つ用意し（MUST）、内容を変更せず10回の測定runすべてで再利用しなければならない（MUST）。Fixtureの構築とsetupは計測時間に含めてはならない（MUST NOT）。各runは、その新しいprocessの自動初回Repository scanがterminal stateになるまで待ち、その後browserから正確に1回の明示的Repository rescanを送信しなければならない（MUST）。両方のtimerはBrowserがそのrescan requestをdispatchした時点で開始しなければならない（MUST）。Admission responseは不透明な`scanRequestId`を返さなければならない（MUST）。1秒timerは、Clarificationsで定義したqualifying statusが画面に表示されassistive technologyにも公開され、同じrequestを識別した時点だけで終了しなければならない（MUST）。10秒timerは、同じrequestがcommitしたgenerationの完全なinventoryが表示され主要な一覧操作が可能になった時点だけで終了し、それ以前のstatus、snapshot、自動scan generationがいずれかの停止条件を満たしてはならない（MUST NOT）。各runでそのrequest-correlatedな完全inventoryが操作可能になった後、標準化されたfilter actionとitem-selection actionを1回ずつ実施しなければならない（MUST）。各interaction timerはBrowserが対応するinputをdispatchした時点で開始し、filtered resultまたはselected-state feedbackが表示され操作可能になった時点で終了しなければならない（MUST）。`npx`のdownload、installation、process起動時間、自動初回scanはこれらのtimerに含めてはならない（MUST NOT）。1つのmeasurement setは同じprofileで正確に10回測定して構成し（MUST）、9回以上が2つのscan時間基準をrunごとに満たし、かつ標準化された両interactionを100ミリ秒未満に保たなければならない（MUST）。各測定runは以前のprocess終了後に新しいInspector processを起動し（MUST）、別runのapplication memory stateまたは以前のscan snapshotを再利用してはならない（MUST NOT）。Operating systemのfilesystem cacheはrun間で意図的にclearまたはresetしてはならず（MUST NOT）、10回のrunは自然に変化するcache stateを使用しなければならない（MUST）。Measurement recordはprofile ID、fixture digest、request ID、commit済みgeneration、実際のenvironment valueを記載しなければならない（MUST）。Profileを変更すると新しい直接比較不能なmeasurement setを開始する。この結果は公開したprofile固有であり、別環境へ適用できる性能保証ではない。
  Check-in済みSC-002 profileは、version付きcanonical fixture manifest 1件とそのSHA-256 digestを指定しなければならない（MUST）。Manifestは100,000-entry/500-match fixtureを再現するために必要な全generated entryと全content-bearing file digestを列挙しなければならない（MUST）。最初のmeasured run直前と各measured run直後にcanonical manifest digestと参照する全content digestを再計算しなければならず（MUST）、mismatch、missing entry、digest driftが1件でもあればmeasurement set全体を無効とする。各run recordは同じprofile ID、manifest version、canonical digestを繰り返し記録しなければならない（MUST）。
- **SC-003**: SC-003 manifestは、サポート対象のexactな`(tool, customization file type, admitted source form)` rowごとにpositive fixtureを1件以上、freezeしたinspection-path selector familyごとにrejected near-miss fixtureを1件以上、文書化済みmulti-tool attribution combinationごとにshared-physical-file fixtureを1件以上含めなければならない（MUST）。Manifest記載fixture全体で、調査対象パス一覧に含まれるサポート対象カスタマイズファイルの認識率100%、一覧外のファイルを解釈する件数0、共有物理ファイルに対するmulti-tool attributionの正解率100%を達成する。
- **SC-004**: SC-004 manifestは、サポート対象toolごと、禁止対象effect class（カスタマイズファイル由来のcommandまたはcode execution、child process、MCP connection、FR-022で定義したdirect product-issued outbound request、product起因の調査対象source mutation）ごと、およびRepositoryとGlobalの各source kindについてboundary外selectorを1件以上含めなければならない（MUST）。Manifest記載fixtureの100%において、inspectionはカスタマイズファイル由来のcommandまたはcode execution、child process、MCP connection、direct product-issued outbound request、product起因の調査対象source mutationを0件とし、有効なsource boundary外として拒否されたselectorに対する意図的なread requestを0件とする。Direct-request assertionは対象product network/URL/MCP surfaceをinstrumentし、exactな2つのFR-022 authorized internal loopback class、すなわちpackaged UI assetへのstatic/SPA `GET`/`HEAD`と、発行済み`localhost` authorityにおけるlocal session API channelを別々に分類・検証し、それ以外のinstrument済みsurfaceで禁止対象request 0件を要求しなければならない（MUST）。全fixture rootがlocalであることも記録しなければならない（MUST）。Lexicalに識別不能なpre-mounted/mapped network filesystemはこのassertionの対象外としてFR-022のplatform/environment limitationとして文書化したまま残し、explicit UNC/server-share/device vectorはfilesystem、DNS、SMB call 0件を証明しなければならない（MUST）。Mutation assertionはproductのfilesystem operationをinstrumentし、platformが公開する範囲でcontent、length、identity、link state、mode、modification/change time、extended attributeまたはACLが変化しないことを観測しなければならない（MUST）。OSのread semanticsだけに起因するaccess-time変更は別に記録し、このcriterionをfailにせず、product起因mutationの証拠にしてはならない（MUST NOT）。
- **SC-005**: SC-005 manifestは、サポート対象のexactな`(tool, customization file type, admitted source form)` rowごとに読み取り可能なexact-display fixtureを1件以上含み、source/comparison両surface、literal-credential/environment-variable-reference両class、set-sentinel/unset referenced-variable両stateについて0件ではないcaseを持たなければならない（MUST）。Manifest記載fixtureの100%で、リテラルcredential値と環境変数参照textがsource viewとcomparison viewにmaskされず変更なしで表示され、参照先のprocess environment値が表示contentへ混入せず、maskまたはreveal controlも表示されない。
- **SC-006**: SC-001を実施した後、同じevaluation sessionの同じ初回利用者20人がSC-006を実施する。SC-001の結果にかかわらず、全参加者は同じ指定カスタマイズファイルが開かれた同一の準備済みInspector stateから開始し、state準備完了と標準課題提示時に2分timerを開始しなければならない（MUST）。各参加者はsource、認識tool、file type、effective behaviorがcertainかconditionalかの4必須項目を回答し、2分以内の全項目ground-truth一致だけを成功とする。18人以上がproduct guidanceとSC-001 moderator policyだけで成功しなければならない（MUST）。その後も20人全員がcomparisonとGlobal consentを実施し、SC-001 discoveryとSC-006 inspectionを合わせて4 workflowすべてを完了する。全participant/equipment/environment/product outcomeを除外・差替えせず記録する。Study equipmentはproduct network/URL/MCP instrumentation、exact-authority server ledger、study-browser captureを全観察で継続する。Fetch Metadataはconsistency signalであり、単独でhuman-initiated navigationを証明しない。`participant`とするにはvalid marker、participant-shaped Fetch Metadata tuple、exact authorized-static target、current armed `StudyParticipantNavigationGrant`の全てが一致しなければならず、proxyはgrantのcorrelation IDをinjectして1回だけconsumeする。Page-script navigation、nonexact target、replayなど、exact armed grantのないparticipant-shaped requestはopen binding IDの`unknown`とし、product-attributable/prohibitedでblockする。Bundled-SPA、extension、missing/invalid marker rowはclosed ruleを維持する。Proxy/serverは6つのFetch Metadata/Origin/Referer fieldを独立projectし、raw valueをdiscardして一致させ、brokerはgrant/correlationを独立validateする。Unintended execution、source mutation、禁止outbound/MCP、2つのauthorized loopback class外request、cross-machine content exposureはautomatic criticalとする。ACK済みcontext correlationはfailure用eligible linkにすぎない。Successはsubmission correlation/review fieldを`not-applicable`のままにし、accepted automatic issueは全て別countする。Eligible candidateがあるfailureはexact correlationの`automatic-critical`をreviewなしで必須とし、candidate-free failureだけをisolated/hidden/one-use reviewer process 2件でreviewし、両`product-caused-blocker`は`reviewer-confirmed-critical`、両`not-product-caused-blocker`は`reviewer-cleared`、一方ずつは`reviewer-disagreement-critical`とする。Successは`not-applicable`とする。Reviewer identity、note、communication、reuse、第三者裁定を禁止する。Confirmed/disagreementだけが`effectClass: workflow-blocker`を使い、その他は`none`とする。Issue IDはexact `automatic:<correlationId>`と`reviewer:<subjectId>:<workflowClass>`からderiveする。20人全員がexact 4 terminal outcomeを持ち、verifierがそのtagged/deduplicated unionをautomatic-linked rowの二重計上なしでemptyと再計算した場合だけzero-critical gateをpassする。

  上記Reviewer identity/assignment禁止のscopeはcollector、outcome、repository study-input artifact、runtime IPC、capture、evidenceとし、published reviewer rosterおよびseparate access-controlled administrative assignment recordは前述governance ruleに従う。Fresh HTTP requestがarmed grantを持たない、target不一致、page-script由来、またはgrant消費後である場合はfresh proxy IDを持つsafe blocked `unknown` observationとし、grantをconsumeせずrunをinvalidateしない。Authenticated candidate/grant IPCのreplay/duplicate/stale、simultaneous second consumption、broker decision/ACKのskip/mismatchだけがrun invalidationとなる。

  上記のreviewer reuse禁止はhuman、collector process/component-run identity、case assignmentを対象とする。Literal reviewer slot labelとsanitized terminal-equipment surfaceはdrain/resetしてfresh case mappingで再利用してよい。

  必須capture roleは正確に`product-instrumentation`、`inspector-server-ledger`、`study-browser`の3件とし、各roleは別々のadapter/watchdog processを使う。Watchdogだけがenvelope writerで、adapterはraw trafficをmemory内で一時分類し、IPC前にdiscardしてclosed safe eventだけを送る。Retain/transmit/hash/error payloadはfixed code、protocol-owner-generated opaque ID、boolean/enum、safe integer、evidence digestだけを許可し、raw header name/framing/wire representation/encoded value/noncanonical derivative、body、content/metadata、participant response、path、URL/authority、capability、environment、raw error/exceptionを禁止する。唯一のheader-derived例外はclosed supervisor-grant/proxy/runtime protocolが所有するstrict validation済みdecoded canonical safe IDであり、`correlationId`としてretained canonical payloadとdigest chainへ入る。`payloadSha256`はそのcanonical safe bytesだけを被覆し、captured wire/browser/Inspector bytesを被覆してはならない（MUST NOT）。

  Capture start時にsupervisorは、fresh、unique、cryptographically random、run-local、unlinkableなparticipant tokenを正確に20件作成し、
  各tokenをexact 32 random byte（256 bit）からunpadded base64url正確に43文字でencodeしなければならない（MUST）。Participant固有
  observationの`subjectId`はそのtokenの1つ、participant非固有observationはliteral `not-applicable`を使用しなければならない（MUST）。
  `subjectId`だけを明示的に許可するpseudonymous human evidenceとし、real
  identity、distribution slot、responseその他のparticipant属性をencodeせず、retained external mappingを持たない。Runごとにfresh生成し、
  supervisorはidentityまたはdistribution mappingを保持せず、そのrun限定のordered token setのみを保持し、次のtokenだけをそのattemptのauthenticated
  `attempt-binding`内で送らなければならない（MUST）。Harnessはattemptをscheduleするだけで、tokenを作成または選択してはならない（MUST NOT）。
  Verifierはそのrun内のuniquenessだけを検証し、cross-run token registryを持たない。`study-browser` streamをworkflow outcomeのsole authorityとし、20 tokenそれぞれについて`discovery`、
  `inspection`、`comparison`、`global-consent`ごとにterminalな`success | failure`を正確に1件、合計80件保持しなければならない（MUST）。
  Subject/workflow pairのmissing、duplicate、extra、mismatchを許可してはならない（MUST NOT）。20 tokenすべてを両denominatorに残し、
  discoveryは20件中19件以上、inspectionは20件中18件以上をsuccessとしなければならない（MUST）。Observation内のnonterminalまたは
  request-event messageは引き続き任意件送ってよい（MAY）。Exact-80 cardinality/canonicalityはsuccess thresholdから独立して評価しなければ
  ならない（MUST）。Validなterminal record 80件があればthreshold未達でもverification、stop、finalize、witness、sealを完了してよい（MAY）。
  Threshold未達は該当release criterionをblockするがevidenceをinvalidateせずautomatic criticalにもしてはならず（MUST NOT）、protocol、
  cardinality、authentication、privacy違反は別にfail closedとしなければならない（MUST）。

  `capture -- start`はrun-levelのみとし、materializeが一度だけ起動した既存のlive supervisorを通じてproxy/listenerをbindし、study harness、scoring moderator、3 adapterをlaunchし、各adapterに自身のwatchdogをlaunchさせ、watchdogがadapter childであるexact 8 internal long-lived descendant/processを構成し、
  3つのlive stream `capture-start`を開始するが、attempt profile、marker、grant、candidate、correlation、workflow evidenceは作成しない。
  Attemptはstrictly sequentialとし、participant 1〜19は各々discovery、inspection、comparison、Global consentを完了し、fully closeしてから次を開始する。
  Participant 20はdiscoveryを完了し、defined failureでterminalize済みでなければsole open attemptとしてcheckpoint/handoffを越え、continuationで残る3 workflowを完了する。
  これによりcheckpointに20件すべてのSC-001 outcomeを含めつつ、live attemptは常に最大1件とする。Participant 20がterminalize済みならpost-anchor heartbeatをcontinuation progressとする。
  各attemptのfresh profile/binding/secret/marker/bootstrapはrun stream開始後かつ対象`npx`/first capturable requestの直前に作成する。

  Authorized materialize caller/study setupはpairwise-distinctでbidirectional/nonrecordingなexternal terminal-equipment handle 4件を用意し、descriptor 6をparticipant、7をmoderator、8を`reviewer-one`、9を`reviewer-two`に固定する。これらはinherited internal evidence IPCではない。Materializerはsupervisor launch前にstable handle identity、distinctness、bidirectionality、history/recordingなし、echoなしをverifyし、その固定descriptorだけをsupervisorへ継承する。Supervisorはdescriptor 6を保持し、scoring moderator launch時に7〜9を渡して自身のcopyを直ちにcloseする。Missing/alias/swap/recordable/echoing/extra handleはenrollment/participant launch前にrunをinvalidateする。

  Digest-bound capture script内のstudy harness/scoring moderatorはruntime-only `StudyCurrentSubjectScoringContext`をexact 1件だけ保持する。
  Exact safe rootは`schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`,
  `automaticIssueCorrelationId`, `terminalizationClass`, `state`とする。Launch/bootstrapとpre-readiness buffer中はdiscovery contextを作らない。Fresh process bind、
  ordered pre-readiness release、open-bindingの両ACK後にsupervisorがdiscovery contextをopenし、moderatorの`scoring-context` ACKを得た後だけ
  readiness responseを返し、その後にparticipant-navigation grant、navigation、prompt/timer/taskへ進む。Buffered pre-readiness observationはworkflow/process/link fieldを`not-applicable`とし、後のworkflow contextを
  updateできず、prohibitedなら別のautomatic issueとしてcountする。Initial値はcorrelation `not-applicable`/class `none`とし、open中に許可するone-way updateは
  correlationをsame-run/subject/process/workflowのfirst accepted nonworkflow prohibited observationへ1回だけ設定すること、terminalization classをmapped causeへ1回だけ設定することのみとする。
  Terminalization後のremaining-workflow contextはmapped classで初期化し、その他のmutationをrejectする。Raw response/timing/ground truth/rubric/reviewer inputは
  scoring-moderatorのcall-localだけに置き、safe IPCを通さない。Normally completed open scoring contextごとにmoderatorはdescriptor 7をexternal runtime-only `StudyModeratorInput` exact 1件だけにenableする。Wireはcompact canonical UTF-8 JSON+LF exact 1件、rootは`schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `response`, `timing`, `groundTruth`, `rubric`、timingはcanonical nonnegative decimal string、他3 raw valueはcanonical JSON stringとする。EOF、parse failure、extra/trailing input、replay、cross-context routeをrejectし、echo/history/recording/logを禁止する。Terminalizationでsynthesizeするremaining workflowはrecord 0件/late rejectとし、terminalization decisionだけからfailureを作りempty response/timing等を捏造しない。Outcome/review後またはabort時にraw frame/call-local valueをdestroyする。Supervisorはauthoritative safe context mirror/current workflowを持ち、
  observation sourceはworkflowをself-assertできない。Open contextのみにsame-run/subject/process/workflowが一致するeventをcandidateとし、supervisorがvalidateしてcanonical safe-payload serialization前にopen current-workflow tagを付け、必要な下流adapter/watchdog ACKを得た後にobservationをaccept/countし、safe mirrorをone-way updateし、
  updated `scoring-context`をmoderatorへ再送してACKを得てからのみrelease/outcomeを許可する。このcorrelationはfailure用のeligible link candidateにすぎずworkflow outcomeを決定しない。
  Accepted retained observationへの後付けtag/mutation/backfillを禁止する。Context-freeまたはpre-readiness observationは永久に`not-applicable`のままで、後からcontextをupdateできない。Successはcandidateがあっても全link/review fieldをN/Aとし、failed+candidateはreviewなしの`automatic-critical`、failed+no-candidateのみreviewとする。Automatic issueは独立にcountする。
  ModeratorはそのACK済みmirror一致linkだけを使える。各workflow submissionをaccept後にそのcontextをdestroyし、次workflowのprompt/timer/task前に
  next contextをopenしてmoderator ACKを得る。

  Study harnessはschedule/attempt orchestrationのみを担当する。Scoring moderatorは80 subject/workflow pairごとに`StudyWorkflowOutcomeSubmission`をexact 1件construct/submitする。
  Root orderは`schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `outcomeClass`,
  `automaticIssueCorrelationId`, `reviewDisposition`, `reviewerOneClassification`, `reviewerTwoClassification`とする。Successはcontextにeligible candidateがあってもsubmissionの
  correlation/disposition/両classificationをすべて`not-applicable`のままにし、accepted automatic issueは別にcountする。FailureのACK済みcontextにeligible candidateがある場合は、
  exact correlationの`automatic-critical`を必須としreviewしない。Candidateがないfailureだけがcorrelation `not-applicable`でreviewする。
  Missing/mismatch/reuse/optional/cross-workflow linkはrejectする。Moderatorはexact root
  `schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `caseClass`、case class `nonautomatic-workflow-failure`の
  `StudySafetyReviewCase`をconstructする。Attempt開始前にsubject/workflowごとのdistinct human pairをprocedural/out-of-bandで割当て、別caseへhuman、collector process、component/run identity、case assignmentをreuseしない。Literal `reviewer-one`/`reviewer-two` slotとsanitized terminal-equipment surfaceはdrain/resetしてfresh case-scoped mappingで再利用してよい。
  Published bilingual governance planは必須reviewer rosterを記名する。Repository bundle、work root、candidate、runtime IPC、capture、evidenceの外にある別管理のaccess-controlled administrative assignment recordは、caseごとにuniqueなhuman pair 1組をaudit用に記録し、consent-retention policyに従って破棄し、scoring byteに影響させずruntime/evidenceへ渡してはならない。
  各pairはrecording/IPCを生み出さないboundary越しに、pre-workflow terminal eventを含む同じlive attempt/workflowを直接観察し、synthesized missing rowもその観察済みterminal eventからreviewする。
  Failure確定後だけmoderatorはreviewerごとにfresh/isolated/one-use vote-collector processをspawnし、両processへbyte-identical safe caseの完全表示後だけslot-isolated descriptor 8/9入力をenableしてclassificationをacceptする。各collectorは自身のexternal terminal-equipment descriptorからLF終端ASCII enum `product-caused-blocker | not-product-caused-blocker` exact 1行だけを読み、echo/history/recording/log/cross-slot outputなしでraw inputをwipeする。
  Successはreviewer processをspawnせず、first voteはsecond reviewerへ隠し、collector、outcome、repository study-input artifact、runtime IPC、capture、evidenceにidentity/assignmentをretainしない。両`not-product-caused-blocker`は`reviewer-cleared`、
  両`product-caused-blocker`は`reviewer-confirmed-critical`、一方ずつは`reviewer-disagreement-critical`とし、後2者だけ`workflow-blocker`を使う。
  Identity/note/communication/第三review/human-process-assignment reuseを禁止し、workflow submission accept前に両process exitを要求する。

  Final verifierはseal aggregateをexact order `automaticCriticalIssueCount`, `suspectedWorkflowBlockerCount`, `reviewVoteCount`,
  `reviewDisagreementCount`, `reviewerCriticalIssueCount`, `criticalIssueCount`, `zeroCriticalIssueGate`で独立再計算する。Automatic issue IDはexact
  `automatic:<correlationId>`、reviewer-critical issue IDはexact `reviewer:<subjectId>:<workflowClass>`からderiveする。
  `suspectedWorkflowBlockerCount`はreviewer-clearedを含む全nonautomatic reviewed failureをcountし、`reviewVoteCount = 2 × suspectedWorkflowBlockerCount`、`reviewerCriticalIssueCount`は
  reviewer issue-ID setのcardinality、`criticalIssueCount`は両tagged/deduplicated setのunion cardinalityとする。`automatic-critical` workflow rowは
  既存automatic issueを参照し、別reviewer issueを追加または二重計上してはならない。Success中に観測したautomatic issueもsuccess submissionがall N/Aのままautomatic setに残る。
  `zeroCriticalIssueGate`はそのunionがemptyかつexact 20×4
  terminal workflow setがcompleteの場合に限りtrueとする。19/20・18/20 threshold、同じrecordKinds、同じretained file setは独立のままとする。

  全request observationはclosed safe classだけを持つ。Fixed
  `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0` profileではproxy/serverがChromium-controlled
  Chromium制御の`Sec-Fetch-Dest`、`Sec-Fetch-Mode`、`Sec-Fetch-Site`、`Sec-Fetch-User`とOrigin/Refererを独立projectし、raw fieldをdiscardする。Fetch Metadataはhuman attestationではない。
  Product-probe readiness後かつsole expected initial navigationの直前に、supervisorはexact root `schemaVersion`, `studyRunId`,
  `browserAttemptId`, `correlationId`, `state`、state `armed | consumed | destroyed`のfresh runtime-only `StudyParticipantNavigationGrant`を生成し、
  browser adapterへ`participant-navigation-grant`で送る。Browser/pageはproxy injection前にgrantを見てはならない。Participantはvalid marker、navigate/document/`?1`/
  Origin missing/site `none | same-origin`、exact authorized-static target、current armed grantの全てが一致する場合だけとする。
  Participant-shaped candidateではadapterがstate変更なしでarmed copyをcall-localにreserveしてgrantのcorrelation IDを使う。Supervisorはstill-armed canonical grant/correlation/attempt/complete candidateをvalidateし、canonical grantをarmedのままcandidateをpending storeする。その後、sole authenticated candidate acceptance/forwarding authorizationかつcanonical grantのatomic consumeとしてexact one-use
  `browser-broker-decision: candidate-forward`を送る。別のcandidate ACKは存在しない。Adapterはmatching decisionをvalidateした後だけ自身のcopyをconsumeしてforwardする。Authenticated candidate/grant IPCのreplay/duplicate/stale、simultaneous second consumption、broker decision/ACKのskip/mismatchはforward 0でrun invalidとし、closeはgrantをdestroyする。
  Armed grantがないfresh HTTP request（nonexact target、post-consumption request、user-activated page-script navigationを含む）は、open binding IDとfresh proxy-generated correlation IDを持つvalid-marker `unknown`、product-attributable/prohibitedとしてblockするが、grantをconsumeせずrunもinvalidateしない。
  Bundled SPAはparticipant以外かつFetch User missingでOrigin exact-issuedまたはOrigin missing+Referer exact-issuedとし、exact authorized static/APIだけforwardする。
  Extension OriginはN/A ID/unrelated、残るvalid-marker rowはopen binding IDの`unknown`/product-attributable/prohibited、missing/invalid markerはN/A ID/unrelatedとしてすべてblockする。
  Proxy/serverの6-field projection mismatchまたはbrokerのgrant/correlation mismatchはfail closedとする。

  Forwardしたparticipant/SPA exact-issuedだけがbinding=outer=claim ID一致の`study-browser`+`inspector-server-ledger` pairを生成する。
  Extension/other-host/unknown/participant-shaped unauthorized/全blocked rowはbrowser-onlyでN/A server claimを作らない。Exact Inspector requestはproduct+server、
  nonexact InspectorとOS/effectはproduct-only、workflowはbrowser-onlyとする。Missing/duplicate/extra/mismatchはfail closedとする。

  Study-browser captureはNode.js-built-in-only deny-by-default HTTP/CONNECT proxyを使う。`study-browser-adapter`だけがdigest/identity-verifiedなpinned Chromium binaryをdirect spawn/OS-observeする。Browser-equipment controlには固定anonymous `--remote-debugging-pipe`だけを使い、このpipeはinherited internal evidence-IPC matrix外とする。Prepared-state inputはexact
  `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`、すなわちPlaywright 1.61.1 `chromium` revision `1228`、
  browserVersion `149.0.7827.55`、title `Chrome for Testing`、Ubuntu 24.04 x64、Node.js 24.18.0、headed/
  fresh/nonpersistent/extension-empty context、browser-context-only proxy、`single-407-basic`を選ぶ。Pinned DevTools protocolで`Target.createBrowserContext`へexact proxy authorityを`proxyServer`、`disposeOnDetach: true`、empty bypass listとして渡し、`Fetch.enable(handleAuthRequests: true)`を有効化し、sole exact Proxy Basic `authRequired` challengeへliteral username `study`とcurrent marker secretを使う`Fetch.continueWithAuth` `ProvideCredentials` exact 1件だけを返す。Run-level capture startが3 streamをliveにした後、各attemptのparticipant `npx`/first capturable request直前にexact proxy-local URI
  `http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`へrequestし、sole authentication challenge
  `Proxy-Authenticate: Basic realm="inspector-study"`と`Connection: close`だけをexact header 2件として持つbodyless 407 exact 1件、canonical Basic retry exact 1件、
  `Connection: close`だけをsole headerとして持つbodyless 204を要求する。
  BootstrapはDNS/connect、application、correlation、candidate、forward、evidence effectを0件とし、capture中のstudy requestはcanonical Basic field exact 1件を持つ。

  Attemptごとにsupervisorが`browserAttemptId`と独立したfresh `browserProxyMarkerSecret`とmarker bindingを生成し、`proxy-marker-install`で
  `study-browser-adapter`へ直接送る。Adapterはattempt-local controller/auth bufferだけにsecretを保持し、literal username `study`とpairになるsole browser-context Basic challengeへ供給する。
  Markerはactual-browser bootstrap完了/ACKまで`prepared`とし、成功ACK後だけsupervisor/adapterがatomicに`active`へ遷移する。Failureは`prepared`から直接`destroyed`とし、activeにしない。
  これはtransport authだけでapplication/control capabilityではなく、validだけでactor/
  product/forwardingを決めない。Secret、raw/encoded Basic、proxy configはbrowser/child env/argv、file、helper/evidence IPC、log/output、retention、profile/history/cache/keychain/credential store、application requestへ入れない。Raw secret transfer bufferはexact marker-install frameとattempt-local DevTools auth requestだけとし、各ACK後にwipeする。Normal/abort/crash/terminalization/controller failure/child-exitではbrowser contextをdisposeし、該当browser-equipment pipe/processをcloseして全copyをwipeする。Pinned Chromium buildのremote-debugging-pipe disconnect contractは`CloseBrowserSoon`を呼ばなければならず、そのexact close-on-disconnect behaviorをintegration testで検証する。Browser contractを超えて必要なplatform containmentはstudy equipment/setupが提供・検証し、Node.js-built-in-only capture componentが内部で捏造してはならない。Adapter crashまたはDevTools-pipe EOFでもorphan Chromium process/contextを残さず、supervisorはadapter exitのdirect observation後、全browser-equipment descendant/contextの終了とfresh profile cleanupをverifyするまでnext attempt/finalizeをblockする。このruntime-only OS observer stateはevidenceへ出さない。Actual testはisolated HOME/XDG/profile/history/cache/credential storeにsecret/encoded Basic/`browserAttemptId` residue 0を要求する。

  Participant candidateはsupervisor生成grantのfresh `correlationId`をexactに使い、それ以外のbrowser requestだけadapter/proxyがfresh canonical
  `X-Inspector-Study-Correlation`を生成する。いずれもincoming copyをreplaceし、Inspector probeでstripする。Raw header
  name/framing/wire/encoded/noncanonical derivativeはIPC前にdiscardしてretain/hashせず、strict decoded canonical safe IDだけを唯一のheader-derived例外として
  `correlationId` payload/digest chainへretainする。Nonexact/CONNECTはDNS/socket/body/response exposure前にblockする。

  Bilingual evidence contract/data modelは`StudyBrowserAttemptBinding`、`StudyBrowserRequestCandidate`、`StudyServerCorrelationClaim`、
  `StudyParticipantNavigationGrant`、`StudyBrowserBrokerDecision`のexact closed safe schema/property orderを所有する。各participant launch前にsupervisor/brokerは
  fresh `browserAttemptId`と`inspectorProcessId: not-applicable`/`state: prepared`のbindingを生成し、prepared/open/closedの各byte-identical runtime-only
  `attempt-binding` snapshotをstudy harness/browser adapterへ配布して両ACKを要求する。Ordered pre-readiness release、openの両ACK、discovery-context ACKの全てが完了した後だけ
  readiness responseを返し、readiness後だけgrant/candidateを許可する。
  `terminalization-decision`で両copyをterminalizingへ移す。Adapterはbrowser/grant/marker/reservation/candidate/pending stateだけをdestroyし、後のclosed snapshotをACKするまでterminalizing bindingを保持する。Harnessはsynthesis完了までterminalizing bindingとfixed remaining scheduleを保持する。Closedの両ACK後だけcanonical binding copyをdestroyして次attemptへ進む。
  Prepared/open/terminalizing bindingは最大1件とする。Exact readinessはfresh process IDをatomicに設定して`open`へ変え、state enumはexact
  `prepared | open | terminalizing | closed`とする。Pre-readiness failureはprocess ID N/Aでterminalizingへ、post-readinessのproduct/browser/equipment/
  premature-probe-close failureはaccepted outcomeをfreezeしてpending joinをcloseし、assigned process IDでterminalizingへ移る。Fixed remaining-workflow orderでsupervisorが各missing-workflow scoring contextをopen/mirror/routeし、moderatorだけがterminal failure exact 1件とrequired review/outcomeをconstructし、harnessはschedule/orchestrationだけを保持する。Accepted rowを保存しduplicateを作らない。Exact 4 outcome後だけclose/wipeする。
  Evidence harness/supervisor-orchestrator/adapter/watchdog/moderator/reviewer failureはrun invalidとしてoutcomeをsynthesizeしない。`browserAttemptId`はsupervisor/broker/harness/
  browser-adapter memory、authenticated frame、grant、safe candidateだけに置き、actual browser process/context/profile/config/credential/request/application/retained evidence/logへ入れない。

  `StudyBrowserBrokerDecision`のexact rootは`schemaVersion`, `studyRunId`, `browserAttemptId`, `correlationId`, `decision`、decisionは
  `candidate-forward | browser-only-released | joined-pair-released`とする。Attempt terminalizationはexact run/subject/attempt/process IDとcause
  `product-exit | browser-exit | equipment-failure | premature-probe-close`だけを運ぶ。Scoring `terminalizationClass`は
  `none | product-exit | browser-exit | equipment-failure`とし、先3 causeはsame-name class、`premature-probe-close`は`equipment-failure`へmapする。
  Supervisorをsole participant-launch controller/direct OS process observerとし、bootstrap前を含む`product-exit`のsole sourceとする。Harnessはschedule/bindingだけを持ちexitをreportしない。Browser adapterはsole attempt-bound browser-equipment observerであり、`browser-exit`はactual browser process/context exitだけ、`equipment-failure`はexact controller/proxy/authentication pathがhealthyなまま外部観測されたbrowser/OS/environment bootstrap failureだけをreportできる。Adapter/proxy/controller/CDP/authentication/marker/IPC/implementation/browser child-management faultはrunをinvalidateしoutcomeをsynthesizeしない。Authenticated probe close時にsupervisorはchild stateをserializeし、既にexit済みなら`product-exit`、liveなら`premature-probe-close`、4 outcome+pending join 0件後のnormal closeならterminalizationなしとする。
  最初にcommitしたvalid causeだけをatomicにacceptし、後続の競合causeをrejectする。
  Scoring moderatorがexact submissionをsupervisorへ送り、supervisorがvalidateして`workflow-outcome`としてbrowser adapterへforwardし、adapterがcanonical safe workflow recordへcanonicalizeしてwatchdogへrouteする。
  このedgeの`safe-payload`はnonworkflow browser observation専用とし、`workflow-outcome`を運んだりbypassしたりしてはならない。Accepted nonworkflow browser observationは
  supervisorだけがcurrent workflow、contextがなければN/Aをtagしてcanonical safe payloadをconstructする。Browser adapterはstored candidateとvalidateし、
  watchdogへrouteし、そのwatchdog ACK後だけsemantic safe-payload ACKを返す。Blocked/browser-only observationはそのACK後だけ`browser-only-released`、joined observationは
  browser/server両safe-payload ACK後だけ`joined-pair-released`とする。
  Terminalizationではsupervisorがbyte-identical `terminalization-decision`をstudy harness/browser adapterの両方へfanoutし、adapterはbrowser/grant/marker/reservation/candidate/pending stateをdestroyするがclosed-snapshot ACKまでterminalizing bindingを保持し、long-lived processを継続する。Harnessはsynthesisとclosed dual ACKが完了するまでterminalizing bindingとfixed remaining scheduleを保持する。
  `browser-broker-decision`はsupervisor→browser adapterのみ、child failure reportは`attempt-terminalization`、parent fanoutは`terminalization-decision`とし、harness→browser adapterのsibling edgeを禁止する。
  `runtime-bootstrap`（materializer edgeのみ）、`browser-proxy-binding`、`attempt-binding`、`proxy-marker-install`、`participant-navigation-grant`、
  `browser-broker-decision`、`safe-payload`、`workflow-outcome`、`terminalization-decision`、
  `stream-control`、`stream-control-result`、`process-lifecycle-attestation`、`lifecycle`を含む全inherited message typeは、contractの完全にclosedなparent/child matrixだけで
  許可し、proseの部分列挙でその集合を変更してはならない。

  Valid-marker bound candidateの`browser-only-released`はopen attemptの`browserAttemptId`を運び、missing/invalid-marker unrelated branchだけがN/A attempt identityを使う。Pre-readiness terminalized workflow submission、review case、両review voteはすべて同じliteral `inspectorProcessId: not-applicable`をrepeatし、later readiness/synthesisで置換しない。

  上記bootstrap/decision tableだけをbrowser marker/actor ruleとする。Request fieldは`browserAttemptId`を運ばず、complete Fetch Metadata rowなしのvalid
  markerはparticipant/SPA claimを作れない。Extension/missing-secret other-hostはbinding ID/server claimを持たない。残るvalid-secret `unknown`はopen
  binding IDを持つがserver claimを作らずproduct/prohibited、
  post-bootstrap missing/invalid markerはunrelatedとしてblockし、marker-only false attributionとSPA remote/other-loopback見逃しの両方を防ぐ。

  Eligible participant/SPA exact-issued requestでは、adapterはgrant stateを変更せずreserveし、supervisorはcanonical grantをarmedのままcandidateをpending storeする。その後exact one-use `browser-broker-decision: candidate-forward`だけをsole authenticated candidate acceptance/forwarding authorizationかつcanonical consumeとし、adapterはmatching decisionをvalidateした後だけcopyをconsumeしてforwardする。別のcandidate ACKは使わない。Probeはmatching claimをatomic
  submitしてbroker ACKを受けてからapplication handlingへ進む。Brokerだけがbrowser/server両safe-payload ACK後にjoined pairをreleaseし、`joined-pair-released`を送って両sideへACKする。`submit-product-event` outer requestは`inspectorProcessId`, `destinationRole`, `payload`だけを運び、outer processはregistered probeと一致しなければならない。Claimのsubject/process equalityはpayload内でopen bindingとouter processに対してenforceする。Extension/host/unknown claimは禁止する。Joinはclock/timeout/retry delayを一切持たない。Failure triggerはtransaction/
  request end、abort/error/connection close、IPC/probe/attempt/child close、stop、replay/mismatch/duplicate/lateだけとする。Failureはpartial record 0、pending wipe、
  late rejectとし、closeはbinding/marker/config/pending joinをdestroyする。このjoinは既存のauthenticated inherited IPC messageを使い、
  join専用のstudy-control commandを追加しない。

  正常にlaunchしたparticipant Inspector processのexact readiness transition中、readiness responseを返す前に、supervisorはexact 32 cryptographically random byte
  （256 bit）をunpadded base64url正確に43文字でencodeしたfresh opaque `inspectorProcessId`を1件付与し、subject token、capture/watchdog ID、
  OS process IDと区別しなければならない（MUST）。これはnon-human
  launch correlation専用で、pseudonymous participant evidenceに使用してはならない（MUST NOT）。同じlaunchのcross-stream request、effect、
  workflow recordは同じsafe IDを使い、別launchでreuseしてはならない（MUST NOT）。Launch/readiness前failureはprocess値をliteral
  `not-applicable`とする。Pre/post-readinessを問わず、terminalizingはaccepted rowを保存し、fixed remaining orderでmissing workflowだけにmapped
  terminalization class付きcontext、terminal `failure` exact 1件、上記reviewを生成する。Duplicate/extra workflow recordを生成せず、exact 4件後だけcloseする。
  20件すべてのparticipant attemptをexactなlaunch/failure recordへbindしなければならない（MUST）。

  Fixed subjectごとにsupervisorはdescriptor 6をLF終端ASCII exact 1行 `npx --no-install agent-customization-inspector --no-open`だけにenableし、他/extra lineをrejectしてcommand bufferをwipeする。Shellを使わず、sanitized equipment PATH上のidentity-pinned sole audited binだけからcandidate-bound local no-install `npx`をresolveし、対象subjectのverified distribution `repository/` cwdでdirectly observed childとしてspawnする。Sanitized envはbound `NODE_OPTIONS=--import=<bound-capture-script-file-url>` probe、control endpoint/token、安全なrun/subject IDだけをminimum scopeで含み、candidate/proxy authorityをterminal/child env/argvへ入れない。Participant `npx`/Inspectorはexternal ephemeral study equipmentで、8 internal long-lived capture descendantに含めない。各attempt後にsupervisorはfresh child/process contextをcloseしdescriptor 6をdrain/reset/clearして、prior participant input/output/historyを次attemptへ残さず、常にfresh `npx`/Inspector process/contextを使う。Probeは全adapter/watchdogとは別とする。
  Targetがbootstrapへ到達した場合、bodyをblockし、exact root `schemaVersion`, `productId`, `bootstrapEventId`の
  `StudyPreReadinessBootstrapProof`を要求する。`register-pre-readiness-probe`は`studyRunId`, `subjectId`, `bootstrapProof`を受けて
  `preReadinessProbeId`を返す。Runtime-only `StudyPreReadinessProductBuffer` rootは`schemaVersion`, `studyRunId`, `subjectId`,
  `preReadinessProbeId`, `state`、stateは`open | readiness-bound | terminalization-bound | destroyed`とする。
  Pre-readiness draftはprocess/workflow/automatic/review N/Aのcanonical observationとし、`buffer-pre-readiness-product-event`へ
  `preReadinessProbeId`, `destinationRole`, `payload`を送り、product effect前にsupervisor ACK、raw immediate discardを要求する。
  `register-product-probe`は`studyRunId`, `preReadinessProbeId`, `readinessProof`, `requestedDestinationRoles`を受け、fresh process-ID bind+
  ordered-release ACK後にopen-binding両ACKとdiscovery-context ACKを順に完了し、その後だけreadiness responseを許可する。Bootstrap未到達exitは通常terminalization、到達後exitはprocess N/A release ACK後にterminalizeする。
  Non-target/helperはregister/evidence 0、identity/register/ACK failureはrun invalidとする。Participant processはsupervisor descriptorをinheritできないため、
  probeはendpoint/token environmentを`register-pre-readiness-probe`、`buffer-pre-readiness-product-event`、`register-product-probe`、
  `submit-product-event`、`close-product-probe`だけに使い、supervisorは各safe eventと
  `inspectorProcessId`をdistinct product/server adapter/watchdogへrouteしなければならない（MUST）。`submit-product-event`のouter exact rootは
  `inspectorProcessId`, `destinationRole`, `payload`だけとし、`destinationRole: inspector-server-ledger`だけがexact `StudyServerCorrelationClaim` payload variantを運んでよい（MAY）。Outer
  `inspectorProcessId`はregistered probeをauthenticateし、participant/SPA claimのsubject/process IDはopen binding/outer IDと一致しなければならない。
  Unrelated-actor claimは禁止する。Probeはraw valueをdiscardする前にlogical
  Inspector requestへ同じclosed correlation headerをassignしなければならない（MUST）。Browser helperはprobe/control
  environmentをinheritしてはならず、probe path/options/environment valueをevidenceへ入れてはならない
  （MUST NOT）。Missing、altered、alternate、duplicate、raw-value-emitting probeはcriticalとする。Candidateはdormant readiness hookだけを所有し、
  evidence authorityを持ってはならない（MUST NOT）。

  Supervisor/child edgeごとにunidirectional inherited anonymous pipe exact 2本（parent→child、child→parent）を使う。Verified child-file identity後、
  parent→child pipeの先頭へfresh seed/nonce/channel IDを含むexact 96-byte binary bootstrap prefixを送り、その同じopen pipe上で直ちにLF終端の
  parent→child canonical frameへtransitionする。Bootstrap後にEOFを送ってはならず、96 byte未満のEOFはfailure、96 byte以後の全byteはcanonical
  frame parserへ属する。Child→parent pipeの最初のmessageはsequence 0のauthenticated one-use `ready` frameとする。Direction keyはdomain-separated
  HMACでderiveし、seed/nonceはderivation/ready後、keyはedge close時にwipeする。Frame exact root orderは`schemaVersion`, `channelId`,
  `sequence`, `direction`, `senderRole`, `receiverRole`, `messageType`, `authenticationTag`, `payload`とする。Tag preimageは
  `authenticationTag: null`のexact compact JSONでLFを含めず、populated transmitted wireだけLF exact 1件をappendする。Receiverはconstant-time tag comparison、sequence 0/+1、closed
  role/message matrixを要求する。Seed/nonce/key/channel/frameをenv/argv/fileへ入れない。Wrong child/role/direction/sequence/field/tag、duplicate ready、replay、premature EOF、unexpected post-bootstrap byte、
  abort/crash/closeはfail closedで両directionをwipeしpartial evidence 0とする。Control commandを追加しない。

  Materializer→supervisor edgeでは、supervisorの`ready`後の最初のauthenticated parent→child frameをone-use `runtime-bootstrap`とし、exact
  `StudySupervisorRuntimeBootstrap` root `schemaVersion`, `workRootLexicalValue`, `workRootCanonicalValue`, `workRootIdentity`, `controlEndpoint`, `controlToken`を運ぶ。Work-root mutation前にsupervisorがrootを独立validateし、endpointをbindし、tokenをloadし、frameをACKした後だけmaterializerはwriteできる。Frame bufferはconsume後にwipeする。成功時はmaterializerがauthenticated role-specific lifecycle closeを送りACKを得てedgeをdetach/wipeするが、supervisor/endpointはfinalizeまでliveのままとする。Failureはabortしsupervisorをexitさせる。これらauthority valueはchild env/argvに入れず、transient bootstrap、supervisor memory、authenticated runtime-controlだけに存在できる。

  Descendant lifecycle evidenceは`process-lifecycle-attestation`だけを使い、exact `StudyProcessLifecycleAttestation` root
  `schemaVersion`, `processRole`, `streamRole`, `componentRunId`, `instanceId`, `processRunId`, `event`, `exitCode`, `signal`、event `registered | exited`を運ぶ。Adapterのsupervisorへのown registrationはself-registrationでexit observationではない。Direct parentはchildのregistrationをforwardする前、またはchild exit reportを作る前に対象childをOS-observeする。各adapterはmatching watchdog registrationをforwardしclean exitをdirect observation後にreportし、moderatorはreviewer ready後にregistration、direct exit observation後にclean exitをreportし、supervisorはadapter/harness/moderatorを直接OS-observeする。Reverse `acknowledgement`は直前のvalid attestationに対するsupervisor→moderator、supervisor→adapter、adapter→watchdog edgeのみで許可し、candidate/terminal reportに使わない。Adapter registrationのsupervisor ACK後だけwriter bindingをrelayし、watchdog registrationはadapter ACK+supervisor ACK後だけstartへ進める。Reviewer exit ACKはoutcome submission前、watchdog exit ACKはadapter exit前に必須とする。Startは6 stream registrationを待ち、stopは3 watchdog attestationとdirect adapter/orchestrator exitを待つ。Reviewer countはmoderatorがOS-observeしattestしたdistinct clean exitだけを使う。Nonclean childは`lifecycle: child-exit`を送りrunをinvalidateし、witnessに使わない。

  Stream lifecycleはexact `StudyStreamControl` root `schemaVersion`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `streamRole`, `command`, `checkpointRequestId`, `handoffSha256`を使い、immutable bindingを全commandで繰り返し、commandを`start | checkpoint | anchor-handoff | stop`とする。Exact `StudyStreamControlResult` rootは`schemaVersion`, `controlSessionId`, `studyRunId`, `streamRole`, `command`, `checkpointRequestId`, `sequence`, `monotonicNs`, `envelopeSha256`とする。Start resultの`checkpointRequestId`はliteral N/Aとする。Supervisorはbyte-identical `stream-control`をadapter経由でwatchdogへ送り、watchdogはsemantic responseをreverse `stream-control-result`で返す。Start/checkpoint/anchor-handoff/stop barrierは3 fixed roleのexact resultを待ち、start resultは`capture-start`とfirst heartbeatのwrite後にcurrent positionをreportする。Supervisorはstream fileをcreate/validateし、専用append-only handleをexact spawn inheritanceだけでdescriptor 5へ渡す。Path-free runtime-only `StudyStreamWriterRuntimeBinding`はcapture adapterのauthenticated component/instance/process identityをexpected fd5のstable handle identity、`nlink`、append modeへbindする。Adapter registrationのsupervisor ACK後、adapterはbindingとinherited handleをwatchdogへrelayしてbinding ACKを受け、watchdogはhandle/bindingを独立validate後にregisterし、adapterとsupervisorの両方がACKする。3 streamのこのbarrierと6 registration完了後だけbrowser-proxy binding ACK、その後stream startを許可する。Descriptor 5はfixed parent→child/child→parent IPC slotの隣のcontract-fixed evidence-writer slotで、path/cwd/env/argvを使わず、nonstream roleには存在せずthird IPC pipeでもない。Adapterはtransferのみでread/writeせずwatchdog registration後にcopyをcloseし、supervisorはcomplete downstream registration ACK後にcopyをcloseする。Extra/duplicate handle copyを禁止しwatchdogをsole holder/writerとする。Stopはresult→handle close→clean exitの順とし、failureは全copyをcloseしrunをinvalidateする。

  各streamは全runを通じてpairwise-distinctかつprotocol-owner-generatedでopaqueなwatchdog-instance、watchdog-process-run、
  capture-instance、capture-process-run IDを使用しなければならない（MUST）。Append-only safe-integer sequenceは0から始まり正確に
  1ずつ増えなければならない（MUST）。Exact envelope byteは
  `Buffer.from(JSON.stringify(canonicalEnvelope) + '\n', 'utf8')`とし、`canonicalEnvelope`はUnicode normalizationなしで新規構築し、
  extra keyを持たず、propertyを`schemaVersion`、`streamRole`、`watchdogInstanceId`、`watchdogProcessRunId`、`captureInstanceId`、
  `captureProcessRunId`、`sequence`、`recordKind`、`monotonicNs`、`priorDigest`、`payloadSha256`の順にinsertしなければならない（MUST）。
  Canonicalityはparse equivalenceでなくbyte-for-byte比較で判定しなければならない（MUST）。`recordKind`はclosedな
  `capture-start | payload | heartbeat | handoff-anchor | capture-stop`とする。各kindは`contracts/usability-study-evidence.ja.md`のclosed canonical
  safe-payload schemaを使い、start/stop payloadは両frozen study digest、heartbeatは観測済みcapture-process/IPC health、stopはfinal
  sequence、record/kind count、preceding envelope digestをbindしなければならない（MUST）。最初の`priorDigest`は64 zero、後続値はprior
  exact envelope byteのlowercase SHA-256とし、全safe-payload digestをretainしたexact canonical safe-payload byteから再計算しなければ
  ならない（MUST）。Sequence 0はsole startとする。Watchdog schedulerは1,000 msごとにheartbeat 1件をtargetとしなければならない
  （MUST）。Scheduler toleranceを含む唯一のobserved continuity acceptance ceilingは、start→first heartbeat、consecutive heartbeat、
  latest heartbeat→checkpoint/handoff、last heartbeat→stopの各gapに対する1,500,000,000 nsとし、intervening payload recordでmissing
  heartbeatを隠してはならず（MUST NOT）、これを超えるgapをcriticalにしなければならない（MUST）。

  Command phase matrixはmaterializeからfinalizeまでの全commandで`INSPECTOR_STUDY_WORK_ROOT`、
  `INSPECTOR_STUDY_CONTROL_ENDPOINT`、`INSPECTOR_STUDY_CONTROL_TOKEN`をrequiredとしなければならない（MUST）。Tokenはrunごとにfreshな
  exact 32 cryptographically random byte（256 bit）をunpadded base64url正確に43文字でencodeした値とする。Materializeと
  `verify -- inputs`は`INSPECTOR_STUDY_CANDIDATE_TARBALL`をignoreし、requiredとしては
  ならない（MUST NOT）。Candidate environment valueは`capture -- start`で初めてrequiredとし、以後finalizeまでの各clientで再度requiredと
  する。Candidate fileはmaterialize前から存在してよく（MAY）、materializeが作成するのはclosed distributionであってcandidateではない。Materialize時、authorized setupはidentity-pinned `npx`をsanitized equipment PATHへ、work root/distribution外のreserved initially-empty candidate-launch store-bin slotを1件固定しなければならず（MUST）、materializer/inputs verificationはそのslotをreadしてはならない（MUST NOT）。`verify -- inputs`成功後かつstart前にauthorized study setupだけがcandidate tarballとfrozen production graphから同じknown slotへnetwork-disabled/scripts-disabledのfresh storeをprovisionし、candidate digestへbindしなければならない（MUST）。Start時にsupervisorはinherited fixed slotを再検証し、pinned `npx --no-install`でsole audited binだけをresolveしなければならない（MUST）。Raw tarball pathをchild environment/argvへ入れず、新しいenvironment/control fieldを追加してはならない（MUST NOT）。Distribution mutation、cache、network、install、alternate PATH、global/fallback resolutionを禁止する。Storeはruntime/evidence外に置き、abort/stop/finalize後にdestroyしてabsence barrierを検証しなければならない（MUST）。
  Materialize時のwork rootはstudy setupが提供するabsolute、existing、emptyなordinary-local directoryとし、active-platformのexplicit
  UNC/server-share/device/network spellingをI/O前にfailureにしなければならない（MUST）。Control endpointはwork root/全distribution外の
  transientなendpointだけを使用しなければならない（MUST）。POSIXではabsolute Unix-domain-socket pathname、Windowsではexact
  `\\.\pipe\agent-customization-inspector-study-`の後にlowercase hexadecimal 32文字を続けた値とする。TCP、UDP、DNS、全network
  transport、remote/network named-pipe spelling、work-root sidecarは禁止する。Lexically indistinguishableなpre-mounted/mapped filesystemはdocumented FR-022 limitationのままとし、
  proven localとclaimしてはならない（MUST NOT）。

  `INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY`はcapture startからstopまでだけrequiredとし、runtime-onlyのexact
  `127.0.0.1:<port>` authorityでなければならない（MUST）。Materialize、`verify -- inputs`、finalizeはこの値をreadまたはrequireしては
  ならず（MUST NOT）、stop前に実行するcheckpoint/continuationはrequiredとする。Raw routeは`authorized start-through-stop caller transient input -> authenticated runtime-control StudyLiveBinding -> supervisor dedicated memory -> one-use browser-proxy-binding -> adapter dedicated memory -> attempt-local DevTools control request/browser context`だけに閉じる。Caller/control/frame/request bufferは各ACK後にwipeする。Adapterはfixed prepared-state Chromium browser contextだけへinstallしてexact loopback listenerをbindし、system-wide proxyを禁止する。上記fixed bootstrap、fresh marker secret、Fetch Metadata tableを必須とし、このattempt-local browser-context例外以外のauthority/config/marker materialをbrowser/child env/argv、profile/history、retained evidence、hash、log、diagnostic、command outputへ入れず、normal/abort/crash/terminalization/stopでwipeする。

  Start時、全6 adapter/watchdog registrationとwriter-binding barrierのsupervisor ACK後にだけone-use `browser-proxy-binding`をsupervisor→`study-browser-adapter`で送り、exact `StudyBrowserProxyRuntimeBinding` root `schemaVersion`, `studyRunId`, `browserProxyAuthority`を運ぶ。Adapterはvalidate/listener bind/ACKを行い、そのACK前に`stream-control: start`、`capture-start`、start completeを許可しない。Authorityはcapture stopまでsupervisor/adapter専用memoryとlive attempt-local DevTools request/browser contextだけに保持し、checkpoint/continuationでequalityを検証し、stop/failureで全copyをwipeする。

  Materializeはrepository-owned capture scriptのdigestを検証し、authenticatedなinternal supervisor modeで開始しなければならない（MUST）。
  Materializeがsole supervisorをexact 1回だけspawnし、startは新しいsupervisorをspawnせずその既存live processを使う。Start時にsupervisorがlong-lived study harness、scoring moderator、3 adapterをspawnし、各adapterは自分のwatchdogをspawnする。各nonautomatic failed workflowでは
  moderatorだけがfailure determination後にfresh ephemeral reviewer vote-collector process 2件をspawnする。
  Control endpoint上のtoken-authenticated hello/challenge protocolはmaterializeからfinalizeまでsupervisorを連続してaliveに保たなければ
  ならない（MUST）。全runtime-control messageのauthentication tagはexact canonical payloadを被覆しなければならない（MUST）。Runtime-control
  path valueのtransientかつnon-retainedなHMACはchannel integrityだけに使用してよい（MAY）が、evidence commitment/hashはpath-freeのままと
  しなければならない（MUST）。Supervisorは後続clientが値を再送しcandidateを独立stat/hashできるよう、work-root/candidateのlexical/canonical
  authority valueをprocess memory内だけに保持し、そのauthenticated runtime-control channelだけで交換してよい（MAY）。Supervisorはinitial
  work-root identity、start時candidate identity/digest、checkpoint position、original handoff anchor、supervisorが直接OS-observeするadapter exit 3件、adapterがOS-observeしauthenticated attestationでreportするwatchdog exit 3件、
  supervisorが直接OS-observeするharness/moderator exit 2件、moderatorがOS-observeしattestするephemeral reviewer exit countをmemory内に保持しなければならない（MUST）。上記exact transient control-message HMACを除き、これらのpath value、
  HMAC key、control tokenをcapture-evidence IPC、raw input byteとしてのcommitment/hash、retained file、evidence、log、diagnostic、command
  outputへ入れてはならず（MUST NOT）、finalizeで
  破棄しなければならない（MUST）。代わりにpath-freeなHMAC work-root/candidate identity commitmentを1つの`controlSessionId`とともに全
  start、handoff、continuity witness、final sealへbindしなければならない（MUST）。

  Exact canonical control request/response property orderはbilingual contractが所有しなければならない（MUST）。両directionは`requestId`を
  retainし、responseはclosed `errorCode` enumを使い、raw control tokenを送信してはならない（MUST NOT）。Materialize済みsupervisorはrun-scopedな
  fresh `controlSessionId`を正確に1件生成し、finalizeまでstableに保たなければならない（MUST）。`hello` requestはsession、challenge、tag、payloadを
  nullとし、responseはそのstable session IDを返し、fresh one-use `challengeId`だけを生成してHMACでauthenticateしなければならない（MUST）。以後の
  direction-separated HMACは`authenticationTag`をnullとしてexact canonical message byte全体を被覆し、challenge/request IDはsingle-useとしなければ
  ならない（MUST）。Command enumはexact `hello | verify-inputs | start | checkpoint | read-checkpoint | anchor-handoff |
  verify-continuation | stop | finalize-prepare | finalize-commit | abort | register-pre-readiness-probe |
  buffer-pre-readiness-product-event | register-product-probe | submit-product-event |
  close-product-probe`とする。Finalize-prepareはsupervisor内部でcurrent binding、continuity、exitを検証し、endpointをliveに保ったままcomplete
  witnessをsupervisor memory内に準備してliteral `null`を返さなければならず（MUST）、continuity keyをsupervisor memory外へ出してはならない
  （MUST NOT）。成功後、verifierはseparately authenticatedなfinalize-commit connectionをopenする。Supervisorはrequestをacceptした後にlistener
  teardownを開始し、既にopen済みのauthenticated connection上でexact `StudyContinuityWitness`を返してからkey materialを破棄してexitしなければ
  ならない（MUST）。Verifierはcomplete responseに続くEOFとnew connection failureを要求し、その後にcanonical continuity-witness pair、次にfinal
  seal pairをwrite/re-readしなければならない（MUST）。

  Work root配下のretained pathは20件の`distributions/participant-NN/` tree、envelope lineの直後にsafe payload lineを置くfixed 3
  `capture/streams/<stream-role>.ndjson` ledger、verifierが作る`capture/study-capture-handoff.json`/
  `capture/study-capture-handoff.sha256`、finalize成功後だけの`capture/study-continuity-witness.json`/
  `capture/study-continuity-witness.sha256`、`capture/study-capture-seal.json`/
  `capture/study-capture-seal.sha256`だけとする。他のretained artifact、sidecar、path value、final runtime-control stateを
  許可してはならない（MUST NOT）。

  Bilingual evidence contractがhandoffのexact canonical schemaとfixed 3-role orderを所有する。Handoffはcheckpoint request/study run、
  両frozen study digest、`controlSessionId`、両path-free identity commitment、recompute済みprefixの
  identity/sequence/count/root/latest-heartbeat stateをbindしなければならない（MUST）。Independent verifierだけがrecomputeしたimmutable
  ledger prefixからcanonical handoff/companionをserializeする。各sole writerはprefix position/monotonic valueをatomic snapshotした直後に
  heartbeat/event appendを継続し、verificationはそのprefixだけをreadしなければならない（MUST）。Controllerはhandoffを
  accept/serializeしてはならない（MUST NOT）。Handoff書込み後、verifierはrun ID、checkpoint request ID、exact handoff digestを
  authenticated supervisorへ送信し、各watchdogはnormal append/heartbeat schedulingをpauseせず、checkpoint sequence後かつstop前に
  matching `handoff-anchor` payload record正確に1件をserializeしなければならない（MUST）。Checkpoint取得時に既にqueue済みのordinary
  post-prefix pairはanchorより先にappendされてもよい（MAY）。Continuationは全intervening pair、sole matching anchor、同じuninterrupted
  chain上でその後に続くordinary heartbeatまたはpayload pair 1件以上を検証しなければならない（MUST）。全stop/final sealは同じdigestをbindし、
  streamごとのhandoff-anchor countをliteral 1としなければならない（MUST）。
  Handoff/companionを別のinternally validなprefixへ置換した場合、replacement companionと後続sequence/digest linkを再計算しても
  continuation/finalizeをfailureにしなければならない（MUST）。

  Builder、capture controller、構造的に独立したverifierはそれぞれself-containedなsingle source fileとし、sourceに含めてよいimportは
  `node:` built-inのliteral static importだけとする。Local/package import/helper、dynamic `import()`、`require`、`createRequire`、`eval`、
  `Function`、`vm`、`process.dlopen`、別loader hook、alternate worker/child entry fileを使用してはならない（MUST NOT）。
  Materializerが内部実行できるのはdescriptor-boundでdigest-verifiedなexact capture fileだけとし、そのfileはexact `supervisor`、`study-harness`、
  `scoring-moderator`、`reviewer-one`、`reviewer-two`、3 named adapter、3 named watchdog modeだけに自分自身をre-executeできる。
  Product probeは別のimport modeでchild re-executionではない。全internal roleはauthenticated inherited parent IPCとfresh one-use bootstrap nonceを要求する。
  T1056 handoffは全streamをopenに保ったままverifierが生成しなければならない（MUST）。Start responseは6 stream processと、separate ordered fieldのexact 2 long-lived orchestratorを列挙する。
  `capture -- stop`はlive reviewer 0を要求し、8 long-lived internal descendantをterminateする一方でsupervisor/endpointをaliveに保たなければならない（MUST）。Finalizeは全envelope/safe payloadを独立recomputeし、
  commitment、original handoff anchor、terminal outcome、cross-stream matrix、supervisorが直接OS-observeする3 adapterと2 orchestratorのclean exit、adapterがOS-observeしattestする3 watchdog clean exit、
  `ephemeralReviewerProcessExitCount == reviewVoteCount`を検証してから、endpointをliveに保ったまま
  finalize-prepareを完了しなければならない（MUST）。Separately authenticatedなfinalize-commit connectionを通じ、listener teardown開始後かつ
  supervisorのkey破棄/exit前にexact witnessを受信し、complete response、EOF、reconnection failureによってendpoint/runtime-control stateの消滅を
  証明しなければならない（MUST）。その後にcanonical continuity-witness pairをwrite/re-readし、次にfinal seal pairをwrite/re-readする。Witnessは
  control session、両commitment、original handoff digest、このmixed-provenance 8 long-lived exit fact、moderatorがOS-observeしattestするephemeral reviewer exit countをbindし、sealは両frozen study
  digest、exact 3 final stream root/count、witness digest/handoff digest、およびexact aggregate summary
  `automaticCriticalIssueCount,suspectedWorkflowBlockerCount,reviewVoteCount,reviewDisagreementCount,reviewerCriticalIssueCount,criticalIssueCount,zeroCriticalIssueGate`
  をbindしなければならない（MUST）。Verifierは上記tagged/deduplicated issue-ID setとvote equationを再計算し、
  `criticalIssueCount`がそのunion cardinalityであり、automatic-linked workflow rowを二重計上せず、
  `zeroCriticalIssueGate`がtrueであるのは`criticalIssueCount = 0`かつexact 20×4 terminal workflow set completeの場合に限ることを確認しなければならない（MUST）。Watchdog/capture/supervisor
  pause、death、restart、identity replacement、endpoint/token/authentication failure、prohibited payload field/valueまたはtruth-table
  combination、subject/workflowまたはrole-matrix mismatch、nominal scheduler misconfiguration、excessive observed gap、missing/duplicate/
  out-of-order sequence、chain/payload/count/digest/commitment/anchor mismatch、handoff rewrite、clock regression、truncation、premature stop、
  non-clean/missing child exit、extra/missing role、independent verification failure、teardown residue、missing/mismatched witness/sealは
  zero-critical-issue gateをfailureにしなければならず（MUST）、discontinuityを隠すstream stitchを行ってはならない（MUST NOT）。
  Contract/source-structure、deterministic fake-clock、real OS-specific child-process/control-endpoint integration/security suiteはphase/env matrix、
  HMAC canonical-message/single-use-challenge rule、script import/entry closure、initially-empty candidate-launch slot、inputs後のdigest-bound provisioning、sole audited-bin resolution、network/scripts/cache/global/fallback rejection、teardown absence barrier、proxy/probe attach/strip、correlation-header grammar/role matrix、
  participant/process/outcome cardinality、accepted workflow 0〜4件の各時点でのcrashとmissing rowだけのexact terminalization、path/secret non-retention、commitment/exit witness、alternate-valid-prefix handoff rewrite、endpoint teardown、
  missing/mismatched witness/sealを扱わなければならない（MUST）。
- **SC-007**: SC-007 manifestは、file-confined outcome classであるmalformed content、binary content、invalid non-NUL UTF-8 replacement decoding、unreadableなfile（壊れたsymbolic linkを含む）、boundary-crossing referenceの各fixtureと、failure classであるjob accept前にrejectされたsession-API request、accept済みsession-API job後のfailure、startup failureの各fixtureを1件以上含めなければならない（MUST）。Manifest記載fixtureの100%で、invalidなnon-NUL UTF-8はreadableな`utf-8-replaced` textとして処理され、それ自体でscanをpartialにしない。他のfile-confined outcomeはそのfileの実行可能なdiagnosticと許可されたcompleteまたはpartial commitを生成し、他のfileへ影響しない。失敗したrequest-owned attemptはnew/partial resultを一切commitせず、失敗requestのerrorとともに最後の正常commit済みsnapshotだけを利用可能に保つ。Startup failureは実行可能なmessageとともにlaunchを終了する。Accept済みの明示rescan failureは最後の正常commit済みsnapshotを維持してstaleとしてmarkし、accept前rejectionは`scanRequestId`を作成せず、失敗したinitial Global enableはGlobal Sourceまたはgenerationを作成せず既存snapshot stateを維持する。Manifestはさらにaccept後のGlobal-disable failureを扱わなければならない（MUST）。この場合、REST processは全inspection dataをfenceし、retry/join controlをretainし、restart next stepを示して生存しなければならない（MUST）。
- **SC-008**: 4つのprimary workflowすべてをkeyboardだけで完了できる。維持管理するbilingual WCAG 2.2 AA matrixでは、local browser interfaceにapplicableとしたLevel AおよびAA success criterionの0件ではない件数をdenominatorとする。Non-applicable criterionは、そのrowに必要なcriterion固有の理由がある場合だけdenominatorから除外する。Applicable criterionは、そのrowで必須としたstable-ID automated/manual checkのすべてに記録済みresultがあり、closed manual execution matrixのapplicableな全cellで合格した場合だけ合格とする。Criterion row、必要な理由、check ID/mapping、manual cell、frozen environment value、evidence、resultのいずれかが欠ければgateを不合格とする。SC-008はapplicable criterionのfailureが0件で、英語・日本語matrixが意味的に同等な場合だけ合格とし、defectのseverityによってこの合否ruleを変更しない。
- **SC-009**: SC-009 manifestは、文書化済みinitial-release Source Condition Fact rowごとにfixtureを1件以上含め、サポート対象toolと文書化済みproduct surfaceのそれぞれを0件ではなく網羅し、documented-condition caseとunavailable-state caseをそれぞれ1件以上含めなければならない（MUST）。Manifest記載factの100%で、各factを正しいSource、tool、product surfaceの下にexpected documented conditionまたはunavailable stateおよびevidenceとともに表示し、physical/synthetic file、file ID、Source-relative Path、authored source text、comparison target、relationship origin、local/hosted read、network requestを作成するfactを0件にする。

## 前提

- 初期リリースはローカルのsingle-user inspection sessionである。Remote hosting、collaboration、account、durable profileは対象外とする。
- 初期リリースの実行可能なapplication codeはすべてJavaScript/TypeScriptで実装する。Browserは生成済みclient logicとdeclarative assetを実行し、それ以外のproduct codeはすべてNode.js上で実行する。Strict manifest、documentation、license fileはnon-executable package dataのままとする。FR-038のとおり、公開packageのuserはRust toolchain、native compiler、native addon、platform別prebuilt binary、package lifecycle/runtimeでのartifact downloadを必要としない。公開package payloadとproduct runtimeはこれらを一切含まず、要求もしない。開発専用toolingは公開package payloadの外にあり、この保証の対象外である。Contributor toolchainは、prebuiltなplatform別componentやpin済みcertification-browser downloadを含み得る、個別にpin/audit済みのthird-party development dependencyを使用するが、これらを公開payloadまたはproduct runtimeへ持ち込んではならない。
- 調査対象のRepository rootとopt-in済みGlobal rootは、起動したuserが管理する、ユーザーが既に信頼しているworkspace内の通常のlocal pathである。通常の同時editはper-file diagnosticまたはfailed scanとして現れ得るので、ユーザーが再scanする。Workspaceを信頼しないユーザーはそこでこのツールを実行すべきではないため、productは敵対的なlocal processに対する防御を行わない。
- Product起因source mutationは、OSのaccess-time policyではなく、mutation可能なfilesystem requestと観測可能なsource propertyによって測定する。Inspectorはaccess-time変更を要求しない。OSだけによるread-side access-time更新は別に記録し、product mutationの成立根拠にしない。
- 選択済みRepository rootは調査boundaryであり、いずれかのcoding agentが使用する実効working directoryの証明ではない。起動時`cwd`または`--cwd`でsubdirectoryを選択した場合、Repository Sourceはそのsubtreeに限定される。より広いscopeを調査するには、意図するrootからcommandを再実行するか、そのrootを`--cwd`で指定する。
- 公式のカスタマイズ形式は変化し得る。正確な調査対象パス、filename、extensionは計画時に再確認して確定し、公開したうえでconformance fixtureによって検証する。Version付きrelease noteがcurrent general guideの網羅的listから省略されたbehaviorを直接追加する場合、そのspecific additionはscopeに残し、互換性のないevidenceを`conflict`として保持する。記載されないschemaまたはorderingを推測しない。
- 公式pageは日付なしまたはrolling更新であり得て、upstream featureはpreview、rollback、supersedeされ得る。Evidenceの鮮度はpage dateではなくrecordごとの`reviewedOn`とsection fingerprintで固定し、日付なしまたはrollingなpageはversion gateを確立しない。Preview中のfeatureはclosedな`preview`/`experimental` lifecycle qualifierを保持する。Rollbackまたはsupersedeされたassertionはdrift時に再reviewし、直接矛盾が残る場合は削除するか`conflict`として保持する。いずれのstateも`stable`として表示したり推測で解消したりしない。
- Global調査はFR-015からFR-017のinstruction pathだけを対象とする。追加のuser-global skill、agent、settings、MCP定義、plugin、managed configuration、remote configurationには、別の同意と将来の仕様作業が必要である。この除外は、文書化済みhosted/runtime behaviorについて保守するread authorityを持たないSource Condition Factの表示を妨げない。そのfactはremote configurationを調査も公開もしない。
- Source text、表示対象の宣言済みmetadata値、authored relationship target、comparison contentは、記述された差分を確認できるようcredential maskingなしで表示する。調査対象content内の環境変数参照はリテラルのままとし、解決しない。Productはreveal workflowを持たない。Loopback-boundなlocal hostをAPI access boundaryとし、bundled-browser warning acknowledgementは各document loadとclient-data purgeでresetするmemory内presentation invariantであり、すべての`FileDetail` requestまたはcomparison構築の前に必要とする。
- Inspectorは、構文だけのparsing、正確なliteral抽出、機械的なtyped decoding、frozen catalogに対する分類、文書化済みstructural order、scope、condition、selection、reference relationshipの投影を行ってよい。Natural-languageの意味を解釈せず、正しさ、有効性、compliance、qualityを判定せず、contentをrank付けせず、remediationを助言しない。Parse diagnosticはvalidation resultではなくdescriptive failureである。
- File、collection、parser、transport、queue、時間、concurrencyの容量は、Node.js、parser、OS、filesystem、browser、実行環境から継承する。Inspectorは数値capacity上限を定義せず、thrownまたはrejected operationの原因を調べず、customization contentをvalidまたはinvalidに分類しない。
- Node.js公開APIのfilesystem promiseは強制cancelできない場合がある。Disable、shutdown、supersessionはpublication authorityを取り消し、遅延resultを破棄する。Productはkernel I/Oの物理的cancelや、uncaughtなstartup error後のprocess survivalを保証しない。
- 初期リリースで一度に比較できるのは2つのdistinctなカスタマイズファイルに限定し、contentのmergeやeditは行わない。
- プロダクト文書とサポート対象一覧は公式vendor documentationを規範となる外部dependencyとして使用し、文書化されていない動作は明示的にuncertainなまま扱う。
