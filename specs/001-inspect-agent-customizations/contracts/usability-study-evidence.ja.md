# 契約: SC-001/SC-006 Usability Study Evidence

[English](usability-study-evidence.md)

**Contract version**: 1
**Runtime**: 宣言済みNode.js 24/26 contract
**Authority**: parse-equivalentまたは手作業で説明したdataではなくcanonical byteとclosed set

この契約はpaired SC-001/SC-006 studyのsupplied input、participant distribution、continuous
capture、privacy、handoff、final seal boundaryを閉じる。Failureが1件でもあればpaired evidence
set全体をinvalidにする。SC-001 thresholdがfailしてもcaptureを停止したりparticipantを除外したり
してはならない。SC-006と4 observationすべてを継続し、release approvalはfinal verification後だけ
判定する。

## Canonical primitive

- `LF`はexact byte `0x0a`である。Lowercase SHA-256は指定したexact byteに対する64文字の
  lowercase hexadecimalとする。
- Safe integerはJavaScript safe integerとする。Countはnonnegative、versionはpositiveとする。
- Canonical objectは指定したproperty orderでfreshに構築し、指定したpropertyだけを持ち、Unicode
  normalizationを行わず、`undefined`、accessor、proxy、inherited/extra propertyを含まない。
- Manifest、fixture descriptor、handoff、continuity witness、seal objectは
  `Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8')`を使う。Capture envelopeとkind固有
  safe payloadはcompactな`Buffer.from(JSON.stringify(value) + '\n', 'utf8')`を使う。
  Byte-for-byte equalityをauthorityとする。
- Runtime-control messageはfreshに構築したcompact canonical objectとする。Authenticated byteでは
  framing LFを除き、`authenticationTag`をliteral `null`として再構築する。Wire byteはtag設定済み
  compact objectの後にexact LF 1件をappendする。その他serializerを許可しない。
- `StudyOpaqueId`はexact `[A-Za-z0-9_-]{43}`とする。Strict base64url decodeがexact 32 byteとなり、
  unpadded canonical base64url re-encodeがoriginal 43-character textと一致しなければならない。Padding、
  whitespace、
  alternate alphabet、ignored character、wrong length、noncanonical encodingをfailする。Harness/supervisor生成
  opaque IDはすべてfresh cryptographically random byteを使う。Control-session/request/challenge/study/
  checkpoint/event/correlation/bootstrap/pre-readiness/readiness、browser-attempt、subject/Inspector-process ID、および全capture/watchdog instance/
  process-run ID（fieldがliteral `not-applicable`でない場合）を対象とする。同じsemantic referenceのrepeatを
  契約が要求する場合を除きcurrent run内のallocationはpairwise distinctとする。Fresh cryptographic
  generationによりrun間のnon-reuse/unlinkabilityを得るが、verifierがexact uniquenessを要求するのは
  current run内だけであり、cross-run ID registryをretainしない。IDはOS PID、path、authority、participant
  response、raw valueのencoding/digestではない。

## Closed study-input bundle

Manifestは`tests/usability/sc001-sc006-study-inputs.json`、companionは
`tests/usability/sc001-sc006-study-inputs.sha256`、`bundleRoot`はexact literal
`tests/usability/sc001-sc006-study-inputs/`とする。Rootはdirect-childだけを許すclosed directoryである。
Recursive regular-file setとmanifest path setは次の16 memberだけとする。

```text
guidance.md
guidance.ja.md
task-prompt-sc001.md
task-prompt-sc001.ja.md
task-prompt-sc006.md
task-prompt-sc006.ja.md
evaluation-fixture.json
evaluation-fixture.ja.json
prepared-state.json
prepared-state.ja.json
response-form.json
response-form.ja.json
ground-truth.json
ground-truth.ja.json
scoring-rubric.json
scoring-rubric.ja.json
```

各`prepared-state*.json` memberはfresh `studyBrowserProfile` object 1件を含む。Complete property orderは
`profileId`, `playwrightVersion`, `browserEngine`, `browserRevision`, `browserVersion`,
`browserDistribution`, `operatingSystem`, `architecture`, `nodeVersion`, `headed`, `contextPersistence`, `extensionSet`,
`proxyConfigurationScope`, `proxyAuthenticationMode`とする。Exact valueは順にliteral
`playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`, `1.61.1`, `chromium`,
`1228`, `149.0.7827.55`, `chrome-for-testing`, `ubuntu-24.04`, `x64`, `24.18.0`, literal `true`,
`fresh-nonpersistent`, empty array, `browser-context-only`, `single-407-basic`とする。Browserは
Playwright 1.61.1がinstallしたrevision `1228`、browser version `149.0.7827.55`のChrome for Testingをheadedで使う。
System browser、persistent context、
extension、異なるproxy scope/auth flow、platform/architecture/Node version/profile IDはineligibleとする。
Profile verificationから出せるのはfixed `profileId`、fixed pass/fail code、既存必須input/evidence digest
だけとし、browser revision/executable/profile path、configuration byte、store content、equipment detailは
runtime-only raw valueとする。

Manifest rootのcomplete property set/orderは`manifestVersion`, `bundleRoot`, `inputs`とする。
`manifestVersion`は`1`から始まるpositive safe integer、`bundleRoot`は上記literal、`inputs`はunique
`inputId`のraw UTF-16 code unit順にsortしたexact 16件のfresh objectとする。各entryのcomplete
property set/orderは`inputId`, `role`, `path`, `sha256`とする。Pathはexact `bundleRoot`とlisted
basename 1件の結合とする。Roleは`guidance | task-prompt | evaluation-fixture | prepared-state |
response-form | ground-truth | scoring-rubric`に閉じ、全roleをnonzero coverageとし、各bilingual pairに
別ID/path/byte/digestを持たせる。Companionはexact canonical manifest byteのlowercase SHA-256と
LF 1件だけを含む。

Validationはlinkをfollowせずrecursive enumerateし、normalized display nameではなくsort済みraw
pathを比較する。`bundleRoot`配下にdirectory memberを許可しない。Rootと全memberはenumerationから
open、hash、post-read validationまで同じreadable objectでなければならない。全regular memberの
`nlink`をexact `1`とするが、このconditionはregular fileだけに適用し、rootまたはその他permitted
directoryには適用しない。Symlink、Windows junction/reparse alias、directory member、non-regular
object、stable file identityのrepeatまたはexternal alias、case-folded/NFC/canonical-path alias、root
escape、missing/extra member、byte drift、identityのunverifiable/ambiguousはfail closedにする。
Platformがusable stable identityとregular-file link-count evidenceを提供できない場合、欠落をsafe扱い
せずvalidationをfailする。Directory identityはstableでなければならないが、directory `nlink`は
platformのnormal valueを取ってよく、`1`を要求しない。

正常にverifyしたbundleだけを供給できる。各participant distributionには16 memberすべての
byte-identical copyだけを渡し、out-of-bandのguidance、prompt、form、ground truth、rubric、fixture
input、generated sidecarを渡さない。Read-only verifierはsourceと20件すべてのsupplied copyを再度
enumerateし、builderが出力したfile list/digestをtrustしない。

`participant-01`から`participant-20`の各distribution rootはexact direct-child directory
`study-inputs/`と`repository/`の2件だけを持ち、その他direct childを持たない。`study-inputs/`は上記
16 basenameをdirect childとして正確に保持し、source bundleとbyte-equalで、subdirectoryを持たない。
`repository/`はdescriptorの`outputs[].path` regular-file setと、そのpathから導かれるproper directory-
prefix setだけを持つ。Top-level file、第3 directory、sidecar、2 tree間collision、link/identity alias、
canonical/case/normalization alias、どちらかのchild rootからのescapeは20-distribution set全体をfail
させる。Packed candidate、equipment configuration、capture runtime、その他session infrastructureは
distribution memberではなく、別の必須bindingを使い、追加のsupplied study-input byteを導入できない。

### Deterministic participant fixture repository

`evaluation-fixture.json`と`evaluation-fixture.ja.json`はcanonical
`ParticipantFixtureRepositoryDescriptor`であり、unbound generatorのlabelではない。Exact root
property orderは`schemaVersion`, `descriptorLocale`, `distributionIds`, `materializer`, `verifier`,
`captureHarness`, `outputs`とする。

- `schemaVersion`はliteral `1`、`descriptorLocale`はそれぞれ`en`/`ja`とする。
- `distributionIds`はascending orderの`participant-01`から`participant-20`だけとする。これらはslotで
  ありparticipant identity/personal dataではない。
- `materializer`、`verifier`、`captureHarness`はexact order `path`, `sha256`のfresh
  `RepositoryArtifactBinding`とする。それぞれ
  `scripts/build-usability-study-inputs.mjs`、
  `scripts/verify-usability-study-evidence.mjs`、
  `scripts/run-usability-study-capture.mjs`のexact raw byteをbindする。Installed、downloaded、
  PATH-resolved、network-fetched、symlinked、digest-mismatchedなsubstituteは利用できない。
- `outputs`はnonemptyで、unique `path`のraw UTF-16 code unit順にsortする。各fresh output objectの
  exact orderは`path`, `contentEncoding`, `bytesBase64`, `sha256`とする。`contentEncoding`は
  `utf-8 | binary`、`bytesBase64`はcanonical padded RFC 4648 base64、`sha256`はdecoded exact
  byteを対象とする。`utf-8`値はstrict decodeを要求するが、どちらのencodingもnormalization/
  transcodingを許可しない。Pathはdistributionの`repository/` rootからのnonemptyな`/`-separated
  relative pathで、absolute、backslash、empty、`.`、`..`、percent-encoded、NUL segmentを禁止する。

両descriptorは`descriptorLocale`を除きdistribution ID、artifact binding、output path、encoding、
represented byte、digestがexactly equalでなければならない。Implied proper directory-prefix setを
complete derived directory set、`outputs[].path`をcomplete derived regular-file setとする。20件の
fresh fixture repositoryすべてでmaterialized set/exact byteをdescriptorと一致させ、sidecar、implicit
default、hard-link/file-identity alias、normalized/case-folded/canonical alias、root escape、reused
output、driftを許可しない。Distribution内の全study-input/fixture-repository byteは16-member manifest
またはnested fixture descriptorのどちらかにbindされ、generated-byte exceptionはない。

Exact `pnpm run study:evidence:inputs -- materialize`はartifact binding 3件をverifyし、bound
materializerだけを使ってfresh distribution 20件を作る。Exact
`pnpm run study:evidence:verify -- inputs`はsource bundle、両descriptor、script binding 3件、supplied
bundle copy 20件、derived fixture tree 20件を独立かつread-onlyでverifyする。Enrollment/capture前に
両commandがpassしなければならない。

Bound script 3件はそれぞれsingle-file trust boundaryとする。そのsourceはliteral staticな`node:`
built-in importだけを含めてよい。Local/package import、dynamic `import()`、`require`、
`createRequire`、`eval`、`Function`、`vm`、下記で明示的に許可するもの以外のmodule-loader hook、
`process.dlopen`、その他worker/child entry pointはfail closedにする。Execution exceptionは次だけとする。

1. materializerはidentity/digest検証済みのbound capture scriptを`process.execPath`でfixed internal
   supervisor modeとして実行できる。
2. capture scriptは同一の検証済みbyteを`process.execPath`でclosed internal mode
   `supervisor`, `study-harness`, `scoring-moderator`, `reviewer-one`, `reviewer-two`,
   `product-instrumentation-adapter`, `inspector-server-ledger-adapter`,
   `study-browser-adapter`, `product-instrumentation-watchdog`,
   `inspector-server-ledger-watchdog`, `study-browser-watchdog`としてだけ再実行できる。
3. supervisorはsubjectのidentity-verified distribution `repository/`で下記sole exact
   participant-equipment commandをshellなしで直接実行できる。その`npx`/Inspectorと選択されたpackage
   execution closureだけをnarrow external-equipment exceptionとし、internal modeには数えない。
4. 同じbound capture scriptはそのparticipant-equipment `npx`/Inspector process内でsole exact
   `NODE_OPTIONS=--import=<bound-capture-script-file-url>` probeとしてself-importできる。
5. study-browser adapterはidentity/digest-verified pinned Chromium binary/prepared profileだけを直接実行できる。
   Chromiumをsole additional external-equipment child exceptionとし、internal modeには数えない。

全internal modeはcurrent verified parentがsponsorしたinherited authenticated IPCとfresh one-use bootstrap
nonceの両方を必須とする。Current-parent-sponsored channelを欠くinvocationと別edge/runのreplayはfailする。
このcapabilityはcurrent legitimate runへのinjection/replayを防ぐが、same-user processが別のemulated runを
意図的に作る場合のsource identity認証をclaimしない。そのprocessはendpoint/session/channel ID/key/nonceが
異なるためcurrent runへjoinできない。許可されたexec/self-importの直前にcallerはscriptをreopenし、
read前後のstable identity、type、`nlink === 1`、descriptor digestを証明し、exact byteをbindingと比較する。
上記2件のexact external-equipment execution closureを除き、helper file、generated module、package
resolution、alternate child program、changed scriptをexecutable authorityにできない。

## Work root、candidate、retained layout

`INSPECTOR_STUDY_WORK_ROOT`、`INSPECTOR_STUDY_CONTROL_ENDPOINT`、
`INSPECTOR_STUDY_CONTROL_TOKEN`は`materialize`から`finalize`まで全commandで必須のbyte-identical
environment bindingとする。Inputs phaseはcandidate/proxy bindingをreadもrequireもしない。
`INSPECTOR_STUDY_CANDIDATE_TARBALL`は`start`から`finalize`まで必須とする。
`INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY`は`start`から`stop`まで必須だが、`materialize`、`inputs`、
`finalize`はreadもrequireもしない。Phase bindingのmissing/newly introduced/changeはphase work前にfailする。

`materialize`時のwork-root値は、study setupがordinary local directoryとして提供するexistingかつemptyな
directoryを指すabsolute lexical pathでなければならない。Work-root由来I/Oの前に、active platformが
認識するexplicit UNC、server-share、device、network spellingをすべてrejectする。Directoryはsymlink、
junction、reparse alias、canonical aliasではならない。Public Node.js APIではlexically ordinaryな
pre-mounted/mapped filesystemをすべて識別できない。これはdocumented FR-022 platform/environment
limitationのままとし、このcontractはそのlocality proofをclaimしない。Directory `nlink`に`1`を要求しない。

Materializerはscript binding 3件を検証後、initially emptyなwork rootを変更する前にbound capture scriptを
internal supervisor modeで起動する。Work-root authority、control endpoint/tokenまたはderivativeをenv/argvで
inheritさせない。Exact 96-byte bootstrapとchild-to-parent sequence `0`のauthenticated `ready`後、materializerは
parent-to-child sequence `0`でexact `StudySupervisorRuntimeBootstrap`を`runtime-bootstrap`として1回だけ送る。
Supervisorはcanonical valueとfresh current root identity一致、endpointのlocal authority/absence、fresh tokenを
validateし、stable session/continuity stateを作りendpointをexclusive bindしてからACKする。そのACK後だけ
materializerはempty rootを変更できる。Supervisorはrootのexact lexical path、canonical path、type、stable
identity baselineを記録し、`finalize-commit`までpersistする。以後の各commandはsame raw lexical/
canonical valueをauthenticated transient control requestで渡す。Supervisorはbaselineとbyte-for-byte
比較し、rootを独立にresolve/statし、command前後でunchanged identityを要求する。Replacement、
unverifiable identity、alias、escapeはfail closedにする。

Authorized materialize caller/study setupはexact 4件のdistinct bidirectional nonrecording external
terminal-equipment handleもmaterializerへ渡し、child-visible descriptor `6`をparticipant、`7`をmoderator、
`8`をreviewer-one、`9`をreviewer-twoにmapする。Materializerは全handleのterminal type、pairwise-distinct
stable equipment identity、history/recording/transcript/echo disabledをlaunch前に検証し、same slotをsupervisorへ
inheritし、runtime-bootstrap ACK後だけown copyをcloseする。これらはclosed external-equipment exceptionで、
internal IPC pipe/channelでもenv/argv/path/evidence authorityでもない。Missing/alias/reorder/extra/echoing/
recording-capable equipmentはretained mutation前にfailし、bootstrap failure/abort/crashは全copyをcloseして
pending input bufferをwipeする。

Raw work-root authorityはmaterializer transient input、sole `runtime-bootstrap` frame、runtime-control request、
supervisor dedicated memoryだけに存在できる。Raw candidate authorityはauthorized post-input/pre-start candidate-store
provisionerのtransient input、start以降のauthorized caller/control request、supervisor memoryだけに存在し、
runtime-bootstrap/provisioned store/internal child frameへ入れない。Raw browser-proxy
authorityのruntime-only one-way routeはexact
`authorized start-through-stop caller transient input -> authenticated runtime-control StudyLiveBinding ->
supervisor dedicated memory -> exact one-use browser-proxy-binding -> study-browser-adapter dedicated memory ->
attempt-local DevTools control request/browser context`だけとし、runtime-bootstrapへ入れない。Caller/transfer/
control-request bufferはresponse/ACK直後にwipeする。Supervisor/adapterはdedicated run-level copyだけをstopまで
保持でき、attempt-local DevTools request/auth cacheはnormal close/abort/crash/terminalizationでcontextとdestroyする。
Complete allowed secret/raw-authority HMAC preimageは、このcontractのexact runtime-bootstrap、browser-proxy-
binding、authenticated runtime-control request、inherited-IPC frame authentication、identity commitment、proxy-
marker-installだけとする。Browser contextをsole equipment-side raw-authority exceptionとし、その他holder/copy/
hash/preimage/capture-evidence IPC/digest/commitment/log/output/evidence/IDを禁止する。Stop/failure/supervisor exitで
全remaining copyをwipeする。

Materializationはexact `distributions/participant-01`から
`distributions/participant-20`を作り、各distributionに上記`study-inputs/`/`repository/` layoutだけを
持たせ、さらにcaptureに必要な`capture/streams/` directoryを作る。Lifecycleを通じて許可するretained
capture fileは次だけとする。

```text
capture/streams/product-instrumentation.ndjson
capture/streams/inspector-server-ledger.ndjson
capture/streams/study-browser.ndjson
capture/study-capture-handoff.json
capture/study-capture-handoff.sha256
capture/study-continuity-witness.json
capture/study-continuity-witness.sha256
capture/study-capture-seal.json
capture/study-capture-seal.sha256
```

