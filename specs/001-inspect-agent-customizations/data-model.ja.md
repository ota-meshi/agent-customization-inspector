# Data model: エージェントカスタマイズの調査

[English](data-model.md)

Modelには2つの表現がある。

- **Internal session record**はcanonical path、read中のfile descriptor、raw byte、maskの元値を含み得る。
  HTTP boundaryを越えず、logにも入れない。
- **Public DTO**はsource-relative display path、mask済みtext、bounded metadata、recognition、relationship、
  diagnostic、generation scopeのopaque IDだけを含む。

## Entity関係

```text
ContractRegistry（immutable、contract-versioned）
├── OfficialSourceRecord
├── VendorBehaviorStatement
├── RuntimeCompositionStrategy
└── InspectionRuleRegistry
    └── InspectionRule

InspectionSession
├── Source（Repositoryを正確に1つ）
│   ├── SourceBoundary（正確に1つ） → InspectionRootContext（internal）
│   └── SourceConditionFact（0以上。起点fileなし）
├── Source（Globalを0または1つ）
│   ├── SourceBoundary（enabled tool homeごとに1つ） → InspectionRootContext（internal）
│   └── SourceConditionFact（0以上。起点fileなし）
├── ScanGeneration（session-wide activeを正確に1つ）
│   └── CustomizationFile
│       ├── ScanEntryTicket + VerifiedReadReceipt（internal）
│       ├── ToolRecognition（1つ以上）
│       │   └── CandidateProvenance（1つ以上）
│       │       └── ApplicabilityAssessment
│       ├── Relationship（0以上）
│       │   └── ApplicabilityAssessment
│       ├── Mask（0以上。raw値はinternalのみ）
│       └── Diagnostic（0以上）
├── GlobalConsentPreview（current lexical previewを0または1つ）
├── GlobalConsent（active recordを0または1つ）
└── Diagnostic（session/source level failure）

BrowserState
├── FilterState
├── ComparisonSelection（0またはreadable fileを正確に2つ）
├── EditorModelState（0以上。active route/generationのみ）
└── RevealedValue（0以上。active generationのみ）
```

## Entity

### InspectionSession

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `sessionId` | opaque string | DTO | Processごとにrandom。API capabilityではない |
| `apiVersion` | literal `1` | DTO | 非互換clientを拒否する |
| `createdAt` | ISO timestamp | DTO | Process開始時刻 |
| `sources` | `Source[]` | DTO | Repositoryを正確に1つ、Globalを0または1つ |
| `activeGeneration` | integer | DTO | 単調増加。変更時にUI stateをinvalidateする |
| `limits` | `ResourceLimits` | DTO | 助言値ではなく実際にenforceする正確なlimit |
| `maskingWarning` | localized message key | DTO | Maskingが完全でないことを常に表示する |
| `sessionDiagnosticIds` | opaque string[] | DTO | 1,024件のsession limit内で受理したout-of-generation lifecycle diagnostic |
| `capability` | 256-bit random token | internal | Constant-time比較。snapshot/logへserializeしない |

Sessionはlaunch processの`cwd`から作成する。Process開始時にfile/diagnosticが空のzero-I/O bootstrap
generation 0とenabled/idle Repository sourceをpublishし、Global sourceはまだ作らず、最初のRepository scanを
自動queueする。Repository picker、ancestor search、profile、cache、resume identifierは持たない。

### ResourceLimits

| Field | 値 | Limit時の動作 |
|---|---:|---|
| `maxFileBytes` | 1 MiB | 上限を越えてreadせずinventory itemをdiagnostic付きで保持 |
| `maxTotalFileBytes` | 32 MiB | Bounded partial generationをpublish |
| `maxVisitedEntries` | 200,000 | 決定的にenumeration停止 |
| `maxCustomizationFiles` | 2,000 | 新candidate acceptance停止 |
| `maxPathSegments` | 64 | より深いentryをdiagnostic付きでskip |
| `maxAliasPathsPerFile` | 1,024 | Primary identityを保持し、alias受理を停止してpartial/diagnosticを作る |
| `maxDirectRelationshipsPerFile` | 1,000 | Stable extractor orderの先頭1,000件を保持し、diagnostic付きpartialをpublishしてrelationshipを追跡しない |
| `maxProvenancesPerRecognition` | 2,000 | 追加admissionの受理を停止し、partial generationとdiagnosticを作る |
| `maxDerivedTargetsPerSeed` | 128 | Stable typed-extractor順の先頭128 distinct validated targetを保持し、次のtargetでseedを停止、partialをpublishしてdiagnostic candidateを渡す |
| `maxDerivationDepth` | 1 | Bounded-derived provenanceは別derived edgeのseedになれない |
| `maxFallbackBasenamesPerConfig` | 16 | それ以降のCodex fallback valueをlimit diagnostic付きで拒否 |
| `maxFallbackBasenameBytes` | 128 UTF-8 byte | 個別のCodex fallback valueを拒否 |
| `maxMaskMatchesPerFile` | 4,096 | 次のmatchでそのfileのsource/metadataを全て非公開にし、一部だけmaskしたviewを出さない |
| `maxMaskedTextBytes` | 2 MiB UTF-8 | Oversizedなmasked stringを構築する前にsource/metadataを全て非公開にする |
| `maxParseDepth` | 64 | 対象recognitionのextraction resultを破棄しpartial diagnosticをpublish |
| `maxParseNodes` | 50,000 | 対象recognitionのextraction resultを破棄しpartial diagnosticをpublish |
| `maxScalarBytes` | 64 KiB UTF-8 | そのrecognitionのextraction resultを破棄し、metadata、relationship、derivationに値を残さない |
| `maxMetadataEntriesPerRecognition` | 512 | Lossyなprefixを返さず対象recognitionのextraction result全体を破棄 |
| `parseTimeBudgetMs` | recognitionごと2,000 | Parser workerをterminate/replaceし、既にmaskしたsourceとdiagnosticだけを保持 |
| `maxParserWorkers` | 2 | 別workerを作らずbounded parser jobをqueue |
| `parserWorkerMaxOldGenerationMiB` | 64 | WorkerのV8 old-generation resource limitを設定し、超過したrecognition resultを破棄 |
| `parserWorkerMaxYoungGenerationMiB` | 16 | WorkerのV8 young-generation resource limitを設定し、超過したrecognition resultを破棄 |
| `parserWorkerStackSizeMiB` | 4 | WorkerのV8 stack resource limitを設定し、超過したrecognition resultを破棄 |
| `maxSourceConditionFactsPerSource` | 256 | 無効な同梱registryをscan前に拒否し、既知limitationをtruncateしない |
| `maxConditionFactsPerAssessment` | 64 | 既知factをtruncateせず、無効なregistry emitterをscan前に拒否 |
| `maxDiagnosticsPerFile` | 128 | 最終slotをfile-limit sentinel用に予約し、overflow時は後続detailを抑止してpartialをpublish |
| `maxDiagnosticsPerSource` | 5,000 | 最終slotをsource-limit sentinel用に予約し、overflow時は後続detailを抑止してpartialをpublish |
| `maxDiagnosticsPerGeneration` | 10,000 | 最終slotをgeneration-limit sentinel用に予約し、overflow時は後続detailを抑止してpartialをpublish |
| `maxDiagnosticsPerSession` | 1,024 | Out-of-generation lifecycle diagnosticを制限し、active generationを変更せず最終slotをsession-limit sentinel用に予約 |
| `maxGlobalPreviewRootInputBytes` | 32 KiB UTF-8 | Normalization/escape前にbounded length countingを停止し、`oversized` null-display entryを返す |
| `maxGlobalPreviewDisplayBytes` | 192 KiB UTF-8 | Output expansion前にstreaming escapeを停止し、同じ`oversized` null-display entryを返す |
| `maxRequestBodyBytes` | 64 KiB | JSON parse前にreject |
| `scanDeadlineMs` | 30,000 | Abortしてbounded partial generationをpublish |
| `maxComparisonLinesPerFile` | 20,000 | Monaco diff highlightをskipし、両方のcomplete masked source viewを保持 |
| `comparisonTimeBudgetMs` | 5,000 | Monaco diff computationをcancelし、両方のcomplete masked source viewを保持 |

