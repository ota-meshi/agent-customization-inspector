# Agent Customization Inspector

[日本語](README.ja.md)

Browse and inspect instructions, skills, MCP settings, and other customization files for AI coding agents.

> Development status: on 2026-07-15, the user directed that all production implementation be removed. This repository currently contains planning documents and generic development-tool configuration only. It does not contain a runnable inspector, library, CLI, server, Web UI, or demo preview.

## Current repository contents

- Product and security planning for a future Agent Customization Inspector
- Generic npm, TypeScript, formatting, and linting configuration
- English and Japanese repository documentation maintained together

The previous M1 implementation was completed and verified on the `dev` branch, then removed at the user's direction. That history does not mean M1 is currently present or authorized for restoration. M2 and later milestones also remain unauthorized.

## Development

```sh
npm ci
npm run format
npm run lint
npm run typecheck
```

These commands validate the retained development configuration and documentation. There are no source tests, production build, package-validation target, or npm-startable product in the current repository.

The future CLI milestone will use [gunshi](https://gunshi.dev/) for argument parsing and generated help. Commander is not used.

## Design

See the [initial product design](docs/plans/initial-product-design.md) for the future scope, security boundaries, milestones, and verification criteria. Restoring M1 or starting M2 or a later milestone requires new explicit approval.

## License

[MIT](LICENSE)
