/**
 * Construct an AST given a markdown source string.
 * @param markdown the source to parse
 * @returns an AST representing the markdown source
 */
export function buildAst(markdown: string): AstNode[] {
  const lines = splitLines(markdown);
  const nodes: AstNode[] = [];

  let lineIndex = 0;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    nodes.push({ type: "p", children: parseInline(paragraphLines.join("\n")) });
    paragraphLines = [];
  };

  const isOuterBlockStarter = (line: string): boolean => {
    if (isBlank(line)) return true;
    if (parseFenceStart(line)) return true;
    if (isHorizontalRule(line)) return true;
    if (parseHeading(line)) return true;
    if (stripBlockquoteMarker(line) !== null) return true;
    return false;
  };

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];

    if (isBlank(line)) {
      flushParagraph();
      lineIndex++;
      continue;
    }

    const fence = parseFenceStart(line);
    if (fence) {
      flushParagraph();
      const lang = fence.info ? fence.info.split(RE_SPLIT_LANG)[0] : undefined;

      lineIndex++;
      const codeLines: string[] = [];
      while (
        lineIndex < lines.length &&
        !isFenceEnd(lines[lineIndex], fence.fenceChar, fence.fenceLen)
      ) {
        codeLines.push(lines[lineIndex]);
        lineIndex++;
      }
      if (lineIndex < lines.length) lineIndex++;

      nodes.push({ type: "pre", lang, raw: codeLines.join("\n") });
      continue;
    }

    if (isHorizontalRule(line)) {
      flushParagraph();
      nodes.push({ type: "hr" });
      lineIndex++;
      continue;
    }

    const heading = parseHeading(line);
    if (heading) {
      flushParagraph();
      nodes.push({
        type: "h",
        level: heading.level,
        children: parseInline(heading.raw),
      });
      lineIndex++;
      continue;
    }

    if (
      isTableCandidate(line) &&
      lineIndex + 1 < lines.length &&
      isTableDelimiterRow(lines[lineIndex + 1])
    ) {
      flushParagraph();

      const headerRaw = splitTableRow(line);
      lineIndex += 2;

      const rowsRaw: string[][] = [];
      while (
        lineIndex < lines.length &&
        !isBlank(lines[lineIndex]) &&
        isTableCandidate(lines[lineIndex])
      ) {
        rowsRaw.push(splitTableRow(lines[lineIndex]));
        lineIndex++;
      }

      const headerRow: TableHeaderRowNode = {
        type: "tr",
        cells: headerRaw.map<TableHeaderCellNode>((cell) => ({
          type: "th",
          children: parseInline(cell),
        })),
      };
      const bodyRows: TableBodyRowNode[] = rowsRaw.map((row) => ({
        type: "tr",
        cells: row.map<TableCellNode>((cell) => ({
          type: "td",
          children: parseInline(cell),
        })),
      }));

      nodes.push({
        type: "table",
        head: { type: "thead", row: headerRow },
        body: { type: "tbody", rows: bodyRows },
      });
      continue;
    }

    const blockquoteMarker = stripBlockquoteMarker(line);
    if (blockquoteMarker !== null) {
      flushParagraph();

      const blockquoteLines: string[] = [];

      while (lineIndex < lines.length) {
        const currentLine = lines[lineIndex];
        const strippedLine = stripBlockquoteMarker(currentLine);

        if (strippedLine !== null) {
          blockquoteLines.push(strippedLine);
          lineIndex++;
          continue;
        }

        if (isBlank(currentLine)) break;
        const currentIndent = getIndent(currentLine);
        if (currentIndent === 0 && parseListMarker(currentLine)) break;
        if (isOuterBlockStarter(currentLine)) break;

        blockquoteLines.push(currentLine);
        lineIndex++;
      }

      nodes.push({
        type: "blockquote",
        children: buildAst(blockquoteLines.join("\n")),
      });
      continue;
    }

    const firstListMarker = parseListMarker(line);
    if (firstListMarker) {
      flushParagraph();

      const ordered = firstListMarker.ordered;
      const start = firstListMarker.ordered ? firstListMarker.start : undefined;

      const listIndent = firstListMarker.indent;
      const items: ListItemNode[] = [];
      let tight = true;

      while (lineIndex < lines.length) {
        const listMarker = parseListMarker(lines[lineIndex]);
        if (!listMarker) break;
        if (listMarker.ordered !== ordered) break;
        if (listMarker.indent !== listIndent) break;

        const contentAfterMarker = lines[lineIndex].slice(
          listMarker.contentIndent
        );
        lineIndex++;

        const listItemLines: string[] = [contentAfterMarker];
        let sawBlankLine = false;

        while (lineIndex < lines.length) {
          const currentLine = lines[lineIndex];

          if (isBlank(currentLine)) {
            sawBlankLine = true;
            listItemLines.push("");
            lineIndex++;
            continue;
          }

          const lineIndent = getIndent(currentLine);

          if (sawBlankLine && lineIndent < listMarker.contentIndent) break;

          const nextListMarker = parseListMarker(currentLine);
          if (
            nextListMarker &&
            nextListMarker.ordered === ordered &&
            nextListMarker.indent === listIndent
          ) {
            break;
          }

          if (lineIndent <= listIndent && isOuterBlockStarter(currentLine))
            break;

          if (lineIndent >= listMarker.contentIndent) {
            listItemLines.push(currentLine.slice(listMarker.contentIndent));
            lineIndex++;
            continue;
          }

          if (lineIndent > listIndent) {
            const stripIndent = Math.min(lineIndent, listIndent + 1);
            listItemLines.push(currentLine.slice(stripIndent));
            lineIndex++;
            continue;
          }

          listItemLines.push(currentLine);
          lineIndex++;
          continue;
        }

        if (sawBlankLine) tight = false;

        items.push({
          type: "li",
          children: buildAst(listItemLines.join("\n")),
        });

        while (lineIndex < lines.length && isBlank(lines[lineIndex])) {
          tight = false;
          lineIndex++;
        }
      }

      nodes.push({ type: "list", ordered, start, tight, items });
      continue;
    }

    paragraphLines.push(line);
    lineIndex++;
  }

  flushParagraph();
  return nodes;
}