Serverはscan、masking、parser、request limitをenforceする。Parser jobはhost event loop外の最大2つの
`Worker` thread poolで実行する。各workerにold generation 64 MiB、young generation 16 MiB、stack
4 MiBのV8 resource limitを設け、timeout、resource-limit exit、uncaught failure後に交換する。Tree
traversalでは上記depth、node、scalar、metadata-entry limitもenforceする。Failureとなったrecognition
resultはall-or-nothingとし、そこからのrelationship/derived declarationをpublishしない。同じphysical
fileの成功した別recognitionは残してよい。Clientは同じDTO値から2つのcomparison limitをenforceし、
Monacoへ同じ有限time budgetを設定する。どちらの側もこれらの値をadvisoryとして扱わない。

### Source

| Field | Type | Rule |
|---|---|---|
| `sourceId` | opaque string | Process lifetime中はstable |
| `kind` | `repository \| global` | Repository sourceを正確に1つ |
| `enabled` | boolean | RepositoryとpresentなGlobal Sourceはtrue。Global absenceがdisabledを表し、disabling Globalはatomic removalまでtrue |
| `status` | `idle \| scanning \| disabling \| ready \| partial \| failed` | 後述transitionに従う。`disabling`はpriority barrierがworkをdrainする間のGlobalだけ |
| `boundaries` | `SourceBoundary[]` | Repositoryは1つ。Globalはconsent済みtool-home boundaryだけ |
| `generation` | integer | 公開済み全sourceでsession-wide active generationと一致 |
| `progress` | `ScanProgress`またはnull | `scanning`/`disabling`中および`ready`/`partial`後だけnon-null。`idle`、`failed`ではnull |
| `conditionFacts` | `SourceConditionFact[]` | 起点fileを持たないdocumented non-file behaviorまたはexcluded/runtime inputについてのboundedなsource-level fact |
| `diagnosticIds` | opaque string[] | 5,000件のsource limit内で受理したactive generationのsource-scoped diagnostic |

Source-level condition factはpath readを許可せず、`Relationship.fromFileId`を捏造しない。
`affectedRuleIds`にruleがあるcandidate provenanceまたはrelationshipは、関連conditionをapplicability
assessmentへ投影できるが、documented product behavior、検査しないenvironment/user setting、managed
policy、その他起点fileを持たないexcluded/runtime inputの正準な説明はsource factに残す。

### SourceConditionFact

| Field | Type | Rule |
|---|---|---|
| `tool` | tool enum | Documented non-file behaviorまたは検査しないinputを持つproduct |
| `ruleId` | stable excludedまたはrelationship-only rule ID | Non-file factを定義し、file candidateを許可できない |
| `affectedRuleIds` | non-emptyなsort済みinspection-rule ID[] | 同梱registryのcandidate/relationship-only subsetで、factを投影できるprovenance/edgeを制御 |
| `behaviorRefs` | sort済み`VendorBehaviorStatement.behaviorId`[] | Factを説明する正確なsurface/scope lookup statement。Readを許可しない |
| `strategyRefs` | sort済み`RuntimeCompositionStrategy.strategyId`[] | Projectionに使った正確なcomposition/selection statement |
| `condition` | `ConditionFact` | 固定reason codeと任意のdocumented status。`satisfied`はnon-file runtime factを記録するだけでread authorityを与えず、unmasked raw valueを含めない |

固定registryが1 sourceあたり最大256 entryを生成し、tool、説明rule、affected-rule set、condition key、
reason codeでdeduplicateする。

### SourceBoundary

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `boundaryId` | opaque string | DTO | Grouping用。pathとして受け付けない |
| `tool` | `copilot \| claude \| codex \| repository` | DTO | Repositoryは`repository` |
| `displayRoot` | string | DTO | User向けlocal path。Control characterをescapeし`maxGlobalPreviewDisplayBytes`でboundする |
| `canonicalRoot` | absolute canonical pathまたはnull | internal | Diagnostic/consent比較と反復containment checkに使用。単独ではreadを認可できず、enabled boundary外へ返さない |
| `rootContext` | `InspectionRootContext` | internal | Enumeration前に必須。中央safe-filesystem layerだけが作成・consumeできる |
| `origin` | `cwd \| default-home \| environment` | DTO | Boundary選択理由を示す |

1つのlogical Global sourceは最大3つの別boundaryを含められる。全tool homeが同じdirectoryだと
偽らず、filter可能なGlobal sourceを1つに保つ。

### InspectionRootContext、ScanEntryTicket、VerifiedReadReceipt

これらpure Node.js recordはinternalだけで、serialize、DTOからのclone、HTTP pathからのreconstruct、request
からの受理を許さない。Private module brandはapplication-level authorityをenforceするが、OS filesystem
capabilityではない。

| Entity / field | Type | Rule |
|---|---|---|
| `InspectionRootContext.privateBrand` | module-private symbol/registry membership | `src/inspection/safe-fs.ts`だけが作成・検査し、process memory外へ出さない |
| `InspectionRootContext.sourceId` / `boundaryId` | opaque ID | 正確に1 source boundaryへcontextをbind |
| `InspectionRootContext.lexicalRoot` / `canonicalRoot` | absolute path | Accepted internal rootとその`realpath`。作成後にclient valueで置換できない |
| `InspectionRootContext.rootIdentity` | bigint `dev`/`ino`/`mode` snapshot | `lstat`でcaptureし、traversal前とcandidate readごとに再比較 |
| `InspectionRootContext.rootDevice` | bigint `dev` | Nodeが公開するdevice changeを検出するが、全mount transitionの識別は主張しない |
| `InspectionRootContext.state` | `active \| closed` | Source disable/process終了でcloseし、closed後の全callを拒否 |
| `ScanEntryTicket.privateBrand` / `rootContext` | module-private brand / internal reference | 1 active root contextのbounded enumerationだけが発行 |
| `ScanEntryTicket.sourceId` / `boundaryId` / `generationId` | opaque ID / integer | 正確に1 source boundaryとscan generationへticketをbind |
| `ScanEntryTicket.relativeSegments` | NFC segment array | Classification用normalized pathと同じ。Ambient absolute pathから受け付けない |
| `ScanEntryTicket.canonicalAtEnumeration` | absolute canonical path | Internal比較値で、単独のread authorityではない |
| `ScanEntryTicket.ancestorSnapshots` | bounded ordered snapshot[] | Relative directory prefixごとに`dev`、`ino`、`mode`を持ち、open前・read前・read後に比較 |
| `ScanEntryTicket.enumerationIdentity` / `enumerationMetadata` | bigint path-stat snapshot | 正確な`dev`、`ino`、`mode`、`size`、`mtimeNs`、`ctimeNs`をbyte read前にpath/opened `FileHandle`と比較 |
| `ScanEntryTicket.occurrence` | non-negative integer | Deterministic enumeration order。`maxVisitedEntries`対象 |
| `ScanEntryTicket.state` | `enumerated \| consumed \| stale \| rejected` | Generationごとに最大1回read。Stale/rejected ticketはaccepted byteを返さない |
| `VerifiedReadReceipt.entryTicket` | internal reference | このfileでconsumeした正確なticket |
| `VerifiedReadReceipt.fileHandleIdentity` | bigint `dev`/`ino`/`mode` snapshot | `CustomizationFile.identity`の唯一source。Durableとはみなさない |
| `VerifiedReadReceipt.preOpenChecks` | bounded verification record | `open`前にroot identity、全ancestor `lstat`、candidate path `lstat`、candidate `realpath`/`path.relative`、再度のcandidate path `lstat`をこの順序で記録する。Applicableな`dev`、`ino`、`mode`、`size`、`mtimeNs`、`ctimeNs`を比較し、最初のcandidate checkでcanonicalization前にlink/non-regular objectを拒否し、両candidate snapshotが相互およびenumerationと一致することを要求 |
| `VerifiedReadReceipt.preReadChecks` / `postReadChecks` | bounded verification record | `open`後かつread前と、同じhandleを開いたread後に、exactなpre-open sequenceを同じ順序で繰り返し、その後に同じ`FileHandle.stat({ bigint: true })` fieldを比較 |
| `VerifiedReadReceipt.fileType` | literal `regular-file` | Directory、link、device、socket、pipeではない。Unsupported/unverifiable objectは拒否 |
| `VerifiedReadReceipt.acceptedByteCount` | integer | `maxFileBytes`または残total budgetを超えない |
| `VerifiedReadReceipt.finalOpenDefense` | `o-nofollow \| unavailable-postcheck-only` | Nodeが有効な`O_NOFOLLOW`を公開する場合は`o-nofollow`必須。Fallbackは明示的なcross-platform limitationを記録 |
| `VerifiedReadReceipt.containmentMode` | literal `node-realpath-fstat-best-effort` | Atomic kernel containmentを主張せず、反復canonical/same-handle validationを記録 |

