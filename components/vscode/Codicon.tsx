// Codicon — single-glyph wrapper for the @vscode/codicons font, shared by all chrome.
// codicon.css pins its font-size with an unlayered `font` shorthand (16px/1),
// which beats Tailwind size utilities — so size is applied inline, once, here.
export default function Codicon({
  name,
  size = 16,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <i
      className={`codicon codicon-${name} ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    />
  );
}
