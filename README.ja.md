# Agent Customization Inspector

[English](README.md)

AIコーディングエージェント向けの指示、スキル、MCP設定、その他のカスタマイズファイルを閲覧・調査します。

> 開発状況: M1の開発基盤とsecurity spineは、このrepositoryで実装および検証済みです。このpackageは未リリースであり、実vendor adapter、redaction、CLI、HTTP server、Web UIはまだ含まれていません。

## 現在の基盤

- TypeScript、ESM-only module、Node.js 22.12.0以降、npm
- 分離されたRepositoryとGlobalのsource contract。Globalは既定で無効
- Root内に制限され、symbolic linkをskipする上限制約付きfilesystem discovery
- Summary-only catalogと、revision checkおよびsource認識を行うdetail store
- 静的で信頼済みのadapter contract、test専用adapter、test専用tool-home resolver
- 英語版と日本語版を同時に維持するrepository documentation

調査対象contentは信頼できないdataとして扱い、決して実行しません。現在のM1 codeには、実際のtool-home resolverやvendor adapterは含まれていません。

## 開発

```sh
npm ci
npm run check
```

用途別のcommandとして、`npm test`、`npm run typecheck`、`npm run lint`、`npm run format`、`npm run build`も利用できます。

将来のCLI milestoneでは、引数parseとhelp生成に[gunshi](https://gunshi.dev/)を使用します。Commanderは使用しません。

## 設計

承認済みscope、security boundary、milestone、verification criteriaについては、[初期プロダクト設計](docs/plans/initial-product-design.ja.md)を参照してください。M2以降のmilestoneには、別途明示的な承認が必要です。

## ライセンス

[MIT](LICENSE)
