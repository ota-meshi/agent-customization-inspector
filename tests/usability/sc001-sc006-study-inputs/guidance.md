# Using the Inspector

[日本語](guidance.ja.md)

This is everything you are told about the tool. The runner cannot add to it.

## Starting it

Open a terminal in the `repository/` directory of the folder you were given, and run:

```bash
npx --no-install agent-customization-inspector --no-open
```

The command prints a URL. Copy it into the browser that was set up for this session.

## What you will see

One page, listing the customization files that Claude Code, GitHub Copilot, and OpenAI
Codex look for in that directory.

Kinds are listed down the left with a count beside each. Choosing a kind shows its rows on
the right. What one row is depends on the kind: a file, or a name or a declared event that
several files can share. Choosing a row opens what it stands for — a file's own page carries
its complete text and the fields it declares, and a declaration's carries that declaration
and the way to each file it was written in.

Being listed does not mean a tool loaded the file. The page reports what is there and what
it says.

## Stopping it

Press Ctrl+C in the terminal.