Repository root contextはprocess `cwd`から作る。Global root contextは一致preview consent後だけ作る。Root作成は
公開されたlexical componentを全て`lstat`で検査してlinkを拒否し、accepted rootの`realpath`とidentityを記録する。
これらの分離checkには後述の残存raceがある。Bounded Node walkerだけがticketを作り、static/derived classifierはselectできても作れない。Derived valueはticketの
exact normalized segmentと一致しなければならない。Candidate readは所有root contextとticketだけからpathを
再構築する。`open`前にroot identityと全ancestor snapshotを比較し、candidate pathを`lstat`してlink/non-regular
objectを拒否しexact fieldを比較する。次にcandidate `realpath`/`path.relative`を検査し、candidate pathの`lstat`
比較を繰り返して、両snapshotが相互およびenumerationと一致することを要求する。`open`後かつread前にこの
順序付きsequenceを繰り返し、opened
`FileHandle.stat({ bigint: true })`も比較する。Bounded same-handle read後もhandleを開いたまま、byte受理前に
同じexact fieldについてこの完全な順序付きpre-read sequenceを繰り返す。検出したidentity/type/metadata/
boundary changeは収集済みbyteを全て破棄し、ticketをstale/rejectedにする。Client/HTTP path stringはreadを認可しない。

Nodeが必要なidentity/metadataまたはcanonicalizationをunavailable、ambiguous、malformed、その他unusableと
報告した場合は`safe-fs-boundary-unverifiable`とし、推測しない。Root-level failureはsource attemptをabortし、
item-level failureには上限付きdiagnostic-only inventory recordだけを残してよい。

Nodeはatomicなdirectory-handle-relative child openを提供しないため、これらrecordはpath check間にroot、
ancestor、final entryを差し替えるactive processへのcontainmentを証明できない。そのactorはcurrent threat
modelのscope外である。
検出した通常の同時変更とその他全detected raceはfail closedにする。Threat model拡張には、将来のatomic Node beneath/no-follow
API、またはOS強制のread-only snapshot/sandboxとrenewed reviewが必要である。
Same-device bind mountとNodeが全く公開しないreparse metadataは、automated-test proof外の明示的なplatform
limitationとして残る。

### StaticAssetManifest、ServerBundleManifest

これらはtrusted packaged-build recordで、inspection-source DTOではない。Build/package verifierは両方を
固定package-root pathだけからresolveする。RuntimeではCLIがstatic manifestを自身の`import.meta.url`相対の
固定URLだけからresolveする。`node:fs`はpackage所有fileのread/hashに使えるが、build manifestを
inspected-source fallbackには使えない。Runtime loaderはoversized document、malformed JSON、duplicate/unknown/
missing key、unexpected order、symlink、non-regular file、size/hash mismatch、package-version mismatchをserver
bind前に拒否する。
これらJSON manifest、generated HTML/CSS、documentation、licenseはdeclarative artifactであり、それらを
consumeする全runtime/build/test executable componentはJavaScript/TypeScriptとする。

Static manifest作成前に固定normalizerがNuxt標準`.output/public` staging treeを読み、regularな生成済み
`200.html`/`404.html`を要求するがredundant static-host fallback 2つはcopyせず、`index.html`以外の全HTML
fileを拒否する。他のaccepted regular fileは新規`dist/public`へcopyし、manifestは全copied fileを記述し、
packaged outputにaliasを含めない。Server assemblerもcleanな`.build/server` staging treeだけを読み、
manifest-listed regular `.mjs` fileだけを`dist/`へcopyする。

| Entity / field | Type | Rule |
|---|---|---|
| `StaticAssetManifest` | 最大2 MiBのstrict JSON | Exact keyは`manifestVersion`、`packageVersion`、`shellPath`、`assets`、`inlineScriptSha256` |
| `StaticAssetManifest.manifestVersion` | literal `1` | Compatibilityを推測しない |
| `StaticAssetManifest.packageVersion` | 最大64 UTF-8 byteのsemver string | Packed `package.json`からembedしたversionと一致 |
| `StaticAssetManifest.shellPath` | literal `/index.html` | 正確なSPA fallback byte |
| `StaticAssetManifest.assets` | ordered unique record 1..4,096件 | `requestPath`順。全post-normalization generated regular fileを正確に1回含む |
| `StaticAssetRecord` | closed object | Exact keyは`requestPath`、`file`、`byteLength`、`sha256`、`mediaType` |
| `StaticAssetRecord.requestPath` | 最大512 UTF-8 byteのroot-absolute URL path | Query、fragment、dot segment、encoded separator、malformed escape、external originなし |
| `StaticAssetRecord.file` | exact `public/...` relative path | `requestPath`のuniqueなlexical counterpart。Separator alias/traversalなし |
| `StaticAssetRecord.byteLength` / `sha256` | non-negative integer / lowercase 64 hex | Bind前にpackaged byteと照合 |
| `StaticAssetRecord.mediaType` | closed MIME enum | Hostと同じ固定extension tableでbuild時に決定。HTMLは`/index.html`だけlegal |
| `StaticAssetManifest.inlineScriptSha256` | ordered uniqueな44-character base64 hash 0..32件 | `/index.html`内の各executable inline-script exact byteのSHA-256。Executable attribute、`<base>`、nonce、external URL、未記録inline scriptはbuildを通らない |
| `ServerBundleManifest` | 最大1 MiBのstrict JSON | Exact keyは`manifestVersion`、`packageVersion`、`assets` |
| `ServerBundleManifest.manifestVersion` | literal `1` | Compatibilityを推測しない |
| `ServerBundleManifest.packageVersion` | 最大64 UTF-8 byteのsemver string | 同じpacked-package versionと一致 |
| `ServerBundleManifest.assets` | ordered unique record 2..256件 | `file`順。`cli.mjs`、`parser-worker.mjs`、全tsdown code-split chunkを正確に1回含み、listed byte合計は最大64 MiB |
| `ServerBundleRecord` | closed object | Exact keyは`file`、`byteLength`、`sha256` |
| `ServerBundleRecord.file` | 最大256 UTF-8 byteのnormalized relative `.mjs` path | Absolute path、empty/dot segment、separator alias、traversal、top-level `public`/`manifests` collisionなし |
| `ServerBundleRecord.byteLength` / `sha256` | non-negative integer / lowercase 64 hex | Copy前にstaged byte、pack前にpackaged byteと照合。1 file最大16 MiB |

全assembly後のrecursive expected setは2 manifest file、`StaticAssetManifest`にlistedされた全`public/...` path、
`ServerBundleManifest`にlistedされた全server pathだけである。Final verifierはstale regular file、unlisted chunk、symlink、fileの
代わりのdirectory、その他platform-safe non-regular objectを含む全差異を拒否する。Package testはunpackした
tarballへ同じsetを適用する。

### GlobalConsentPreview

Capabilityで保護したconsent routeは、process environmentとdefault-home valueからlexical path operationだけで
このpreviewを作る。作成と返却のどちらでも、候補Global root配下の`stat`、`realpath`、directory
enumeration、file readを行わない。

| Field | Type | Rule |
|---|---|---|
| `previewId` | 256-bit random opaque string | Process-memoryのlookup key。新previewは以前の未同意previewをinvalidate |
| `previewDigest` | keyed SHA-256 | 下記全fieldと`sessionId`のcanonical encodingを対象とし、constant timeで比較。別processの値を受理しない |
| `allowlistVersion` | date string | Current shipped contract version |
| `entries` | 正確に3 tool entry | Copilot、Claude、Codexの固定順 |
| `entries[].tool` | tool enum | Closed value |
| `entries[].origin` | `default-home \| environment` | Invalidでもenvironment entryを使い、暗黙fallbackしない |
| `entries[].displayRoot` | escape済みlexical absolute/invalid valueまたはnull | Bound内なら正確なproposed rootを示す。Nullは`oversized`だけで、canonicalization済みとは主張しない |
| `entries[].pathPatterns` | non-emptyな固定relative-pattern array | そのroot配下の正確なinstruction candidate。隣接customization classなし |
| `entries[].inputState` | `eligible \| present-empty \| relative \| invalid \| oversized` | I/O前に決定し、`eligible`だけがconsent後boundaryになれる |
| `excludedRuleIds` | sort済みexcluded rule ID[] | Authored proseを受け付けず表示除外を決める |

