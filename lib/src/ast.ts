/**
 * Construct an AST given a markdown source string.
 * @param markdown the source to parse
 * @returns an AST representing the markdown source
 */
export function parseBlocks(markdown: string): BlockNode[] {
  const lines = splitLines(markdown);
  const out: BlockNode[] = [];

  let i = 0;
  let paraBuf: string[] = [];

  const flushParagraph = () => {
    if (paraBuf.length === 0) return;
    const raw = paraBuf.join("\n");
    out.push({ type: "p", children: parseInline(raw) });
    paraBuf = [];
  };

  const isOuterBlockStarter = (l: string): boolean => {
    if (isBlank(l)) return true;
    if (parseFenceStart(l)) return true;
    if (isHorizontalRule(l)) return true;
    if (parseHeading(l)) return true;
    if (stripBlockquoteMarker(l) !== null) return true;
    return false;
  };

  const indentOf = (l: string) => l.match(/^ */)?.[0].length ?? 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      flushParagraph();
      i++;
      continue;
    }

    // Fenced code
    const fence = parseFenceStart(line);
    if (fence) {
      flushParagraph();
      const lang = fence.info ? fence.info.split(/\s+/)[0] : undefined;

      i++;
      const codeLines: string[] = [];
      while (
        i < lines.length &&
        !isFenceEnd(lines[i], fence.fenceChar, fence.fenceLen)
      ) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;

      out.push({ type: "pre", lang, raw: codeLines.join("\n") });
      continue;
    }

    // HR
    if (isHorizontalRule(line)) {
      flushParagraph();
      out.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading
    const heading = parseHeading(line);
    if (heading) {
      flushParagraph();
      out.push({
        type: "h",
        level: heading.level,
        children: parseInline(heading.raw),
      });
      i++;
      continue;
    }

    // Table
    if (
      isTableCandidate(line) &&
      i + 1 < lines.length &&
      isTableDelimiterRow(lines[i + 1])
    ) {
      flushParagraph();

      const headerRaw = splitTableRow(line);
      i += 2;

      const rowsRaw: string[][] = [];
      while (
        i < lines.length &&
        !isBlank(lines[i]) &&
        isTableCandidate(lines[i])
      ) {
        rowsRaw.push(splitTableRow(lines[i]));
        i++;
      }

      out.push({
        type: "table",
        header: headerRaw.map((cell) => parseInline(cell)),
        rows: rowsRaw.map((row) => row.map((cell) => parseInline(cell))),
      });
      continue;
    }

    // Blockquote
    const bq = stripBlockquoteMarker(line);
    if (bq !== null) {
      flushParagraph();

      const qLines: string[] = [];

      while (i < lines.length) {
        const cur = lines[i];
        const stripped = stripBlockquoteMarker(cur);

        if (stripped !== null) {
          qLines.push(stripped);
          i++;
          continue;
        }

        if (isBlank(cur)) break;
        const curIndent = indentOf(cur);
        if (curIndent === 0 && parseListMarker(cur)) break;
        if (isOuterBlockStarter(cur)) break;

        qLines.push(cur);
        i++;
      }

      out.push({
        type: "blockquote",
        children: parseBlocks(qLines.join("\n")),
      });
      continue;
    }

    // List
    const firstMarker = parseListMarker(line);
    if (firstMarker) {
      flushParagraph();

      const ordered = firstMarker.ordered;
      const start = firstMarker.ordered ? firstMarker.start : undefined;

      const listIndent = firstMarker.indent;
      const items: ListItemNode[] = [];
      let tight = true;

      while (i < lines.length) {
        const m = parseListMarker(lines[i]);
        if (!m) break;
        if (m.ordered !== ordered) break;
        if (m.indent !== listIndent) break;

        const afterMarker = lines[i].slice(m.contentIndent);
        i++;

        const itemLines: string[] = [afterMarker];
        let sawBlank = false;

        while (i < lines.length) {
          const l = lines[i];

          if (isBlank(l)) {
            sawBlank = true;
            itemLines.push("");
            i++;
            continue;
          }

          const ind = indentOf(l);

          if (sawBlank && ind < m.contentIndent) break;

          const nextMarker = parseListMarker(l);
          if (
            nextMarker &&
            nextMarker.ordered === ordered &&
            nextMarker.indent === listIndent
          ) {
            break;
          }

          if (ind <= listIndent && isOuterBlockStarter(l)) break;

          if (ind >= m.contentIndent) {
            itemLines.push(l.slice(m.contentIndent));
            i++;
            continue;
          }

          if (ind > listIndent) {
            const strip = Math.min(ind, listIndent + 1);
            itemLines.push(l.slice(strip));
            i++;
            continue;
          }

          // lazy continuation
          itemLines.push(l);
          i++;
          continue;
        }

        if (sawBlank) tight = false;

        items.push({
          type: "li",
          children: parseBlocks(itemLines.join("\n")),
        });

        while (i < lines.length && isBlank(lines[i])) {
          tight = false;
          i++;
        }
      }

      out.push({ type: "list", ordered, start, tight, items });
      continue;
    }

    // Paragraph line
    paraBuf.push(line);
    i++;
  }

  flushParagraph();
  return out;
}

