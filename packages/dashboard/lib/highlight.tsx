import * as React from "react";

/// Tiny, dependency-free syntax highlighter. Works line-by-line so it's safe to
/// call per row in a code window. Not a full parser — just enough token coloring
/// to make TS / Solidity / JSON / bash snippets feel premium.

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "import", "export", "from",
  "new", "async", "await", "type", "interface", "extends", "implements",
  "class", "public", "private", "external", "internal", "view", "pure",
  "payable", "memory", "storage", "calldata", "mapping", "address", "uint256",
  "uint", "int", "bool", "string", "bytes32", "struct", "event", "emit",
  "contract", "pragma", "solidity", "if", "else", "for", "while", "require",
  "constructor", "modifier", "indexed", "returns", "of", "in", "as", "default",
  "try", "catch", "throw", "void", "enum", "namespace", "yield",
]);

const LITERALS = new Set(["true", "false", "null", "undefined", "this"]);

// Order matters: comments → strings → numbers → identifiers → punctuation.
const TOKEN_RE =
  /(\/\/[^\n]*|#[^\n]*)|(`[^`]*`|"[^"]*"|'[^']*')|(\b\d[\d_.]*(?:e[+-]?\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\sA-Za-z0-9_$])/g;

function classFor(kind: string, value: string, nextChar: string): string {
  switch (kind) {
    case "comment":
      return "italic text-white/35";
    case "string":
      return "text-emerald-300";
    case "number":
      return "text-amber-300";
    case "ident":
      if (KEYWORDS.has(value)) return "text-violet-300";
      if (LITERALS.has(value)) return "text-amber-300";
      if (nextChar === "(") return "text-sky-300";
      if (/^[A-Z]/.test(value)) return "text-teal-300";
      return "text-white/85";
    case "punct":
      return "text-white/45";
    default:
      return "";
  }
}

export function highlight(line: string, language?: string): React.ReactNode {
  // JSON: keys/strings green, numbers amber, punctuation dim — the generic
  // tokenizer already does a reasonable job, so we share it.
  void language;
  if (line.length === 0) return " ";

  const nodes: React.ReactNode[] = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  let key = 0;

  while ((m = TOKEN_RE.exec(line)) !== null) {
    const [full, comment, str, num, ident, ws, punct] = m;
    if (ws) {
      nodes.push(ws);
      continue;
    }
    let kind = "";
    if (comment) kind = "comment";
    else if (str) kind = "string";
    else if (num) kind = "number";
    else if (ident) kind = "ident";
    else if (punct) kind = "punct";

    const nextChar = line[m.index + full.length] ?? "";
    const cls = classFor(kind, full, nextChar);
    nodes.push(
      cls ? (
        <span key={key++} className={cls}>
          {full}
        </span>
      ) : (
        full
      ),
    );
  }
  return nodes;
}
