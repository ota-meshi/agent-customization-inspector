---
'agent-customization-inspector': patch
---

Compute every source comparison with VS Code's own line diff (`vscode-diff`) in place of a hand-assembled Myers pass. A line the other copy kept at another indentation now stands opposite that line instead of opposite whatever took its position, and the mark on it is the two spaces it gained rather than both sides' whole indentation. Within a line, a mark no longer breaks into islands around a `.` or a `/` that two otherwise unrelated values happen to share.