Stream file 3件は`start`、handoff pairはsuccessful `verify -- checkpoint`だけが作り、witness/seal
pairはsuccessful `verify -- finalize`まで存在してはならず、finalizeはwitness pairをseal pairより先に作る。
各phase前にはそのphaseで未認可のfileをabsentに
する。その他top-level entry、distribution、stream、retained regular/non-regular artifact、PID/control/
state file、temporary file、log、crash dump、backup、lock、socket sidecar、generated metadataを禁止する。
全retained regular fileと全distribution fileの`nlink`をexact `1`とする。このconditionはpermitted
directoryには適用しない。
Control endpointはwork root、全distribution、candidateのlexical/canonical外にあるtransient external
local IPCとする。POSIXではabsolute Unix-domain socket path、Windowsではexact
`\\.\pipe\agent-customization-inspector-study-`とlowercase hexadecimal 32文字の結合とする。Remote/network
pipe spellingを禁止する。TCP、UDP、DNS、その他network transportをすべて禁止する。Work root配下には
endpoint、PID、socket、control/state sidecarを一切置かない。Endpointは`materialize`前にabsent、そのrunの
supervisorだけがexclusive bindし、link/aliasを通じず、`finalize-commit`までsame endpointを保ち、final
evidence作成前にremoveする。
Raw spellingはmaterializerのsole runtime-bootstrap、supervisor/socket API、later authorized caller/control request
だけで使い、capture-evidence payload、別digest/commitment、retain/log/output/evidenceへ入れない。

Control tokenはrunごとのfresh cryptographically random 32 byteをunpadded base64url 43文字でencodeし、
全ID/continuity keyとdistinctにする。下記closed protocolのHMAC keyとしてだけ使う。Raw byte/text、plain
hash、reversible encoding、その他token derivativeをargv、retained state、log、process output、evidenceへ入れない。
Raw tokenはmaterializer input、sole authenticated runtime-bootstrap payload、supervisor dedicated memory、later
authorized command、probe readinessまでのtarget-launch chainだけに置き、bootstrap ACK後transfer copyをwipeする。
Emitを許可するsole derivativeはmessageごとのroot `authenticationTag` HMAC valueで、
当該transient control exchangeだけに存在し、payload、retain、log、output、reuse、evidence copyを禁止する。Raw tokenは
authorized command、supervisor、exact probe readinessまでのinherited target-launch chain内だけに存在し、
各processはearliest required boundary/exit時にdestroy/removeする。

Candidateはwork root/全distributionのlexical/canonical外にある、usable stable identityとexact `nlink`
`1`を持つexisting non-link regular fileへのabsolute pathでなければならない。`start`でsupervisorは
lexical/canonical authorityとstable identityを保持し、capture controllerはexact byteをhashする。
以後`finalize`まで各commandは同じtransient authorityを渡し、supervisor/independent verifierは作業前後に
same stable objectをreopen/stat/hashする。Identity、link count、type、byte driftはfailする。Candidate
authorityにはwork-root authorityと同じraw-value restrictionを適用する。必須lowercase digestとpath-free
commitmentだけをretainする。

`StudyRuntimeIdentityTuple`はin-memory-only fresh objectでexact orderを`platformClass`, `objectType`,
`device`, `inode`, `typeBits`とする。`platformClass`は`posix | windows`、`objectType`は
`directory | regular-file`、残り3 valueは同一BigInt `lstat` snapshotから得るcanonical nonnegative decimal
stringとする。Path、timestamp、byte count、digest、PID、OS handleを含まない。各commandはfresh tupleを取得し、
supervisorがstored initial tupleとseparately required lexical/canonical valueに比較する。Candidate
`nlink === 1`/digest stabilityはseparate mandatory checkのままとする。

`StudySupervisorRuntimeBootstrap`はruntime-only fresh canonical objectで、exact root orderを
`schemaVersion`, `workRootLexicalValue`, `workRootCanonicalValue`, `workRootIdentity`,
`controlEndpoint`, `controlToken`とする。Versionはliteral `1`、identityはfresh current exact
`StudyRuntimeIdentityTuple`、endpointはabsent local authority、tokenはstrict decodeでexact 32 byteとなるfresh
canonical unpadded-base64url 43文字とする。Materializer→supervisorでready後/root mutation前にexact 1回だけ許可し、
missing/extra/reorder/env/argv inheritance/duplicate/replay/stale root/wrong identity/present・nonlocal・aliased endpoint/
malformed・reused tokenをfailしてsupervisor/endpointをteardownしretained mutationを許可しない。

Runtime-only `StudyWorkRootBinding`のexact orderは`workRootLexicalValue`, `workRootCanonicalValue`,
`workRootIdentity`, `studyInputManifestSha256`とする。`StudyFullBinding`は`workRootLexicalValue`,
`workRootCanonicalValue`, `workRootIdentity`, `candidateLexicalValue`, `candidateCanonicalValue`,
`candidateIdentity`, `candidateSha256`, `studyInputManifestSha256`とする。`StudyLiveBinding`はexact order
`runtimeBinding`, `browserProxyAuthority`とし、`runtimeBinding`はexact fresh `StudyFullBinding`とする。

Supervisorはfresh 256-bit continuity keyを1件作り、決して返さない。Commitment 2件は64-lowercase-hexの
domain-separated HMAC-SHA-256とする。Exact preimageはそれぞれASCII `work-root-identity\0`/
`candidate-identity\0`と、exact order `controlSessionId`, `identity`のcompact canonical no-LF objectの結合とし、
`identity`は対応するexact tupleとする。Preimageにlexical/canonical path/candidate digestを含めない。
Work-root commitmentはmaterialization、candidate commitmentはstartでfixする。Key、tuple、raw binding、
commitment mappingはsupervisor memoryだけに存在し、finalizationでdestroyする。Start、handoff、witness、sealは
same `controlSessionId`、commitment 2件、candidate digest、study-input-manifest digestをbindする。

Browser-proxy authorityはexact `127.0.0.1:<port>`とし、`<port>`は`1`から`65535`までのnonzero canonical
decimal integerとする。`StudyBrowserProxyRuntimeBinding`はruntime-only fresh canonical objectでexact root orderを
`schemaVersion`, `studyRunId`, `browserProxyAuthority`とし、version `1`、current run、exact authorityを使う。
Browser adapterとwatchdog registrationのsupervisor ACK後、supervisor→study-browser-adapter
`browser-proxy-binding`でexact 1回送る。Adapterがvalidate/exclusive bindしてexisting child-to-parent ACKを返した後だけ
start completion/stream start/capture-startを許可する。ACK後transfer/frame copyをwipeし、dedicated authorityはstopまで
supervisor/adapterだけが保持し、checkpoint/continuationでresent value一致を要求する。Env/argv inheritance、retain/
log/output/evidence/別digestを禁止し、hash coverageはexact runtime-control requestとこのframeだけとする。

`StudyStreamWriterRuntimeBinding`はpath-free runtime-only fresh canonical objectで、exact root orderは
`schemaVersion`, `controlSessionId`, `studyRunId`, `streamRole`, `captureComponentRunId`,
`captureInstanceId`, `captureProcessRunId`, `writerFileIdentity`, `writerLinkCount`,
`writerOpenMode`とする。Versionはliteral `1`、session/run/streamはcurrent、capture ID 3件はmatching
adapterのauthenticated ready/self-registration identity、`writerFileIdentity`はregular stream fileのexact
path-free `StudyRuntimeIdentityTuple`、link countはliteral `1`、open modeはliteral `append-only`とする。
Path/descriptor/raw handle/authority/retained valueを含めない。

各streamでadapter ready+self-registration→supervisor ACK→one-use `stream-writer-binding`の順とする。
Adapterはown ID/fd `5`をverifyしてbindingをbyte-identical relayし、upstream ACKを保留する。WatchdogはID、
fd5 stable regular-file identity、`nlink === 1`、append-only authorityをverifyしbinding ACKを返した後、own
registrationを送る。Downstream binding ACK後だけadapterはupstream binding ACK、watchdog registrationの
ACK/forward、own fd5 closeを行い、supervisorはforwarded registrationをACKしてown fd5をcloseする。
Browser-proxy-bindingはbrowser adapter/watchdog両registrationのsupervisor ACK後だけ送ってadapter ACKを
必須とする。全3 writer-binding relay/ACK、全6 registration、browser-proxy ACK前にstream-control start、
capture-start、start completionを許可しない。

## Closed runtime-control protocol

各connectionはLF-terminated `hello` request、`hello` response、phase request、phase responseをそれぞれ
exact 1件だけ運び、その後closeする。Requestのcomplete root orderは次とする。

`schemaVersion`, `requestId`, `command`, `controlSessionId`, `challengeId`,
`authenticationTag`, `payload`。

Responseのcomplete root orderは次とする。

`schemaVersion`, `requestId`, `command`, `controlSessionId`, `challengeId`, `ok`, `errorCode`,
`authenticationTag`, `payload`。

Versionはliteral `1`とする。`requestId`はfresh opaque IDで、responseはsame IDを繰り返す。`hello`
requestは`controlSessionId`、`challengeId`、`authenticationTag`、`payload`をすべてliteral `null`とする。
Responseはsupervisorのstable fresh `controlSessionId`、fresh one-use `challengeId`、`ok: true`、
`errorCode: none`、`payload: null`、authenticated tagを返す。Phase requestはsame session/challengeを
繰り返し、responseも両方を繰り返す。Challenge/request IDをreuseできず、1 connectionに第2 phase
requestを置けない。Challengeはaccepted/rejected/malformed/disconnected/replayed attemptでconsumeし、
commandごとにnew helloを要求する。

HMAC計算時、senderは`authenticationTag: null`としたexact compact canonical messageをLFなしで再構築し、
command固有payloadのexact byteをpreserveする。HMAC inputはそれぞれASCII `request\0`/`response\0`と
そのbyteの結合とする。Decoded control tokenでHMAC-SHA-256し、resultをunpadded base64url 43文字の
`authenticationTag`とする。Receiverはaction前にdecodeした32 byteをconstant-time比較する。Token
自体は送信しない。Unknown/extra field、noncanonical byte、malformed ID/tag、replay、wrong phase/session/
direction、payload mismatchをfail closedにする。Success時は`ok: true`、`errorCode: none`、command schema
準拠payloadとする。Failure時は`ok: false`、`payload: null`、complete closed enum
`none | malformed-message | authentication-failed | challenge-replayed | command-not-allowed |
payload-invalid | binding-mismatch | state-mismatch | runtime-control-unavailable`のnon-`none` 1件とする。
Codeはtoken、path、identity component、raw field、child detailを開示しない。Canonical responseを作れる場合は
authenticateしてconnectionをcloseする。

Command setはexact `hello | verify-inputs | start | checkpoint | read-checkpoint |
anchor-handoff | verify-continuation | stop | finalize-prepare | finalize-commit | abort |
register-pre-readiness-probe | buffer-pre-readiness-product-event | register-product-probe |
submit-product-event | close-product-probe`とする。Payloadは次のschema/orderだけを
持つfresh canonical valueとする。

| Command | Request payload | Response payload |
|---|---|---|
| `hello` | `null` | `null` |
| `verify-inputs` | exact `StudyWorkRootBinding` | `workRootIdentityCommitment`, `runtimeControlReady` |
| `start` | exact `StudyLiveBinding` | `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `processes`, `orchestrators` |
| `checkpoint` | exact `StudyLiveBinding` | `checkpointRequestId` |
| `read-checkpoint` | exact `StudyLiveBinding` | `checkpointRequestId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `streams` |
| `anchor-handoff` | `liveBinding`, `checkpointRequestId`, `handoffSha256` | `anchorPositions` |
| `verify-continuation` | `liveBinding`, `checkpointRequestId`, `handoffSha256` | `anchorPositions` |
| `stop` | `liveBinding`, `checkpointRequestId`, `handoffSha256` | `null` |
| `finalize-prepare` | `runtimeBinding`, `checkpointRequestId`, `handoffSha256` | `null` |
| `finalize-commit` | `runtimeBinding`, `checkpointRequestId`, `handoffSha256` | exact `StudyContinuityWitness` |
| `abort` | `null` | `null` |
| `register-pre-readiness-probe` | `studyRunId`, `subjectId`, `bootstrapProof` | `preReadinessProbeId` |
| `buffer-pre-readiness-product-event` | `preReadinessProbeId`, `destinationRole`, `payload` | `null` |
| `register-product-probe` | `studyRunId`, `preReadinessProbeId`, `readinessProof`, `requestedDestinationRoles` | `inspectorProcessId` |
| `submit-product-event` | `inspectorProcessId`, `destinationRole`, `payload` | `null` |
| `close-product-probe` | `inspectorProcessId` | `null` |

`runtimeControlReady`はliteral `true`とする。Response `processes` arrayはfixed stream order、各stream内
`watchdog`、次に`capture`のexact 6 objectを持ち、各exact orderは`streamRole`, `processRole`, `instanceId`,
`processRunId`とする。Checkpoint `streams` arrayはfixed stream orderのexact 3 entryを持ち、各exact orderを
`streamRole`, `checkpointSequence`, `checkpointMonotonicNs`, `running`, `sealed`とし、last 2 fieldはliteral
`true`/`false`とする。`anchorPositions`はsame 3-role orderで、各fresh entryのexact orderを`streamRole`,
`anchorSequence`, `anchorEnvelopeSha256`とする。

Separate start-response `orchestrators` arrayは`study-harness`, `scoring-moderator`の順のexact 2 entryとする。
各exact root orderは`processRole`, `componentRunId`で、roleはslot literal、IDはauthenticated `ready` frameの
fresh component-run IDとする。両arrayにOS PID/reviewer processを含めず、unknown/missing/extra/duplicate/reorderを
failする。

`liveBinding`はexact `StudyLiveBinding`、`runtimeBinding`はexact `StudyFullBinding`とする。
`bootstrapProof`はexact `StudyPreReadinessBootstrapProof` root `schemaVersion`, `productId`, `bootstrapEventId`、
valueはliteral `1`, literal `agent-customization-inspector`, fresh one-use opaque IDとする。Success responseはfresh runtime-
only `preReadinessProbeId`を返す。
`readinessProof`のexact orderは`schemaVersion`, `productId`, `readinessEventId`、valueはliteral `1`、literal
`agent-customization-inspector`、fresh one-use opaque ID 1件とする。Nonempty `requestedDestinationRoles` arrayは
fixed order `product-instrumentation`, `inspector-server-ledger`のduplicate-free subsetとする。
`destinationRole`はそのregistered memberで、`study-browser`を選べない。`payload`はclosed variant exact 1件、
すなわちouter registered IDと`inspectorProcessId`が一致し`subjectId`を内部だけで運ぶcanonical safe observation、
または`destinationRole: inspector-server-ledger`かつalready-pending browser candidateに限るexact
`StudyServerCorrelationClaim`とする。Outer `inspectorProcessId`は常にregistered IDと一致してsubmitting probeを
authenticateする。Claimはregistered subject/process IDと`participant | bundled-spa` actorだけを使い、N/A
claim IDまたは他actorをinvalidとする。Supervisorはsafe-observation variantをselected
adapter/watchdogへexact 1回、claim variantをin-memory brokerへexact 1回routeし、claimをwatchdogへ直接送らない。
Successful registration responseは
supervisor生成fresh `inspectorProcessId` 1件を持つ。Null-response commandはliteral `null` payloadを使い、
success boolean side channelを持たない。

`buffer-pre-readiness-product-event`の`destinationRole`はsole literal `product-instrumentation`、`payload`は下記exact
`StudyPreReadinessProductObservationDraft`だけとし、server claim/他variantを許可しない。Register-product requestはsame
run/subject/bootstrapのstill-open exact `preReadinessProbeId`を必須とし、IDをenv/argv/application/evidenceへ入れない。
Unknown/duplicate/replay/post-bind/wrong run/subject/ID/destination/raw/mutation/reorderをfailする。

Supervisor state machineはexact `materialized -> inputs-verified -> live -> checkpointed ->
handoff-anchored -> continuation-verified -> stopped -> finalize-prepared -> finalized`とする。
`verify-inputs`、`start`、`checkpoint`、`anchor-handoff`、`verify-continuation`、`stop`、
`finalize-prepare`、`finalize-commit`がそれぞれtransitionを行い、`read-checkpoint`はcheckpointed中だけ
許可する。Probe commandはliveからcontinuation-verifiedまで、かつstop前だけ許可する。`abort`は全non-final
phaseで許可し、runをinvalidateし、endpointをremoveしてexitする。その他command/phase pairはtransition
なしでfailする。
`finalize-commit`はsuccessful prepare後exact 1回だけacceptする。Commit前のfailureではfail-closed retry/
`abort`だけのためendpointをavailableに保ち、witness/sealを書かない。

## Closed inherited-IPC protocol

全internal channelはこのexact protocolを使い、one-use bootstrapをinformalなOS-pipe trust assumptionに
しない。Complete role enumは`materializer | supervisor | study-harness | scoring-moderator |
reviewer-one | reviewer-two | product-instrumentation-adapter | inspector-server-ledger-adapter |
study-browser-adapter | product-instrumentation-watchdog | inspector-server-ledger-watchdog |
study-browser-watchdog`とする。各allowed role edgeについてchannel sponsorはexactly 2本のfresh
unidirectional anonymous inherited pipe、parent-to-childとchild-to-parentを作る。Parent-to-child pipeはfresh
32-byte `channelSeed`、fresh 32-byte `bootstrapNonce`、fresh 32-byte `channelId`の順のexact 96-byte
bootstrap prefixで始まり、その後同pipeがLF-framed parent-to-child messageへ切り替わる。Childはfirst 96 byteを
consumeしてからframe parsingをenableし、以後のbyteをbootstrapとして扱えない。Byte 96前のEOF/parent close、
partial/reordered/replayed bootstrap、byte 96前のframe parseをfailする。Prefix直後のbyteはnext canonical frameの
先頭であるか、frame completeまでpendingとなり、malformed/trailing byteは下記frame ruleでfailする。Bootstrap materialをenvironment、argv、file、
named endpoint、log、output、evidenceに入れず、frameには`channelId`のcanonical 43-character encodingだけを使う。

Allowed edge/message type matrixはclosedとする。

| Parent role | Verified child role | Parent-to-child message type | Child-to-parent message type |
|---|---|---|---|
| `materializer` | `supervisor` | `runtime-bootstrap`, `lifecycle` | `ready`, `acknowledgement`, `lifecycle` |
| `supervisor` | `study-harness` | `attempt-binding`, `terminalization-decision`, `lifecycle` | `ready`, `acknowledgement`, `lifecycle` |
| `supervisor` | `scoring-moderator` | `scoring-context`, `acknowledgement`, `lifecycle` | `ready`, `workflow-outcome`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| `scoring-moderator` | `reviewer-one` | `review-case`, `lifecycle` | `ready`, `reviewer-vote`, `acknowledgement`, `lifecycle` |
| `scoring-moderator` | `reviewer-two` | `review-case`, `lifecycle` | `ready`, `reviewer-vote`, `acknowledgement`, `lifecycle` |
| `supervisor` | `study-browser-adapter` | `browser-proxy-binding`, `stream-writer-binding`, `attempt-binding`, `proxy-marker-install`, `participant-navigation-grant`, `browser-broker-decision`, `safe-payload`, `workflow-outcome`, `terminalization-decision`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `browser-request-candidate`, `attempt-terminalization`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| `supervisor` | `product-instrumentation-adapter`または`inspector-server-ledger-adapter` | `stream-writer-binding`, `safe-payload`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| 各`*-adapter` | same-prefix `*-watchdog` | `stream-writer-binding`, `safe-payload`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |

他edge/type、特に`study-harness -> study-browser-adapter` edgeは存在しない。Moderator edgeとbrowser-adapter
edgeの`workflow-outcome`はexact `StudyWorkflowOutcomeSubmission`だけを運ぶ。後者をsupervisorからadapterへのsole
routeとし、adapterだけがcanonical workflow payloadへ変換して自watchdog edgeの`safe-payload`を使う。他typeを
workflow transportへ流用しない。Supervisor→browser-adapter edgeの`safe-payload`は、validated/stored matching candidateと
current-context decisionからsupervisor brokerが構築したexact canonical nonworkflow browser-observation variant 1件だけを
許す。下記complete canonical observation-payload root、literal `eventCode: observation`、nonworkflow
`observationClass`を必須とする。Workflow outcome/product/server variantやcandidate/broker state bypassを許さず、adapterはcandidate bindingを
validateするだけでworkflow tagを推測/self-assignしない。Blocked candidateはvalidated/storedだがacceptedではなく、
forwarded branchの`candidate-forward`だけをacceptanceとする。Review-case/reviewer-vote channelはsafe-onlyとする。
`StudyInheritedIpcFrame`のcomplete root orderは`schemaVersion`, `channelId`, `sequence`,
`direction`, `senderRole`, `receiverRole`, `messageType`, `authenticationTag`, `payload`とする。Versionはliteral
`1`、directionは`parent-to-child | child-to-parent`、sequenceは各directionで`0`からexact 1ずつ増える
nonnegative safe integer、tagはcanonical 43-character HMACとする（preimage構築時だけliteral `null`）。
Payloadはmatrixが選ぶexact closed schemaとし、unknown/extra/reordered fieldをfailする。

Direction keyは次のexact byte concatenationでderiveする。Nonce/channel IDはraw 32 bootstrap byte、roleは
exact ASCII literalで、final role separatorも含む。

```text
K_parent_to_child = HMAC-SHA-256(channelSeed,
  ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId ||
  ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)
K_child_to_parent = HMAC-SHA-256(channelSeed,
  ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId ||
  ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)
```

Childのfirst authenticated frameはchild-to-parent sequence `0`の`ready`とし、そのpayload exact orderは
`schemaVersion`, `bootstrapNonce`, `componentRunId`、valueはliteral `1`とnonce/component-run IDのcanonical
43-character encodingとする。Parentがauthenticate/consumeした後、両endpointは`channelSeed`と
`bootstrapNonce`をoverwrite/dropし、別edgeのbootstrapへreuseしない。

Materializer→supervisor edgeだけはfirst parent-to-child frameをsequence `0`のsole `runtime-bootstrap`とする。
Supervisorは全validation、stable session/continuity作成、endpoint bind後だけそのsequenceをACKする。そのACK後、
successful materializationはauthenticated `lifecycle: close`でmaterializer edgeだけをdetach/wipeし、supervisorを
停止しない。Rejected/missing/replayed/disconnected bootstrap、ACK前root mutation、abort/failureはedge/endpoint/
supervisorをteardownしretained mutationを許可しない。

各frameでsenderは`authenticationTag: null`のexact compact canonical no-LF frameを構築する。HMAC preimageは
exact `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || canonicalFrameBytes`とする。
該当direction keyのHMAC-SHA-256 resultをcanonical unpadded base64url tagとし、wire byteはtag設定済みcompact
objectとexact LF 1件とする。Receiverはpayload parse/state change前にcanonical byte、channel、direction、role、
edge/type、sequence、decoded 32-byte tagをconstant timeでvalidateする。`acknowledgement` payload exact orderは
`schemaVersion`, `acknowledgedSequence`, `result`、resultはliteral `accepted`とする。`lifecycle` payload exact
orderは`schemaVersion`, `event`、eventは`close | abort | child-exit`とする。

Parent-to-child `acknowledgement`はmoderator/adapter/watchdog edgeで直前のvalid child-to-parent
`process-lifecycle-attestation` sequenceだけをACKできる。Candidate、attempt terminalization、workflow、vote、ready、
stream result、他messageへ流用できず、wrong/duplicate/cross-type/late ACKはrunをinvalidateする。Watchdog
registration ACK後だけupstream relay、supervisor registration ACK後だけstart、watchdog exit ACK後だけadapter
exit、reviewer exit ACK後だけoutcomeを許可する。

Supervisor→study-browser-adapter edgeで`workflow-outcome`に対するchild-to-parent `acknowledgement`をmandatory
semantic responseとし、`acknowledgedSequence`はaccepted workflow-outcome exact sequenceでなければならない。
Adapterはmatching watchdog `safe-payload` ACK後だけこれを送る。Next context/binding/lifecycle/controlをimplicit
ACKにできず、missing/wrong/premature/duplicate/cross-type ACKをfailする。上記parent-to-child attestation-only
restrictionは維持する。

その他payload-bearing messageは下記対応canonical recordをwrapperなしでexactに運ぶ。
`runtime-bootstrap`はexact `StudySupervisorRuntimeBootstrap`、`browser-proxy-binding`はexact
`StudyBrowserProxyRuntimeBinding`、`stream-writer-binding`はexact `StudyStreamWriterRuntimeBinding`だけを運ぶ。
`StudyBrowserBrokerDecision`をsole `browser-broker-decision` payloadとし、exact root orderは
`schemaVersion`, `studyRunId`, `browserAttemptId`, `correlationId`, `decision`、decisionは
`candidate-forward | browser-only-released | joined-pair-released`とする。Candidate-forward/joined-pair-releasedの
`browserAttemptId`はcurrent non-N/A、browser-only-releasedはvalid-marker bound candidateならcurrent ID、missing/
invalid-marker unrelated candidateでderived subject/processもN/Aの場合だけ`not-applicable`とする。Eligible
validated/stored candidateはcanonical grantがarmedの間にcandidate-forward exact 1回を使い、そのdecision commitを
sole acceptance/authorizationとしてcanonical grantをatomic `armed -> consumed`してからforwardする。Blocked candidateはsole browser payloadのadapter/watchdog downstream ACK後にmutually exclusiveな
browser-only-released exact 1回、forward済みcandidateはjoin+両payload downstream ACK後にjoined-pair-released exact 1回を使う。Duplicate/skip/reorder/
wrong-state/reuseをfailする。

`StudyProcessLifecycleAttestation`のexact root orderは`schemaVersion`, `processRole`, `streamRole`,
`componentRunId`, `instanceId`, `processRunId`, `event`, `exitCode`, `signal`とする。Version `1`、roleは3 named
adapter/3 matching watchdog/`reviewer-one|reviewer-two`だけとする。Adapter/watchdogはmatching stream、ready
component ID、fresh uninterrupted instance/process ID、reviewerはstream/instance/process `not-applicable`とready IDを
使う。Eventは`registered | exited`、registeredはnull/null、accepted clean exitは同identityの`0`/nullだけとする。
Adapter ready/self-registrationとsupervisor ACK後にwriter-bindingをrelayし、そのwatchdog ACK後だけwatchdog
self-registrationをadapterへ送りACK/byte-identical relayする。Adapterはwatchdog stop後のdirect OS child observationからwatchdog exitを作る。Moderatorはreviewer ready/direct OS
child exitからregistered/exitedを作る。Self/sibling exit attestationを禁止し、nonclean exitは`lifecycle: child-exit`で
run invalid/no synthesisとする。

`StudyStreamControl` exact root orderは`schemaVersion`, `controlSessionId`, `studyRunId`,
`workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`,
`studyInputManifestSha256`, `streamRole`, `command`, `checkpointRequestId`, `handoffSha256`とする。Immutable bindingは
start値を反復し、commandは`start | checkpoint | anchor-handoff | stop`、startはN/A/N/A、checkpointはfresh ID/N/A、
anchor/stopはcurrent ID/digestとする。`StudyStreamControlResult` exact root orderは`schemaVersion`,
`controlSessionId`, `studyRunId`, `streamRole`, `command`, `checkpointRequestId`, `sequence`, `monotonicNs`,
`envelopeSha256`とし、actual first-heartbeat/immutable checkpoint/anchor/terminal-stop位置を返す。
`checkpointRequestId`はstartでliteral `not-applicable`、checkpointでfresh ID、anchor-handoff/stopでcurrent accepted
IDとし、他のN/Aを許可しない。Adapterはrequest/resultをbyte-identical relayするだけでact/synthesize/mutateできない。
Resultがsemantic responseでgeneric ACKを使わない。

`attempt-terminalization`と`terminalization-decision`はbyte-identicalなexact
`StudyAttemptTerminalization` root `schemaVersion`, `studyRunId`, `browserAttemptId`, `subjectId`,
`inspectorProcessId`, `cause`を運ぶ。Versionは`1`、readiness前process IDは`not-applicable`可、causeは
`product-exit | browser-exit | equipment-failure | premature-probe-close`とする。Harnessはterminalization sourceではない。
Supervisorはsole participant launch controller/OS child observerで、direct child waitからだけproduct-exitを作り、bound
bootstrap前exitはexclusively product-exitとする。Study-browser-adapterはChromium child/contextをdirect own/observeし、
actual exitをbrowser-exit、adapter/proxy/DevTools controller/marker auth/IPC/implementationがhealthyなexternal browser/
bootstrap/environment failureだけをequipment-failureとしてreportする。Internal proxy/controller output、DevTools/auth/
marker/IPC/implementation/adapter/watchdog faultはcleanup+run invalid/no synthesisとする。Authenticated probe close/EOFは
OS child wait stateとsame mutexでserializeし、already exitedならproduct-exit、still liveかつ4 outcome前ならpremature-
probe-close、4 outcome+pending join 0件後ならnormal closeとする。First committed valid causeだけをacceptしてlater/raceをrejectし、byte-identical decisionをharness/browser
adapterへfanoutする。Adapterはbrowser/grant/marker/reservation/candidate/pendingをcleanするがterminalizing bindingを保持し、
harnessもbinding/fixed remaining scheduleを保持する。Moderator/supervisorが4 outcomeを完了しclosed snapshot dual ACK後だけ
両copyをdestroyする。Wrapper/free-form detail/raw case/alternate variantを許可しない。

Truncated bootstrap、role、edge、type、channel、direction、order、tag、duplicate、skip、replay、trailing、
partial、frame内EOF、close後frame、unexpected child exitはedgeをcloseし、runをfailし、partial routeを0件にする。
Orderly close、abort、crash、authentication failure、child exitではdirection key、buffered frame、bootstrap、
sequence/replay stateをwipeする。Control token、continuity key、`browserProxyMarkerSecret`、他channel seed/key/
derivativeのsubstitute/reuseを禁止する。Inherited capture IPC内では、raw bootstrap/frame byte/tagはcapture evidence/
別digest preimageではなく、そのframe payloadをauthenticateできるのはこのexact frame authenticationと下記exact
marker-install frameだけとする。Cross-protocolで許可するHMAC preimageのcomplete setは上記enumerationだけとし、
その他preimageを禁止する。

## Capture process boundary

Executable process treeはclosedとする。Materializationはlong-lived `supervisor` exact 1件を起動する。`start`で
supervisorは順にlong-lived `study-harness` 1件、`scoring-moderator` 1件、3 stream各adapter 1件を起動し、各
adapterはready前にmatching watchdog exact 1件を起動する。Supervisor配下はorchestrator 2件+stream process
6件のexact 8 long-lived internal descendantとし、watchdogはadapter childでsupervisor direct childではない。
Attempt-local participant `npx`/InspectorとChromium child/contextはexternal equipmentで8件に含めない。
Supervisorはscoring-moderator spawn時にdescriptor `7`,`8`,`9`をsame slotで渡してown copyを即closeし、participant
ingressのdescriptor `6`だけを保持する。Review-required failureごとにmoderatorは
fresh `reviewer-one`、`reviewer-two` one-use vote-collectorをslot順にspawnし、両ready後にregistered attestation 2件の
supervisor ACKを待ってbyte-identical safe caseを送り、hidden first vote、次にsecond voteをacceptし、両direct OS
child exit attestationのsupervisor ACK後にchannel destroy/outcome submitする。Success/
valid automatic-link failureではreviewer processをspawnせず、process reuseを禁止する。

各adapterはready/self-registerしてsupervisor ACK後にwriter bindingを受けrelayする。Watchdogがbinding verify/ACK後に
self-registerし、adapter ACK/forward、supervisor ACKの順とする。`start`は8 internal process ready、writer binding
3件、registration 6件、browser-proxy-binding ACK、3 watchdogのcapture-start+first-heartbeat後の
exact start result後だけ成功し、start response identityはregistrationだけから得る。`stop`時は
live reviewer/open case/attempt/pending joinを0件とし、harness、moderatorの順、次にfixed stream orderのadapterを
closeする。各adapterはexact stop result後にwatchdog handle close/clean OS child exitをobserveし、exit attestationの
supervisor ACK後だけexitする。Supervisorはadapter 3件/orchestrator 2件をdirect OS observeし、watchdog 3件はaccepted
adapter-parent-OS attestationを使い、finalizeまでsole live study processとして残る。
Unexpected launch、extra/reused process、wrong parent/role/order、nonzero/signalled exit、harness/moderator/adapter/
watchdog/reviewer premature deathはrunをinvalidateし、workflow synthesisを許可しない。Participant Inspector/
browser/equipment terminalizationだけは下記attempt ruleを使う。

Startでsupervisorはstream file各1件をsecure create/validateしappend-only handle各1件をopenする。全internal childで
child-visible fd `3`=parent-to-child read、fd `4`=child-to-parent writeとし、adapter/watchdog modeだけmatching writer
handleをfd `5`で受け、他roleのfd5はabsent/closedとする。Fd5はthird IPC/channelではなく、exact supervisor→adapter→
matching-watchdog spawn mappingだけのsole required non-IPC inheritance exceptionとする。Adapterはverify/passだけを行い、
read/write/seek/duplicate/retainせず、downstream writer-binding ACK+watchdog registration relay後にcopyをcloseし、
supervisorもupstream registration ACK後copyをcloseする。Watchdogはbindingとmatching stable regular-file identity、
`nlink === 1`、append-only authorityをverifyしてsole holder/writerとなる。Extra duplicate/read/write/seek/retain authorityを
禁止する。Stop result後handle close/
clean exitとし、readable/swapped/extra/missing/wrong-slot/drift/adapter access/path・cwd・env・argv leakをfailする。

Streamは次のfixed orderのexact 3件だけとする。

1. `product-instrumentation`
2. `inspector-server-ledger`
3. `study-browser`

各streamはdistinctなcapture-adapter child processとwatchdog child processを1件ずつ持つ。6件の
process-run IDと6件のinstance IDはすべてpairwise distinctとする。Capture adapterはraw trafficを
自processのmemory内だけで観測し、直ちにclassifyして、IPC前に全raw valueをdiscardし、authenticated
local IPCだけを通じてsubmitする。Authenticated IPC message 1件はclosed canonical safe payload
valueをexactly 1件だけ運ぶ。同一primary-workflow/study observation内で任意数のmessage/eventを
submitでき、acceptされた全messageはpayload record 1件としてcountされ、envelope/payload pair 1件として
chainされる。Adapterはevidenceのwrite、append、rewrite、truncate、checkpoint、stop、seal、repairを
行えない。Watchdogはそのstreamのenvelope/safe-payload
sole writerであり、capture eventとheartbeat tickを1つのappend queueでserializeする。Pause、death、
restart、replacement、writer change、ID reuse、stream stitchはstudy全体をinvalidにする。

Raw header name/case/order/framing/wire byte/text/encoded representation/whitespace/duplicate
layout、noncanonical valueとそのalternate derived value、request/response body、inspected/authored
content/metadata、filesystem path/filename、capability/authority value、URL、raw network byte、raw
parser/system error/exception string、personal data、participant response valueはcapture-evidence IPCを
越えず、hash/persistせず、envelope、safe payload、handoff、witness、seal、process output、temporary file、
validation recordへ含めない。Sole retained header-derived exceptionは下記でstrict decodeしcanonical re-
encodeした43-character `correlationId`とする。そのprovenanceはheader representationではなくcontract-defined
fresh generator、すなわちparticipantではsupervisor grant、SPA/browser-onlyではbrowser adapter、他pathでは
明示されたowning safe generatorとする。このcanonical safe stringだけがsafe payloadと必須payload/envelope/stream/handoff/
witness/seal digest chainへ入る。別のruntime-only `browserProxyMarkerSecret` exceptionはexact authenticated
`proxy-marker-install` IPC frame、そのHMAC processing、ephemeral browser-equipment configurationだけに限定し
retainしない。Adapterはfixed classification生成のため
一時的に検査してdiscardする。禁止valueをencode/encrypt/redact/normalize/hashしてもallowedにならない。
この契約が明示するcandidate、manifest、canonical safe payload、envelope、handoff、witness、seal digestは許可する。

### Product-instrumentation probe

Materializer→supervisor launch時、sanitized ordinary equipment `PATH`をidentity/digest-pinned `npx` launcher binと、
work root/distribution/control endpoint/browser profile外のreserved initially-empty candidate-launch-store bin slotの
exact 2 entryにfixし、supervisorへinheritする。`materialize`/`inputs`はstore contentをread/requireしない。Successful
`verify -- inputs`後かつcapture `start`前だけ、authorized setupがexact candidate tarball+frozen production graphから、
network/lifecycle script disabledでその既知reserved slotへprovisionし、package/bin/runtime payload identity/digestを
candidate digestへbindする。Distribution/`node_modules`を変更しない。

`start`でsupervisorはinherited fixed slotだけをresolveしpinned launcher/storeをcandidate digestへrevalidateする。
New env/control field/path frame/post-materialize path、global/cache/network/install/fallback/alternate PATHを禁止する。
Raw tarball lexical/canonical authorityをchildへ渡さず、store path/identity/handleをruntime equipmentだけに保ち、capture/
evidence/log/output/ID/retained digestへ入れない。`stop`/`finalize`/abort/crashでstoreをdestroyしabsence proofまでblockする。
Provisioningは8 long-lived internal descendant外とし、actual pinned `npx --no-install` integration testでsole store
resolutionを証明する。