Hostはproposed rootのUTF-8 lengthをincrementalにcountし、別copyを構築せず32 KiBを超えた時点で止める。
Limit内valueはincrementalにescapeし、outputが192 KiBを超える前に止める。どちらのoverflowでも
`inputState: oversized`、`displayRoot: null`とし、normalization/canonicalization/root creation/readを行わない。
UIは固定localized `global.previewTooLarge` messageだけを示し、userはenvironmentを修正して新previewを
要求する。Digestはlength-prefix付きUTF-8 field、固定enum encoding、表のarray順を用いる。Limit内の
`displayRoot`はUnicode normalizationなしの正確なescaped lexical UTF-8 byteとしてbindし、またはnullと
`oversized`を明示的にbindする。固定registry stringは既にcanonical NFCであり、filesystemから得た値を含まない。
Limit内のinvalid environment valueはescapeして
表示するが、許可pathにnormalizeしない。

### GlobalConsent

| Field | Type | Rule |
|---|---|---|
| `allowlistVersion` | date string | 表示したcurrent contractと一致すること |
| `previewId` / `previewDigest` | opaque string | Current in-memory previewと完全一致すること |
| `confirmedTools` | tool enum[] | 正確なnon-null pathを表示した`eligible` toolだけ。`oversized`は不可 |
| `confirmedAt` | ISO timestamp | Memoryのみ |
| `active` | boolean | Global inspection disable時にclear |

Consentはallowlist contractに表示したpathだけを許可する。隣接settings、credential、state、skill、
plugin、任意env pathは許可しない。
Confirmation後、candidate entryを追跡せずに各eligible lexical rootをcanonicalizeする。Canonical rootと
表示済みlexical absolute rootがcomponentごとに一致しない場合、symlink、junction、case、Unicode
normalization、short-name aliasを含め、enumeration前にそのtoolをsafe diagnostic付きで拒否する。
Applicationはcanonical targetへ暗黙置換せずconsentを広げず、userにconfigured rootの修正と新previewの
取得を求める。

### OfficialSourceRecord

`tests/fixtures/conformance/official-sources.json`はimmutableなrelease/test dataで、検査対象Repositoryのinputでは
なく、product startup/scan中にfetchしない。

| Field | Type | Rule |
|---|---|---|
| `sourceId` | stable dotted string | Unique。Behavior、rule、strategyの全`sourceRefs` entryはこのkeyだけを参照 |
| `canonicalUrl` | absolute HTTPS URL | `officialHost`上の正確なauthored URL。Credential、query、fragmentなし |
| `officialHost` | lowercase DNS hostname | Recordごとのexact host allowlist。URLと許可する全redirect hopが正確に一致し、subdomainやsibling hostを暗黙に許可しない |
| `sectionAnchors` | 1..16 exact heading-text string | Exact rendered heading textだけ。各最大256 UTF-8 byte。Heading ID、URL fragment、CSS/XPath、その他executable selectorは不可 |
| `affectedBehaviorIds` | sort済みbehavior ID[] | 参照する全`VendorBehaviorStatement.sourceRefs` entryと相互一致 |
| `affectedRuleIds` | sort済みrule ID[] | 参照する全`InspectionRule.sourceRefs` entryと相互一致 |
| `affectedStrategyIds` | sort済みstrategy ID[] | 参照する全`RuntimeCompositionStrategy.sourceRefs` entryと相互一致 |
| `reviewedOn` | ISO date | Human semantic review後だけ更新 |
| `normalizationVersion` | literal `1` | Checked-in deterministic normalization algorithmを選択 |
| `snapshotFingerprint` | lowercase SHA-256 | 選択したofficial sectionだけのnormalized text digest |
| `assertions` | 1..64 maintained assertion[] | Stable assertion ID、最大1,024 UTF-8 byteのparaphrase済み期待semantics、affected behavior、rule、strategy ID。Page textをcopyしない |
| `semanticFingerprint` | lowercase SHA-256 | Sort済みmaintained assertionのcanonical JSON digest |

Offline contract testはID、相互contract-record link、exact official host、boundをvalidateして`semanticFingerprint`を再計算し、
networkへ接続しない。明示maintainer drift commandはcredential、cookie、Repository data、その他local stateを
送信しない。1 sourceあたり10秒、decompress後2 MiB、UTF-8 HTML/Markdown、最大3 HTTPS redirectに制限し、
全hopがそのsourceのallowlist済みofficial host内に留まることを要求する。別final URLへのredirectは
`canonicalUrl`を黙って変えずreview対象として報告する。Downgrade、cross-host redirect、誤content type、
oversize、anchor欠落/重複、decode failureはhard drift-check failureとする。

Normalizationは各anchored headingから同level以上の次heading直前までを選択し、document chromeとscript/style
nodeを除去してprose/code textを保持し、entity decode、Unicode NFC、LF ending、line edge trim、horizontal
whitespace collapseを適用し、列挙順にsectionをjoinしてSHA-256を計算する。Digest/assertion driftからbehavior、rule、strategyを
自動変更しない。Maintainerがaffected contract recordと両言語contract/researchをreviewした後、anchor、assertion、
fingerprint、`reviewedOn`を明示更新する。Remote page text/response bodyはcheck inしない。

Affected-ID arrayの少なくとも1つはnon-emptyとする。各assertionはgenericなproduct areaではなく、そのrecordの
reverse-index済みbehavior、rule、strategy IDのnon-empty subsetを指定する。Mapは最大128 source recordとする。上限外またはunsupportedなrecordはpackage前のoffline contract/build
validationをfailさせる。Scannerはこのtest mapをloadせず、source record、anchor、assertionをtruncateしない。

### VendorBehaviorStatement

`VendorBehaviorStatement`は、upstream documentationに対するatomicかつsurface-specificな解釈を記録する。
Productのlookup場所を説明するものでfilesystem matcherではなく、readを許可できない。

| Field | Type | Rule |
|---|---|---|
| `behaviorId` | stable dotted string | Uniqueで、厳密に1つのbilingual vendor contractだけで定義 |
| `tool` | tool enum | 所有product |
| `surfaces` | non-empty surface enum[] | VS Code、CLI、cloud、shared local Codex clientなど。暗黙の“all”なし |
| `vendorScope` | closed scope enum | Repository/workspace、User、hosted/managed、plugin、runtime-only |
| `lookupBase` | closed locator-base descriptor | Workspace root、Git/repository root、runtime `cwd`、target-path chain、tool home、profile data、active config layer、registered catalog、hosted state |
| `relativeSelector` | bounded vendor-relative stringまたはnull | Path textだけ。Inspector glob semanticsを含まずauthorityを与えない |
| `traversal` | closed traversal descriptor | Exact、ancestor chain、standard-location chain、recursive-under-base、lazy descendant、explicit registration、none |
| `activationConditions` | condition-key enum[] | Trust、feature flag、target match、installation、enablement、runtime version、その他必須input |
| `strategyRefs` | sort済みstrategy ID[] | このbehaviorに適用するcomposition/selection record |
| `documentationStatus` | documentation-status enum | `conflict`は競合する全source assertionを保持 |
| `sourceRefs` | non-empty source ID[] | このstatementのためreviewした正確なofficial section。Source recordと相互一致 |

Registryはancestor walkを`**/`で表さない。Lookup base、relative selector、traversalを別々のclosed fieldにする。
Relative filenameが同じでもbase/traversalが異なる2 surfaceは、異なるbehavior IDを持つ。

### RuntimeCompositionStrategy

`RuntimeCompositionStrategy`は、文書化済みlayering、selection、fallback、deduplication、precedenceをread
authorityへ変えずに記録する。

