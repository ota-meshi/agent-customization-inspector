# Agent Customization Inspector

[日本語](README.ja.md)

Browse and inspect instructions, skills, MCP settings, and other customization files for AI coding agents.

> Development status: the M1 foundation and security spine are implemented and verified in this repository. The package is not released and does not yet include vendor adapters, redaction, a CLI, an HTTP server, or a Web UI.

## Current foundation

- TypeScript, ESM-only modules, Node.js 22.12.0 or later, and npm
- Separate Repository and Global source contracts; Global is off by default
- Bounded, root-contained filesystem discovery that skips symbolic links
- Summary-only catalogs and revision-checked, source-aware detail storage
- Static trusted adapter contracts plus test-only adapters and tool-home resolvers
- English and Japanese repository documentation maintained together

Inspected content is treated as untrusted data and is never executed. The current M1 code contains no real tool-home resolver or vendor adapter.

## Development

```sh
npm ci
npm run check
```

Useful focused commands are `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`, and `npm run build`.

The future CLI milestone will use [gunshi](https://gunshi.dev/) for argument parsing and generated help. Commander is not used.

## Design

See the [initial product design](docs/plans/initial-product-design.md) for the approved scope, security boundaries, milestones, and verification criteria. M2 and later milestones require separate explicit approval.

## License

[MIT](LICENSE)