Supervisorをsole participant-launch controller/OS observerとする。Prepared attempt/marker/browser-equipment barrier後だけ
descriptor `6` inputをenableし、LF前byteがliteral `npx --no-install agent-customization-inspector --no-open`である
exact one LF-terminated ASCII lineだけをacceptする。Shell/parser/substitution/extra option/prefix/suffix/CR/second line/
terminal history/echo/recordingを禁止する。Subject distribution identityを再検証し、exact `repository/` cwdかつsame
external terminal equipmentでdirect spawnする。Sanitized child envはfixed product env、上記exact 2-entry audited `PATH`、
sole exact `NODE_OPTIONS=--import=<bound-capture-script-file-url>`、exact control endpoint/token、probeに必要な最小scopeのcurrent safe `INSPECTOR_STUDY_RUN_ID`/`INSPECTOR_STUDY_SUBJECT_ID` value（run/
subject context）だけとし、raw candidate/proxy authority、browserAttemptId、internal channel、他study valueをargv/env/cwd/
terminal/application inputへ入れない。Command bufferをspawn直後にwipeし、supervisorがOS child handle/waitをownする。
Attempt close/terminalization/child exit/abort/crashでchild viewをcloseしfd6をdrain/resetしてpending input/output/stateを
wipeし、prior bytes/history/context absenceを証明する。Fixed surface/slot reuseだけを許し、participant process/probe
contextは毎回freshとする。

Sole exact NODE_OPTIONSはlaunchからInspector childがprobe readinessをcompleteまたはfailするまで存在する。
その他option/imported moduleを置かない。Imported codeは
`Symbol.for('agent-customization-inspector.study-probe.v1')`にoptional readiness function exact 1件を
installする。Bound Inspector bootstrapはfunctionが存在する場合、server/browser start前にfresh canonical
object `schemaVersion`, `productId`（valueはliteral `1`/`agent-customization-inspector`）を渡してexact 1回callする。

Inspector-process IDを事前assign/environment格納しない。Candidate module-body evaluation前にimport codeはbound bootstrap identityをtransient verifyし、
raw identityをdiscardしてexact `StudyPreReadinessBootstrapProof`でregisterする。Supervisorはruntime-only
`StudyPreReadinessProductBuffer` root `schemaVersion`, `studyRunId`, `subjectId`, `preReadinessProbeId`, `state`を作る。
Versionはliteral `1`、IDはcurrent/fresh safe valueとする。Stateは`open | readiness-bound | terminalization-bound |
destroyed`でopen→いずれかbound→destroyedのone-wayとする。
IDはmodule-private/runtime-onlyでenv/argv/application/evidence/digest/outputへ入れない。

`StudyPreReadinessProductObservationDraft`はcanonical observation payloadとsame exact root order
`schemaVersion`, `eventCode`, `eventId`, `correlationId`, `subjectId`, `inspectorProcessId`, `observationClass`,
`actorClass`, `authorityClass`, `requestClass`, `targetClass`, `methodClass`, `originClass`,
`effectClass`, `workflowClass`, `outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`,
`reviewerOneClassification`, `reviewerTwoClassification`, `sameInspectorHost`, `productAttributable`, `prohibited`を
持つ。Version/eventは`1`/`observation`、event/correlationはfresh transient ID、subjectはcurrent、process/workflow/
automatic/reviewはN/A、outcome observed、他tupleはclosed product rowだけとし、evidence/claimにしない。

Observable/prohibited pre-readiness effect継続前にhookはsafe classifyしrawを即discardし、sole destination
`product-instrumentation`へexact `buffer-pre-readiness-product-event`をsubmitしてACKを待つ。ACK前にeffectを続行しない。
Supervisorはdraftをexact orderでvalidate/storeし、まだhash/route/evidence retainしない。Abrupt exitでもACK済みbufferは
残る。Readiness時`register-product-probe`にopen `preReadinessProbeId`を含め、stateをreadiness-boundにし、fresh
process ID/new evidence event/correlationでfresh canonical payloadを順序再構成し、product adapter ACKを待つ。Emptyを
含むbuffer destroy後だけattempt-open ACK flowへ進む。Register/readiness responseは全buffer release ACK/destroy、
harness/browser-adapter両open-binding ACK、moderator discovery-context ACKが完了するまでblockし、その後だけassigned
process ID/readinessを返す。Grant/navigation/taskはさらにその後だけ開始し、post-ready/pre-context product event gapを
作らない。Pre-readiness terminalizationではstateを
terminalization-boundにしprocess N/Aで順序release/ACK、empty含むdestroy後だけterminalization decision/synthetic
outcomeへ進む。Readiness後のsafe observationはdistinct `submit-product-event`で送る。Browser-origin server correlationはsame commandでexact
`StudyServerCorrelationClaim` variantを送り、registered IDはouter authentication fieldだけに残す。Orderly
Inspector exitでIDをcloseする。Probeはcapture adapter/
watchdogのどちらでもなく、evidenceを書かない。

Canonical product-attributable observationが`inspectorProcessId: not-applicable`を使えるのは、readiness前にsame-run/
same-subjectの`terminalization-bound` pre-readiness bufferからreleaseされ、workflowも`not-applicable`のときだけとする。
`readiness-bound` releaseはすべて新規assignしたnon-N/A process IDを使う。Readiness後を含め、その他のproduct-
attributable N/A rowはinvalidとする。

Readiness proof作成前にprobeは、そのcallがbound candidateのfixed bootstrap identityからrequired pre-server/
pre-browser pointで発生したことをtransientにverifyする。Raw call-site/path materialは直ちにdiscardし、proofへ
入れない。Helper/wrapperがglobal symbol自体をcallしてreadiness proofをmintすることはできない。

Exact bootstrap identityを持たないhelper/unrelated processはregisterせずlocal dataをdiscard/evidence 0件とする。
Supervisorがdirect observeしたexpected participant childがbound bootstrap到達前にexitした場合はsole pre-readiness
classification `product-exit`+reviewed failure 4件とし、
candidate-body effectは不可能とする。Bound bootstrap到達後はregistration ACKまでmodule body evaluationをblockし、
identity/register/ACK failureはbody未評価のままrunをinvalidateする。Buffer ACK failure、missing/wrong/duplicate
readiness、direct/duplicate probe install、changed self-import、raw IPC、run/subject/ID/destination mismatch、duplicate/
replay/mutated/post-bind draftはrunをinvalidateしsynthesisしない。Study-browser adapterはdirect Chromium作成前に
`NODE_OPTIONS`、control binding 2件、safe-context binding 2件、candidate authority、inherited internal IPCをstripし、
proxy authorityはattempt-local DevTools request/context routeだけへ渡す。Contract/integration testはactual pinned
`npx --no-install`のaudited candidate-launch store-only resolution、target readiness、pre-readiness buffering、non-target discard、helper stripping、missing/
tampered probe、全product/server observation surfaceをexerciseする。

### Study-browser proxy

Run-level stream start後、各participant candidateの`npx`/first capturable request直前に、supervisorはfixed
20-subject orderのnext subjectをprepareする。Fresh `browserAttemptId`を生成し、runtime-only
`StudyBrowserAttemptBinding` 1件をinstallする。Complete root orderは`schemaVersion`, `studyRunId`,
`browserAttemptId`, `subjectId`, `inspectorProcessId`, `state`とする。Versionはliteral `1`、`studyRunId`、
`browserAttemptId`、`subjectId`はapplicable safe run-local ID、prepared中の`inspectorProcessId`はliteral `not-applicable`、
`state`はexact `prepared | open | terminalizing | closed`とする。Pathは`prepared -> open -> closed`,
`prepared -> terminalizing -> closed`, `prepared -> open -> terminalizing -> closed`だけとする。全runtime stateを
通じbindingは最多1件で、closed bindingをdestroyしてからnextをconstructする。

Binding replicationはclosed acknowledged state machineとする。Supervisorはbyte-identical prepared snapshotを
harness/browser adapterへ送り、両ACK前にmarker install/launchしない。Readinessでfresh process IDを持つcanonical
open snapshotをatomicに作り両者へ送り、次にdiscovery scoring-context mirrorをopenしてmoderator ACKを得る。Buffer
release/destroy、両open-snapshot ACK、そのmoderator ACK後だけregister responseを返し、grant/candidate/taskはresponse後だけ作れる。
Terminalization-decision acceptで各copyをatomicにterminalizingへ変更する。4 outcome後にbyte-identical canonical
closed snapshotを両者へ送り、adapterはattempt-local cleanup後にACKする。両ACK後に全copyをdestroyする。Normal
completionもsame closed snapshot/ACK pathを使う。Wrong/skip/reorder/stale/duplicate/mismatch/partial ACKはrunをfailし、
next attemptをopenしない。

`browserAttemptId`はcontent-free safe broker IDだけであり、supervisor/broker/harness/adapter memory、authenticated
`attempt-binding` frame、request candidateだけに存在できる。Actual browser process/context/profile/configuration/
credential、application request、environment、argv、control/evidence/retained digestへ渡さない。Supervisorは別途fresh 32-byte/43-character
`browserProxyMarkerSecret`を生成し、runtime-only `StudyBrowserProxyMarkerBinding`をexact root order
`schemaVersion`, `studyRunId`, `browserAttemptId`, `browserProxyMarkerSecret`, `state`で構築する。Versionは
literal `1`、ID/secretはstrict `StudyOpaqueId`、stateは`prepared | active | destroyed`をmonotonicに取る。Supervisorは
prepared bindingを`proxy-marker-install`でbrowser adapterだけへ直接送り、harnessへ渡さない。Adapterはephemeral
browser equipmentへinstallしてexact bootstrap成功後だけACKし、そのacceptで両copyをatomicに`active`へ変更する。
このACKはmarker copyだけをactiveにし、attempt bindingはreadiness/open dual ACKまでpreparedのままとする。Actual
browser process/context exitはmarkerをdestroyしてbrowser-exit、healthy adapter/proxy/DevTools controllerが観測するexternal browser/
bootstrap/environment failureはequipment-failureをreportする。Internal malformed 407/204/output、proxy/controller、
DevTools/auth/marker/IPC/implementation/adapter/watchdog faultはmarkerをdestroyするがrun invalid/no synthesisとする。Install frameをraw secretを
含むsole transient HMAC preimageとし、binding/secretをevidenceにしない。

Study-browser adapterはexact identity/digest-pinned Chromium binary/profileをdirect revalidate/spawnし、headed、fresh
nonpersistent context、empty extension setとする。AdapterがOS child/contextをownしdirect exit observeする。Closed
nonsecret argvはliteral `--remote-debugging-pipe`とexact pinned headed/profile switchだけで、shell/helper/package/import
expansion、raw proxy/marker、browserAttemptId、control/internal IPCをChromium argv/env/profile/history/log/evidenceへ
入れない。Attempt ID mappingはadapter memoryだけに保つ。

Anonymous browser-equipment DevTools pipeはinternal capture IPC matrix外でdataをretainしない。Attemptごとにadapterは
raw authorityを`proxyServer`、`disposeOnDetach: true`、empty bypassとしてexact `Target.createBrowserContext`をcallし、
`handleAuthRequests: true`のexact `Fetch.enable`をcallする。Sole exact Proxy Basic `Fetch.authRequired`へ
`Fetch.continueWithAuth`の`ProvideCredentials`、username `study`、password marker secretをexact 1回返す。Authorized
adapter dedicated run-level proxy-authority copy/attempt marker-binding copy以外のDevTools-stage raw copyは、adapter
call-local request bufferとactual context/auth cacheだけに存在し、DevTools response ACK後bufferをwipeする。このactual
contextでexact `407 -> one retry -> 204`をverifyしてからmarker ACKする。Normal close/abort/crash/terminalization/internal
faultでcontext/auth cache/pipeをdispose/closeし、attempt Chromium childをterminateしてfresh isolated profileをdestroyし、
process/contextをreuseしない。

Pinned Chromium bindingは、verified close-on-disconnect implementationがexact source behavior
`StartRemoteDebuggingPipeHandler(base::BindOnce(&ChromeDevToolsManagerDelegate::CloseBrowserSoon))`で、pipe disconnectが
browser closeをscheduleする場合だけeligibleとする。Adapterがpipe/child handleをcreate/ownする。Supported study platformは
existing Node.js built-in child-spawn/OS boundaryを通じfresh attempt-isolated process-group/job containment+emptiness observerも
供給する。これはlifecycle equipmentで、executable helper/import/IPC message/env/path authorityではなく、供給不可platformは
launch前equipment preparationをfailする。Live adapter EOFは`Target.disposeBrowserContext`→pipe close→child exit→profile
destroy、adapter crashはpipe closeによるverified `CloseBrowserSoon`+containment survivor cleanupとする。Supervisorはraw
containment handle/PIDをruntime observer stateだけに保持し、adapter exit後はdescendant/context/profile 0件のproof前にnext
attempt/stop/finalizeへ進めない。Failureはcleanup+invalid、PID/handle/path/stateをevidenceへ入れない。

Browser-context proxy usernameはliteral `study`、passwordはexact marker secretとする。
3件の`capture-start`後、当該attemptのparticipant `npx`/first capturable request直前に、browserはfixed proxy-local URI
`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`だけをnavigateする。First requestは`Proxy-Authorization`なしで、
bodyless `407` exact 1件を受け、そのraw response headerは順にexact
`Proxy-Authenticate: Basic realm="inspector-study"`, `Connection: close`の2件だけとする。
次にexact UTF-8 `study:<browserProxyMarkerSecret>`のcanonical RFC 4648 padded base64を持つcanonical `Proxy-Authorization: Basic <credentials>` field exact 1件で
retryし、sole header exact `Connection: close`だけを持つfixed bodyless `204`を受ける。両exchangeはstream live中も
proxy-local equipment trafficで、DNS/connect/application/candidate/correlation/evidenceを0件とする。他status/
header name/order/value/body/network/evidence effectをadapter/proxyが生成した場合はrun invalidとする。Internal outputが
exactなのにactual browser/environmentのretry/credential/sequence/completionが失敗した場合だけequipment-failure、actual
browser process/context exitはbrowser-exitとする。
Bootstrap後のcapture中、study-browser requestは毎回exact Basic 1件を
持つ。Syntactically validなmissing markerは`other-host-process`、malformed/duplicate/noncanonical/unknown/
stale/mismatched markerは`unknown`とし、いずれもunrelated、N/A binding IDでDNS/connect前にblockする。

Proxyはforward前にBasic field全体をconsume/stripする。Secretはproxy transport authentication capability
だけであり、validityだけでactor/product attribution、application/control capability、forward authorizationを
成立させず、closed target/method/origin policyを広げない。Raw/encoded Basic、raw secret、install
configuration、marker bindingは他inherited/evidence IPC、hash、evidence、log、process output、file、environment、
argv、persistent profile/history/cache/credential store/keychain、application requestへ入れない。Control token、
continuity key、IPC key、`browserAttemptId`、それらのderivativeをmarker secretへreuseしない。Normal close、
abort、crash、child exitでbrowser context/process/configurationと全secret/binding copyをdestroyする。Chromium childは
control、safe-context、candidate、proxy、probe、marker、internal-IPC environmentを受け取らず、Chromium equipment内の
proxy/markerは上記DevTools request/context/auth cacheだけに置く。

Actual fixed headed Chromiumをnormal completion、abort、全bootstrap/request boundaryのcrashでtestする。各case後に
isolated temporary `HOME`、全XDG root、profile/history/cache/credential-store surfaceをinspectし、raw secret、encoded
Basic、`browserAttemptId` persistenceを0件とし、next attempt前にcontext/browser process/config/storageをdestroyする。
Bodyless 407/204とlater one-Basic requestはsynthetic clientではなくactual browserでexerciseする。
Pinned-binary integration testは全bootstrap/request boundaryでremote-debugging pipeをdisconnectし、verified
`CloseBrowserSoon` path+containment/absence barrierを証明してadapter crash後orphan Chromium child/context/fresh profileを
0件とする。

`study-browser` capture adapterはNode.js built-inだけでproxy自体をimplementし、`start`中にdeclared exact
loopback authorityへbindし、`stop`中にcloseし、local HTTP/CONNECT syntaxをclassificationのためだけにparseして
deny-by-defaultとする。Missing、malformed、noncanonical、unknown、stale、mismatched markerを持つrequestは
DNS/connect/forwarding前にblockする。Current markerはattempt bindingだけを確立し、CONNECT tunnelは存在しない。

ProxyとInspector-side probeは、同じunmodified certified-Chromium-controlled header
`Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site`, `Sec-Fetch-User`, `Origin`, `Referer`からそれぞれ独立に
exact transient `StudyBrowserInitiatorProjection`を構築する。Complete root orderは`schemaVersion`,
`destinationClass`, `modeClass`, `siteClass`, `userClass`, `originEvidenceClass`,
`refererEvidenceClass`とする。Versionはliteral `1`。Closed valueは順に`document | other | unknown`,
`navigate | other | unknown`, `none | same-origin | other | unknown`, `present | missing | unknown`、last 2
fieldは各`missing | exact-issued | extension-scheme | other | unknown`とする。`Sec-Fetch-User: ?1`だけを
`present`、exact issued HTTP origin/refererだけを`exact-issued`、canonical extension-scheme originだけを
`extension-scheme`とする。Duplicate、noncanonical、unknown controlled value、inconsistent combinationはactor
projectionを`unknown`にする。両classifierはraw header valueをIPC前にdiscardし、proxyは6 headerをunchangedで
forwardし、server projectionとcandidate projectionのexact一致を要求する。Production profileはempty
extension set、別test-only extension profileはcertified Chromiumがpage/extension codeによるFetch Metadata
spoofを防ぐことを証明する。

Fetch Metadataはconsistency signalだけで、participant attestationとして十分ではない。Exact product-probe
readiness後、attemptのsole expected initial participant navigation直前にsupervisorはfresh `correlationId`とruntime-
only `StudyParticipantNavigationGrant`を作る。Exact root orderは`schemaVersion`, `studyRunId`, `browserAttemptId`,
`correlationId`, `state`、versionは`1`、stateは`armed | consumed | destroyed`とする。Supervisorをcanonical state
ownerとしbroker copyを保持し、byte-identical armed copyをbrowser adapterへ送る。Proxy injection前にbrowser/page/
applicationへgrantを見せない。Adapterはcall-local mutex下でvalid secret+exact participant-shaped projection+exact
authorized-static targetだけにarmed copyを一度reserveするがcanonical fieldを変更せず、grant correlationを使う
candidateをforwardせず送る。Supervisorはown armed copy、attempt/correlation/tupleをverifyし、candidate storeと
pending storeを行うが両grant copyをarmedのまま保つ。Exact one-use `candidate-forward`をsole authenticated acceptance/
forward authorizationとしてcommitし、それとatomicにcanonical grantを`armed -> consumed`とする。Generic candidate
ACKやvalidation/storage時のacceptanceは存在しない。Adapterはmatching decisionをvalidateしてからown copyをconsumedにし
forwardする。Decision commit前failureはpendingをwipeして両grantをarmedのまま保つが、authenticated replay/raceはrun
invalid+grant destroyとする。No armed grant、wrong target、page script、post-consumptionのfresh HTTP requestはfresh proxy correlationの
unknown/prohibited blocked observationとなりgrant consume/run invalidationしない。Duplicate/replayed/stale authenticated
candidate/grant IPC、simultaneous second consume、authenticated reservation/decision mismatch、committed decisionのadapter側
missing/mutation、wrong authenticated attemptは
run invalid/no forwardとし、attempt closeで全copyをdestroyする。

