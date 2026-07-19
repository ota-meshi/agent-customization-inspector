# 仕様品質チェックリスト: Agentカスタマイズの調査

[English](requirements.md)

**目的**: 計画phaseへ進む前に仕様の完全性と品質を検証する
**作成日**: 2026-07-15
**機能**: [Agentカスタマイズの調査に関する仕様](../spec.ja.md)

## 内容の品質

- [x] 明示的に要求されたNode.js-only制約、そのsecurity保証・環境由来resource behavior・残存riskを定義するために必要最小限の公開API behavior、scan完了とUS4 resultの安定性を客観化するrequest/generation identity・state-lifecycle用語を除き、実装詳細（言語、framework、API）がない
- [x] ユーザー価値とbusiness needに焦点を当てている
- [x] 非技術stakeholder向けに記述されている
- [x] すべての必須sectionが完成している

## 要件の完全性

- [x] `[NEEDS CLARIFICATION]` markerが残っていない
- [x] 要件がtestableかつ明確である
- [x] 成功基準が測定可能である
- [x] SC-002がversion付きで公開されたreference profile、fixture digest、自動初回scan後にstatusとcommit済みinventory generationを1つの`scanRequestId`へ対応付ける客観的な明示rescan protocolを使用する
- [x] SC-004が測定可能なfilesystem-race動作を文書化済みNode.js-only threat modelへ明示的に限定する箇所を除き、成功基準がtechnology-agnosticである
- [x] すべてのacceptance scenarioが定義されている
- [x] 境界事例が特定されている
- [x] Scopeが明確に限定されている
- [x] Dependencyと前提が特定されている
- [x] Origin-file-less Source Condition Factが定義され、file authorityまたはread authorityを付与せずにuser scenario、要件、entity、edge case、測定可能な成果で扱われている
- [x] US4が、initialまたはretryのGlobal Source正常commitすべてについて、`Source.sourceId`とsemantic上変化しないRepository inventory/source contentを維持しながら、generation advance、generation-owned IDの再key、以前のgenerationに属するdetail/comparison/editor stateの無効化を必須とし、all-rejected attemptがcommitを生成しないことを定義している
- [x] ClosedなDiagnostic unionが正確なlocation invariantを定義している。File scopeはcoherentな`sourceId`/`fileId`/`sourceRelativePath` tupleを必須とし、source scopeは`sourceId`だけを必須としてfile/pathを禁止し、session scopeは3つすべてを禁止し、scopeはgeneration ownershipとlifecycle ownershipの違いに直交する
- [x] Product起因mutationを禁止済みmutation-capable requestと観測可能なsource propertyで定義し、OSだけによるaccess-time変更をfailureにもproofにもせず別に記録する
- [x] FR-032が許可するstructural-projection boundaryを定義し、全product/documentation surfaceでvalidation、semantic interpretation/ranking、verdict、remediation adviceを禁止する
- [x] FR-029とFR-040が製品定義の数値resource validation limitを禁止し、回復可能なengine/環境failureとrevoked late workの安全な処理、固定codeと不透明IDだけを含むoperational log、認証済みdiagnosticとの分離を要求する
- [x] File sizeとitem件数をcustomizationのvalidity、correctness、compliance、lint findingに使用せず、容量をNode.js、parser、OS、filesystem、browser、実行環境から継承する
- [x] Closedなscan-publication tableが、完全なtraversal後の決定的かつentry-localでcapacityに起因しないfailureだけにcontracted partial publicationを許可し、capacity/resource failureではattemptをabortし、item、Source、recognition、derived result、scan-result record/response、generationを一切commitせず、prior committed snapshotだけを維持する
- [x] 検証済みbyteのdecoding tableが、NUL/binary、strict UTF-8、先頭BOM 1つの記録と除去、replacement/別decodeなしのunsupported invalid UTF-8、diagnostic-only itemのcomparison不適格を、製品固有のbyte、line、item上限なしで扱う
- [x] ClosedなGlobal-root tableがabsent/default、empty、relative、表現不能、通常のhome外を含む表現可能なabsolute root、fallbackなしのconsent後rejection、commit前Source publicationなしのprovisional admissionを区別する
- [x] 固定browser helperがinspection由来のpath/contentを受け取らず、closedなambient platform key setだけを直接copyでき、Source rootとのlexical一致がprovenanceを変えずauthorityを与えずhandlerを選択しない
- [x] SC-008が、Level A/AA全基準のbilingual applicability matrix、criterion固有の非適用理由、automated/manual check mapping、0件ではないapplicable-criterion denominator、failure 0件の合格ruleを定義している
- [x] ApplicableなSC-008 rowがcriterion固有のstable check IDとexpected observationを持ち、closed manual matrixが両locale、release/environment version、responsive/visual profile、workflow state、input profileを固定して、未記録のsamplingを許さない
- [x] WCAG 2.2 criterion 2.2.2が、他contentと並行する自動更新scan/status informationをapplicableとして扱い、criterion準拠のessential exceptionを立証しない限り、検証済みpause/stop/hideまたはuser-frequency mechanismを要求する

## 機能の準備状況

- [x] すべての機能要件に明確なacceptance criteriaがある
- [x] User scenarioが主要flowを網羅している
- [x] 成功基準で定義した測定可能な成果を満たしている
- [x] 初回利用者studyについて、必要性、accountable ownership、recruitmentとcompensation funding、participant support、privacy、accessibility、定義済みreview protocol、再実施条件を明記し、通常のcontributorへ責任を負わせていない
- [x] 意図したNode.js-only制約、security/cancellation limitationをtestableにする公開API check、scan完了とUS4 resultの安定性をtestableにするrequest/generation identity、mutation measurement、state-lifecycle用語を除き、実装詳細が仕様へ漏れていない

