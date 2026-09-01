# SC-001 / SC-006 評価キット

[English](sc001-sc006-study-kit.md)

1回の評価runをどう実施するか。測定対象の基準は
[`spec.ja.md`](../../specs/001-inspect-agent-customizations/spec.ja.md)の`SC-001`と`SC-006`であり、
runが記録すべきものは
[`validation.ja.md`](../../specs/001-inspect-agent-customizations/validation.ja.md)にある。
この文書はoperator側、すなわち誰が参加し、何を伝え、何を書き留めるかを述べる。

## 誰が参加するか

20件の独立した自律agentが1回のrunに参加し、各agentはSC-001、SC-006、残る2つのworkflow taskの順に
実施する。同じ20件が両方の基準を担う。

人ではなくagentであるのは、初見のparticipant 20名がこのprojectには得られないからである。これは
実施の細部ではなく、runが何を立証するかの限界である。すなわちこのrunが測るのは、product自身の
guidanceだけでfileに到達でき、productがそのfileについて述べていることを言えるかであって、同じ
interfaceを人がどう体験するかについては何も立証しない。runのどの記録もそれを明記する。

Sessionは一度登録したら結果に残る。置換も除外も無い。Environment failureでもproduct
failureでも同じであり、いずれも中断した基準の不成功として数える。

## 各sessionに与えるもの

1つだけ、稼働中のInspectorが印字したoriginである。Selectorもrouteも、interfaceの説明も与えず、
このrepositoryへのaccessも与えない。Sourceを読むsessionは、探し当てたことではなく答えを読んだ
ことで測られてしまうからである。

20件すべてが同じtreeに向き合うため、1つのInspectorがrun全体を担う。`pnpm run
start:fixture`がall-kind fixtureを構築して配信し、それが
[`ground-truth.json`](sc001-sc006-study-inputs/ground-truth.json)の前提となるtreeである。

## 何を言ってよいか

4つの定型prompt — `task-prompt-sc001.md`、`task-prompt-sc006.md`、
`task-prompt-comparison.md`、`task-prompt-consent.md` — は、sessionが求める限り何度でも逐語で
繰り返してよい。

それ以外は何も言わない。Command、selector、route、手順が正しかったという確認、誤りの訂正、
いずれも与えない。これはrun中の全taskに、計時の有無を問わず適用する。

## SC-001 — discovery

SessionはInspectorを起動し、発見したcustomization file 1件を開く。

Timerはpromptの提示で開始し、発見された1 fileのsource/details viewが実際に開いて操作可能に
なった時点で停止する。Commandが印字したURLでInspectorへ到達することは計測区間に含まれ、
sessionに与えたguidanceの一部である。

2分、20件中19件以上が成功しなければならない。

## SC-006 — inspection

SC-001の結果にかかわらず、全sessionが同じ指定fileから開始する。Timerはその状態が整い
promptを提示した時点で開始する。

Sessionは3項目 — fileのsource、認識するtool、file type — を記録する。3つすべてを2分以内に
提出し、3つすべてが[`ground-truth.json`](sc001-sc006-study-inputs/ground-truth.json)と一致
しなければならない。欠落または誤りのある項目は不成功であり、部分点は無い。

2分、20件中18件以上が成功しなければならない。

## 残るworkflow

計時付きSC-006の回答提出後、20 sessionすべてがcomparison taskとpersonal-setup taskを実施する。
`task-prompt-comparison.md`と`task-prompt-consent.md`から読み上げ、同じノーヒント方針を適用する。
これらは計時しない。完了した試行がどう見えるかは`ground-truth.json`の`workflows`にある。

SC-001のdiscovery観測と計時付きSC-006のinspectionと合わせ、これで全sessionについて4つのprimary
workflowが覆われる。

## 何を記録するか

全sessionについて、いかなる場合も次を記録する。

- 4つの客観的なworkflow完了outcome
- SC-001とSC-006の計測区間
- 事前定義のsafety event項目

採点は[`scoring-rubric.json`](sc001-sc006-study-inputs/scoring-rubric.json)を、回答とground
truthに照らして用いる。結果は`validation.md`と`validation.ja.md`へ、sessionごとに、除外も
置換もせず記録する。

Safetyは各sessionが自ら観測できるもの、すなわち自身のbrowserが発したrequestと被検査treeの状態
から観測する。同じ性質は自動化されたFR-022およびUser Story suiteが各自のgateでassertしており、
だからこそここに独立したinstrumentationは存在しない。

## 結果の読み方

SC-001は19件、SC-006は18件で合格する。閾値に届かなかったrunも有効なrunである。より良い数字を
得るために再実施はせず、releaseの判断はそれとは別に行う。