// Constants
const RE_NEWLINES = /\r\n?/g;
const RE_LEADING_SPACES = /^ */;
const RE_HEADING = /^(#{1,6})[ \t]+(.*)$/;
const RE_HEADING_TRAIL = /[ \t]+#+[ \t]*$/;
const RE_FENCE_START = /^[ ]{0,3}(`{3,}|~{3,})(.*)$/;
const RE_FENCE_LEADING_SPACES = /^[ ]{0,3}/;
const RE_FENCE_TICKS_ONLY = /^`{3,}$/;
const RE_FENCE_TILDES_ONLY = /^~{3,}$/;
const RE_UL_MARKER = /^([-+*])[ \t]+/;
const RE_OL_MARKER = /^(\d{1,9})([.)])[ \t]+/;
const RE_WHITESPACE = /\s+/g;
const RE_TABLE_ALIGN = /^:?-+:?$/;
const RE_DASH = /-/;
const RE_ALPHANUM = /[A-Za-z0-9]/;
const RE_SPLIT_LANG = /\s+/;

const DELIMITER_CLASS_MAP = { "*": "*", _: "*", "~": "~" } as const;

// Utils
const normalizeNewlines = (str: string) => str.replace(RE_NEWLINES, "\n");
const splitLines = (str: string) => normalizeNewlines(str).split("\n");
const isBlank = (str: string) => !str.trim();
const getIndent = (line: string) =>
  RE_LEADING_SPACES.exec(line)?.[0].length ?? 0;

function isHorizontalRule(str: string) {
  str = str.trim();
  if (str.length < 3) return false;
  const char = str[0];
  if (char !== "-" && char !== "*" && char !== "_") return false;
  for (const character of str)
    if (character !== char && character !== " ") return false;
  return str.split("").filter((character) => character === char).length >= 3;
}

function parseHeading(line: string) {
  const matches = RE_HEADING.exec(line);
  if (!matches) return null;
  const level = matches[1].length as Level;
  let raw = matches[2];
  raw = raw.replace(RE_HEADING_TRAIL, "");
  return { level, raw };
}

function parseFenceStart(line: string) {
  const fenceMatch = RE_FENCE_START.exec(line);
  if (!fenceMatch) return null;

  const fence = fenceMatch[1];
  return {
    fenceChar: fence[0] as "`" | "~",
    fenceLen: fence.length,
    info: (fenceMatch[2] || "").trim(),
  };
}

function isFenceEnd(str: string, fenceChar: "`" | "~", fenceLen: number) {
  str = str.replace(RE_FENCE_LEADING_SPACES, "").trimEnd();

  if (fenceChar === "`") {
    if (!RE_FENCE_TICKS_ONLY.test(str)) return false;
  } else if (!RE_FENCE_TILDES_ONLY.test(str)) return false;

  const runLen = str.length;
  return runLen >= fenceLen;
}

type ListMarker = {
  ordered: boolean;
  indent: number;
  markerWidth: number;
  contentIndent: number;
  start?: number;
};

function parseListMarker(line: string): ListMarker | null {
  const indent = getIndent(line);
  const rest = line.slice(indent);

  const uliMatches = RE_UL_MARKER.exec(rest);
  if (uliMatches) {
    const markerWidth = uliMatches[0].length;
    return {
      ordered: false,
      indent,
      markerWidth,
      contentIndent: indent + markerWidth,
    };
  }

  const oliMatches = RE_OL_MARKER.exec(rest);
  if (oliMatches) {
    const markerWidth = oliMatches[0].length;
    return {
      ordered: true,
      start: parseInt(oliMatches[1], 10),
      indent,
      markerWidth,
      contentIndent: indent + markerWidth,
    };
  }

  return null;
}

function stripBlockquoteDepth(str: string) {
  let index = 0;
  while (index < str.length && index < 3 && str[index] === " ") index++;

  let depth = 0;
  while (index < str.length && str[index] === ">") {
    depth++;
    index++;
    if (str[index] === " ") index++;
  }

  if (depth === 0) return null;
  return { depth, content: str.slice(index) };
}

function stripBlockquoteMarker(str: string) {
  const blockquoteInfo = stripBlockquoteDepth(str);
  if (!blockquoteInfo) return null;
  if (blockquoteInfo.depth === 1) return blockquoteInfo.content;
  return ">".repeat(blockquoteInfo.depth - 1) + " " + blockquoteInfo.content;
}

function splitTableRow(str: string): string[] {
  str = str.trim();
  if (str.startsWith("|")) str = str.slice(1);
  if (str.endsWith("|")) str = str.slice(0, -1);
  return str.split("|").map((cellValue) => cellValue.trim());
}

function isTableDelimiterRow(line: string): boolean {
  const cells = splitTableRow(line);
  if (cells.length <= 1) return false;

  return cells.every((cell) => {
    cell = cell.replace(RE_WHITESPACE, "");
    if (cell.length === 0) return false;
    if (!RE_TABLE_ALIGN.test(cell)) return false;
    return RE_DASH.test(cell);
  });
}

function isTableCandidate(line: string): boolean {
  if (!line.includes("|")) return false;
  return splitTableRow(line).length > 1;
}

const delimClass = (ch: DelimiterChar) => DELIMITER_CLASS_MAP[ch];
const isSpace = (ch?: string) => ch === " " || ch === "\t" || ch === "\n";
const isAlphanum = (ch?: string) => !!ch && RE_ALPHANUM.test(ch);

function mergeTextNodes(nodes: Atom[] | InlineNode[], value: string) {
  if (!value) return;
  const last = nodes[nodes.length - 1];
  if (last && last.type === "text") last.value += value;
  else nodes.push({ type: "text", value });
}

function computeCanOpenClose(
  prev: string | undefined,
  next: string | undefined
) {
  const prevIsNonSpace = prev !== undefined && !isSpace(prev);
  const nextIsNonSpace = next !== undefined && !isSpace(next);
  return { canOpen: nextIsNonSpace, canClose: prevIsNonSpace };
}

type TokenByType = {
  [T in Token["type"]]: Extract<Token, { type: T }>;
};

type TokenLiteralHandlers = {
  [T in Token["type"]]: (token: TokenByType[T]) => string;
};

const TOKEN_LITERAL_HANDLERS: TokenLiteralHandlers = {
  text: (token) => token.value,
  newline: () => "\n",
  lbracket: () => "[",
  rbracket: () => "]",
  lparen: () => "(",
  rparen: () => ")",
  bang: () => "!",
  delimiter_run: (token) => token.ch.repeat(token.len),
  backtick_run: (token) => "`".repeat(token.len),
  backslash: () => "\\",
};

function tokenToLiteral<T extends Token["type"]>(
  token: TokenByType[T]
): string {
  return TOKEN_LITERAL_HANDLERS[token.type](token);
}

function tokenize(raw: string): Token[] {
  const tokens: Token[] = [];
  let textBuffer = "";

  const flushText = () => {
    if (!textBuffer) return;
    const last = tokens[tokens.length - 1];
    if (last && last.type === "text") last.value += textBuffer;
    else tokens.push({ type: "text", value: textBuffer });
    textBuffer = "";
  };

  const pushToken = (token: Token) => {
    flushText();
    tokens.push(token);
  };

  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];

    if (char === "\n") {
      pushToken({ type: "newline" });
      continue;
    }

    if (char === "\\") {
      pushToken({ type: "backslash" });
      continue;
    }

    if (char === "!") {
      pushToken({ type: "bang" });
      continue;
    }
    if (char === "[") {
      pushToken({ type: "lbracket" });
      continue;
    }
    if (char === "]") {
      pushToken({ type: "rbracket" });
      continue;
    }
    if (char === "(") {
      pushToken({ type: "lparen" });
      continue;
    }
    if (char === ")") {
      pushToken({ type: "rparen" });
      continue;
    }

    if (char === "`") {
      let runIndex = index + 1;
      while (runIndex < raw.length && raw[runIndex] === "`") runIndex++;
      pushToken({ type: "backtick_run", len: runIndex - index });
      index = runIndex - 1;
      continue;
    }

    if (
      char === "_" &&
      isAlphanum(raw[index - 1]) &&
      isAlphanum(raw[index + 1])
    ) {
      textBuffer += char;
      continue;
    }

    if (Object.keys(DELIMITER_CLASS_MAP).includes(char)) {
      let runIndex = index + 1;
      while (runIndex < raw.length && raw[runIndex] === char) runIndex++;
      const previousChar = index > 0 ? raw[index - 1] : undefined;
      const nextChar = runIndex < raw.length ? raw[runIndex] : undefined;
      const { canOpen, canClose } = computeCanOpenClose(previousChar, nextChar);

      pushToken({
        type: "delimiter_run",
        ch: char as DelimiterChar,
        len: runIndex - index,
        canOpen,
        canClose,
      });

      index = runIndex - 1;
      continue;
    }

    textBuffer += char;
  }

  flushText();
  return tokens;
}

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
  const tokensOut: Token[] = [];

  const pushText = (value: string) => {
    if (!value) return;
    const last = tokensOut[tokensOut.length - 1];
    if (last && last.type === "text") last.value += value;
    else tokensOut.push({ type: "text", value });
  };

  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    const token = tokens[tokenIndex];
    if (token.type !== "backslash") {
      tokensOut.push(token);
      continue;
    }

    const nextToken = tokens[tokenIndex + 1];
    if (!nextToken) {
      pushText("\\");
      continue;
    }

    const literal = tokenToLiteral(nextToken);
    const escapedChar = literal[0];

    if (ESCAPABLE.has(escapedChar)) {
      pushText(escapedChar);

      if (nextToken.type === "delimiter_run" && nextToken.len > 1) {
        tokensOut.push({
          ...nextToken,
          len: nextToken.len - 1,
          canOpen: true,
          canClose: true,
        });
      } else if (nextToken.type === "backtick_run" && nextToken.len > 1) {
        tokensOut.push({ ...nextToken, len: nextToken.len - 1 });
      } else if (nextToken.type === "text" && nextToken.value.length > 1) {
        pushText(nextToken.value.slice(1));
      }

      tokenIndex++;
      continue;
    }

    pushText("\\");
  }

  const mergedTokens: Token[] = [];
  for (const token of tokensOut) {
    if (token.type === "text") {
      const last = mergedTokens[mergedTokens.length - 1];
      if (last && last.type === "text") last.value += token.value;
      else mergedTokens.push(token);
    } else {
      mergedTokens.push(token);
    }
  }
  return mergedTokens;
}

