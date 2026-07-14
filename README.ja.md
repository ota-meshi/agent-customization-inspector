# Agent Customization Inspector

[English](README.md)

AIコーディングエージェント向けの指示、スキル、MCP設定、その他のカスタマイズファイルを閲覧・調査します。

> 開発状況: 2026-07-15に、ユーザーはproduction実装をすべて削除するよう指示しました。現在のrepositoryには、計画documentと汎用的な開発tool設定だけがあります。実行可能なinspector、library、CLI、server、Web UI、demo previewは含まれていません。

## 現在のrepository内容

- 将来のAgent Customization Inspectorに向けたproductおよびsecurity計画
- 汎用的なnpm、TypeScript、format、lint設定
- 英語版と日本語版を同時に維持するrepository documentation

以前のM1実装は`dev` branchで完了および検証された後、ユーザーの指示により削除されました。この履歴は、M1が現在存在することや、復元が承認されていることを意味しません。M2以降のmilestoneも引き続き未承認です。

## 開発

```sh
npm ci
npm run format
npm run lint
npm run typecheck
```

これらのcommandは、残された開発設定とdocumentationを検証します。現在のrepositoryには、source test、production build、package-validation target、npmで起動可能なproductはありません。

将来のCLI milestoneでは、引数parseとhelp生成に[gunshi](https://gunshi.dev/)を使用します。Commanderは使用しません。

## 設計

将来のscope、security boundary、milestone、verification criteriaについては、[初期プロダクト設計](docs/plans/initial-product-design.ja.md)を参照してください。M1の復元、M2またはそれ以降のmilestoneの開始には、新たな明示的承認が必要です。

## ライセンス

[MIT](LICENSE)
