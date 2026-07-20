# Accessibility受入contract

[English](accessibility-acceptance.md)

**規範対象**: 完全なlocal browser interfaceに対するQR-004とSC-008の受入

**参照**: [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)のLevel AおよびAA

## 判定rule

Release candidateは、下表のWCAG 2.2 Level A/AA成功基準を、4つの主要workflowすべてと、
各workflowで使用する全responsive variationに対して評価しなければならない（MUST）。各行は、
次のいずれか1つの確定済みapplicability stateを持つ。

- **Applicable**: 指定した自動、contract、手動evidenceがすべて合格しなければならない。
- **Not applicable**: 記載したproduct factを、完全なrelease diffとbuild済みpackageに対して再確認
  しなければならない。そのfactが成立しなくなった場合、その行をApplicableへ変更し、release前に
  合格evidenceを取得する。

SC-008が合格するのは、Applicableな全行が合格し、Not-applicable rationaleがすべて成立し、4つの
主要workflowをkeyboardだけで完了でき、Applicableなrowの件数と等しい0件ではないdenominatorが記録された
場合だけである。Level A/AAの全55基準はinventoryに残し、Not-applicable rowはcriterion固有のrationaleが
成立している間だけdenominatorから除外する。現在の確定denominatorは38であり、applicability stateを変更する場合は、
この数と両言語版を同時に更新しなければならない（MUST）。別の「critical defect」による免除やseverity thresholdは設けない。
Applicableな1基準の失敗、根拠のないNot-applicable判定、未検査のresponsive variation、未完了のkeyboard
workflowのいずれか1つでもSC-008は失敗する。

## 安定check IDと実行場所

各行は必須checkの完全な集合を指定する。各安定IDにcriterion番号を含めるため、別criterionでIDを再利用できない。

| ID形式 | 正確な実行場所と記録rule |
|---|---|
| `AUTO-{criterion}` | `tests/e2e/accessibility.spec.ts`に置き、test titleへ完全なIDを含めるdeterministic test。Packed release candidateに対してPlaywright 1.61.1の3 projectすべてで実行し、行のproduct固有受入条件をassertする。補助unit/contract testはevidenceを追加できるが、このtestを置き換えられない。`validation.ja.md`のWCAG result tableへ、ID、3 projectすべての結果、artifact path、pass/failを記録する。 |
| `MANUAL-{criterion}` | Procedureは行のproduct固有受入条件であり、下記の閉じたmanual matrixのapplicableな全cellで実行する。`validation.ja.md`のmanual-cell tableへ、`(ID, locale, platform, viewport, mode, scenario, input)`の各cellごとにresult、evidence、reviewerを記録する。 |
| `REVIEW-{criterion}` | 完全なrelease diff、packed-file manifest、render済みpacked interfaceに対して、行に記載した不在preconditionが引き続き不在か再確認する。`validation.ja.md`のWCAG result tableへ、ID、調査したdiff/manifest/build identifier、reviewer、rationale、evidence、pass/failを記録する。 |

`AUTO-*`と`MANUAL-*`の両方を指定する行では両方を必須とする。自動結果はevidenceであり、必須の手動checkを
置き換えない。Tool reportがruleを「inapplicable」としただけではNot-applicable行を立証できない。

## WCAG 2.2 Level A/AA applicability matrix