function resolveCodeSpans(tokens: Token[]): Atom[] {
  const atomsOut: Atom[] = [];

  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    const token = tokens[tokenIndex];

    if (token.type !== "backtick_run") {
      atomsOut.push(token);
      continue;
    }

    const openerLen = token.len;

    let closingIndex = tokenIndex + 1;
    while (closingIndex < tokens.length) {
      const candidateToken = tokens[closingIndex];
      if (
        candidateToken.type === "backtick_run" &&
        candidateToken.len === openerLen
      )
        break;
      closingIndex++;
    }

    if (closingIndex >= tokens.length) {
      mergeTextNodes(atomsOut, "`".repeat(openerLen));
      continue;
    }

    let codeRaw = "";
    for (
      let innerIndex = tokenIndex + 1;
      innerIndex < closingIndex;
      innerIndex++
    ) {
      codeRaw += tokenToLiteral(tokens[innerIndex]);
    }

    atomsOut.push({ type: "code", value: codeRaw });
    tokenIndex = closingIndex;
  }

  const mergedAtoms: Atom[] = [];
  for (const atom of atomsOut) {
    if (atom.type === "text") mergeTextNodes(mergedAtoms, atom.value);
    else mergedAtoms.push(atom);
  }
  return mergedAtoms;
}

function atomToToken(atom: Atom): Token | null {
  if (atom.type === "code" || atom.type === "a" || atom.type === "img")
    return null;
  return atom as Token;
}