Closed ordered decision tableは次とする。

| First matching case | Actor/evidence ID | Attribution/action |
|---|---|---|
| Valid secret、`modeClass: navigate`、`destinationClass: document`、`userClass: present`、`originEvidenceClass: missing`、`siteClass: none \| same-origin`、exact authorized-static target、current armed grant | `participant`; open binding IDとgrant correlation | Grantをonce consumeしてforward/join。 |
| 上記participant条件のいずれかを欠くparticipant-shaped valid-secret request（nonexact target/no grant/replay/user-activated page-script navigationを含む） | `unknown`; open binding ID | Browser-only fail-closed critical `unauthorized-request`、attributable/prohibited trueでblock。 |
| Valid secret、participantではない、`userClass: missing`、かつ`originEvidenceClass: exact-issued`または（Origin missingかつReferer exact-issued） | `bundled-spa`; open binding ID | Exact authorized-static/RPC requestだけforward/join。全nonexact/unauthorizedはbrowser-only product-attributable/prohibitedとしてblock。 |
| Valid secretかつextension-scheme origin | `browser-extension`; subject/process N/A | 常にbrowser-only unrelated、effect none、attributable/prohibited falseでblock。 |
| その他valid-secret projection | `unknown`; open binding ID | Browser-only fail-closed critical request: 該当に応じて`requestClass: unclassifiable \| prohibited`、`effectClass: unauthorized-request`、`productAttributable: true`、`prohibited: true`でblock。 |
| Bootstrap後のsyntactically valid missing secret | `other-host-process`; subject/process N/A | Browser-only unrelated/falseでblock。 |
| Invalid/duplicate/malformed/noncanonical/unknown/stale/mismatched secret | `unknown`; subject/process N/A | Browser-only unrelated/falseでblock。 |

したがってInspector/two-stream joinへ到達できるのはgrant-attested exact authorized `participant`とexact authorized
`bundled-spa`だけであり、
valid-secret extension/other-host/unknown N/A-claim branchは存在しない。Blocked requestはDNS/connect/request-body
forwarding/response exposure前にcandidateをsubmitする。Adapterではなくsupervisor brokerがcurrent-context ruleを適用し、
workflow tag/eligible correlation candidateを決めてsole canonical browser observationを構築する。Proxy authority、marker、projection
header、その他raw request valueはbroker/evidence IPC前にdiscardする。Proxy bind drift/bypass、authorizing
credential、key reuse、remote resolution/connect、persistence、stop close failureはrunをinvalidateする。

Exact candidate-owned readiness handshake時、supervisorはsole prepared bindingのrun/subjectをverifyし、fresh
`inspectorProcessId`を生成してbindingをatomicに`inspectorProcessId: <fresh-id>, state: open`へ変更する。Existing
`register-product-probe` responseは上記prebuffer/dual-ACK replication/discovery-context ACK chain後だけ返す。Supervisorは
participant OS child waitからだけ`product-exit`をderiveし、harnessはterminalization sourceではない。`study-browser-adapter`をdesignated attempt-bound equipment observerとし、actual browser
process/context exitを`browser-exit`、adapter/proxy/DevTools controller/marker authentication/IPC/implementationがhealthyなまま発生したexternal
browser/bootstrap/environment failureを`equipment-failure`としてsole exact `attempt-terminalization`でreportする。Internal
malformed 407/204/output、proxy/controller、DevTools/authentication、marker、IPC、implementation、adapter/watchdog faultはrunをinvalidateし、
outcomeをsynthesizeしない。Authenticated `close-product-probe`/unexpected EOFをOS child stateとserializeし、already
exitedならproduct-exit、still liveかつ4 outcome前なら`premature-probe-close`、4件+pending join 0件後ならnormalとする。First valid committed causeだけをacceptし、
accepted workflow prefixをfreezeし、pending joinをpartial releaseなしでcloseし、bindingを`terminalizing`へ変更して
byte-identical `terminalization-decision`をfanoutする。Scoring mapは`product-exit -> product-exit`,
`browser-exit -> browser-exit`, `equipment-failure -> equipment-failure`,
`premature-probe-close -> equipment-failure`とする。

Remaining fixed workflow orderでmoderatorはunaccepted workflowごとにcontext 1件を作り、exact `failure`と必要reviewを
acceptedにしてからnextを開く。Harnessはremaining fixed scheduleだけをownし、synthesisはmoderatorだけがownする。
Accepted rowはimmutableでduplicate/replaceしない。Accepted count 0..4すべてを扱い、同subject IDとexisting process ID、
readiness前なら`not-applicable`のままexact 4 rowにする。Decision時にadapterはbrowser/grant/marker/reservation/
candidate/pendingをdestroyするが、adapter/harnessはterminalizing binding copyを保持する。4件後にsupervisorがbyte-identical
closed snapshotを両方へ送り、両ACK後にgrant/marker/config/context/browser/profile/storage/join/binding copyをdestroyしてから
next attemptを許可する。Normal ready attemptもprobe close+4 row+pending join 0件後だけ同じclosed-snapshot pathでcloseする。
Evidence harness/orchestrator/adapter/watchdog/reviewer failureはrunをinvalidateしsynthesisしない。`stop`/finalizeは全runtime
copy/live reviewerを0件とする。

Scoring moderatorがsole call-local raw response/timing/ground-truth/rubric ownerで、descriptor `7`だけから読む。
Matching open scoring context deliveryとcurrent workflow display complete後、exact 1件のLF-terminated compact canonical
UTF-8 JSON `StudyModeratorInput`をenableする。Exact root orderは`schemaVersion`, `studyRunId`, `subjectId`,
`inspectorProcessId`, `workflowClass`, `response`, `timing`, `groundTruth`, `rubric`。Version `1`、ID/workflowは
open contextとbyte-match、process IDはnon-N/A、`timing`はcanonical nonnegative decimal string、`response`/
`groundTruth`/`rubric`はcall-local raw contentを持つcanonical JSON stringとする。Unknown/extra/reorder/noncanonical
JSON/UTF-8/escaping、CR/extra line、premature EOF、duplicate/replay/wrong contextをfailする。Echo/history/recording/
transcript/log/evidence retention/other surface routeを禁止する。Canonical safe outcome作成直後にrecord/parsed rawを
overwriteしinput disable+fd7 drain/resetし、abort/crash/terminalizationはpartial byteをwipeする。

Normally completed workflowごとにrecord exact 1件を必須とする。Terminalizationのunexecuted remaining workflowは
decisionからfailureをsynthesizeしfd7を読まない。Synthetic/closed/already accepted workflowのinputはlate/cross-context
invalidとする。Accepted prefixはnormal workflowごとにrecord 1件をconsume済みで、synthetic row向けempty/default raw
valueを捏造しない。Harnessはsubmissionを生成しない。
Runtime-only `StudyCurrentSubjectScoringContext`のexact root orderは`schemaVersion`, `studyRunId`, `subjectId`,
`inspectorProcessId`, `workflowClass`, `automaticIssueCorrelationId`, `terminalizationClass`, `state`とする。
Versionはliteral `1`、ID/workflowはcurrent safe value、automatic fieldはinitially `not-applicable`、terminalizationは
`none | product-exit | browser-exit | equipment-failure`、stateは`open | submitted | destroyed`をその順にmonotonicとする。
Open中だけautomatic fieldをN/Aからearliest accepted matching
nonworkflow prohibited correlationへexact 1回、terminalizationをnoneからmapped classへexact 1回更新できる。Later
synthesized contextはmapped classでinitializeする。この2 one-way update以外のmutation/reversal/replacement/second/
post-submit updateをfailする。Call-localでsafe contextとraw inputをassociateできるが、identity/recruitment/
distribution/profile/retained/external/reidentifying/cross-workflow mapを持たない。Raw valueはcontext/IPC/hash/log/output/
evidenceへ入れずnext workflow前にdestroyする。

Supervisorをsafe current-context coordinatorとし、open mirrorを`scoring-context`でmoderatorへ送る。Sourceはworkflowを
self-declareしない。Canonical payload serialization前にcurrent open workflow tagをassignし、eligible contextなし/pre-
readiness/context-freeならpermanent N/Aとする。Downstream ACK(s)→immutable observation accept/countの後だけfirst
matching prohibited observationでmirror correlationをatomic updateしてcomplete contextを再送し、moderator ACK後だけ
release/matching outcomeを許す。Accepted retained observationをmutate/backfill/retagせず、late/closed/cross-contextは
originally serialized workflowを保持する。

Context scheduleはexactとする。Pre-readiness buffered observationにはeligible contextがなくworkflow N/Aのままとする。
Buffer release/destroyとopen-binding両ACK後、Inspector body/readiness response/browser navigation/discovery taskをblockした
ままsupervisorがdiscovery mirrorをopenしてmoderator ACKを待つ。その後だけreadinessを返しgrant/navigation/taskを
開始する。各workflow outcomeがbrowser watchdogまでdownstream acceptされた後、contextをsubmitted→destroyedとし、
next fixed-order workflowのtask/timer/prompt開始前にnext contextをopen/ACKする。Post-ready/pre-context intervalを作らない。

Moderatorはpairごとにexact `StudyWorkflowOutcomeSubmission`をmoderator→supervisor `workflow-outcome`、次にsame exact
recordをsupervisor→browser adapter `workflow-outcome`で送る。Adapterだけがwatchdog向けcanonical workflow payloadを
作り、watchdog ACK後だけsubmissionをACKする。Submission exact root orderは`schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`,
`outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`, `reviewerOneClassification`,
`reviewerTwoClassification`。Versionはliteral `1`、workflowは`discovery | inspection | comparison | global-consent`、
outcomeは`success | failure`とする。Dispositionは`not-applicable | automatic-critical | reviewer-cleared |
reviewer-confirmed-critical | reviewer-disagreement-critical`、classificationは`not-applicable |
product-caused-blocker | not-product-caused-blocker`とする。
`inspectorProcessId`は`StudyOpaqueId | not-applicable`で、N/Aはexact terminalization-bound pre-readiness synthetic
branchだけに許可し、submission/review case/both voteでbyte-matchさせる。Normal input/post-readiness terminalizationは
current non-N/A IDを使う。Context correlationはeligible failure-link candidateであり
outcome overrideではない。Successはcontext candidateの有無にかかわらずautomatic ID/disposition/voteをN/Aにして
successを維持し、underlying prohibited nonworkflow observationはindependent automatic issue setへcountする。Failureで
context candidateがnon-N/Aならsame run/subject/process/workflowのalready accepted earliest prohibited observationへの
exact same link、`automatic-critical`、N/A votesを必須とし、reviewer branchへ逃げることをinvalidとする。Context candidate
がN/Aのfailureだけがautomatic ID N/A、reviewer disposition 3種の1件、exact 2 votesを使える。Missing/mismatch/later/
unrelated/reuseをrejectする。Open contextなしでacceptしたpre-readiness observationはworkflow N/Aのままbackfill/linkせず、
independent automatic issue setにはcountする。Issue IDは`automatic:<correlationId>`または
`reviewer:<subjectId>:<workflowClass>`だけをderiveする。