| Criterion | Level | State | 必須check | 確定済みproduct固有受入条件 |
|---|---:|---|---|---|
| 1.1.1 Non-text Content | A | Applicable | `AUTO-1.1.1`; `MANUAL-1.1.1` | 全icon、status glyph、非text controlに同等のaccessible nameがあり、装飾contentをassistive technologyから隠す。 |
| 1.2.1 Audio-only and Video-only (Prerecorded) | A | Not applicable | `REVIEW-1.2.1` | Productはprerecorded audio/videoを同梱・表示しない。調査対象のmarkup/media参照は不活性なtextのままでloadされない。 |
| 1.2.2 Captions (Prerecorded) | A | Not applicable | `REVIEW-1.2.2` | Productはprerecorded synchronized mediaを同梱・表示しない。 |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | A | Not applicable | `REVIEW-1.2.3` | Productはprerecorded synchronized mediaを同梱・表示しない。 |
| 1.2.4 Captions (Live) | AA | Not applicable | `REVIEW-1.2.4` | Productはlive audio/videoを提供しない。 |
| 1.2.5 Audio Description (Prerecorded) | AA | Not applicable | `REVIEW-1.2.5` | Productはprerecorded videoを同梱・表示しない。 |
| 1.3.1 Info and Relationships | A | Applicable | `AUTO-1.3.1`; `MANUAL-1.3.1` | Heading、landmark、list、table、label、diagnostic、source metadata、comparison relationshipをprogrammaticに表現する。 |
| 1.3.2 Meaningful Sequence | A | Applicable | `AUTO-1.3.2`; `MANUAL-1.3.2` | DOM、focus、reading、narrow layout、diff viewの順序が意図した意味を保持する。 |
| 1.3.3 Sensory Characteristics | A | Applicable | `MANUAL-1.3.3` | Instructionとnext stepがshape、color、position、orientation、soundだけに依存しない。 |
| 1.3.4 Orientation | AA | Applicable | `AUTO-1.3.4`; `MANUAL-1.3.4` | すべての主要workflowがorientation lockなしでportrait/landscapeの両方で動作する。 |
| 1.3.5 Identify Input Purpose | AA | Not applicable | `REVIEW-1.3.5` | WCAG input-purpose taxonomyに該当するuser情報を収集するfieldがない。 |
| 1.4.1 Use of Color | A | Applicable | `AUTO-1.4.1`; `MANUAL-1.4.1` | Tool、state、severity、selection、diffの意味には常にcolor以外のindicatorがある。 |
| 1.4.2 Audio Control | A | Not applicable | `REVIEW-1.4.2` | Productはaudioを出力しない。 |
| 1.4.3 Contrast (Minimum) | AA | Applicable | `AUTO-1.4.3`; `MANUAL-1.4.3` | Textとtext-equivalentのcontrastがlight、dark、forced-colors表示で合格する。 |
| 1.4.4 Resize Text | AA | Applicable | `AUTO-1.4.4`; `MANUAL-1.4.4` | 200% zoomでcontent/functionを失わず、textがreadableかつoperableである。 |
| 1.4.5 Images of Text | AA | Not applicable | `REVIEW-1.4.5` | Text表示を目的とするimageを同梱せず、調査対象imageをloadしない。 |
| 1.4.10 Reflow | AA | Applicable | `AUTO-1.4.10`; `MANUAL-1.4.10` | 許容されたessential source-code regionを除き、WCAG reference widthで2次元page scrollなしに主要workflowがreflowする。そのregionにはaccessible alternative/inline layoutがある。 |
| 1.4.11 Non-text Contrast | AA | Applicable | `AUTO-1.4.11`; `MANUAL-1.4.11` | Focus indicator、control、selected state、boundary、意味のあるgraphicがnon-text contrastを満たす。 |
| 1.4.12 Text Spacing | AA | Applicable | `AUTO-1.4.12`; `MANUAL-1.4.12` | 必須text-spacing overrideでcontentのclip、非表示、overlap、function lossが起きない。 |
| 1.4.13 Content on Hover or Focus | AA | Applicable | `AUTO-1.4.13`; `MANUAL-1.4.13` | Tooltip、popover、hover/focus contentは必要に応じてdismissible、hoverable、persistentである。存在しない場合はそれをreleaseで証明する。 |
| 2.1.1 Keyboard | A | Applicable | `AUTO-2.1.1`; `MANUAL-2.1.1` | Monaco source/diff accessを含む4つの主要workflowの全operationがkeyboardで動作する。 |
| 2.1.2 No Keyboard Trap | A | Applicable | `AUTO-2.1.2`; `MANUAL-2.1.2` | 標準keyboard操作で全control、dialog、editor、error、consent stateへfocusを出入りさせられる。 |
| 2.1.4 Character Key Shortcuts | A | Not applicable | `REVIEW-2.1.4` | 単一の印字可能文字でapplication commandを起動しない。Read-only editor defaultも同じ性質か確認する。 |
| 2.2.1 Timing Adjustable | A | Not applicable | `REVIEW-2.2.1` | Visibleなuser taskにtime limitがない。Network deadlineとhidden-page security purgeはvisible interactionを期限切れにせず、Resumeで固定時間内の完了を要求せずにoperableな新規summaryへ戻れる。 |
| 2.2.2 Pause, Stop, Hide | A | Applicable | `AUTO-2.2.2`; `MANUAL-2.2.2` | 他contentと並行表示される自動開始scan/status updateをpause、stop、hide、またはuser制御のupdate frequencyへ変更できる。文書化したessential exceptionでは、正確なupdateを識別し、代替ではpurposeを満たせない理由を証明し、releaseの明示承認を得る。 |
| 2.3.1 Three Flashes or Below Threshold | A | Not applicable | `REVIEW-2.3.1` | 同梱animation/state transitionはflashせず、調査対象contentをactive media/animationとしてrenderしない。 |
| 2.4.1 Bypass Blocks | A | Applicable | `AUTO-2.4.1`; `MANUAL-2.4.1` | Keyboard/assistive-technology userが反復navigationをskipして主要workflow contentへ移動できる。 |
| 2.4.2 Page Titled | A | Applicable | `AUTO-2.4.2`; `MANUAL-2.4.2` | 各client routeがstateに合ったdescriptiveなdocument titleを公開する。 |
| 2.4.3 Focus Order | A | Applicable | `AUTO-2.4.3`; `MANUAL-2.4.3` | Route change、warning gate、rescan、Global commit、disable、error、generation replacementでfocus orderがlogicalなままである。 |
| 2.4.4 Link Purpose (In Context) | A | Applicable | `AUTO-2.4.4`; `MANUAL-2.4.4` | 全link/link-like navigationのpurposeがaccessible textとcontextから分かる。調査対象linkは不活性なtextのままである。 |
| 2.4.5 Multiple Ways | AA | Not applicable | `REVIEW-2.4.5` | Root inventoryだけがstandalone pageであり、file、comparison、consent routeは単一local inspection processの結果またはstepである。新しいstandalone pageが追加された場合、この行をApplicableへ変更する。 |
| 2.4.6 Headings and Labels | AA | Applicable | `AUTO-2.4.6`; `MANUAL-2.4.6` | Filter、source fact、diagnostic、warning、comparison、Global controlを含むheading/labelがtopicまたはpurposeを説明する。 |
| 2.4.7 Focus Visible | AA | Applicable | `AUTO-2.4.7`; `MANUAL-2.4.7` | 全keyboard-operable elementがすべてのsupported visual modeでvisible focus indicatorを持つ。 |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Applicable | `AUTO-2.4.11`; `MANUAL-2.4.11` | Sticky region、dialog、Monaco surface、progress、responsive layoutがfocused component全体を隠さない。 |
| 2.5.1 Pointer Gestures | A | Not applicable | `REVIEW-2.5.1` | Multipointまたはpath-based pointer gestureを必要とするfunctionがない。 |
| 2.5.2 Pointer Cancellation | A | Applicable | `AUTO-2.5.2`; `MANUAL-2.5.2` | Down-eventだけでpointer actionを完了せず、cancel/undo-safeな同等手段がある。 |
| 2.5.3 Label in Name | A | Applicable | `AUTO-2.5.3`; `MANUAL-2.5.3` | Controlのvisible labelがaccessible nameに含まれる。 |
| 2.5.4 Motion Actuation | A | Not applicable | `REVIEW-2.5.4` | Device/user motionをinputに使うfunctionがない。 |
| 2.5.7 Dragging Movements | AA | Not applicable | `REVIEW-2.5.7` | Draggingを必要とするapplication functionがない。Selection、comparison、filtering、editor navigation、consentにnon-drag controlがある。 |
| 2.5.8 Target Size (Minimum) | AA | Applicable | `AUTO-2.5.8`; `MANUAL-2.5.8` | Pointer targetがminimum sizeまたはcriterionの明示的exceptionを満たし、exceptionを個別に記録する。 |
| 3.1.1 Language of Page | A | Applicable | `AUTO-3.1.1` | English/Japanese表示が正しいprimary page languageを設定する。 |
| 3.1.2 Language of Parts | AA | Applicable | `MANUAL-3.1.2` | 必要なhuman-language changeを識別する。Code、path、authored source、product name、technical identifierにはcriterion上適切な扱いを適用する。 |
| 3.2.1 On Focus | A | Applicable | `AUTO-3.2.1`; `MANUAL-3.2.1` | Focusを受け取るだけではcontextを変更しない。 |
| 3.2.2 On Input | A | Applicable | `AUTO-3.2.2`; `MANUAL-3.2.2` | Input changeの効果がpredictableであり、context changeがある場合は使用前に説明する。 |
| 3.2.3 Consistent Navigation | AA | Applicable | `AUTO-3.2.3`; `MANUAL-3.2.3` | 同じresponsive variationで反復navigationのrelative orderが一定である。 |
| 3.2.4 Consistent Identification | AA | Applicable | `AUTO-3.2.4`; `MANUAL-3.2.4` | 同じfunctionのcomponentがvisible/accessibilityの両面で一貫して識別される。 |
| 3.2.6 Consistent Help | A | Applicable | `MANUAL-3.2.6` | 反復next-step/help mechanismが存在する場合、同じresponsive variationで同じrelative orderに置かれる。 |
| 3.3.1 Error Identification | A | Applicable | `AUTO-3.3.1`; `MANUAL-3.3.1` | 検出したinput/workflow errorをtextで識別し、影響するcontrol/stateへ関連付ける。 |
| 3.3.2 Labels or Instructions | A | Applicable | `AUTO-3.3.2`; `MANUAL-3.3.2` | Controlと必須confirmationに、input前の十分なlabel/instructionがある。 |
| 3.3.3 Error Suggestion | AA | Applicable | `AUTO-3.3.3`; `MANUAL-3.3.3` | Safeな修正が既知なら、source valueを露出せずにdiagnostic/errorが実用的なnext stepを示す。 |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Not applicable | `REVIEW-3.3.4` | Productはlegal/financial commitmentを作らず、durableなuser-controlled dataを変更・削除しない。Global disableはtransient inspection stateだけを削除し、明示的な再enable/rescanで回復できる。 |
| 3.3.7 Redundant Entry | A | Not applicable | `REVIEW-3.3.7` | 以前入力した情報の再入力を求めない。Acknowledgement/confirmationはactionであってdata entryではない。 |
| 3.3.8 Accessible Authentication (Minimum) | AA | Applicable | `AUTO-3.3.8`; `MANUAL-3.3.8` | Capability URLのopen/reopenにcognitive-function test、transcription、puzzle、memorizationを要求せず、manual fallbackを利用できる。 |
| 4.1.2 Name, Role, Value | A | Applicable | `AUTO-4.1.2`; `MANUAL-4.1.2` | Custom control、Monaco integration、state、property、changeが正しいprogrammatic name、role、valueを公開する。 |
| 4.1.3 Status Messages | AA | Applicable | `AUTO-4.1.3`; `MANUAL-4.1.3` | Scan、rescan、stale、error、comparison、Global、livenessのstatus changeをfocus移動なしでannounceする。 |