function atomToLiteral(atom: Atom): string {
  if (atom.type === "text") return atom.value;
  if (atom.type === "code") return "`" + atom.value + "`";

  if (atom.type === "softbreak") return " ";
  if (atom.type === "hardbreak") return "\n";

  if (atom.type === "a") return "";
  if (atom.type === "img") return "";

  if (atom.type === "em") return atomsToLiteral(atom.children);
  if (atom.type === "strong") return atomsToLiteral(atom.children);
  if (atom.type === "del") return atomsToLiteral(atom.children);

  if (atom.type === "delimiter") return atom.ch.repeat(atom.len);

  return tokenToLiteral(atom);
}

function atomsToLiteral(atoms: Atom[] | InlineNode[]): string {
  let literalText = "";
  for (const atom of atoms) {
    literalText += atomToLiteral(atom);
  }
  return literalText;
}

function resolveLinksAndImages(atoms: Atom[]): Atom[] {
  const atomsOut: Atom[] = [];

  for (let atomIndex = 0; atomIndex < atoms.length; atomIndex++) {
    const token = atomToToken(atoms[atomIndex]);
    if (!token) {
      atomsOut.push(atoms[atomIndex]);
      continue;
    }

    const isBang = token.type === "bang";
    const leftBracketIndex = isBang ? atomIndex + 1 : atomIndex;

    const leftBracketToken = atomToToken(atoms[leftBracketIndex]);
    if (!leftBracketToken || leftBracketToken.type !== "lbracket") {
      atomsOut.push(atoms[atomIndex]);
      continue;
    }

    let rightBracketIndex = leftBracketIndex + 1;
    while (rightBracketIndex < atoms.length) {
      const candidateToken = atomToToken(atoms[rightBracketIndex]);
      if (candidateToken && candidateToken.type === "rbracket") break;
      rightBracketIndex++;
    }
    if (rightBracketIndex >= atoms.length) {
      atomsOut.push(atoms[atomIndex]);
      continue;
    }

    const leftParenToken = atomToToken(atoms[rightBracketIndex + 1]);
    if (!leftParenToken || leftParenToken.type !== "lparen") {
      atomsOut.push(atoms[atomIndex]);
      continue;
    }

    let rightParenIndex = rightBracketIndex + 2;
    while (rightParenIndex < atoms.length) {
      const candidateToken = atomToToken(atoms[rightParenIndex]);
      if (candidateToken && candidateToken.type === "rparen") break;
      rightParenIndex++;
    }
    if (rightParenIndex >= atoms.length) {
      atomsOut.push(atoms[atomIndex]);
      continue;
    }

    const labelAtoms = atoms.slice(leftBracketIndex + 1, rightBracketIndex);
    const urlAtoms = atoms.slice(rightBracketIndex + 2, rightParenIndex);

    const url = atomsToLiteral(urlAtoms).trim();
    const labelRaw = atomsToLiteral(labelAtoms);

    if (!url) {
      atomsOut.push(atoms[atomIndex]);
      continue;
    }

    if (isBang) {
      atomsOut.push({ type: "img", url, alt: labelRaw });
      atomIndex = rightParenIndex;
      continue;
    }

    const children = parseInline(labelRaw);
    atomsOut.push({ type: "a", url, children });
    atomIndex = rightParenIndex;
    continue;
  }

  const mergedAtoms: Atom[] = [];
  for (const atom of atomsOut) {
    if (atom.type === "text") mergeTextNodes(mergedAtoms, atom.value);
    else mergedAtoms.push(atom);
  }
  return mergedAtoms;
}