## 注記

- 不活性なbrowser表示、tool-specific instruction選択rule、surface別behavior table、official-source
  traceabilityを明文化した後、2026-07-15の検証iteration 3ですべての項目に合格した。
- ユーザーが要求したNode.js-only runtime制約を記録した後、2026-07-16の検証iteration 4で合格した。
  Filesystem containmentを過大評価しないため、仕様には関連する公開APIの制約を明記している。
  詳細なalgorithmとdata structureはplanとresearch artifactへ残している。
- 2026-07-17の検証iteration 5では、tool別の独立したGlobal Source、environment置換を行わない
  値の完全表示、致命的な再scanのrollback、Source-relative path用語、後にiteration 7で置き換えた
  当時の非公開performance-environment案という5件のclarificationを記録した。SC-002には固定済みの
  sampling・aggregation protocolがなく、SC-001とSC-006には参加者populationとstudy protocolがないため、
  3つのchecklist項目を未完了へ戻した。これらの成功基準をrelease gateとして使用する前に、追加の
  clarification passが必要である。
- 2026-07-19の検証iteration 6では、唯一の固定startup browser起動helperをcustomization由来の
  child processから区別し、FR-007のmetadata/relationship presentation allowlistをclosedにし、
  正確な100ミリ秒未満のinteraction protocolをSC-002へ追加し、仕様をimplementation-readyと
  した後、すべての項目に合格した。Iteration 5で指摘したsampling、participant、cross-workflowの
  protocolはこのiterationでは仕様化済みと扱われ、clarification markerは残っていなかった。
- 2026-07-19の検証iteration 7では、可変かつ非公開だったSC-002環境をversion付き公開profileと
  客観的status停止条件へ置き換え、20人release studyのfunding、support、privacy、accessibilityを
  maintainer teamへ割り当ててcritical-issue reviewを限定し、origin-file-less Source Condition Factを
  scenario、要件、entity、edge case、verification、SC-009にわたって仕様化した後、すべての項目に合格した。
- 2026-07-19の検証iteration 8では、comparisonの対象を発見済みで読み取り可能な
  カスタマイズファイルに限定し、読み取り不能またはdiagnostic-onlyなitemをdiagnostic reviewのみに
  利用可能とし、そのselection boundaryをtask再生成前に明示した後、すべての項目に合格した。
- 2026-07-19の検証iteration 9では、各FR-007 presentation file typeをexactな`(tool, kind)`と
  admission済みsource formの組として定義し、exact source-form extractor applicabilityを第2のeligibility gateとし、
  Claude marketplace catalogをsupportedなinitial-release familyへ明示的に追加した後、すべての項目に合格した。
- 2026-07-19の検証iteration 10では、生成済みtask historyを再確認し、元のfamily-vertical orderを復元した後、
  すべての項目に合格した。各familyのdiscoveryと完全で不活性なdetailをそのcomparisonより前に置き、familyは正確な
  SKILL → Instructions → MCP → Rules → Commands → Copilot Prompts → Custom Agents → Configuration/Settingsの
  順序を維持し、Global inspectionはRepository acceptanceの後に置く。
- 2026-07-19の検証iteration 11では、US4のRepository resultの安定性をsemantic上の安定性として定義しながら、
  Global Source正常commitにgeneration advance、generation-owned IDの再key、以前のgenerationに属するstateの無効化を
  必須とし、file/source/sessionの排他的なDiagnostic location invariantを定義し、SC-008の未定義だった
  critical-defect thresholdを、Level A/AA全基準のbilingual matrixと0件ではないdenominatorに対するapplicable criterionの
  failure 0件gateへ置き換えた後、すべての項目に合格した。
- 2026-07-19の検証iteration 12では、全WCAG rowへstable check IDとexpected observationを割り当て、完全なmanual execution
  matrixをclosedにし、2.2.2を修正して他contentと並行する自動更新statusに固有controlを要求した後、すべての項目に合格した。
- 2026-07-19の検証iteration 13では、意図したcapability認証済み完全content調査とpath/content-freeな
  operational logを両立させ、環境failure処理、revocation、late cleanupを定義し、SC-002を明示的な
  rescan requestとそのcommit済みgenerationへ対応付け、product起因mutationをOSだけによるaccess-time effectから
  独立して定義し、FR-032のnon-analysis boundaryを全product/documentation surfaceへ適用した後、全項目に合格した。
- 2026-07-19の検証iteration 14では、製品定義のfile size、件数、parser、transport、queue、時間、
  concurrency上限を除去した。容量はsupported engineと環境から継承し、回復可能なfailureを運用diagnostic
  として扱い、validation、correctness/complianceの含意、lint findingには使用しない。
- 2026-07-19の検証iteration 15では、Global-root admission、検証済みbyte decoding、scan-publication outcomeを
  closedにし、contracted partial commitを完全なtraversal後の決定的かつentry-localでcapacityに起因しないfailureだけに
  限定し、capacity/resource failureをすべてnon-publishingとし、ambient browser-helper contextをinspection由来pathの
  provenanceから分離した後、すべての項目に合格した。
- 正確なRepositoryの調査対象パス一覧は、公式vendor specificationを再確認した後、計画phaseで意図的に確定する。仕様はサポートするproduct familyを固定し、仕様変更なしのGlobal scope拡張を禁止している。
- 一時的なローカルのプロダクト説明ファイルは、この仕様からリンクされず、仕様の利用にも必要ない。