## 閉じたmanual実行matrix

Manual acceptanceではdevelopment serverではなくpacked release candidateを使用する。実行前にtarball digest、
Playwright 1.61.1 package versionとbundled browser revision、supported OS version、実際のbrowser/engine version、
assistive-technology version、locale pack、display scalingを`validation.ja.md`へfreezeする。必須platform cellは次の3つである。

| Platform ID | Supported OS、engine、assistive technology |
|---|---|
| `P1` | macOS 15 arm64、Playwright-bundled WebKit revision、VoiceOver。 |
| `P2` | Windows Server 2025 x64、Playwright-bundled Chromium revision、NVDA。 |
| `P3` | Ubuntu 24.04 x64、Playwright-bundled Firefox revision、Orca。 |

最初のcheck前に解決済みOS build、browser/engine revision、AT versionを記録し、それをreleaseの固定baselineとする。
固定version、revision、tarball byte、matrix定義、またはaccessibilityへ影響するsourceのいずれかが変わった場合、manual
checkをすべて再実行する。

各`MANUAL-*` IDを次の閉じた集合の直積で実行する。

- **Locale**: `L1` English（`en`）、`L2` Japanese（`ja`）。
- **Viewport/profile**: `V1` 1440×900 CSS px landscape、100% zoom、default spacing、
  `V2` 390×844 CSS px portrait、100%、default spacing、`V3` 844×390 CSS px landscape、
  100%、default spacing、`V4` 1280×720 CSS px landscape、200% browser zoom、default
  spacing、`V5` 1280×720 CSS px landscape、100% zoomでline height `1.5`、paragraph
  spacing `2em`、letter spacing `0.12em`、word spacing `0.16em`を同時適用。