| Field | Type | Rule |
|---|---|---|
| `strategyId` | stable dotted string | Uniqueで、bilingual runtime-composition contractで定義 |
| `tool` / `surfaces` | tool enum / non-empty surface enum[] | 正確なproduct/surface boundary |
| `operations` | 1..4 ordered closed enum[] | 各entryは`append \| concatenate \| select-first \| select-closest \| replace \| merge-map \| deduplicate \| filter \| unknown-order`。Array orderは文書化済みpipeline order |
| `inputBehaviorRefs` | non-emptyなsort済みbehavior ID[] | Documented inputだけ。Excluded/user/hosted inputは明示conditionのまま |
| `requiredConditionKeys` | condition-key enum[] | Terminal applicability resultを許す前に必要な全input |
| `documentationStatus` | documentation-status enum | Ambiguous/conflicting orderからwinnerを捏造しない |
| `sourceRefs` | non-empty source ID[] | Operationsに対する相互一致するofficial evidence |

Strategyはimmutable contract dataである。Applicability assessmentを説明・projectできるが、directoryのenumerate、
relationship targetのopen、InspectorのRepository/Global sourceのmergeはできない。

### InspectionRule

`InspectionRule`は、二言語inspection-rule contractのimplementation counterpartとして保守するimmutableな
release dataである。
検査対象Repositoryから読み込むものではない。

| Field | Type | Rule |
|---|---|---|
| `ruleId` | stable dotted string | 1 registry内でunique。Semanticsがcompatibleな間だけversion間で維持 |
| `contractVersion` | date string | `GlobalConsent`および同梱registryと一致 |
| `tool` | tool enumまたは`shared` | `shared`はvendor横断のsafety/derivation ruleだけ |
| `discoveryClass` | `static-candidate \| bounded-derived-candidate \| relationship-only \| excluded` | 最初の2つだけがreadを許可可能 |
| `kind` | customization-kind enumまたはnull | Kind横断relationship/exclusionはnull |
| `sourceKinds` | source-kind enum[] | Contractに明示されたRepository、Global、または両方 |
| `matcher` | structured Inspector matcherまたはnull | Static ruleだけ。正確なsource Base、`./` prefix付きRepository selector（またはconsent済みGlobal相対selector）、closed expansion mode。Vendor locator/executable globではない |
| `derivation` | closed typed-edge descriptorまたはnull | Bounded-derived ruleだけに存在 |
| `behaviorRefs` | sort済みbehavior ID[] | このpolicyに関連する正確なupstream lookup statement。Exclusionはreadを許可せずdocumented User behaviorを参照可能 |
| `policyRefs` | non-emptyなsort済みspecification ID[] | Surfaceを許可または意図的に除外するFR/QR clause |
| `strategyRefs` | sort済みstrategy ID[] | Order/applicabilityに使うcomposition fact。Path admissionには使わない |
| `conditionKeys` | condition-key enum[] | 適用可能性判定前に必要なruntime fact |
| `precedenceGroup` | stable stringまたはnull | 文書化されたselection/order semanticsを持つruleだけを結ぶ |
| `documentationStatus` | `documented \| ambiguous \| conflict \| experimental \| deprecated` | Runtime stateではなくupstream ruleを表す |
| `sourceRefs` | non-empty `OfficialSourceRecord.sourceId`[] | このruleのEvidence cellに直接記載した正確なsourceで、相互検証する。参照behavior/strategyが所有するevidenceは各IDから到達可能なままとし、このregistry fieldへ暗黙copyしない |

Build/contract validatorはpackage前にunique性、field組み合わせ、参照rule ID、typed derivationのacyclic性、
fixtureとの完全一致を検証する。Runtime loaderはscan前にembedded registry schema、integrity、contract
versionを検証する。Repository提供pluginでruleを追加する機構は持たない。

### ScanGeneration

| Field | Type | Rule |
|---|---|---|
| `generation` | non-negative integer | Process内でuniqueかつmonotonic。`0`はbootstrap専用 |
| `baseGeneration` | non-negative integer | Bootstrapは`0`、それ以外はserialized transaction開始時のactive generation |
| `transactionKind` | `bootstrap \| repository-scan \| global-scan \| global-disable` | Closed transaction classification |
| `scannedSourceId` | opaque source IDまたはnull | いずれかのscan kindでは1 source、bootstrap/zero-I/O Global disableではnull |
| `startedAt` / `finishedAt` | timestamp | Scan中は`finishedAt`なし |
| `outcome` | `complete \| partial` | Partialにはlimit/diagnostic必須。Fatal attemptはgenerationにしない |
| `files` | `CustomizationFile[]` | 全enabled sourceを含み、source、normalized path、IDの順で決定的sort |
| `diagnostics` | `Diagnostic[]` | Overflow sentinelを含め最大10,000件、secret-safe |
| `counters` | `ScanProgress`またはnull | Source scanでは必須で設定limit内。zero-I/O bootstrap/disableではnull |

Generation 0はprocess開始時に同期作成し、`baseGeneration: 0`、`transactionKind: bootstrap`、nullの
`scannedSourceId`/`counters`、等しい`startedAt`/`finishedAt`/session `createdAt`、`outcome: complete`、空の
file/diagnosticを持つ。Legalなreadable baseだがRepository scan成功を意味しない。自動の初回Repository scanは
0から開始し、fatal failureならgeneration 0をactiveのまま保ち、bounded session-lifecycle channelで報告する。

単一`ScanCoordinator`がRepository scan、Global scan、Global-disable transactionをserializeし、2 source
scanをconcurrent実行しない。通常source commandはFIFOとする。Global disableはpriority barrierとしてactive
uncommitted transactionをabort/discardし、queued Global commandをcancelしてzero-I/O disable transactionを
次に置く。中断したRepository commandはfresh counterでbarrierの直後へ正確に1回requeueし、中断したGlobal
commandはrequeueしない。Barrierがqueued/active中の2回目のdisableは同じcompletionへjoinし、追加transactionを
作らない。Global enabled flag、consent record、nonempty graph、accepted root context、running/queued Global
scan/enable commandが何もない場合、無関係なRepository workの有無にかかわらずdisableは即時no-opとする。
Transactionはその時点のgeneration Nから開始する。Unchanged source graphを
carry forwardし、scanned sourceにはsession-wide file-count、retained-byte、generation-diagnostic budgetの
残量だけを渡し、replacementを別に構築する。`maxVisitedEntries`とdeadlineはactive source jobへ適用する。
Completeまたはcontract済みpartial resultだけが正確にN+1としてatomic commitされる。その時点で全sourceが
N+1を報告し、unchanged sourceを含む全file/recognition/provenance/relationship/mask IDを再生成し、全comparison/
reveal stateをclearする。Global-disable transactionも同じcommit ruleでGlobal graphをfilesystem I/Oなしに除く。

Fatal attemptは`ScanGeneration`を作成もpartial mergeもせず、Nとprior IDをactiveのままにする。Global-disable
barrierによるexpected cancellationはfailure diagnosticをemitしない。それ以外のbounded safe failureは
out-of-generation session-lifecycle diagnosticとし、表示用`sourceId`を持てても
`Source.diagnosticIds`やsource/generation capへ入れない。Coordinatorは次のqueued transactionをstill-current N
から開始する。1 sourceあたりrunning/queued scan commandは最大1つで、duplicate scan commandはcontract済み
conflictを返す。Disableは上記join/no-op ruleを使い、duplicate scan commandではない。

### ScanProgress

| Field | Type | Rule |
|---|---|---|
| `phase` | `waiting \| cancelling \| enumerating \| reading \| deriving \| recognizing \| complete` | `waiting`はqueue中、`cancelling`はdisable/shutdown abortのdrain中。どちらもpath/source contentを含めない |
| `visitedEntries` | non-negative integer | 最大200,000 |
| `candidateFiles` | non-negative integer | Accepted item最大2,000 |
| `readBytes` | non-negative integer | 最大32 MiB |
| `diagnosticCount` | non-negative integer | Sentinelを含む受理数。最大10,000 |
| `queuedAt` | timestampまたはnull | Accepted commandが別transaction待ちになると設定し、work開始時にclear |
| `startedAt` | timestampまたはnull | Source scan開始時、またはbarrier所有progressではdisable受理時。idle/waiting中はnull |

`Source.progress`は`idle`、`failed`でnullとする。`scanning`では`waiting`にnon-null `queuedAt`とnull
`startedAt`が必要で、active phaseはnull `queuedAt`とnon-null `startedAt`が必要。`disabling`はbarrier drain中の
該当`cancelling` progressを公開する。Commit済み`ready`/`partial` sourceはnull `queuedAt`とnon-null
`startedAt`を持つ最終`complete` progressを保持する。Bootstrapにはsource progressがない。