各subject attempt開始前に4 workflowそれぞれへdistinct human pairをout-of-band assignし、人を別caseへreuseしない。
Uniqueness auditに必要なminimum identity/slotは、separate governed access-controlled administrative roster/assignment recordへ
retainしてよい。そのrecordはrepository bundle、work root、candidate、study runtime、capture/evidence IPC、hash、log、output、
handoff、witness、sealの外に置き、published consent/privacy retention procedureに従ってdestroyする。Runtimeへ渡すのはliteral
reviewer slotだけで、bundle/runtime/evidenceはidentity/assignmentをretainしない。Fixed slot label/equipment surfaceは
drain/reset後だけreuseできるが、human identity、fresh case-local assignment instance、collector componentRunId/process
instance、caseはreuseしない。各pairは同じlive attempt/assigned workflowをrecording/internal IPCなしで独立観察し、workflow開始前terminal eventも観察する。Synthesized rowはsame directly observed live terminal
eventを分類し、recording/replayしない。Context candidateがliteral N/Aのfailureだけでmoderatorはexact runtime
`StudySafetyReviewCase` root
`schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `caseClass`（case literal
`nonautomatic-workflow-failure`）を作り、versionはliteral `1`、process IDは上記exact union/ruleとする。Fresh reviewer-one/two collector両ready後、moderatorは
registered attestation 2件を送りsupervisor ACKを待ってから、vote accept前にbyte-identical safe caseを送り、raw caseを
IPCへ入れない。Moderatorはreviewer-oneへfd8だけ、reviewer-twoへfd9だけをmapする。Collectorはinternal case accept+
own nonrecording surfaceのdisplay complete後だけslot inputをenableし、LF-terminated ASCII enum exact 1行
`product-caused-blocker | not-product-caused-blocker`だけを読む。CR/variant/second line/echo/history/recording/transcript/
log/raw IPCを禁止し、safe vote作成直後にraw inputをwipeしてinput disable/child view closeする。First voteはmoderator
dedicated memoryだけに保持し、second vote前にfd9/reviewer-two/他surfaceへ表示/routingしない。
`StudySafetyReviewVote` exact rootは`schemaVersion`, `studyRunId`, `subjectId`,
`inspectorProcessId`, `workflowClass`, `reviewerSlot`, `classification`。First voteをhiddenにしsecond後に両process/
channelをexit/destroyする。Versionはliteral `1`、process IDは上記exact union/rule、slotは`reviewer-one | reviewer-two`、classificationは
`product-caused-blocker | not-product-caused-blocker`とする。Moderatorは両collectorのclean exitをdirect OS child observationし、
matching exit attestationを送り、両supervisor ACK後だけoutcome submission/destroyを許可し、fd8/9をdrain/resetする。
EOF/malformed/extra/replay/cross-case/cross-descriptor/first-vote exposure/abort/crashはboth child view close+raw/hidden
state wipe+run invalidとする。Identity/note/raw/recording/third/replacement/replay/reuseを禁止する。

Exact truth tableは次とする。

| Outcome case | `automaticIssueCorrelationId` | `reviewDisposition` | Reviewer one/two | `effectClass` |
|---|---|---|---|---|
| Context candidate有無を問わない`success` | `not-applicable` | `not-applicable` | 両方`not-applicable` | `none` |
| Eligible context candidateがnon-N/Aのfailure | required exact linked correlation | `automatic-critical` | 両方N/A | `none` |
| Context candidate N/Aのfailure、両vote nonblocker | `not-applicable` | `reviewer-cleared` | その2 vote | `none` |
| Context candidate N/Aのfailure、両vote blocker | `not-applicable` | `reviewer-confirmed-critical` | その2 vote | `workflow-blocker` |
| Context candidate N/Aのfailure、disagreement | `not-applicable` | `reviewer-disagreement-critical` | ordered 2 vote | `workflow-blocker` |

Missing/duplicate/replay/reorder/wrong run/subject/process/workflow/slot/nonterminal/truth mismatch/raw/extra routeはfailする。
これをworkflow outcome 80件すべてのsole implementation pathとする。

### Safe request correlation

Inject可能なheaderはexact `X-Inspector-Study-Correlation`だけとする。Valueはlogical request eventごとの
fresh opaque IDで、capabilityではなくauthentication/routingへ影響できない。Participant candidateはsupervisor-
generated grant correlationをexactに使い、proxyはreplacementを生成しない。SPA/browser-only non-grant branchだけ
adapterがheader前にfresh correlationを生成する。Transient classification後にin-memory
`StudyBrowserRequestCandidate`をconstructし、eligible exact-issued requestでは同名incoming fieldをすべてremoveして
canonical field exact 1件をinjectする。Blocked requestにはforwarded headerを付けない。Candidateのcomplete root orderは`schemaVersion`, `studyRunId`,
`browserAttemptId`, `correlationId`, `actorClass`, `authorityClass`, `requestClass`, `targetClass`, `methodClass`,
`originClass`, `effectClass`, `sameInspectorHost`, `productAttributable`, `prohibited`とする。
Versionはliteral `1`、`studyRunId`はcurrent run、`browserAttemptId`はcurrent valid binding IDまたはmissing/
invalid marker時のliteral `not-applicable`、`correlationId`はparticipantではgrant ID、他branchではadapter fresh IDとする。全class/booleanは
下記closed classificationとし、candidateはsubject/process ID/raw valueを持たない。

Forward済みexact authorized `participant | bundled-spa` requestだけがserverへ到達する。Inspector-side probeは
application handling前にcorrelation header exact 1件を要求し、strict base64url decodeで32 byte、canonical re-
encodeがreceived 43-character textとexact equalであることを要求する。その後stripし、existing
`submit-product-event` commandのserver-claim payload variantでexact in-memory
`StudyServerCorrelationClaim`だけをconstruct/submitする。Complete root orderは`schemaVersion`, `studyRunId`,
`correlationId`, `subjectId`, `inspectorProcessId`,
`actorClass`, `authorityClass`, `requestClass`, `targetClass`, `methodClass`, `originClass`,
`effectClass`, `sameInspectorHost`, `productAttributable`, `prohibited`とし、browser-attempt ID/raw valueを含めない。
Command outer process IDはregistered probeを引き続きauthenticateするがclaim/evidence fieldではない。
Canonical `correlationId` stringはsole retained header-derived valueであり、canonical payload/stream/handoff/
witness/seal digestの対象になれる。Raw header name/case/order/framing/wire byte/encoded representation/whitespace/
duplicate layout、invalid/noncanonical spelling、alternate derived valueはIPC前にdiscardしhash/retainしない。Claimは
binding/registered subject/process IDをcopyし、actorはexact `participant | bundled-spa`とする。N/A claim ID、
extension/other-host/unknown claim branchはinvalidとする。Probeはunchanged controlled header 6件からprojectionを
独立deriveしcandidate tupleとのexact一致を要求する。Direct Inspector-origin
requestは従来のprobe-generated correlation pathを使い、browser-attempt bindingを使わない。

Logical request eventとはHTTP requestである。Session channelのdevframe frameはHTTP requestではなく
headerを持たない。Authorized upgrade 1件のjoined pairがreleaseされた後、そのconnectionのframeは
released connectionのopaque byteとしてproxyを通過し、per-frame candidate、header injection、
proxy側のparse/retentionは存在しない。そのconnection上でhostがdispatchする各RPC invocationは代わりに
Inspector-sideのregistered probeが観測し、probe-generated correlation pathでsafe server observation
1件をsubmitする。それらのobservationのclosed classificationは下記authorized-rpc rowが固定する。

Supervisorは`studyRunId + correlationId`だけをkeyにするcontent-free in-memory brokerを所有する。Validated candidateごとに
current binding/open-context scopeをsnapshotしてからevidenceを構築し、source/adapterによるworkflow supply/inferenceを許さない。
Canonical serialization前にcurrent open workflow tagをassignし、eligible contextがなければworkflow/linkをpermanent
N/A、readiness前ならprocessもN/Aとし、accepted payloadをbackfill/mutateしない。Matching product-attributable
nonworkflow prohibited candidateもcanonical observationがdownstream ACKされacceptされるまではprospective eligible correlationに
すぎない。Brokerがfresh evidence event IDとexact derived fieldを生成し、browser observationをrestricted
supervisor→browser-adapter `safe-payload`だけで送る。Adapterはvalidated candidate/bindingとの一致をvalidateし、unchanged payloadを
watchdogへ送ってwatchdog ACK後だけACKする。Retag/workflow variant生成/direct writeを禁止する。その後だけsupervisorが
observationをaccept/countする。Still-open matching contextのfirst eligible correlationなら、その後にmirrorをatomic updateし、complete
updated `scoring-context`を送り、moderator ACKを待つ。この順序後だけlater release decisionまたはmatching outcome submissionを
許可する。

Exact-issued forwarded candidateのlifecycleはtimer-freeかつobservable orderとする。Brokerはattempt/projectionをvalidateし、
participantではcanonical grantをarmedのまま`candidate-pending` storeし、SPAではadapter-generated correlationを要求してgrantを
consumeしない。Proxy forward前にone-use exact `candidate-forward`をsole authenticated acceptance/authorizationとしてcommitし、
participant canonical grantを同時に`armed -> consumed`とする。Adapterはdecision validate→own copy consume→forwardの順とする。
Predecision failureはpendingをwipeしてgrantをarmedのまま保つがauthenticated replay/raceはrun invalid+destroyとする。Inspector probeはclaim exact 1件をsubmitし、broker
acknowledgementを待ってからapplication handlingする。Brokerはcurrent open bindingをresolveし、actorをexact
`participant | bundled-spa`、claim subject/processをbinding/registered probeと一致させ、independent 6-header projection/class/
boolean全fieldを一致させ、participantではconsumed grant/correlation relationを再validateする。Entryをatomicに`joined`へ変更し、
fresh `eventId` 2件とbrowser/server canonical payloadを構築する。Browser memberはrestricted
supervisor→browser-adapter `safe-payload`、server memberはexisting supervisor→server-ledger-adapter `safe-payload`で送り、各adapterは
matching candidate/claimをvalidateしてexact payloadをwatchdogへ送り、そのACK後だけsupervisorへACKする。両downstream ACK後に
joined observation 2件をaccept/countし、applicableならeligible mirror updateとupdated-context moderator-ACK barrierを完了してから
`released`へ変更し、one-use exact `joined-pair-released`を送ってそのACKを待ち、その後だけclaim ACK/application handling/
response completionを許す。Complete join前write、released decision前response/content exposureを禁止する。両payloadはcorrelation、
subject/process、class、supervisor-selected workflow tag、N/A automatic/review field、booleanが一致し、event IDだけdistinctとする。

Wall-clock join deadline、timeout、timeout state、elapsed-time transitionは存在しない。`candidate-forward` commit後の
`candidate-pending`中のunmatched proxy
transaction end/abort/error/connection close、Inspector request abort、inherited-IPC close、product-probe close、attempt close、
`stop`、relevant child exitはentryをfailedにし、runをinvalidateし、pendingをwipeし、pair memberを0件releaseする。その後のclaimは
lateでfailする。Claim-before-candidate、matching `candidate-forward`前のforward、required downstream ACK前のaccept/count、required
updated-context ACK前のrelease、claim ACK前のapplication handling、released decision前のresponse exposureもfailする。Clock advance
だけではstateを変更しない。

Browser-only blocked candidateはvalidated/storedだがacceptedではなく`candidate-forward`を受けない。Server claimを許さず、exact order、unique correlation、actor decision、class/boolean/roleを
validateし、context ruleでbrowser payloadを構築してrestricted `safe-payload`を送る。Adapterはcandidateをvalidateしwatchdog ACK後
だけsupervisorへACKする。その後にsupervisorがobservationをaccept/countし、eligible mirror updateとmoderator-ACK barrierをapplicable
なら完了してからexact `browser-only-released`を送り、そのdecision ACK前にblocked responseをcompleteしない。
Participant-shaped nonexact/no-grant/replayed requestはbinding IDとcritical tupleを使う。Extension、missing-secret other-host、
invalid-secret unknownはN/A subject/processとunrelated/false tuple、blocked bundled-SPAはbinding IDとproduct/prohibited tuple、
valid-secret unknownはbinding IDとcritical tupleを使う。

各adapterはraw method/path/authority/marker/projection/correlation headerをmemory内だけでclassifyし、broker/evidence IPC前に
prohibited representationをdiscardする。Strict canonical correlation stringだけをsafe payloadの一部としてretain/hashできる。
Duplicate/replayed/stale authenticated candidate/grant IPC、second consume、mismatched decision、duplicate/replayed claim、
correlation reuse、wrong-run/binding、mismatched-projection/tuple、unexpected-role/order、skipped ACK、lifecycle-terminated、late-after-
close inputはrunをfailさせる。対照的に、armed grantなし、wrong target、page-script origin、またはconsume後のfresh HTTP requestは
fresh proxy correlationを使うunknown/prohibited blocked observationであり、grantをconsumeせずrunをinvalidateしない。Attempt
close/`stop`時のunmatched broker entryもfailさせる。Failureはincomplete pairのmemberを一切releaseせずpending entryをdestroyする。

Logical observationごとのrequired role setはclosedとする。

| Observation source | `authorityClass` | Exact evidence role |
|---|---|---|
| Exact authorized projected `participant \| bundled-spa` requestをexact-issued authorityへforward | `exact-issued` | `study-browser`, `inspector-server-ledger` |
| Browser requestをforward前にblock | any | `study-browser`だけ |
| `inspector` request | `exact-issued` | `product-instrumentation`, `inspector-server-ledger` |
| `inspector` request | その他authority | `product-instrumentation`だけ |
| operating-system request、effect、MCP、execution、mutation | any | `product-instrumentation`だけ |
| workflow result | `not-applicable` | `study-browser`だけ |

各required roleはrecord exact 1件を持ち、その他roleは0件とする。Correlated recordはsame classification、
`subjectId`、`inspectorProcessId`を持つ。Event IDはdistinctのままで、shared correlation IDはその他logical
eventに出現しない。Browser-only recordはordered actor tableが選ぶID/classificationをexactに使う。特にvalid-
secret unknownはbinding IDを持つcritical、extension/missing-or-invalid-secret unrelated caseはN/A IDとする。
Blocked recordまたはnon-`participant | bundled-spa` actorにserver claimを許さない。Missing、duplicate、malformed、
misrouted、inconsistent classificationはfailする。Matrixが要求しない限りproduct requestにbrowser recordを
要求しない。

## Envelope/chain

各fixed `capture/streams/<streamRole>.ndjson` fileはheader、footer、blank line、comment、alternate
recordを持たない。各sequenceについてLF-terminated compact JSON lineをexact 2件、すなわちexact
`envelopeBytes`、続いてそのenvelopeのexact `safePayloadBytes`の順に含む。次sequenceは直後の
envelope lineから始まる。`StudyCaptureEnvelope`のcomplete property set/exact orderは次のとおりとする。

`schemaVersion`, `streamRole`, `watchdogInstanceId`, `watchdogProcessRunId`,
`captureInstanceId`, `captureProcessRunId`, `sequence`, `recordKind`, `monotonicNs`,
`priorDigest`, `payloadSha256`。

- `schemaVersion`はliteral `1`、`streamRole`は当該streamのfixed roleとする。
- Opaque ID 4件はsole startからsole stopまでstableとする。Actual process startごとにnew instance/
  process-run IDを生成し、restarted processは以前のIDを継承できない。
- `sequence`はnonnegative safe integerで、`0`から始まりexact +1とする。
- `recordKind`は`capture-start | payload | heartbeat | handoff-anchor | capture-stop`とする。
- `monotonicNs`はwatchdogがsampleする、`0`以外はleading zeroなしのnonnegative base-10 integer
  stringで、全envelopeを通じてnondecreasingとする。
- `priorDigest`はsequence `0`でzero 64件、以後はLFを含むprior exact envelope byteのlowercase
  SHA-256とする。`payloadSha256`は対応するcanonical privacy-safe payload byteだけのlowercase
  SHA-256とする。

Sequence `0`をsole `capture-start`とする。Terminal `capture-stop`は正確に1件で、その後byteをappend
してはならない。Checkpoint/verificationはchainをclose/rewriteしない。`streamRootSha256`はexact
NDJSON file全体、すなわちsequence順の各pairについて`envelopeBytes`、続いて`safePayloadBytes`を
連結したnonempty byte列のSHA-256とする。Verifierはrootをtrustせず全line/pairも検証する。

## Closed privacy-safe payload

各payloadはliteral `schemaVersion: 1`を持ち、extra propertyを持たず、次のcomplete property orderを
使う。`eventCode`はrow記載のliteralとする。

| `recordKind` | `eventCode` | Canonical construction後のexact payload property |
|---|---|---|
| `capture-start` | `capture-start` | `schemaVersion`, `eventCode`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `captureProcessReady`, `watchdogReady` |
| `payload` | `observation` | `schemaVersion`, `eventCode`, `eventId`, `correlationId`, `subjectId`, `inspectorProcessId`, `observationClass`, `actorClass`, `authorityClass`, `requestClass`, `targetClass`, `methodClass`, `originClass`, `effectClass`, `workflowClass`, `outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`, `reviewerOneClassification`, `reviewerTwoClassification`, `sameInspectorHost`, `productAttributable`, `prohibited` |
| `heartbeat` | `heartbeat` | `schemaVersion`, `eventCode`, `studyRunId`, `watchdogHealthy`, `captureProcessHealthy`, `acceptedPayloadCount` |
| `handoff-anchor` | `handoff-anchor` | `schemaVersion`, `eventCode`, `studyRunId`, `checkpointRequestId`, `handoffSha256` |
| `capture-stop` | `capture-stop` | `schemaVersion`, `eventCode`, `studyRunId`, `candidateSha256`, `studyInputManifestSha256`, `checkpointRequestId`, `handoffSha256`, `continuityPassed`, `finalSequence`, `envelopeCount`, `payloadRecordCount`, `heartbeatRecordCount`, `handoffAnchorRecordCount`, `priorEnvelopeSha256` |

`capture-start`ではready field 2件をliteral `true`とし、session、run、identity commitment 2件、frozen
study digest 2件を全streamで同一にする。`heartbeat`ではhealth field 2件をliteral `true`、
`studyRunId`をstartと同一にし、`acceptedPayloadCount`をprior accepted observation record数と一致させる。

Observation IDは明示されたsupervisor/adapter/moderator/registered product probeというcontract-defined safe ownerだけが
生成する。Shared `correlationId`はsafe observationだけを相関する。
`start`でsupervisorがfresh unique subject token exact 20件をfixed runtime-only orderで生成/所有し、next tokenだけを
`attempt-binding`でharness/browser adapterへ渡す。Token-set/mapping/extra routeは存在せず、各tokenを1 participantの4 workflowを通じて使う。
`subjectId`はそのtoken 1件またはliteral `not-applicable`だけとする。これはsole authorized pseudonymous
participant evidenceであり、real identity、distribution slot、response、external recordをembed/mapしない。
Mappingをdistribute/retainしない。Sole runtime association exceptionはat-most-one call-local
`StudyCurrentSubjectScoringContext`であり、safe ID/workflow/stateだけを持ち、raw scoring valueを含めず、next
workflow前にdestroyする。

`inspectorProcessId`はsuccessful readinessを完了したparticipant Inspector process 1件のfresh opaque
supervisor-generated IDまたはliteral `not-applicable`とする。OS PID、path、digest、capture/watchdog ID、
distribution/subject/process-metadata derivative、prelaunch environment value、reused IDではない。Exact Inspector readiness前のfailureはterminal workflow
failure exact 4件、すなわちdiscovery/inspection/comparison/global-consent failureをすべて
review truth tableでindependentにclassifyし、failureだけから`workflow-blocker`をinferしない。4件すべてがsame subject token、`inspectorProcessId: not-applicable`を使い、
各exact 1件でextra/duplicateを許さない。Readiness後は当該processの全observationがexitまでreturned IDを使う。
Successful readiness registrationごとにdistinct IDを返す。

Classification valueは次のclosed setとする。

| Field | Closed value |
|---|---|
| `observationClass` | `request \| mcp \| execution \| inspected-source-mutation \| workflow` |
| `actorClass` | `inspector \| bundled-spa \| browser-extension \| other-host-process \| operating-system \| participant \| unknown` |
| `authorityClass` | `exact-issued \| other-loopback \| remote \| unclassifiable \| not-applicable` |
| `requestClass` | `authorized-static \| authorized-rpc \| prohibited \| unrelated \| os-mediated \| unclassifiable \| not-applicable` |
| `targetClass` | `static-manifested-asset \| static-spa-shell \| static-client-route-fallback \| connection-discovery-metadata \| rpc-channel-upgrade \| rpc-get-session \| rpc-get-file-detail \| rpc-get-mcp-carrier-detail \| rpc-get-hook-carrier-detail \| rpc-get-plugin-carrier-detail \| rpc-get-plugin-file-detail \| rpc-get-permission-policy-detail \| rpc-open-file \| rpc-rescan-repository \| rpc-get-global-consent-preview \| rpc-create-global-consent-preview \| rpc-enable-global \| rpc-rescan-global \| rpc-disable-global \| rpc-devframe-framework \| other-loopback \| remote \| mcp \| unclassifiable \| not-applicable` |
| `methodClass` | `get \| head \| post \| other \| unclassifiable \| not-applicable` |
| `originClass` | `exact-same-origin \| missing \| mismatched \| unclassifiable \| not-applicable` |
| `effectClass` | `none \| unauthorized-request \| command-or-code-execution \| child-process \| mcp-connection \| prohibited-outbound-request \| inspected-source-mutation \| cross-machine-content-exposure \| workflow-blocker` |
| `workflowClass` | `discovery \| inspection \| comparison \| global-consent \| not-applicable` |
| `outcomeClass` | `observed \| success \| failure \| not-applicable` |
| `automaticIssueCorrelationId` | `StudyOpaqueId \| not-applicable` |
| `reviewDisposition` | `not-applicable \| automatic-critical \| reviewer-cleared \| reviewer-confirmed-critical \| reviewer-disagreement-critical` |
| `reviewerOneClassification`, `reviewerTwoClassification` | `not-applicable \| product-caused-blocker \| not-product-caused-blocker` |

`sameInspectorHost`、`productAttributable`、`prohibited`はbooleanとする。Request observationはnon-
`not-applicable` request/target classification、`outcomeClass: observed`を使う。Canonical serialization前にsupervisorが
全nonworkflow observationへcurrent eligible open-context workflowをassignし、eligible contextなしならliteral
`not-applicable`とする。Serialized tagはimmutableでsource self-declareを禁止する。
Terminal workflow rowはexact `eventCode: observation`、`observationClass: workflow`、
`actorClass: participant`とし、`authorityClass`、`requestClass`、`targetClass`、`methodClass`、
`originClass`はすべて`not-applicable`、workflowはnon-N/A 4件のうち1件、
`outcomeClass: success | failure`とする。Pre-readiness failureでもstudy Inspector host contextにbindするため
`sameInspectorHost: true`、`productAttributable: true`、`prohibited: false`とする。Successは
`effectClass: none`とall automatic/review field N/A、failureは上記exact truth tableを使う。Reviewer confirmed/disagreement
criticalだけが`workflow-blocker`、automatic/clearedはeffect noneとする。Successful readiness
launchはreturned process ID、pre-readiness failureは`inspectorProcessId: not-applicable`を使い、answerを含めない。
その他workflow tupleはfail closedにする。全nonworkflow payloadはautomatic fieldとreview field 3件をliteral
`not-applicable`とし、workflowは上記coordinator exception以外N/A、MCPは`targetClass: mcp`とする。

Authorized static rowは`authorityClass: exact-issued`、`requestClass: authorized-static`、packaged-serving target class
4件のうち1件、`methodClass: get | head`、`originClass: not-applicable`、
`sameInspectorHost: true`、`productAttributable: true`、`prohibited: false`、actor
`participant | bundled-spa`、`effectClass: none`だけに閉じる。`static-manifested-asset`はmanifest-listed
non-HTML assetだけ、`static-spa-shell`はpackaged `/`/`index.html` shellだけ、
`static-client-route-fallback`はclosed client-route fallback 1件だけ、`connection-discovery-metadata`は
channel自身のpathを載せsession dataを一切持たないdevframe固定のconnection-discovery document
(`__connection.json`)だけとする。Authorized-rpc rowはtransport境界で分かれる。Channel establishmentは
browser path上のHTTP request 1件で、actor `bundled-spa`、exact-issued authority、
`requestClass: authorized-rpc`、`targetClass: rpc-channel-upgrade`、`methodClass: get`、
`originClass: exact-same-origin` — pinned browserはWebSocket upgradeで必ずpage originを名乗る —
same-host/attributable true、`effectClass: none`、prohibited falseに閉じる。Released upgraded
connection上でhostがdispatchする各RPC invocationは、registered probeからのserver observationで、
actor、authority、request class、effect、booleanは同じ、`methodClass: not-applicable`と
`originClass: not-applicable`とする。Frameは HTTP requestではなく、そのconnectionのmethodとoriginは
upgradeで分類済みだからである。`targetClass`はdispatchされた関数のrow exact 1件で、exact関数名は
probe memory内だけで分類する:

| RPC function(`http-api.ja.md` § RPC function一覧) | `targetClass` |
|---|---|
| `agent-customization-inspector:get-session` | `rpc-get-session` |
| `agent-customization-inspector:get-file-detail` | `rpc-get-file-detail` |
| `agent-customization-inspector:get-mcp-carrier-detail` | `rpc-get-mcp-carrier-detail` |
| `agent-customization-inspector:get-hook-carrier-detail` | `rpc-get-hook-carrier-detail` |
| `agent-customization-inspector:get-plugin-carrier-detail` | `rpc-get-plugin-carrier-detail` |
| `agent-customization-inspector:get-plugin-file-detail` | `rpc-get-plugin-file-detail` |
| `agent-customization-inspector:get-permission-policy-detail` | `rpc-get-permission-policy-detail` |
| `agent-customization-inspector:open-file` | `rpc-open-file` |
| `agent-customization-inspector:rescan-repository` | `rpc-rescan-repository` |
| `agent-customization-inspector:get-global-consent-preview` | `rpc-get-global-consent-preview` |
| `agent-customization-inspector:create-global-consent-preview` | `rpc-create-global-consent-preview` |
| `agent-customization-inspector:enable-global` | `rpc-enable-global` |
| `agent-customization-inspector:rescan-global` | `rpc-rescan-global` |
| `agent-customization-inspector:disable-global` | `rpc-disable-global` |
| devframe自身のframework-registered関数 — 全connectionが発行するtrust handshakeとtransport契約が列挙するbuilt-in | `rpc-devframe-framework` |

その他の関数名をdispatchするinvocationはどのrowにもmatchせず、`targetClass: unclassifiable`と
not-applicableなmethod/originを持つauthorized table外のexact-issued requestとなる。
その他cross-field combinationをauthorizeしない。Remaining product-attributable request/MCP effect tableは次の
exact 5行とする。全rowで`workflowClass`は上記coordinator exception以外`not-applicable`、`outcomeClass: observed`を
使い、automatic/review field 4件を`not-applicable`とする。

| Case | Exact classification/boolean |
|---|---|
| Authorized table外のexact-issued request | `observationClass: request`、observed product-attributable `participant \| bundled-spa \| inspector` actor、`authorityClass: exact-issued`、`requestClass: prohibited`、observed closed `targetClass`/`methodClass`/`originClass`、`effectClass: unauthorized-request`、`sameInspectorHost: true`、`productAttributable: true`、`prohibited: true` |
| Other-loopback request | `observationClass: request`、observed product-attributable `participant \| bundled-spa \| inspector` actor、`authorityClass: other-loopback`、`requestClass: prohibited`、`targetClass: other-loopback`、observed closed non-N/A `methodClass`、`originClass: not-applicable`、`effectClass: unauthorized-request`、`sameInspectorHost: true`、`productAttributable: true`、`prohibited: true` |
| Remote request | `observationClass: request`、observed product-attributable `participant \| bundled-spa \| inspector` actor、`authorityClass: remote`、`requestClass: prohibited`、`targetClass: remote`、observed closed non-N/A `methodClass`、`originClass: not-applicable`、`effectClass: prohibited-outbound-request`、`sameInspectorHost: false`、`productAttributable: true`、`prohibited: true` |
| Fully unclassifiable product-correlated request | `observationClass: request`、`actorClass: unknown`、`authorityClass: unclassifiable`、`requestClass: unclassifiable`、`targetClass: unclassifiable`、`methodClass: unclassifiable`、`originClass: unclassifiable`、`effectClass: unauthorized-request`、`sameInspectorHost: false`、`productAttributable: true`、`prohibited: true` |
| Product MCP observation | `observationClass: mcp`、`actorClass: inspector`、`authorityClass: not-applicable`、`requestClass: not-applicable`、`targetClass: mcp`、`methodClass: not-applicable`、`originClass: not-applicable`、`effectClass: mcp-connection`、`sameInspectorHost: false`、`productAttributable: true`、`prohibited: true` |

IDはapplicable binding/probe subject/process IDとする。Browser-attempt pathではordered initiator decision
tableをauthorityとする。Extension、missing-secret other-host、invalid-secret unknownは
unrelated、両ID N/A、effect none、attributable/prohibited falseとする。Participant-shaped
nonexact/no-grant/replayed/user-activated page-scriptとvalid-secret remainder unknownはbinding ID、
effect unauthorized-request、attributable/prohibited true、blocked bundled-SPAはbinding IDとapplicable product-
attributable prohibited tupleを使う。すべてoutcome observed/automatic/review N/Aで、workflowはcoordinator exception以外N/Aとする。Product correlationのないoperating-system mediationは
`observationClass: request`、`actorClass: operating-system`、`authorityClass: not-applicable`、
`requestClass: os-mediated`、`targetClass: not-applicable`、`methodClass: not-applicable`、
`originClass: not-applicable`、`effectClass: none`、`workflowClass: not-applicable`、`outcomeClass: observed`、
`sameInspectorHost: true`、`productAttributable: false`、`prohibited: false`、両ID `not-applicable`とする。
Unlisted field value/cross-field combinationはすべてfail closedにする。

`study-browser` streamをsole workflow-observation roleとする。Unique subject token 20件それぞれについて
4 workflowそれぞれのterminal `success | failure`をexact 1件、合計exact 80 workflow recordを持たせ、
missing/duplicate subject/workflow pairを禁止する。Earlier thresholdにかかわらず20 participant全員で
4 attemptすべてを実行する。Discovery success 19件以上/inspection success 18件以上はaggregate release
criterionだけとし、comparison/global-consentもterminal outcome 20件ずつを持つ。Exact 80-record shapeと全
protocol/privacy ruleがpassすればsuccess/failure比やthreshold missにかかわらずcanonical evidenceとする。
Threshold missはseal後にreleaseだけをblockし、evidence invalidation、automatic critical issue、fresh run要件に
しない。Arbitrary non-workflow safe observationは引き続き許可する。

Command scheduleはexactとする。`capture -- start`はrun-levelだけで、listener/proxy bind、8 long-lived process
launch、3 `capture-start` pair/first heartbeatだけを行い、attempt/profile/context/marker/secret/grant/bootstrapを
作らない。Start後にattemptをsequential実行する。Subject 1–19は各`discovery -> inspection -> comparison ->
global-consent`をterminalizeし、attemptを完全close/destroyしてからnext subjectをprepareする。Subject 20は
discovery後にcheckpoint/handoffを行い、そのattemptだけがcheckpointをopenのまま跨げる。Continuation後にremaining
3 workflowを行いcloseする。Early terminalization済みなら4 row/destroyはcomplete済みで、post-anchor ordinary
heartbeatがcontinuation progressを証明する。したがってcheckpoint時にSC-001用discovery 20件を持ちbinding最多1件を
維持する。各attemptのfresh context/secret/407-Basic-204 bootstrapはstream start後かつ自身の`npx`/first capturable
request直前だけに作り、stream live中でもbootstrap candidate/correlation/evidenceを0件とする。

Handoff-anchor payloadはexact handoff digest/request IDをbindし、各streamにexact 1件現れる。
`capture-stop`では`studyRunId`とstudy digest 2件をstart、`checkpointRequestId`/`handoffSha256`をsole
anchorと一致させ、`handoffAnchorRecordCount`をliteral `1`、`continuityPassed`をliteral `true`とする。`finalSequence`はstop
envelope sequenceと一致し、`envelopeCount`は`finalSequence + 1`および
`2 + payloadRecordCount + heartbeatRecordCount + handoffAnchorRecordCount`の両方と一致する。Kind countはobserved prior recordと
一致する。`priorEnvelopeSha256`はLFを含むpreceding exact envelope byteのlowercase SHA-256かつstop
envelopeの`priorDigest`と一致する。Independent verifierが全valueをrecomputeし、declaration自身をproof
として扱わない。

## Heartbeat boundary/handoff

Watchdogはdrift-freeなnominal 1,000,000,000 monotonic nanosecond cadenceをtargetとする。このtargetは
第2のacceptance thresholdではない。唯一のobserved maximum 1,500,000,000 nsを次の4 gapへ独立適用する。

1. capture-startからfirst heartbeat
2. consecutive heartbeat各pair
3. latest heartbeatからcheckpoint/handoff
4. last heartbeatからcapture-stop

Exact 1,500,000,000 nsはpass、1,500,000,001 nsはfailとする。Intervening observation payloadは
heartbeat gapをreset/concealしない。Inspector launch前にfirst heartbeatをpassさせる。

### StudyCaptureHandoff

Exact `capture -- checkpoint`ではsupervisorがfresh `checkpointRequestId` 1件の下で各adapter経由のexact `checkpoint`
stream controlを送る。各adapterはrequestをbyte-identicalにrelayし、各watchdogはそのrequestより前にあるcurrent pairを
completeし、結果となるcomplete prefix position/checkpoint monotonic valueを記録してexact immutable checkpoint resultを返し、
stop、seal、later recordのholdを行わずnormal append/nominal heartbeatを直ちに継続する。Adapterはresultをbyte-identicalに
relayし、supervisorはmatching result 3件すべての後だけcheckpointをacceptする。Controllerはhandoff/sidecarを書かない。
Exact `verify -- checkpoint`は各ledgerがgrowを継続する間にbundle、candidate digest、そのimmutable prefixを独立recomputeし、
`capture/study-capture-handoff.json`と`capture/study-capture-handoff.sha256`を作るsole creatorとする。その後exact handoff
digest/checkpoint IDをruntime control `anchor-handoff`で送り、supervisorがmatching exact stream controlをadapter経由で送る。
各watchdogはheartbeat queueをpauseせず`handoff-anchor` pair exact 1件をappendし、そのexact anchor resultをbyte-identical relayで
返す。Verifierはresult/anchor 3件すべてを独立にobserve/validateした後だけsuccessを返す。Snapshot/anchor処理とslow verifierに
よって同じ1.5-second ceilingを超えるheartbeat gapを生じさせてはならない。

`StudyCaptureHandoff`はfresh canonical objectであり、complete root property orderを
`schemaVersion`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`,
`candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`,
`checkpointRequestId`, `streams`とする。Versionはliteral `1`、session/checkpoint request/study run IDと
commitment 2件はsupervisor/start valueと一致させ、digest 2件は独立rehashしたfrozen inputと一致させ、
`streams`はfixed stream-role orderのexact 3 entryとする。

