# Skill: shiki-readonly

Code view is Shiki (VS Code's own highlighter) + line-number gutter + fake
minimap gradient. No Monaco (2MB, editing unneeded). Edit mode swaps a
`textarea` overlay with identical font metrics (`font-vscode-code` 14px/1.6);
`Esc` returns to highlighted view.

Good: highlighted `<pre>` for view, transparent-caret textarea for edit.
Bad: importing `monaco-editor` / making Shiki output contentEditable —
breaks highlighting and balloons the bundle.