Disable受理時にGlobalは直ちに`disabling`となり、そのprogressはnull `queuedAt`を持つ。Drain対象がGlobal
scanならcurrent bounded counterと元scanの`startedAt`を保持し、`phase`だけ`cancelling`へ変える。それ以外は
Globalがbarrier所有の全4 counter zero、disable-acceptance時刻の`startedAt`を持つ`cancelling` progressを
公開する。同時にdrainするRepository scanは自身のcounter/`startedAt`を保持し、`queuedAt`をclearして
phaseだけ`cancelling`へ変える。Single disable commit後にGlobal Sourceを除去する。中断Repository commandは
zero counter、`phase: waiting`、requeue時のnon-null `queuedAt`、null `startedAt`で再表示する。Joinしたdisable
requestは全valueを再利用し、別progress recordを作らない。Barrierはsource I/Oをしないため、commit済みdisable
generationの`counters`は引き続きnullとする。

### CustomizationFile

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `fileId` | 128-bit、22-character base64url opaque string | DTO | Generationごとに新規。APIはpathを受け付けない |
| `sourceId` / `boundaryId` | opaque string | DTO | Enabled boundaryを識別する |
| `relativePath` | normalized POSIX-style path | DTO | Leading slash、NUL、empty segment、`..`なし。表示時control character escape |
| `aliasPaths` | normalized path[] | DTO | 同じidentityの別allowlist対象hard-link pathを最大1,024件、sort済みで保持。Symlinkはaliasにしない |
| `identity` | `VerifiedReadReceipt`のfile-handle identity | internal | Alias/race detection専用。Durableとみなさない |
| `verifiedReadReceipt` | `VerifiedReadReceipt`またはnull | internal | 受理済みreadable fileだけにあり、serializeしない |
| `readState` | file read-state enum | DTO | 後述 |
| `parseStatus` | `not-applicable \| not-attempted \| parsed \| partial \| malformed` | DTO | Metadata extractionだけ。Vendor validation resultではない |
| `sizeBytes` | integerまたはnull | DTO | Readable fileは最大1 MiB |
| `encoding` | `utf-8 \| utf-8-bom \| unsupported \| binary \| unknown` | DTO | Invalid textはdiagnosticのみ |
| `maskedText` | stringまたはnull | DTO | Mask placeholderを入れた正確なsource。HTMLではない |
| `contentDigest` | sessionごとのkeyed digest | internal | 再利用可能content hashを公開せずstale検出 |
| `recognitionIds` | opaque string[] | DTO | Accepted customization fileは1つ以上 |
| `relationshipIds` / `diagnosticIds` | opaque string[] | DTO | 同じgenerationを参照。Diagnosticは128件のfile limit内で受理 |

Read stateは`readable`、`unreadable`、`oversized`、`binary`、`unsupported-encoding`、
`masking-overflow`、`stale`、`unsafe-link`、`boundary-rejected`、`limit-skipped`。`parseStatus: malformed`でも
`readState: readable`ならmask済みsourceを表示できる。Diagnosticはmetadata extractionだけを説明し、
vendorに対するvalidity判断ではない。
`masking-overflow`はnon-readableで、`maskedText`はnull、`masks`/metadataはempty、`parseStatus`は
`not-attempted`とする。Decoded/raw contentをただちに破棄し、comparison/reveal対象にしない。

### ToolRecognition

| Field | Type | Rule |
|---|---|---|
| `recognitionId` | opaque string | Generation内unique |
| `fileId` | opaque string | 複数recognitionが1 physical fileを参照可能 |
| `provenances` | `CandidateProvenance[]` | 共有tool/kind解釈についてのrule/path admissionのsort済み非空set。最大2,000件 |
| `tool` | `copilot \| claude \| codex` | 必須 |
| `kind` | closed customization-kind enum | Instruction、rule、skill、agent、prompt/command、hook、MCP、settings/config、output style、plugin、marketplace、skill metadata |
| `metadata` | bounded JSON-safe map | Allowlist keyだけ。最大512 entry、scalarごとに最大64 KiB。Secret値をrecursiveにmask |

Customization-kind enumは共有するが、各recognizerがpath/interpretation ruleを所有する。共有`AGENTS.md`、
`CLAUDE.md`、`.mcp.json`、skill、marketplaceは1 fileのまま複数recognitionを持つ。Tool、kind、parsed
contentの意味が一致する場合だけprovenanceを1 recognitionで共有できる。Path固有scope、order、
documentation status、applicabilityをlossyなrecognition-level aggregateにしない。

### CandidateProvenance

| Field | Type | Rule |
|---|---|---|
| `provenanceId` | opaque string | Generationと所有recognition内でunique。Path-relative relationshipの起点に使う |
| `discoveryClass` | `static-candidate \| bounded-derived-candidate` | Relationship/excluded ruleは出現不可 |
| `ruleId` | stable inspection-rule ID | 所有recognitionを受理した同梱ruleの1つ |
| `matchedPath` | normalized source-relative path | このruleが受理した正確なcandidate path。Fileのprimaryまたはalias pathであること |
| `seedFileId` | opaque stringまたはnull | Derived candidateでは必須、static candidateではnull |
| `seedRuleId` | stable rule IDまたはnull | Unsatisfied/shadowedと判明していない独立受理済みstatic-candidate provenance。未解決seedはconditional outputだけ生成 |
| `depth` | integer `0..1` | Staticは0、derivedは1 |
| `declarationKey` | closed field/component identifierまたはnull | 任意のunmasked valueを含めない |
| `scope` | structured scope descriptor | Evaluateせず、このadmissionのrepository/global、directory、matching path、declared scopeを説明 |
| `documentationStatus` | documentation-status enum | このruleからコピーし、runtime applicabilityと分離 |
| `applicability` | `ApplicabilityAssessment` | このrule/path/seed admissionだけのconditionとsummary |
| `order` | structured order descriptorまたはnull | このadmissionについて文書化されたbroad-to-narrow/fallback factだけ |
| `behaviorRefs` | `VendorBehaviorStatement.behaviorId`[] | Ruleからcopyし、該当surface lookup statementを示す |
| `strategyRefs` | `RuntimeCompositionStrategy.strategyId`[] | このprovenanceのorder/applicabilityで実際に考慮したstrategy |
| `sourceRefs` | `OfficialSourceRecord.sourceId`[] | 曖昧なproduct aggregateではなく、このprovenanceの正確なvalidated evidence union |

Provenanceはsource identity、`matchedPath`、`ruleId`、`seedFileId`、`seedRuleId`、
`declarationKey`でdeduplicateし、2つのseedからの宣言をまとめない。Staticとderivedの両ruleで受理した
fileは1回だけ読み、両entryを保持する。全derivation provenanceは1本のtyped edgeで、別edgeのseedには
なれない。同じphysical fileの独立static provenanceは自身のtyped ruleをseedにできる。
Arrayのstable orderは`matchedPath`、`ruleId`、nullable seedのstable source/boundary/path keyと
`seedRuleId`、nullable declaration keyとし、opaque file/provenance IDをsortに使わない。Overflow時は
追加admissionを停止してgenerationをpartialにする。

独立受理済みstatic seed provenanceごとに、typed extractorはderivation `ruleId`、closed declaration
field、zero-based source occurrence順で列挙する。Validate後、seedのstable provenance key、derivation
rule、normalized target、declaration keyでdeduplicateし、最初のoccurrenceを残す。先頭128 distinct targetは
通常のcandidate/safe-read limitへ進める。129件目でtargetのstat/read前にそのseedのderivationを停止し、
generationをpartialにしてfixed-code diagnostic candidate 1件をdiagnostic aggregatorへ渡す。Known
unsatisfied/shadowed seedは何も生成せず、未解決eligible static seedはconditional candidateだけを生成し、
bounded-derived provenanceはこのalgorithmに入らない。
Validationはgeneration-bound ticket選択前に行い、contractのplatform-independent NFC segment grammar、列挙済みentryとの
exact match、canonical component-identity checkを適用する。このためADS/device/trailing-dot-space/case/
normalization/8.3 aliasは、そのspellingが解決可能なhostでも開かず拒否する。

### ApplicabilityAssessment