各handoff stream entryのcomplete property orderは次のとおりとする。

`streamRole`, `watchdogInstanceId`, `watchdogProcessRunId`, `captureInstanceId`,
`captureProcessRunId`, `checkpointSequence`, `checkpointMonotonicNs`, `envelopeCount`,
`payloadRecordCount`, `heartbeatRecordCount`, `lastEnvelopeSha256`,
`latestHeartbeatSequence`, `latestHeartbeatMonotonicNs`, `latestHeartbeatEnvelopeSha256`,
`running`, `sealed`。

- RoleとID 4件は当該fixed streamの全retained envelopeと一致する。Checkpoint以前に
  `capture-stop`が存在してはならない。
- `checkpointSequence`はatomic prefix snapshot内のlast complete retained pairをselectするnonnegative
  safe integerとする。`checkpointMonotonicNs`はenvelope `monotonicNs`と同じdecimal grammarを使い、
  watchdogがsnapshotとともにsampleし、そのpairの`monotonicNs`以後、かつstream clockをregressしない値とする。
- `envelopeCount`は`checkpointSequence + 1`、snapshot内のactual retained pair count、
  `1 + payloadRecordCount + heartbeatRecordCount`のすべてと一致させる。Kind countはobserved recordと
  一致させ、`heartbeatRecordCount`をpositiveとする。
- `lastEnvelopeSha256`はLFを含む`checkpointSequence`のexact envelopeを対象とする。
  `latestHeartbeatSequence`はsnapshot内のactual latest heartbeatをselectするnonnegative safe integerで、
  `checkpointSequence`以下とする。`latestHeartbeatMonotonicNs`は同じdecimal grammarを使い、そのenvelope
  valueと一致させ、`latestHeartbeatEnvelopeSha256`はLFを含むそのexact
  byteのdigestとする。そのmonotonic valueから`checkpointMonotonicNs`までの差を、intervening payloadに
  かかわらず1,500,000,000 ns以下とする。
- `running`はliteral `true`、`sealed`はliteral `false`とする。

Handoff byteは上記pretty canonical serializationを使う。Companionはそのexact byteのlowercase
SHA-256とLF 1件だけを含む。Verifierは各fileを1回だけwriteし、missing、partial、rewritten、
noncanonical、mismatched、extra、pre-existing handoff artifactはrunをinvalidにする。Handoff完成時点で
later pairがすでに存在してよい。それらはimmutable checkpoint prefix外であり、そのcount/rootに含めない。
Continuationは`checkpointSequence`直後のfirst pairでsame role/ID、exact
`checkpointSequence + 1`、envelope `priorDigest`としての`lastEnvelopeSha256`をverifyし、checkpoint後/
stop前にrequest ID/digest一致のhandoff anchor exact 1件と、そのanchor後のordinary heartbeat/payload pair
1件以上を同じuninterrupted chainで要求する。Already-queued post-prefix pairがanchorより前に存在してよい。
Alternate valid prefixとrecomputed handoff/companionは、後続chain内のanchor digestと一致できないためfailする。
SC-001 resultにかかわらずSC-006 continuationを必須とする。

## Cross-stream final seal

Stop後はsupervisorだけを残す。Independent verifierはcurrent full bindingと全retained input、handoff、stream、
stop、child-exit factを再validationする。Exact `finalize-prepare`はsupervisorがcurrent bindingを独立比較し、
same continuity-key-held commitmentをconfirmし、endpointをliveに保ったままcomplete witness materialをprepareした
後、literal `null`だけを返す。Continuity keyはsupervisor memory外へ一切出さない。

Verifierはseparately authenticated `finalize-commit` connectionをopenし、same runtime binding/checkpoint ID/
handoff digestを送る。そのrequest accept後、supervisorはlistener teardownを開始し、already-open connection上の
authenticated response payloadとしてexact `StudyContinuityWitness`を返す。Responseをconstruct/queueし、全
authority/key materialをdestroyし、complete response後にclose/exitする。Verifierはreturned witnessを自身の
independent checkと照合し、complete authenticated response後のEOFと、新しいlocal connectionがendpoint
absent/unavailableでfailすることを要求する。これをportable finalize confirmation semanticsとする。
Real-process integration testはさらにsupervisor direct child handleをownし、endpointからinferするだけでなく
actual process exitを証明する。

そのconfirmation後だけ、verifierはexact returned canonical valueをreserializeし、
`capture/study-continuity-witness.json`と`.sha256` companionを作れる。
Fresh canonical witnessのcomplete root orderは次とする。