// Utils
const normalizeNewlines = (str: string) => str.replace(/\r\n?/g, "\n");
const splitLines = (str: string) => normalizeNewlines(str).split("\n");
const isBlank = (str: string) => !str.trim();

function isHorizontalRule(str: string): boolean {
  str = str.trim();
  if (str.length < 3) return false;
  const char = str[0];
  if (char !== "-" && char !== "*" && char !== "_") return false;
  for (const c of str) if (c !== char && c !== " ") return false;
  return str.split("").filter((c) => c === char).length >= 3;
}

function parseHeading(line: string) {
  const matches = /^(#{1,6})[ \t]+(.*)$/.exec(line);
  if (!matches) return null;
  const level = matches[1].length as Level;
  let raw = matches[2];
  raw = raw.replace(/[ \t]+#+[ \t]*$/, "");
  return { level, raw };
}

function parseFenceStart(line: string) {
  const m = /^[ ]{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if (!m) return null;

  const fence = m[1];
  return {
    fenceChar: fence[0] as "`" | "~",
    fenceLen: fence.length,
    info: (m[2] || "").trim(),
  };
}

function isFenceEnd(
  line: string,
  fenceChar: "`" | "~",
  fenceLen: number
): boolean {
  const stripped = line.replace(/^[ ]{0,3}/, "").trimEnd();

  if (fenceChar === "`") {
    if (!/^`{3,}$/.test(stripped)) return false;
  } else {
    if (!/^~{3,}$/.test(stripped)) return false;
  }

  const runLen = stripped.length;
  return runLen >= fenceLen;
}

type ListMarker =
  | {
      ordered: false;
      start?: never;
      indent: number;
      markerWidth: number;
      contentIndent: number;
    }
  | {
      ordered: true;
      start: number;
      indent: number;
      markerWidth: number;
      contentIndent: number;
    };

function parseListMarker(line: string): ListMarker | null {
  const indent = line.match(/^ */)?.[0].length ?? 0;
  const rest = line.slice(indent);

  const mu = /^([-+*])[ \t]+/.exec(rest);
  if (mu) {
    const markerWidth = mu[0].length;
    return {
      ordered: false,
      indent,
      markerWidth,
      contentIndent: indent + markerWidth,
    };
  }

  const mo = /^(\d{1,9})([.)])[ \t]+/.exec(rest);
  if (mo) {
    const markerWidth = mo[0].length;
    return {
      ordered: true,
      start: parseInt(mo[1], 10),
      indent,
      markerWidth,
      contentIndent: indent + markerWidth,
    };
  }

  return null;
}

function stripBlockquoteDepth(
  line: string
): { depth: number; content: string } | null {
  let i = 0;
  while (i < line.length && i < 3 && line[i] === " ") i++;

  let depth = 0;
  while (i < line.length && line[i] === ">") {
    depth++;
    i++;
    if (line[i] === " ") i++;
  }

  if (depth === 0) return null;
  return { depth, content: line.slice(i) };
}

function stripBlockquoteMarker(line: string): string | null {
  const r = stripBlockquoteDepth(line);
  if (!r) return null;
  if (r.depth === 1) return r.content;
  return ">".repeat(r.depth - 1) + " " + r.content;
}

function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isTableDelimiterRow(line: string): boolean {
  const cells = splitTableRow(line);
  if (cells.length < 2) return false;

  return cells.every((cell) => {
    const t = cell.replace(/\s+/g, "");
    if (t.length === 0) return false;
    if (!/^:?-+:?$/.test(t)) return false;
    return /-/.test(t);
  });
}

function isTableCandidate(line: string): boolean {
  if (!line.includes("|")) return false;
  return splitTableRow(line).length >= 2;
}

const delimClass = (ch: DelimiterChar) => (ch === "_" ? "*" : ch);
const isSpace = (ch?: string) => ch === " " || ch === "\t" || ch === "\n";
const isAlphanum = (ch?: string) => !!ch && /[A-Za-z0-9]/.test(ch);

function mergeText(out: Atom[] | InlineNode[], value: string) {
  if (!value) return;
  const last = out[out.length - 1] as any;
  if (last && last.type === "text") last.value += value;
  else (out as any).push({ type: "text", value });
}

function computeCanOpenClose(
  prev: string | undefined,
  next: string | undefined
) {
  const prevIsNonSpace = prev !== undefined && !isSpace(prev);
  const nextIsNonSpace = next !== undefined && !isSpace(next);
  return { canOpen: nextIsNonSpace, canClose: prevIsNonSpace };
}

function tokenToLiteral(t: Token): string {
  switch (t.type) {
    case "text":
      return t.value;
    case "newline":
      return "\n";
    case "lbracket":
      return "[";
    case "rbracket":
      return "]";
    case "lparen":
      return "(";
    case "rparen":
      return ")";
    case "bang":
      return "!";
    case "delimiter_run":
      return t.ch.repeat(t.len);
    case "backtick_run":
      return "`".repeat(t.len);
    case "backslash":
      return "\\";
    default: {
      const _exhaustive: never = t;
      return _exhaustive;
    }
  }
}

// ---------- 1) Tokenize ----------

function tokenizeInline(raw: string): Token[] {
  const tokens: Token[] = [];
  let textBuf = "";

  const flushText = () => {
    if (!textBuf) return;
    const last = tokens[tokens.length - 1];
    if (last && last.type === "text") last.value += textBuf;
    else tokens.push({ type: "text", value: textBuf });
    textBuf = "";
  };

  const push = (t: Token) => {
    flushText();
    tokens.push(t);
  };

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (ch === "\n") {
      push({ type: "newline" });
      continue;
    }

    if (ch === "\\") {
      push({ type: "backslash" });
      continue;
    }

    if (ch === "!") {
      push({ type: "bang" });
      continue;
    }
    if (ch === "[") {
      push({ type: "lbracket" });
      continue;
    }
    if (ch === "]") {
      push({ type: "rbracket" });
      continue;
    }
    if (ch === "(") {
      push({ type: "lparen" });
      continue;
    }
    if (ch === ")") {
      push({ type: "rparen" });
      continue;
    }

    if (ch === "`") {
      let j = i + 1;
      while (j < raw.length && raw[j] === "`") j++;
      push({ type: "backtick_run", len: j - i });
      i = j - 1;
      continue;
    }

    if (ch === "_" && isAlphanum(raw[i - 1]) && isAlphanum(raw[i + 1])) {
      textBuf += ch;
      continue;
    }

    if (delimiterChars.includes(ch as DelimiterChar)) {
      let j = i + 1;
      while (j < raw.length && raw[j] === ch) j++;
      const prev = i > 0 ? raw[i - 1] : undefined;
      const next = j < raw.length ? raw[j] : undefined;
      const { canOpen, canClose } = computeCanOpenClose(prev, next);

      push({
        type: "delimiter_run",
        ch: ch as DelimiterChar,
        len: j - i,
        canOpen,
        canClose,
      });

      i = j - 1;
      continue;
    }

    textBuf += ch;
  }

  flushText();
  return tokens;
}

// ---------- 2) Backslash escapes ----------

const ESCAPABLE = new Set([
  "\\",
  "`",
  "*",
  "_",
  "~",
  "{",
  "}",
  "[",
  "]",
  "(",
  ")",
  "#",
  "+",
  "-",
  ".",
  "!",
  "|",
  ">",
]);

function applyBackslashEscapes(tokens: Token[]): Token[] {
  const out: Token[] = [];

  const pushText = (value: string) => {
    if (!value) return;
    const last = out[out.length - 1];
    if (last && last.type === "text") last.value += value;
    else out.push({ type: "text", value });
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== "backslash") {
      out.push(t);
      continue;
    }

    const next = tokens[i + 1];
    if (!next) {
      pushText("\\");
      continue;
    }

    const lit = tokenToLiteral(next);
    const ch = lit[0];

    if (ESCAPABLE.has(ch)) {
      pushText(ch);

      if (next.type === "delimiter_run" && next.len > 1) {
        out.push({ ...next, len: next.len - 1, canOpen: true, canClose: true });
      } else if (next.type === "backtick_run" && next.len > 1) {
        out.push({ ...next, len: next.len - 1 });
      } else if (next.type === "text" && next.value.length > 1) {
        pushText(next.value.slice(1));
      }

      i++; // consume next
      continue;
    }

    pushText("\\");
  }

  // Merge adjacent text tokens
  const merged: Token[] = [];
  for (const t of out) {
    if (t.type === "text") {
      const last = merged[merged.length - 1];
      if (last && last.type === "text") last.value += t.value;
      else merged.push(t);
    } else {
      merged.push(t);
    }
  }
  return merged;
}

// ---------- 3) Code spans ----------

function resolveCodeSpans(tokens: Token[]): Atom[] {
  const out: Atom[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (t.type !== "backtick_run") {
      out.push(t);
      continue;
    }

    const openerLen = t.len;

    let j = i + 1;
    while (j < tokens.length) {
      const tt = tokens[j];
      if (tt.type === "backtick_run" && tt.len === openerLen) break;
      j++;
    }

    if (j >= tokens.length) {
      mergeText(out, "`".repeat(openerLen));
      continue;
    }

    let raw = "";
    for (let k = i + 1; k < j; k++) {
      raw += tokenToLiteral(tokens[k]);
    }

    out.push({ type: "code", value: raw });
    i = j;
  }

  const merged: Atom[] = [];
  for (const a of out) {
    if (a.type === "text") mergeText(merged, a.value);
    else merged.push(a);
  }
  return merged;
}

// ---------- 4) Links & images (inline) ----------
// Recognize: [label](url) and ![alt](url)
// - label/alt parsed with parseInline recursively (so code spans etc work inside label)
// - URL is raw text between ( ... ) until first ')'
// - We intentionally keep it simple (no titles, no nested parens, no ref links).

function atomToToken(a: Atom): Token | null {
  // We only match link syntax over remaining tokens.
  // InlineNodes (code/a/img) do not participate.
  if (a.type === "code" || a.type === "a" || a.type === "img") return null;
  return a as Token;
}

function atomToLiteral(a: Atom): string {
  // Inline nodes
  if (a.type === "text") return a.value;
  if (a.type === "code") return "`" + a.value + "`";

  // If you want literalization to match your old paragraph behavior:
  // softbreak => space, hardbreak => newline
  if (a.type === "softbreak") return " ";
  if (a.type === "hardbreak") return "\n";

  if (a.type === "a") return ""; // ignore in literal contexts
  if (a.type === "img") return ""; // ignore in literal contexts

  if (a.type === "em") return atomsToLiteral(a.children);
  if (a.type === "strong") return atomsToLiteral(a.children);
  if (a.type === "del") return atomsToLiteral(a.children);

  // Delimiter atom
  if (a.type === "delimiter") return a.ch.repeat(a.len);

  // Everything else must be a Token
  return tokenToLiteral(a);
}

function atomsToLiteral(atoms: Atom[] | InlineNode[]): string {
  let s = "";
  for (const a of atoms as any[]) {
    s += atomToLiteral(a as any);
  }
  return s;
}

function resolveLinksAndImages(atoms: Atom[]): Atom[] {
  const out: Atom[] = [];

  for (let i = 0; i < atoms.length; i++) {
    const t = atomToToken(atoms[i]);
    if (!t) {
      out.push(atoms[i]);
      continue;
    }

    // image: ! [ label ] ( url )
    const isBang = t.type === "bang";
    const lbIndex = isBang ? i + 1 : i;

    const lb = atomToToken(atoms[lbIndex]);
    if (!lb || lb.type !== "lbracket") {
      out.push(atoms[i]);
      continue;
    }

    // find matching rbracket (no nesting for now)
    let rbIndex = lbIndex + 1;
    while (rbIndex < atoms.length) {
      const tt = atomToToken(atoms[rbIndex]);
      if (tt && tt.type === "rbracket") break;
      rbIndex++;
    }
    if (rbIndex >= atoms.length) {
      out.push(atoms[i]);
      continue;
    }

    // must be followed by ( ... )
    const lp = atomToToken(atoms[rbIndex + 1]);
    if (!lp || lp.type !== "lparen") {
      out.push(atoms[i]);
      continue;
    }

    let rpIndex = rbIndex + 2;
    while (rpIndex < atoms.length) {
      const tt = atomToToken(atoms[rpIndex]);
      if (tt && tt.type === "rparen") break;
      rpIndex++;
    }
    if (rpIndex >= atoms.length) {
      out.push(atoms[i]);
      continue;
    }

    const labelAtoms = atoms.slice(lbIndex + 1, rbIndex);
    const urlAtoms = atoms.slice(rbIndex + 2, rpIndex);

    // URL: we only accept if urlAtoms contains no non-text tokens besides (maybe) newline; keep it simple.
    // We'll literalize everything and trim spaces.
    const url = atomsToLiteral(urlAtoms).trim();
    const labelRaw = atomsToLiteral(labelAtoms);

    if (!url) {
      out.push(atoms[i]);
      continue;
    }

    if (isBang) {
      // alt is plain text: we keep it simple and just literalize/trim
      out.push({ type: "img", url, alt: labelRaw });
      i = rpIndex;
      continue;
    }

    // link label is parsed recursively (so `code` in label works)
    const children = parseInline(labelRaw);
    out.push({ type: "a", url, children });
    i = rpIndex;
    continue;
  }

  // merge adjacent text nodes created by replacements
  const merged: Atom[] = [];
  for (const a of out) {
    if (a.type === "text") mergeText(merged, a.value);
    else merged.push(a);
  }
  return merged;
}

// ----------------------------
// Helper: turn delimiter_run tokens into delimiter atoms
// ----------------------------
function expandDelimRuns(atoms: Atom[]): Atom[] {
  const out: Atom[] = [];
  for (const a of atoms) {
    if (a.type !== "delimiter_run") {
      out.push(a);
      continue;
    }
    out.push({
      type: "delimiter",
      ch: delimClass(a.ch),
      len: a.len,
      canOpen: a.canOpen,
      canClose: a.canClose,
    });
  }
  return out;
}

function isDelimiter(a: Atom): a is Delimiter {
  return (a as any).type === "delimiter";
}

function mergeTextInline(out: InlineNode[], value: string) {
  if (!value) return;
  const last = out[out.length - 1];
  if (last && last.type === "text") last.value += value;
  else out.push({ type: "text", value });
}

// Any remaining tokens/delimiters become literal text.
function atomToLiteralForFinalize(a: Atom): string {
  if (a.type === "delimiter") return a.ch.repeat(a.len);
  if (
    a.type === "text" ||
    a.type === "newline" ||
    a.type === "lbracket" ||
    a.type === "rbracket" ||
    a.type === "lparen" ||
    a.type === "rparen" ||
    a.type === "bang" ||
    a.type === "delimiter_run" ||
    a.type === "backtick_run" ||
    a.type === "backslash"
  ) {
    // Token
    return tokenToLiteral(a as any);
  }
  return ""; // InlineNode handled elsewhere
}

// ----------------------------
// Delimiter resolution (compact, "GitHub-like in practice")
// ----------------------------
function resolveDelimiters(atomsIn: Atom[]): Atom[] {
  const atoms = expandDelimRuns(atomsIn);

  type Frame = {
    ch: DelimiterChar;
    len: 1 | 2; // opener length used
    nodes: Atom[];
  };

  const stack: Frame[] = [];
  let cur: Atom[] = [];

  const open = (ch: Frame["ch"], len: Frame["len"]) => {
    stack.push({ ch, len, nodes: cur });
    cur = [];
  };

  const close = (ch: Frame["ch"], len: Frame["len"]) => {
    const inner = cur;
    const frame = stack.pop();
    if (!frame) return;

    cur = frame.nodes;

    if (ch === "~") {
      cur.push({ type: "del", children: finalizeInline(inner) });
    } else if (len === 2) {
      cur.push({ type: "strong", children: finalizeInline(inner) });
    } else {
      cur.push({ type: "em", children: finalizeInline(inner) });
    }
  };

  function pushBreak(out: InlineNode[], hard: boolean) {
    out.push(hard ? { type: "hardbreak" } : { type: "softbreak" });
  }

  function trimTwoTrailingSpaces(out: InlineNode[]): boolean {
    const last = out[out.length - 1];
    if (!last || last.type !== "text") return false;
    if (!last.value.endsWith("  ")) return false;
    last.value = last.value.slice(0, -2);
    if (last.value.length === 0) out.pop();
    return true;
  }

  function finalizeInline(list: Atom[]): InlineNode[] {
    const out: InlineNode[] = [];

    for (const a of list) {
      if (
        a.type === "code" ||
        a.type === "a" ||
        a.type === "img" ||
        a.type === "em" ||
        a.type === "strong" ||
        a.type === "del"
      ) {
        out.push(a);
        continue;
      }

      if (a.type === "text") {
        mergeTextInline(out, a.value);
        continue;
      }

      // ✅ IMPORTANT: convert newline tokens to break nodes here too
      if (a.type === "newline") {
        const hard = trimTwoTrailingSpaces(out);
        pushBreak(out, hard);
        continue;
      }

      // Everything else becomes literal text
      mergeTextInline(out, atomToLiteralForFinalize(a));
    }

    return out;
  }

  // Consume a delimiter run into N open/close actions, preferring strong (2) before em (1),
  // and for ~ only allow pairs (2).
  function consumeDelimRun(d: Delimiter) {
    if (d.ch === "~") {
      // Only "~~" pairs are meaningful. For odd runs, the extra "~" should be literal
      // and should sit OUTSIDE the pair structure.
      const hasOdd = d.len % 2 === 1;
      const pairs = Math.floor((d.len - (hasOdd ? 1 : 0)) / 2);

      // Decide where the odd "~" goes:
      // - opener-ish: before pairs (so it stays outside)
      // - closer-ish: after pairs
      // - ambiguous: prefer before (less surprising and fixes ~~~x~~)
      const putOddBefore =
        hasOdd &&
        (d.canOpen && !d.canClose
          ? true
          : d.canClose && !d.canOpen
            ? false
            : true);

      if (putOddBefore) cur.push({ type: "text", value: "~" });

      for (let k = 0; k < pairs; k++) {
        const top = stack[stack.length - 1];
        if (d.canClose && top && top.ch === "~" && top.len === 2) close("~", 2);
        else if (d.canOpen) open("~", 2);
        else cur.push({ type: "text", value: "~~" });
      }

      if (hasOdd && !putOddBefore) cur.push({ type: "text", value: "~" });
      return;
    }

    let remaining = d.len;

    // Greedy: 2s then maybe 1
    const pieces: Array<1 | 2> = [];
    while (remaining >= 2) {
      pieces.push(2);
      remaining -= 2;
    }
    if (remaining === 1) pieces.push(1);

    // IMPORTANT: if this run ends with "...** *" (i.e. [2,1]) and we can close,
    // choose the order based on what's on top of the stack.
    // If top wants 1, do 1 then 2, else do 2 then 1.
    if (
      pieces.length >= 2 &&
      pieces[pieces.length - 2] === 2 &&
      pieces[pieces.length - 1] === 1
    ) {
      const top = stack[stack.length - 1];
      if (d.canClose && top && top.ch === d.ch && top.len === 1) {
        // move the trailing 1 before the last 2
        pieces.splice(pieces.length - 2, 2, 1, 2);
      }
    }

    for (const len of pieces) {
      const top = stack[stack.length - 1];

      const canClose = d.canClose && top && top.ch === d.ch && top.len === len;
      const canOpen = d.canOpen;

      if (canClose) close(d.ch, len);
      else if (canOpen) open(d.ch, len);
      else cur.push({ type: "text", value: d.ch.repeat(len) });
    }
  }

  for (const a of atoms) {
    // Never treat delimiters inside code/link/img nodes
    if (
      a.type === "code" ||
      a.type === "a" ||
      a.type === "img" ||
      a.type === "em" ||
      a.type === "strong" ||
      a.type === "del"
    ) {
      cur.push(a);
      continue;
    }

    if (a.type === "text") {
      cur.push(a);
      continue;
    }

    if (isDelimiter(a)) {
      // If neither open nor close, literalize
      if (!a.canOpen && !a.canClose) {
        cur.push({ type: "text", value: a.ch.repeat(a.len) });
        continue;
      }
      consumeDelimRun(a);
      continue;
    }

    // Other tokens become literal text for now
    cur.push(a);
  }

  // Unwind unmatched openers: re-insert their literal opener text.
  while (stack.length) {
    const frame = stack.pop()!;
    const opener = frame.ch.repeat(frame.len);
    const inner = cur;
    cur = frame.nodes;
    cur.push({ type: "text", value: opener });
    cur.push(...inner);
  }

  // Merge adjacent text nodes
  const merged: Atom[] = [];
  for (const a of cur) {
    const last = merged[merged.length - 1];
    if (a.type === "text" && last && last.type === "text")
      last.value += a.value;
    else merged.push(a);
  }

  return merged;
}

function pushBreak(out: InlineNode[], hard: boolean) {
  out.push(hard ? { type: "hardbreak" } : { type: "softbreak" });
}

function trimTwoTrailingSpaces(out: InlineNode[]): boolean {
  const last = out[out.length - 1];
  if (!last || last.type !== "text") return false;
  if (!last.value.endsWith("  ")) return false;
  last.value = last.value.slice(0, -2);
  if (last.value.length === 0) out.pop();
  return true;
}

// ---------- Public entrypoint ----------

function parseInline(raw: string): InlineNode[] {
  let tokens = tokenizeInline(raw);
  tokens = applyBackslashEscapes(tokens);

  let atoms: Atom[] = resolveCodeSpans(tokens);
  atoms = resolveLinksAndImages(atoms);
  atoms = resolveDelimiters(atoms);

  // Finalize: any remaining tokens/delimiters become literal text (should be rare now)
  const out: InlineNode[] = [];
  for (const a of atoms) {
    if (a.type === "newline") {
      const hard = trimTwoTrailingSpaces(out);
      pushBreak(out, hard);
    } else if (
      a.type === "code" ||
      a.type === "a" ||
      a.type === "img" ||
      a.type === "em" ||
      a.type === "strong" ||
      a.type === "del"
    ) {
      out.push(a);
    } else if (a.type === "text") {
      mergeTextInline(out, a.value);
    } else {
      mergeTextInline(out, atomToLiteralForFinalize(a));
    }
  }
  return out;
}

// Types
export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | HorizontalRuleNode
  | PreNode
  | BlockquoteNode
  | ListNode
  | TableNode;

type ParagraphNode = { type: "p"; children: InlineNode[] };

type Level = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingNode = {
  type: "h";
  level: Level;
  children: InlineNode[];
};

type HorizontalRuleNode = { type: "hr" };

type PreNode = {
  type: "pre";
  lang?: string;
  raw: string;
};

type BlockquoteNode = {
  type: "blockquote";
  children: BlockNode[];
};

type ListNode = {
  type: "list";
  ordered: boolean;
  start?: number;
  tight: boolean;
  items: ListItemNode[];
};

type ListItemNode = {
  type: "li";
  children: BlockNode[];
};

type TableNode = {
  type: "table";
  header: InlineNode[][];
  rows: InlineNode[][][];
};

const delimiterChars = ["*", "_", "~"] as const;
type DelimiterChar = (typeof delimiterChars)[number];

type Token =
  | { type: "text"; value: string }
  | { type: "newline" }
  | { type: "backslash" }
  | { type: "backtick_run"; len: number }
  | {
      type: "delimiter_run";
      ch: DelimiterChar;
      len: number;
      canOpen: boolean;
      canClose: boolean;
    }
  | { type: "lbracket" }
  | { type: "rbracket" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "bang" };

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "a"; url: string; children: InlineNode[] }
  | { type: "img"; url: string; alt: string }
  | { type: "em"; children: InlineNode[] }
  | { type: "strong"; children: InlineNode[] }
  | { type: "del"; children: InlineNode[] }
  | { type: "softbreak" }
  | { type: "hardbreak" };

type Delimiter = {
  type: "delimiter";
  ch: DelimiterChar;
  len: number;
  canOpen: boolean;
  canClose: boolean;
};

type Atom = Token | InlineNode | Delimiter;