- **UI mode**: `M1` light、forced colorsなし、normal motion、`M2` dark、forced colorsなし、
  reduced motion、`M3` native OS forced colors、reduced motion。`P1/M3`と`P3/M3`だけが事前定義された
  platform-mode N/A cellであり、指定したsupported OSにnative forced-colors modeがないというrationaleを個別に
  記録する。いずれも黙って省略しない。
- **Workflow/state scenario**: `S1` populated inventory、filter、tool/source/kind factを伴うRepository discovery、
  `S2` Repository empty state、決定的にreturnされたsource Diagnostic、明示的rescan、および以前のsnapshotをstaleのまま
  保持してgenericなOperation Errorだけを表示する別のthrown/rejected rescan、`S3` sensitive-content acknowledgement前後の
  file inspectionとMonaco source access、`S4` file diagnosticと実行可能なnext step、`S5` 2-file comparison、
  Monaco accessible diff、narrow inline alternative、`S6` generation replacement後のstale/removed comparison、
  `S7` Global disabled、selectorを持たないfixed 3-toolのsession-wide consent pending、admit済みsubsetを1 batchでscanして
  正確に1つのatomic generationとしてcompleteする状態、その他のthrow/rejectionによるtransaction全体abort、およびrequest前
  full client-data purge、greater content epoch、non-nullな全inspection-data fence、control-onlyのdraining/failed/retry/join state、
  unconfirmed cleanupのrestart next step、terminal recovery、`remove-active-state` N+1、未公開initial enableだけの
  `cleanup-only` N caseを扱う明示disable、`S8` 並行表示されるscan/status update、exactな
  `{ sessionId, globalContentEpoch, globalDisableInProgress }` liveness stateとrender前purge transition、disable fenceがnullの場合だけの
  Resume inspection、pause/stop/hideまたはuser-frequency control、error recovery、focus restoration。