| Field | Type | Rule |
|---|---|---|
| `summary` | `authored \| available \| selected \| omitted \| shadowed \| disabled \| conditional \| unknown` | 便宜的projectionにすぎず、`effective`と呼ばない |
| `conditions` | `ConditionFact[]` | 最大64件、key・reason code・basis・status順でsort/deduplicateし、欠けたinputをtrueにしない |
| `strategyRefs` | sort済みstrategy ID[] | Projectionに使ったstrategy。Authorshipしか判明しない場合はempty |
| `evaluatedFromGeneration` | integer | Rescanを越えてfactを残さない |

各`ConditionFact`は`key`（`surface`、`engine-version`、`runtime-cwd`、`workspace-root`、
`repository-root`、`project-root`、`worked-path`、`target-match`、`scope-availability`、`feature-state`、
`trust`、`approval`、`enablement`、`selection`、`settings-inputs`、`plugin-state`、`agent-context`、`event`、
`content-limits`、`documentation-variant`、`tool-availability`、`installation`、`managed-policy`、
`instruction-byte-budget`、`external-runtime`）、
`status`（`satisfied`、`unsatisfied`、`unknown`、`documentation-conflict`）、固定`reasonCode`、
`basis`（`inspected-data`、`official-rule`、`excluded-input`、`runtime-input`）を持つ。
Applicableなofficial ruleと結論に必要な全inputが判明した場合だけsummaryを`selected`、`omitted`、
`shadowed`、`disabled`にする。それ以外は`conditional`または`unknown`のままとする。

同梱condition-reason registryは各`reasonCode`を、許可するkey/basis/status shape、結論にrequiredかどうか、
1つのprojection role（`authorship`、`availability`、`selection`、`omission`、`shadowing`、`disablement`、
`documentation-uncertainty`）へmapする。Emitterはsummaryを直接選べない。各generationで次のdecision tableを
使って再計算し、最初にproofが完成したrowを採用する。

| Priority | Summary | 必要なcomplete proof |
|---:|---|---|
| 1 | `disabled` | Documented enablement、managed-policy、tool-availability controlがuseを禁止すると判明。このproofは後続selection factにかかわらず十分 |
| 2 | `shadowed` | Completeなapplicable precedence chainで別candidateが勝つと証明し、disable proofなし |
| 3 | `omitted` | Completeなsurface/target/selection/budget ruleで除外を証明し、higher-priority proofなし |
| 4 | `selected` | Documented selection ruleでinclusionを証明し、selectionを妨げ得る全conditionがsatisfied |
| 5 | `unknown` | Required composition/applicability ruleのdocumentationがabsent/conflictingで、十分なnegative proofなし |
| 6 | `conditional` | Documented applicability pathはあるがrequired runtime/excluded inputがunknown/conflictingで、十分なnegative proofなし |
| 7 | `available` | 全documented availability requirementがsatisfiedで、availabilityを妨げる未解決factがなく、selection resultは主張しない |
| 8 | `authored` | Accepted authored declarationだけを証明し、installation/availabilityを意図的に主張しない |

`authored`をprojectできるのはfile起点candidate declarationだけで、より強いproofがないrelationshipは
`conditional`または`unknown`とする。Unrelated informational factはterminal resultを妨げず、reason registryで
requiredとしたfactだけが妨げる。Higher-priority sufficient outcomeが勝ってもconditionは正本として全て表示する。

### Relationship

| Field | Type | Rule |
|---|---|---|
| `relationshipId` | opaque string | Generation内unique |
| `fromFileId` | opaque string | 必須 |
| `fromRecognitionId` | opaque string | 必須。`fromFileId`に属し、`fromProvenanceId`を所有すること |
| `fromProvenanceId` | opaque string | 必須。その`matchedPath`だけをpath-relative normalizationのbaseにする |
| `ruleId` | stable relationship-only rule ID | 参照がreadを許可できないことを示す |
| `kind` | `import \| declared-component \| skill-resource \| plugin-source \| agent-reference \| context-inheritance \| runtime-reference \| order \| fallback` | Descriptiveのみ |
| `rawTargetMasked` | string | Secret/control characterをmask/escape |
| `normalizedTarget` | source-relative stringまたはnull | Lexical normalizationが安全な場合のみ |
| `boundaryStatus` | `inside \| outside \| invalid \| unknown` | Readを許可しない |
| `resolutionStatus` | `not-followed \| independently-admitted \| missing \| rejected` | Relationship自体はcontentを展開しない |
| `documentationStatus` | documentation-status enum | Runtime-dependentまたはconflicting referenceを明示したままにする |
| `behaviorRefs` | sort済みbehavior ID[] | Edgeの説明を許すsurface-specific upstream statement |
| `strategyRefs` | sort済みstrategy ID[] | Edgeについて考慮したcomposition/selection strategy |
| `sourceRefs` | sort済みsource ID[] | Relationship rule、behavior、strategy recordからの正確なevidence union |
| `applicability` | `ApplicabilityAssessment` | Edge固有context/tool/trust/selection fact。Targetのread authorityにはしない |

Relationshipはdirectのみ。最大depth 1、1 file最大1,000件。Candidate targetはstaticまたは
bounded-derived ruleで独立して受理し、relationship自体はtargetを昇格させない。Typed candidate
derivationは`CandidateProvenance`で表し、別のdepth/count limitを持ち、relationship traversalではない。
Relationship summaryは、既知product ruleの下でreference edgeがavailable/selectedになり得るかだけを表し、
target fileのeffectivenessを表さない。

抽出済みreferenceはapplicableなcandidate provenanceごとにemitし、hard-link aliasや別rule admissionが
別provenanceのdirectoryをrelative baseとして借用しない。各extractorはclosed declaration-field identifierとzero-based sourceまたはdeterministic synthetic occurrenceだけからなるinternal origin
keyを付ける。Authored field valueを含めず、serializeしない。Deduplication keyは`fromFileId`、
`fromRecognitionId`、`fromProvenanceId`、`ruleId`、`kind`、origin key、target identityである。Target
identityは利用可能ならnormalized target、そうでなければunmasked targetのprocess-keyed digestとし、
memory外やlogへ出さない。Extractorは起点provenanceのstable array key、recognition tool/kind、
relationship `ruleId`/kind、declaration-field identifier、source occurrenceの順でemitし、opaque IDをsortに
使わない。1,001件目のdistinct edgeでそのfileの
extractionを停止し、先頭1,000件を同じ順序で保持してgenerationをpartialにし、fixed-code limit diagnosticを
1件diagnostic aggregatorへ渡す。Outer diagnostic capが抑止した場合は、そのcapのfixed sentinelが抑止を
表す。保持対象を決める間もtargetを開かない。

### Mask

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `maskId` | opaque string | DTO | Scanごとに新規 |
| `fileId` | opaque string | DTO | 同じactive generation |
| `kind` | secret kind enum | DTO | Generic labelのみ。Secret-bearing key textは含めない |
| `placeholder` | string | DTO | 1つのmasked view内でstable |
| `start` / `end` | byteまたはcode-point offset | internal | Authoritative decoded sourceに対しvalidate |
| `rawValue` | string | internal | Normal DTO、diagnostic、logへ含めない |

Revealは`fileId` + `maskId`に対する明示action後、1つの`rawValue`だけを返す。Browserはopen file view内
だけに値を保持し、file close、generation変更、Global disable、process終了時にclearする。

Mask detectorは固定、Repository非依存のbounded linear scannerとする。Candidateはsource offset、detector
priority、longest-match順でemitし、overlapをmergeしてからplaceholderを作る。4,097個目のcandidate
matchに遭遇するか、UTF-8 masked outputが2 MiBを超えると判明した時点で、DTO publish前にmaskingを
abortする。そのfileのprefix、placeholder-only approximation、metadata parse、relationship、derived
declarationを残さず、`masking-overflow`にしてraw/decoded contentとmask valueを全て破棄する。
Generationをpartialにし、diagnostic cap対象のfixed safe diagnosticだけをemitする。このfail-closed
stateにより、未scanのsuffixがnormal source、metadata、comparison、diagnostic、reveal responseへ達しない。

### Diagnostic