function expandDelimRuns(atoms: Atom[]): Atom[] {
  const atomsOut: Atom[] = [];
  for (const atom of atoms) {
    if (atom.type !== "delimiter_run") {
      atomsOut.push(atom);
      continue;
    }
    atomsOut.push({
      type: "delimiter",
      ch: delimClass(atom.ch),
      len: atom.len,
      canOpen: atom.canOpen,
      canClose: atom.canClose,
    });
  }
  return atomsOut;
}

function isDelimiter(atom: Atom): atom is Delimiter {
  return atom.type === "delimiter";
}

function atomToLiteralForFinalize(atom: Atom): string {
  if (atom.type === "delimiter") return atom.ch.repeat(atom.len);
  if (
    atom.type === "text" ||
    atom.type === "newline" ||
    atom.type === "lbracket" ||
    atom.type === "rbracket" ||
    atom.type === "lparen" ||
    atom.type === "rparen" ||
    atom.type === "bang" ||
    atom.type === "delimiter_run" ||
    atom.type === "backtick_run" ||
    atom.type === "backslash"
  ) {
    return tokenToLiteral(atom);
  }
  return "";
}

function resolveDelimiters(atomsIn: Atom[]): Atom[] {
  const atoms = expandDelimRuns(atomsIn);

  type Frame = {
    delimiterChar: DelimiterChar;
    delimiterLength: 1 | 2;
    nodes: Atom[];
  };

  const stack: Frame[] = [];
  let currentNodes: Atom[] = [];

  const open = (
    delimiterChar: Frame["delimiterChar"],
    delimiterLength: Frame["delimiterLength"]
  ) => {
    stack.push({
      delimiterChar,
      delimiterLength,
      nodes: currentNodes,
    });
    currentNodes = [];
  };

  const close = (
    delimiterChar: Frame["delimiterChar"],
    delimiterLength: Frame["delimiterLength"]
  ) => {
    const inner = currentNodes;
    const frame = stack.pop();
    if (!frame) return;

    currentNodes = frame.nodes;

    if (delimiterChar === "~") {
      currentNodes.push({ type: "del", children: finalizeInline(inner) });
    } else if (delimiterLength === 2) {
      currentNodes.push({ type: "strong", children: finalizeInline(inner) });
    } else {
      currentNodes.push({ type: "em", children: finalizeInline(inner) });
    }
  };

  function finalizeInline(atomsList: Atom[]): InlineNode[] {
    const inlineNodes: InlineNode[] = [];

    for (const atom of atomsList) {
      if (
        atom.type === "code" ||
        atom.type === "a" ||
        atom.type === "img" ||
        atom.type === "em" ||
        atom.type === "strong" ||
        atom.type === "del"
      ) {
        inlineNodes.push(atom);
        continue;
      }

      if (atom.type === "text") {
        mergeTextNodes(inlineNodes, atom.value);
        continue;
      }

      if (atom.type === "newline") {
        const hard = trimTwoTrailingSpaces(inlineNodes);
        pushBreak(inlineNodes, hard);
        continue;
      }

      mergeTextNodes(inlineNodes, atomToLiteralForFinalize(atom));
    }

    return inlineNodes;
  }

  function consumeDelimRun(delimiter: Delimiter) {
    if (delimiter.ch === "~") {
      const hasOdd = delimiter.len % 2 === 1;
      const pairs = Math.floor((delimiter.len - (hasOdd ? 1 : 0)) / 2);

      const putOddBefore =
        hasOdd &&
        (delimiter.canOpen && !delimiter.canClose
          ? true
          : delimiter.canClose && !delimiter.canOpen
            ? false
            : true);

      if (putOddBefore) currentNodes.push({ type: "text", value: "~" });

      for (let pairIndex = 0; pairIndex < pairs; pairIndex++) {
        const top = stack[stack.length - 1];
        if (
          delimiter.canClose &&
          top &&
          top.delimiterChar === "~" &&
          top.delimiterLength === 2
        )
          close("~", 2);
        else if (delimiter.canOpen) open("~", 2);
        else currentNodes.push({ type: "text", value: "~~" });
      }

      if (hasOdd && !putOddBefore)
        currentNodes.push({ type: "text", value: "~" });
      return;
    }

    let remaining = delimiter.len;

    const pieces: Array<1 | 2> = [];
    while (remaining >= 2) {
      pieces.push(2);
      remaining -= 2;
    }
    if (remaining === 1) pieces.push(1);

    if (
      pieces.length >= 2 &&
      pieces[pieces.length - 2] === 2 &&
      pieces[pieces.length - 1] === 1
    ) {
      const top = stack[stack.length - 1];
      if (
        delimiter.canClose &&
        top &&
        top.delimiterChar === delimiter.ch &&
        top.delimiterLength === 1
      ) {
        pieces.splice(pieces.length - 2, 2, 1, 2);
      }
    }

    for (const delimiterLength of pieces) {
      const top = stack[stack.length - 1];

      const canClose =
        delimiter.canClose &&
        top &&
        top.delimiterChar === delimiter.ch &&
        top.delimiterLength === delimiterLength;
      const canOpen = delimiter.canOpen;

      if (canClose) close(delimiter.ch, delimiterLength);
      else if (canOpen) open(delimiter.ch, delimiterLength);
      else
        currentNodes.push({
          type: "text",
          value: delimiter.ch.repeat(delimiterLength),
        });
    }
  }

  for (const atom of atoms) {
    if (
      atom.type === "code" ||
      atom.type === "a" ||
      atom.type === "img" ||
      atom.type === "em" ||
      atom.type === "strong" ||
      atom.type === "del"
    ) {
      currentNodes.push(atom);
      continue;
    }

    if (atom.type === "text") {
      currentNodes.push(atom);
      continue;
    }

    if (isDelimiter(atom)) {
      if (!atom.canOpen && !atom.canClose) {
        currentNodes.push({
          type: "text",
          value: atom.ch.repeat(atom.len),
        });
        continue;
      }
      consumeDelimRun(atom);
      continue;
    }

    currentNodes.push(atom);
  }

  while (stack.length) {
    const frame = stack.pop();
    if (!frame) break;
    const opener = frame.delimiterChar.repeat(frame.delimiterLength);
    const inner = currentNodes;
    currentNodes = frame.nodes;
    currentNodes.push({ type: "text", value: opener });
    currentNodes.push(...inner);
  }

  const mergedAtoms: Atom[] = [];
  for (const atom of currentNodes) {
    const last = mergedAtoms[mergedAtoms.length - 1];
    if (atom.type === "text" && last && last.type === "text")
      last.value += atom.value;
    else mergedAtoms.push(atom);
  }

  return mergedAtoms;
}