- **Input profile**: `I1` AT browse/virtual modeとfocus modeを含むkeyboardのみ、`I2` click activationとcancellationを
  通るprimary pointer、`I3` mouse hoverに続くkeyboard focus、dismissal、pointer transfer、persistence check。

Cell keyは`(MANUAL-ID, L#, P#, V#, M#, S#, I#)`である。閉じた直積は、明示的なN/A resultを持つcellも含め、
各`MANUAL-*` IDにつき`2 × 3 × 5 × 3 × 8 × 3 = 2,160`個のkey付きcellを持つ。Applicableな全cellを実行し、sampling、platformの
持ち回り、自動evidenceによる代用を禁止する。Trigger componentまたはOS capabilityが客観的に存在せず、特定cellに
criterionを適用できない場合、その個別cellをN/Aとして、正確な技術的rationaleとevidenceを記録する。空欄、暗黙、
group単位のN/Aはgateを失敗させる。各実行cellの期待観察は、対応するmatrix行のproduct固有受入条件である。

## 必須execution record

`validation.md`と`validation.ja.md`は、55行それぞれについて、確定state、必須check IDの完全な集合、各IDのresultと
evidence location、row pass/fail、reviewer、Not-applicable revalidation noteを記録しなければならない（MUST）。
上記keyで識別するmanual matrixの全cellについて、result、evidence、許可される場合のN/A rationale、reviewerを1件ずつ
記録する。また、0件ではないApplicable-row denominator、applicable criterionのfailure 0件、4つのkeyboard workflow
outcomeを記録する。両recordは意味的に同等で、調査対象source valueを含まない。