`schemaVersion`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`,
`candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`,
`checkpointRequestId`, `handoffSha256`, `processes`, `orchestrators`,
`ephemeralReviewerProcessExitCount`, `runtimeControlRemoved`。

Versionはliteral `1`、identifier/commitment/digestは全earlier bindingと一致し、`runtimeControlRemoved`は
literal `true`とする。`processes`はfixed stream orderでexact 6 fresh objectを持ち、各stream内は`watchdog`
の次に`capture`とする。各objectのexact orderは`streamRole`, `processRole`, `instanceId`, `processRunId`,
`stopEnvelopeSha256`, `exitCode`, `signal`とする。`processRole`はそれぞれliteral `watchdog`/`capture`、
`instanceId`/`processRunId`はそのroleのchain IDと一致し、`exitCode`はliteral `0`、`signal`はliteral
`null`とする。同じstreamのwatchdog/capture entryはそのstreamのexact stop-envelope digestをrepeatする。Capture/adapterの
各exit factはsupervisorによるdirect OS child observationを根拠とし、watchdogの各exit factはmatching adapterによるparent-OS
observationから作られたaccepted/ACKed/identity-matched clean-exit attestationを根拠とする。Witness companionはexact pretty
canonical witness byteのlowercase SHA-256とLF 1件だけを含む。

`orchestrators`は`study-harness`, `scoring-moderator`の順のexact 2 exit entryとする。各exact root orderは
`processRole`, `componentRunId`, `exitCode`, `signal`、role/IDはstart responseと一致し、exitはliteral `0`/`null`とし、両factは
supervisorのdirect OS child observationを根拠とする。`ephemeralReviewerProcessExitCount`はnonnegative safe integerで
`reviewVoteCount`とexact equalとする。Count対象の各reviewer processはdistinct registered identityとmatching clean-exit
attestationを持ち、そのattestationはmoderatorのdirect parent-OS observationから作られ、outcome submission前にsupervisorが
ACKする。Live/uncounted/replaced collectorを残さない。Direct adapter exit 3件、authenticated watchdog exit 3件、direct
orchestrator exit 2件をstop前に必要なexact 8 long-lived clean exit factとし、supervisorがgrandchildをOS observationしたとは
主張しない。

次にverifierはexact `capture/study-capture-seal.json`と`capture/study-capture-seal.sha256`を
`StudyCaptureSeal`として作る。Fresh rootのexact orderは`schemaVersion`, `controlSessionId`, `studyRunId`,
`workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`,
`studyInputManifestSha256`, `handoffSha256`, `continuityWitnessSha256`,
`automaticCriticalIssueCount`, `suspectedWorkflowBlockerCount`, `reviewVoteCount`,
`reviewDisagreementCount`, `reviewerCriticalIssueCount`, `criticalIssueCount`,
`zeroCriticalIssueGate`, `streams`とする。Versionはliteral
`1`、全valueはwitness、start/stop、handoff、独立recomputeしたcandidate/manifest byteと一致させる。
`streams`はfixed role orderのexact 3 entryとする。

Aggregate 7 fieldはverifier-derived exact valueとする。Nonworkflow `prohibited: true`のdistinct correlation
ごとにtagged automatic issue ID `automatic:<correlationId>`を作る。Workflow-N/A pre-readiness observationとsuccess
workflowのcandidate observationも含み、link使用/不使用でsuppress/duplicateしない。Dispositionが`reviewer-confirmed-critical |
reviewer-disagreement-critical`のworkflow rowごとにtagged reviewer issue ID
`reviewer:<subjectId>:<workflowClass>`を作る。Prefixで2 classをdisjointにし、各class内もIDでdedupeする。
Automatic/reviewer set cardinalityを`A`/`R`、dispositionが`reviewer-cleared |
reviewer-confirmed-critical | reviewer-disagreement-critical`のworkflow row countを`S`、disagreement countを`D`とする。
`automaticCriticalIssueCount=A`、`suspectedWorkflowBlockerCount=S`、`reviewVoteCount=2*S`、
`reviewDisagreementCount=D`、`reviewerCriticalIssueCount=R`、`criticalIssueCount`はtagged/deduplicated unionの
cardinality（class disjointのため`A+R`）とする。`automatic-critical` workflow rowはreviewer issue IDを作らず、
separate automatic correlationだけをcountし、workflow linkは上記accepted-observation ruleとexact一致させる。
Threshold failure、`reviewer-cleared`はcriticalを
加算しない。`zeroCriticalIssueGate`は`criticalIssueCount===0`かつexact 20×4 terminal workflow set completeの場合
だけliteral `true`とする（seal自体も同setをrequireする）。Protocol/review shape errorはsealをpreventする。

各`StudyCaptureStreamSeal`のexact orderは`streamRole`, `watchdogInstanceId`,
`watchdogProcessRunId`, `captureInstanceId`, `captureProcessRunId`, `envelopeCount`,
`payloadRecordCount`, `heartbeatRecordCount`, `handoffAnchorRecordCount`, `firstEnvelopeSha256`,
`lastEnvelopeSha256`, `streamRootSha256`とする。IDは当該streamの全envelope、countはstop/observed
recordと一致させ、`handoffAnchorRecordCount`はliteral `1`とする。First/last digestはLFを含むexact
start/stop envelope byteを対象とし、rootは上記ordered-pair preimageを使う。
`continuityWitnessSha256`はwitness companion valueと一致させる。Seal companionはexact pretty canonical
seal byteのlowercase SHA-256とLF 1件だけを含む。Alternate witness/seal filename、copy、retention sidecarを
禁止する。

Structurally independent verifierはbundle/distribution 20件を再enumerateし、candidate、manifest、
descriptor、script binding、output、payload、envelope、chain、heartbeat、count、anchor、stop、stream root、
witness、seal、companionのbyte/digestとsealed ledgerからaggregate 7 fieldをindependent recomputeし、clean process termination、commitment continuity、
supervisor removal、exact final work-root layoutを検証する。Builder/capture serializer、supervisor declaration、
handoff/stop declaration、recorded count、generated root、existing witness/sealをtrustしない。Partial、
restarted、replaced、truncated、concatenated、stitched streamをrepair/sealしてはならない。

## Exact command/lifecycle

`package.json`は正確に次を定義する。

```json
{
  "study:evidence:inputs": "node scripts/build-usability-study-inputs.mjs",
  "study:evidence:capture": "node scripts/run-usability-study-capture.mjs",
  "study:evidence:verify": "node scripts/verify-usability-study-evidence.mjs"
}
```

Protocol orderで許可するcommand formは次だけとする。

```text
pnpm run study:evidence:inputs -- materialize
pnpm run study:evidence:verify -- inputs
pnpm run study:evidence:capture -- start
pnpm run study:evidence:capture -- checkpoint
pnpm run study:evidence:verify -- checkpoint
pnpm run study:evidence:verify -- continuation
pnpm run study:evidence:capture -- stop
pnpm run study:evidence:verify -- finalize
```

Inputs executableはcanonical `materialize`だけ、capture executableのexternal operational subcommandはcanonical
`start`,`checkpoint`,`stop`だけ、verifier executableは`inputs`,`checkpoint`,`continuation`,`finalize`だけをacceptする。
Internal modeはcurrent-parent-sponsored inherited channelだけで利用でき、command aliasではない。Wrong entrypoint/
spelling/phase/extra argumentをphase work前にfailする。

Unknown/missing/repeated/extra subcommand/argumentはfailする。Installed、downloaded、PATH-selected、
network-fetched implementationへfallbackしてはならない。Exit `0`はrequested phaseと全prerequisite checkが
passした場合だけとし、skipped、partial、inconclusive、unverifiable、invalid、already-stopped、already-sealed
stateはnonzeroを返す。

`materialize`はempty root変更前にsupervisorをverify/launchし、ready/runtime-bootstrap/ACK barrierを完了し、そのACK後だけ
closed distribution/directoryをmaterializeする。その後authenticated lifecycle closeでmaterializer edgeをdetachし、external
supervisorをliveのまま残す。`inputs`はread-onlyで`verify-inputs`を使い、candidate/proxy environmentをreadしない。`start`は
unchanged root/control bindingに加えてcandidate/proxy bindingを要求し、secureなempty stream file 3件とappend-only handle 3件を
作り、orchestrator 2件+stream process 6件をlaunchする。Registration 6件をacceptし、browser proxy bindingをtransfer/ACKして
deny-by-default proxyをbindした後、exact start control/resultでcapture-start/first-heartbeat prefix 3件を作る。Attempt/browser
profile/context/marker/grant/bootstrapを作らず、8 long-lived internal descendant、start 3件、first heartbeat 3件がliveになるまでreturnしない。
その後だけsequential scheduleが各`npx`直前にattempt equipmentを作る。Capture
`checkpoint`はatomic in-memory prefix snapshotだけを記録し、later appendをholdせず
全processをliveに保つ。Verify `checkpoint`は`read-checkpoint`を使い、exact handoff pairだけを作り、その
digestを全streamへanchorしてanchorをverifyする。`continuation`はその他read-onlyでcandidateをrehashし、
`verify-continuation`を使う。`stop`はterminal workflow record 80件、全required observation、全registered
probe close、live reviewer 0件、全attempt/grant/marker state destroy後に1回だけacceptし、proxyをcloseする。Exact stop
control/resultでterminal pair 3件をappendし、writer handleをcloseし、watchdog exit attestation 3件をacceptし、adapter 3件と
orchestrator 2件のexitをdirect OS observationして、external supervisorだけをliveに残す。Witness/sealは書かない。
`finalize`はproxy environmentをreadせずcandidate/inputをrehashし、
`finalize-prepare`/`finalize-commit`を行い、supervisor/endpoint removalをconfirmし、full protocol/
canonical/final-layout verification後にexact witness pair、次にseal pairだけを作る。Canonical threshold-miss runでも`finalize`は
exit `0`でsealし、separate aggregate release decisionだけをnon-approvingとする。

## Failure class/required test

Fixed failure classは`input-closure`, `fixture-distribution`, `work-root-authority`,
`candidate-binding`, `script-closure`, `runtime-control-authentication`, `proxy-enforcement`,
`product-probe`, `privacy-schema`, `correlation-integrity`, `workflow-coverage`,
`process-continuity`, `canonical-chain`, `heartbeat-continuity`, `handoff-integrity`,
`handoff-continuation`, `continuity-witness`, `terminal-seal`, `command-lifecycle`とする。各failureはopaque
ID/countだけのfixed code、nonzero exit、prohibited value 0件を返す。全classがrelease evidenceをblockし、
capture failureはautomatic critical issueとして、全new IDを持つwholly fresh study runを要求する。

`workflow-coverage`はtwenty-by-four matrixのmissing、duplicate、extra、nonterminal、mismatched memberだけを
意味し、release-threshold missを含まない。Discovery/inspection threshold missはreleaseだけをblockするvalid
sealed aggregate resultであり、その他protocol/privacy failure classは上記fail-closed critical handlingを維持する。

`tests/contract/usability-study-evidence.test.ts`はmanifest/root/member/role/order/canonicalization/digestの
全deviation、descriptor locale/script binding/base64/encoding/output-set/bilingual mismatch、unknown/extra/
reordered envelope/payload field、invalid enum/ID/count/digest、forbidden raw value、noncanonical seal、
companion mismatchをrejectしなければならない。
さらにphase固有の全environment-variable grammarをvalueのretainなしでenforceし、phase固有のexact
work-root layout、NDJSON line alternation、regular-fileだけの`nlink === 1`とordinary non-1 directory
link countのacceptance、complete exact `StudyCaptureHandoff` root/stream order、literal、equation、heartbeat
binding、canonical byte、filename、companion、anchor payload、witness、seal、candidate rehash/identity-
commitment要件、sole authorized handoff/witness/seal writer/filenameをenforceしなければならない。全runtime-
control root/payload property order、command、phase、canonical HMAC preimage、direction domain、one-use
challenge、constant-time tag validation、null rule、error code、connection framingをenforceする。
Inherited IPCのexact two-unidirectional-pipe/96-byte prefix、closed role/edge/type matrix、frame root/order/
canonical byte、direction key derivation、sequence/replay、constant-time tag、ready/close/wipe、key nonreuseもenforceする。
Exact `StudySupervisorRuntimeBootstrap`、`StudyBrowserProxyRuntimeBinding`、`StudyProcessLifecycleAttestation`、
`StudyStreamControl`、`StudyStreamControlResult`のroot/order/direction/source role/one-use state barrier、restricted reverse ACK、
parent-OS provenance、immutable binding repetition、semantic result routing、およびwrong/missing/extra/duplicate/replay/reorder/source/
identity/exit/authority全branchをvalidateする。Runtime-bootstrap ACK前のmaterializer mutationを禁止し、materializer detach時に
supervisorがexitしないこと、exact frame/ACKだけでbrowser proxyをbindすること、environment/argvでauthorityをtransferしないことを
要求する。
Browser-edge `safe-payload` restrictionをenforceし、workflow/product/server/candidate-bypass variantとadapterのworkflow
tag inference/replacementをrejectする。Exact context schedule/readiness gate、すなわちpre-ready N/A→buffer ACK/destroy→
open-binding両ACK→discovery-context ACK→readiness response→grant/navigation/task、later contextはprior browser-watchdog
accept/destroy後だけopen、をcheckする。
Authenticated IPC message 1件につきclosed canonical safe payload exactly 1件をenforceし、同一primary-
workflow/study observation内でdistinctなmessageとして複数payloadを扱い、acceptされた全messageがcount/
chainされることを要求する。Target/method matrix、prohibited/effect exact 5行と全rejected cross-field tuple、全invalid
workflow tuple、actor false-attribution row、correlation role matrix、broker candidate/claim両property order、attempt-
binding state transition/single-active-attempt invariant、subject token 20件、launch-ID lifecycle、exact workflow
terminal 80件もexhaustiveにcheckする。Review field 3件/truth table、context candidate N/Aの各failureのisolated
one-use vote 2件、runtime/evidence内のthird/raw/identity/note禁止、runtime ingressのないseparate governed administrative
uniqueness record、at-most-one scoring context lifecycle、seal aggregate 7 field equationをvalidateする。
Context-candidate/outcome全branch、すなわちsuccessはsubmission field N/Aを維持しcandidate observationをindependent
automatic setへcount、candidate non-N/A failureはexact automatic link必須かつreview禁止、candidate N/A failureはreview
必須、pre-readiness no-context observationはworkflow N/A/unlinkedのままautomatic setへcount、をcoverする。
Threshold-pass/threshold-miss比の両方がcanonicalize/sealされ、aggregate release decisionだけが異なることを
別に証明する。
`product-instrumentation`へのclaim payload、safe-observation/claim variant swap、wrong outer registered process ID、
nonpending correlation、wrong claim-ID actor branchをrejectする。
全`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewVote`、`StudyCurrentSubjectScoringContext`、
`StudyBrowserProxyMarkerBinding`のfield/order/enum/ID/bootstrap/pair-count/state deviationと、それらをsupervisor
control commandとして扱う試みをrejectする。
Exact pre-readiness registration/buffering/register-product command root、proof root、buffer/draft root/order、one-way state、
ID freshness/non-disclosure、sole product destination、ACK-before-effect/release/destroy/open/terminalization orderをvalidateする。
Product-attributable N/A-process payloadはreadiness前のordered same-run/same-subject `terminalization-bound` releaseかつ
workflow N/Aだけをacceptし、全`readiness-bound` releaseにassigned non-N/A process IDを要求し、その他またはreadiness後の
product-attributable N/A payloadをすべてrejectする。

`tests/integration/usability-study-evidence.test.ts`はreal child process/authenticated IPCを使い、materialize、
inputs、start、checkpoint、continuation、stop、finalizeを実行しなければならない。Fresh byte-identical
distribution 20件とexact derived tree、watchdog-only concurrent serialization、independent recomputation、
simulated SC-001 failure後のmandatory continuation、heartbeat gap 4件、fake-clockのexact
1,500,000,000-pass/1,500,000,001-fail boundaryを証明する。Existing empty local work rootとexternal
candidateを作り、retained treeの全exact phase transition、sequenceごとのNDJSON line 2件、heartbeatを
継続させたままdeliberately slow verifier中にatomic prefix snapshotを取ること、verifierだけによるhandoff
作成、同一primary-workflow/study observation内でdistinctなauthenticated IPC messageとして複数payloadを
submitし、acceptされた各messageがcount/chainされること、全verifier phaseでのcandidate rehash、
finalize後runtime-control endpoint/unlisted artifact 0件を証明しなければならない。Handoffはverifierだけが
作り、anchor 3件すべてをappend/observeし、recomputed handoffを持つalternate valid prefixをrejectする。
Real Unix socket/Windows named pipe、actual HMAC framing/replayとexact inherited binary prefix/frame protocol、descriptor
slot 3/4/5とpass-only append authority、real registration/exit attestationとrestricted reverse ACK、byte-identical stream
control/result relay、pre-ready buffering、ACK-preserving abrupt exit、readiness-bound/terminalization-bound両release、non-target
discardを含むactual `npx`/self-import/readiness path、exact headed Playwright 1.61.1
Chromium revision `1228`、browser version `149.0.7827.55`、Chrome for Testing profile、distinct
`study:<browserProxyMarkerSecret>` Basic markerを使う。Run-level stream start後、各sequential candidate `npx`/first capturable
request直前にbodyless 407 exact 1件（headerは`Proxy-Authenticate`、次に`Connection: close`のexact 2件）、canonical retry
1件、sole header `Connection: close`のbodyless 204 exact 1件、authorization前DNS/connect/application/evidence 0件を証明する。
Actual browser exitとhealthy-adapter external-equipment-failureというdistinct terminal branch、およびinternal malformed
407/204/output、proxy、marker/authentication、IPC、implementation、adapter/watchdog faultの各run invalidation/no-synthesisを
証明する。Marker ACKはmarker copyだけをactiveにし、attemptはreadiness/open dual ACKまでpreparedのままであることを証明する。
Adapterによるdescriptor 5のread/write/seek/duplication、readable/wrong/swapped/extra/missing handle authority、stable identity drift、
non-adapter fd5、stream path/cwd/environment/argv leakをrejectする。Start resultはfirst heartbeat後だけ、checkpoint resultは
immutable、anchor resultはexact、stop resultはhandle close/clean-exit attestation前であることをverifyする。Run全体でstrict
decode/strip、blocked target
のDNS/connect 0件、proxy/server projection independent exact一致、全broker surfaceを証明する。Markerがactor/
product/application/control/forward authorizationをgrantしないこと、sole authenticated `candidate-forward` acceptance前に
forwardしないこと、fresh no-grant/nonexact/page-script/post-consumption HTTP requestはblocked observationになり、authenticated
candidate/grant IPC replayまたはsimultaneous consumeはinvalidateすることを証明する。Blocked browser `safe-payload`のcandidate
validationとwatchdog/downstream ACKはobservation accept/count、mirror/context ACK、`browser-only-released`、completionより前、joined
browser/server `safe-payload` downstream ACKはobservation accept/countとmirror/context ACKより前、それらは
`joined-pair-released` decision ACKより前、そのACKはclaim ACK/application handling/response completionより前であることを証明する。
Buffer/open-binding/context/readiness full gateに
post-ready/pre-context eventがないことも証明する。Fake clock advance
だけではjoinを終えず、enumerated lifecycle raceはpartial pairなしでfailする。Close/abort/crash/finalize後にbinding、
pending join、marker config、browser context/process/profile/history/cache/credential-store、raw marker、encoded Basic、
`browserAttemptId` persistenceが0件であることを証明する。20-by-4 workflow attemptとpass/fail両方のaggregate-
threshold outcome（pre-readiness failureのreview truthに従うN/A-process outcome exact 4件を含む）、supervisor-direct adapter
exit 3件、accepted adapter-OS watchdog exit attestation 3件、supervisor-direct orchestrator exit 2件、moderator-OS-attested
one-use reviewer-collector exit countとreview-vote countのexact一致、continuity-key
non-disclosure/supervisor-held commitment continuity、authenticated final EOF、endpoint removal、directly
observed actual supervisor process exitを証明する。

`tests/security/usability-study-evidence.test.ts`はsentinel header/body/content/path/capability/authority/URL/
error/participant responseをinjectし、sentinel、encoding、digest、sidecarがcapture-evidence IPC/retained artifactへ一切到達
しないことを証明しなければならない。さらに各processのkill/pause/restart/replacement、heartbeat/payload
write race、ID/clock change、missing/duplicate/reordered record、chain/payload/count/digest corruption、
stop後truncate/append、candidate/manifest/distribution/script byte変更、extra/symlink/junction/non-regular/
hard-link/alias/escape/drift、premature stop、cross-stream stitchingを試行する。さらにmissing/relative/
nonempty/explicit-UNC/server-share/device/network-spelled/replaced work root、changed
work-root environment/identity、work/distribution tree内candidate、candidate link/type/identity/byte drift、
missing/changed candidate environment、extra retained/control artifact、stream filename/line-pair deviation、
全handoff field/count/digest/order/literal corruption、handoff rewrite/precreation、exact handoff boundary以外からの
continuationを扱う。全script/helper/child/module loadをtamperし、internal mode/nonceをdirect invoke/replayし、
check/exec間でverified byteをmutateする。Raw/wrong-direction control token/tag、replayed challenge、extra
command、wrong payload order、TCP/UDP/network/remote-pipe endpoint、authorizing proxy-credential scheme/control-token
reuse、missing/malformed/noncanonical/duplicate/stale/mismatched/replayed marker secret、duplicate/replayed/
mismatched/unexpected-role/lifecycle-terminated/unmatched/late broker candidate/claim、valid-secret initiator projection
spoof、forbidden extension/other-host/unknown claim、claim destination/outer-ID spoof、remote CONNECT/DNS attempt、
malformed/duplicate correlation header、probe handshake/import/environment failure、
duplicate/missing workflow terminal、current-run subject/process ID reuse、全workflow/reviewer cross-field mutation、witness/
commitment/process-exit/removal corruptionをinjectする。さらにmutation前のwrong/missing/replayed runtime bootstrap、inherited
authority/env/argv leakage、wrong/present/aliased endpoint bootstrap、pre-ACK root mutation、materializer detach failure、wrong/missing/
replayed browser-proxy binding、pre-ACK proxy/stream action、forged/wrong-source process registration/exit、別messageへのattestation
ACK reuse、nonclean-child laundering、mutated stream control/result、adapter-synthesized result、readable/swapped/extra/missing/wrong-
slot descriptor-5 authorityを試行する。Rejected caseごとにrequired handle/stateがcloseされ、evidenceまたはsynthesized participant
outcomeを作れないことを証明する。Raw response、ground-truth、rubric、DOM、screenshot、
moderator/scoring valueのworkflow IPC注入と、workflow payloadのproduct command/他stream routingも試行する。
Sentinel work-root/candidate/endpoint/proxy authority/token、raw/encoded marker、raw correlation-header representation、response/
timing/ground truth/rubric byteがretained byte、contract-defined exact runtime-bootstrap、browser-proxy-binding、runtime-control、
marker-install、frame-authentication transient HMAC exception以外のhash、process outputに存在しないことを要求する。Reviewer
identity/noteはrepository bundle、work root、candidate、study runtime、capture/evidence、hash、log、output、handoff、witness、sealへ
存在してはならない。Separate governed administrative rosterには既に許可したminimum identity/slot fieldだけを置き、そのretention
procedureに従ってdestroyする。Digest inputをinstrumentしてcanonical 43-character correlation string
だけがevidence digest chainへ入りwire/header representationは入らないことを証明する。Normal close/abort/crash後の
isolated `HOME`/XDG/profile/history/cache/keychain/credential-store/environment/argv/application request/outputを
inspectし、secret/encoded Basic/`browserAttemptId` persistence 0件を証明する。全caseをraw disclosure/partial joined
evidenceなしでfail closedにする。