function pushBreak(inlineNodes: InlineNode[], hard: boolean) {
  inlineNodes.push(hard ? { type: "hardbreak" } : { type: "softbreak" });
}

function trimTwoTrailingSpaces(inlineNodes: InlineNode[]): boolean {
  const last = inlineNodes[inlineNodes.length - 1];
  if (!last || last.type !== "text") return false;
  if (!last.value.endsWith("  ")) return false;
  last.value = last.value.slice(0, -2);
  if (last.value.length === 0) inlineNodes.pop();
  return true;
}

function parseInline(raw: string): InlineNode[] {
  let tokens = tokenize(raw);
  tokens = applyBackslashEscapes(tokens);

  let atoms: Atom[] = resolveCodeSpans(tokens);
  atoms = resolveLinksAndImages(atoms);
  atoms = resolveDelimiters(atoms);

  const inlineNodes: InlineNode[] = [];
  for (const atom of atoms) {
    if (atom.type === "newline") {
      const hard = trimTwoTrailingSpaces(inlineNodes);
      pushBreak(inlineNodes, hard);
    } else if (
      atom.type === "code" ||
      atom.type === "a" ||
      atom.type === "img" ||
      atom.type === "em" ||
      atom.type === "strong" ||
      atom.type === "del"
    ) {
      inlineNodes.push(atom);
    } else if (atom.type === "text") {
      mergeTextNodes(inlineNodes, atom.value);
    } else {
      mergeTextNodes(inlineNodes, atomToLiteralForFinalize(atom));
    }
  }
  return inlineNodes;
}

// Types
export type AstNode =
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
  children: AstNode[];
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
  children: AstNode[];
};

type TableNode = {
  type: "table";
  head: TableHeadNode;
  body: TableBodyNode;
};

type TableHeadNode = {
  type: "thead";
  row: TableHeaderRowNode;
};

type TableBodyNode = {
  type: "tbody";
  rows: TableBodyRowNode[];
};

type TableHeaderRowNode = {
  type: "tr";
  cells: TableHeaderCellNode[];
};

type TableBodyRowNode = {
  type: "tr";
  cells: TableCellNode[];
};

type TableHeaderCellNode = {
  type: "th";
  children: InlineNode[];
};

type TableCellNode = {
  type: "td";
  children: InlineNode[];
};

type DelimiterChar = keyof typeof DELIMITER_CLASS_MAP;

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