| Field | Type | Rule |
|---|---|---|
| `diagnosticId` | opaque string | Generation/session内unique |
| `code` | stable closed code | Objective testとdocumentation linkに利用可能 |
| `severity` | `info \| warning \| error` | Vendor validationを意味しない |
| `sourceId` / `fileId` | optional opaque ID | Client pathを受け付けずscope指定 |
| `messageKey` | localized key | 英語・日本語messageを同等に保つ |
| `safeArgs` | bounded JSON-safe map | Raw source、secret、任意exception string、outside pathなし |
| `nextStepKey` | localized key | 全errorが実用的な次actionを示す |

Closed diagnostic-code registryがseverity、message/next-step key、code固有argument schemaを固定する。
`safeArgs`はscalar最大16 entryで、stringはmask/escape後最大256 UTF-8 byteとする。Candidateはcode、
source/file ID、canonical safe argumentでdeduplicateし、固定phase、source/boundary、normalized file path、
rule/code、emitter occurrence順でemitする。Opaque IDはretention orderに使わない。

Aggregation前に各candidateを正確に1つのlifetime classへ割り当てる。Scan candidateは1つの
`ScanGeneration`に属し、applicableなfile/source/generation capを全て通す。各aggregatorは最終slotを予約し、
detailを最大127、4,999、9,999件保持する。Commit不能なfatal scan attemptを含むout-of-generation
lifecycle candidateはsessionだけに属して別session capを通し、generation/source ID listへ入れない。
Authentication、malformed request、その他client起因API errorはresponseで返すがdiagnosticとして保持しない。
Session aggregatorは最終slotを予約し、lifecycle detailを最大1,023件保持する。

Overflowまでは予約slotを未使用のままとする。Applicableなdetail allowanceを超える最初のdistinct
candidateで、そのslotへfixed `diagnostic-limit-file`、`diagnostic-limit-source`、
`diagnostic-limit-generation`、または`diagnostic-limit-session` sentinelとsaturating 32-bit suppressed countを
置き、後続detailはcountして抑止する。Applicableな全capを通過したdiagnosticだけを`diagnostics`またはID
listへ載せる。Scan-class overflowはgenerationをpartialにする。Session-class overflowはsession sentinelだけを
保持し、prior active generationを変更しない。

Unknown internal exceptionはgeneric codeとmemory内だけのcorrelation IDへmapする。Stack traceとraw parser
errorは既定でbrowserへ送らない。
Closed registryは`safe-fs-root-rejected`、`safe-fs-boundary-unverifiable`、`safe-fs-link-rejected`、
`safe-fs-device-changed`、`safe-fs-entry-stale`、`safe-fs-race-detected`、
`safe-fs-file-metadata-changed`、`safe-fs-open-failed`を含む。ArgumentにOS error text、outside path、
filesystem handle/descriptor、source byteを含めない。

### BrowserState

このstateはauthoritativeではなく永続化しない。

- `FilterState`: 選択したsource/tool/kindとpath query。
- `ComparisonSelection`: active generation内のreadableな`fileId`を0または正確に2つ。Literal comparisonは
  Monacoでmask済みsource textを比較し、Vueでtyped recognition metadata fieldをsource textへserialize
  せず比較する。
- `EditorModelState`: Opaqueなin-memory URIとmask済みtextだけを持つgeneration-scoped Monaco model。
  所有editor、subscription、全modelはroute close、selection replacement、file removal、source disable、
  generation変更時に個別にdisposeする。
- `RevealedValue`: 現在openなviewの`fileId`、`maskId`、returned value。Route close、file removal、
  source disable、generation変更時にdropする。

## State transition

### Repository source

```text
idle -> scanning（waitingまたはactive） -> ready
                                      -> partial
                                      -> failed（bootstrap generationをactiveのまま維持）

ready/partial -> scanning（waitingまたはactive） -> ready/partial
                                                \-> failed（以前のgenerationをactiveのまま維持）

failed -> scanning（waitingまたはactive） -> ready/partial
                                         \-> failed（同じactive generationを維持）
```

### Global source

```text
absent -- consent preview --> absent（Source/I/Oなし）
absent -- accepted enable --> scanning（enabled Sourceを作成） --> ready/partial
                                                                   \-> failed
ready/partial/failed -- accepted rescan --> scanning --> ready/partial
                                                    \-> failed
scanning/ready/partial/failed -- disable --> disabling/cancelling barrier --> absent
```

Enableには一致する`GlobalConsent`が必要。Disableはcoordinator barrierを実行し、次DTO公開前にGlobal file、
diagnostic、comparison、raw byte、mask、revealed valueを削除してcarried Repository entityをrekeyする。
Lexical consent previewは`Source`ではない。Global Sourceはenable command受理時だけ作成し、disable commit後は
再びabsentになる。
全`failed` stateでactiveなbootstrap/prior generationはreadableなまま、`progress`はnullとし、cap対象lifecycle
diagnosticがuncommitted attemptを説明する。
Globalではfatalなenable/rescan attempt後も`enabled: true`、正確なconsent record、accepted root context、
任意のprior committed Global graphを保持し、明示rescanまたはdisableを可能にする。別rootへ
fallbackしない。

### Customization file

```text
candidate -> readable + parsed/partial/malformed/not-applicable parse status
                     -> 次generationでstale/removed
          -> unreadable/oversized/binary/unsupported-encoding
          -> masking-overflow
          -> unsafe-link/boundary-rejected/limit-skipped
```

どのtransitionもsourceへwriteしない。Rescanはold file recordをin-place mutateせず新entityを作る。

## Entity横断invariant

1. 全DTOは1つのactive session/generationに属し、old generationのIDは`404 stale-resource`を返す。
2. Repository sourceは正確に1つで、Git rootでなくてもboundaryはlaunch `cwd`である。
3. Globalは全新processでdisabledであり、current allowlist consent済みboundaryだけを含められる。
4. Accepted file pathは同梱したstaticまたはtyped bounded-derived ruleで許可され、safe-read checkを
   独立して満たす。Parsed valueがaccessを許可できるのはその正確なderivation ruleを満たす場合だけで、
   relationship/excluded ruleは決して許可しない。
   Authorizationは既存`ScanEntryTicket`をselectし、中央safe-filesystem layerだけがそのticketと所有active
   `InspectionRootContext`を組み合わせられる。Readable resultは文書化したpre-open、pre-read、post-read checkを
   全て通らなければならず、client path stringはcontext/ticket pairの代替にならない。
5. Physical fileはsource/generationごとに1つの`CustomizationFile`と任意数のtool recognitionを持つ。
   受理済みかつ上限内のhard-link aliasは`aliasPaths`で見えるままにし、raw contentを重複しない。
   Overflowは要求済みpartial resultとdiagnosticで表す。
6. Normal API responseはraw unmasked valueを含まない。Diagnostic、log、progress、exception、comparison
   metadataはmask済みまたは固定dataだけを使う。
7. Documentation status、authored/installed state、selection、trust、enablement、その他condition factを
   provenance固有かつ直交したまま保ち、「effective configuration」やlossyなrecognition-level winnerへ
   まとめない。
8. Typed derivationは厳密に1 edge、1 seed最大128 targetであり、generic relationshipとbounded-derived
   provenanceをseedにしない。Physical fileがderived provenanceも持つ場合でも、独立static provenanceは
   eligibleなままとする。
9. File起点relationshipは1つのrecognitionとcandidate provenanceを指定し、そのprovenanceの
   `matchedPath`だけをrelative targetのbaseに使う。
10. 全array、string、parse、comparison、request body、filesystem work、derivation、relationship extractionを
   allocation/processing前に制限する。
11. Browser editor modelはopaqueなin-memory identityを使い、filesystem/remote URLを使わず、active routeと
   generationを越えてsourceを保持しない。
12. 全behavior、rule、strategy、source IDは、所有するbilingual contractとexecutable registryで正確に1回だけ
    定義する。Registryの`sourceRefs` arrayは所有rowのdirect Evidence cellと一致し、official-source逆引きindexと
    相互一致する。Runtime provenance/relationship DTOは表示用にこれらdirect recordのdeterministic unionを公開してよいが、
    そのderived unionはregistry backlinkを変更しない。Missing、duplicate、orphan、language-divergentなrecordは
    buildをfailさせる。
13. Vendor lookup base/traversalとInspector matcherは別record typeである。全Repository matcherは`./`で始まり、
    bare `**/`はinvalidとする。`./**/`は明示的な下向きInspector inventoryだけを意味し、vendor traversalや
    runtime selectionを意味しない。
