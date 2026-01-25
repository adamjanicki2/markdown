/**
 * Construct an AST given a markdown source string.
 * @param markdown the source to parse
 * @returns an AST representing the markdown source
 */
export function buildAst(markdown: string): AstNode[] {
  const lines = splitLines(markdown);
  const nodes: AstNode[] = [];

  let lineIndex = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    nodes.push({ type: "p", children: parseInline(paragraph.join("\n")) });
    paragraph = [];
  };

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];

    if (isBlank(line)) {
      flushParagraph();
      lineIndex++;
    } else {
      const fence = parseFenceStart(line);
      if (fence) {
        flushParagraph();
        const lang: string | undefined = fence.info.split(RE_SPLIT_LANG)[0];

        lineIndex++;
        const pre: string[] = [];
        while (
          lineIndex < lines.length &&
          !isFenceEnd(lines[lineIndex], fence.fenceLen)
        ) {
          pre.push(lines[lineIndex]);
          lineIndex++;
        }
        if (lineIndex < lines.length) lineIndex++;

        nodes.push({ type: "pre", lang, raw: pre.join("\n") });
      } else {
        const list = parseListNode(lines, lineIndex, isTopLevelNodeStarter);
        if (list) {
          flushParagraph();
          nodes.push(list.node);
          lineIndex = list.nextIndex;
        } else if (isHorizontalRule(line)) {
          flushParagraph();
          nodes.push({ type: "hr" });
          lineIndex++;
        } else {
          const heading = parseHeading(line);
          if (heading) {
            flushParagraph();
            nodes.push({
              type: "h",
              level: heading.level,
              children: parseInline(heading.raw),
            });
            lineIndex++;
          } else {
            const table = parseTableNode(lines, lineIndex);
            if (table) {
              flushParagraph();
              nodes.push(table.node);
              lineIndex = table.nextIndex;
            } else {
              const blockquote = parseBlockquoteNode(
                lines,
                lineIndex,
                isTopLevelNodeStarter
              );
              if (blockquote) {
                flushParagraph();
                nodes.push(blockquote.node);
                lineIndex = blockquote.nextIndex;
              } else {
                paragraph.push(line);
                lineIndex++;
              }
            }
          }
        }
      }
    }
  }

  flushParagraph();
  return nodes;
}

// Constants
const RE_NEWLINES = /\r\n?/g;
const RE_LEADING_SPACES = /^ */;
const RE_HEADING = /^[ ]{0,3}(#{1,6})[ \t]+(.*)$/;
const RE_HEADING_TRAIL = /[ \t]+#+[ \t]*$/;
const RE_FENCE_START = /^[ ]{0,3}(`{3,})(.*)$/;
const RE_FENCE_LEADING_SPACES = /^[ ]{0,3}/;
const RE_FENCE_TICKS = /^`{3,}$/;
const RE_UL_MARKER = /^([-+*])[ \t]+/;
const RE_OL_MARKER = /^(\d{1,9})([.)])[ \t]+/;
const RE_WHITESPACE = /\s+/g;
const RE_TABLE_DELIM_MIN1 = /^-+$/;
const RE_TABLE_DELIM_MIN3 = /^-{3,}$/;
const RE_TABLE_ALIGN_LEFT = /^:-+$/;
const RE_TABLE_ALIGN_RIGHT = /^-+:$/;
const RE_TABLE_ALIGN_CENTER = /^:-+:$/;
const RE_COLON = /:/g;
const RE_ALPHANUM = /[A-Za-z0-9]/;
const RE_SPLIT_LANG = /\s+/;
const RE_LIST_REST_SPACES = /[ \t]+/g;
const RE_LIST_MARKER_ONLY = /^[*+-]+$/;
const RE_AUTOLINK_URL = /(^|[^A-Za-z])https?:\/\/[^\s<>()]+/g;
const RE_AUTOLINK_TRAILING_PUNCT = /[),.!?;:]/;

const DELIMITER_CLASS_MAP = { "*": "*", _: "*", "~": "~" } as const;
const DELIMITER_CHARS = Object.keys(DELIMITER_CLASS_MAP);

// Utils
const normalizeNewlines = (str: string) => str.replace(RE_NEWLINES, "\n");
const splitLines = (str: string) => normalizeNewlines(str).split("\n");
const isBlank = (str: string) => !str.trim();
const getIndent = (line: string) =>
  RE_LEADING_SPACES.exec(line)?.[0].length ?? 0;
const isSpace = (char?: string) =>
  char === undefined || char === " " || char === "\t" || char === "\n";
const isAlphanum = (char?: string) => !!char && RE_ALPHANUM.test(char);
const isTopLevelNodeStarter = (line: string) =>
  Boolean(
    isBlank(line) ||
    parseFenceStart(line) ||
    isHorizontalRule(line) ||
    parseHeading(line) ||
    stripBlockquoteMarker(line) !== null
  );

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
  const raw = matches[2];
  return { level, raw: raw.replace(RE_HEADING_TRAIL, "") };
}

function parseFenceStart(line: string) {
  const fenceMatch = RE_FENCE_START.exec(line);
  if (!fenceMatch) return null;

  const fence = fenceMatch[1];
  return {
    fenceLen: fence.length,
    info: (fenceMatch[2] || "").trim(),
  };
}

function isFenceEnd(str: string, fenceLen: number) {
  str = str.replace(RE_FENCE_LEADING_SPACES, "").trimEnd();

  if (!RE_FENCE_TICKS.test(str)) return false;

  return str.length >= fenceLen;
}

type ListMarker = {
  ordered: boolean;
  indent: number;
  markerWidth: number;
  contentIndent: number;
  markerChar: string;
  start?: number;
};

function parseListMarker(line: string): ListMarker | null {
  const indent = getIndent(line);
  const rest = line.slice(indent);
  const restTrimmed = rest.trim();

  const uliMatches = RE_UL_MARKER.exec(rest);
  if (uliMatches) {
    const markerWidth = uliMatches[0].length;
    return {
      ordered: false,
      indent,
      markerWidth,
      contentIndent: indent + markerWidth,
      markerChar: uliMatches[1],
    };
  }

  if (
    restTrimmed.length === 1 &&
    (restTrimmed === "-" || restTrimmed === "+" || restTrimmed === "*")
  ) {
    return {
      ordered: false,
      indent,
      markerWidth: rest.length,
      contentIndent: indent + rest.length,
      markerChar: restTrimmed,
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
      markerChar: oliMatches[2],
    };
  }

  return null;
}

function shouldDisallowListStart(line: string, marker: ListMarker): boolean {
  if (!marker.ordered && isHorizontalRule(line)) return true;
  const rest = line.slice(marker.contentIndent);
  if (!rest.trim()) return false;

  const trimmed = rest.replace(RE_LIST_REST_SPACES, "");
  if (!RE_LIST_MARKER_ONLY.test(trimmed)) return false;

  if (marker.ordered) return false;
  if (trimmed.length < 3) return false;
  for (const character of trimmed)
    if (character !== marker.markerChar) return false;
  return true;
}

function getBlockquoteInfo(str: string) {
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
  const blockquoteInfo = getBlockquoteInfo(str);
  if (!blockquoteInfo) return null;
  if (blockquoteInfo.depth === 1) return blockquoteInfo.content;
  return ">".repeat(blockquoteInfo.depth - 1) + " " + blockquoteInfo.content;
}

function splitTableRow(str: string): string[] {
  str = str.trim();
  if (str.startsWith("|")) str = str.slice(1);
  if (str.endsWith("|")) str = str.slice(0, -1);
  return str.split("|").map((cell) => cell.trim());
}

function hasOuterPipes(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

type TableAlign = "left" | "right" | "center";

function parseTableAlignments(
  line: string,
  minDashes: number
): Array<TableAlign | undefined> | null {
  const cells = splitTableRow(line);
  if (cells.length <= 1) return null;

  const delimRegex = minDashes >= 3 ? RE_TABLE_DELIM_MIN3 : RE_TABLE_DELIM_MIN1;
  const alignments: Array<TableAlign | undefined> = [];

  for (const cell of cells) {
    const trimmed = cell.replace(RE_WHITESPACE, "");
    if (trimmed.length === 0) return null;
    const dashCount = countChar(trimmed.replace(RE_COLON, ""), "-");
    if (dashCount < minDashes) return null;

    if (RE_TABLE_ALIGN_CENTER.test(trimmed)) alignments.push("center");
    else if (RE_TABLE_ALIGN_LEFT.test(trimmed)) alignments.push("left");
    else if (RE_TABLE_ALIGN_RIGHT.test(trimmed)) alignments.push("right");
    else if (delimRegex.test(trimmed)) alignments.push(undefined);
    else return null;
  }

  return alignments;
}

function isTableCandidate(line: string): boolean {
  if (!line.includes("|")) return false;
  return splitTableRow(line).length > 1;
}

type NodeParseResult<NodeType extends AstNode> = {
  node: NodeType;
  nextIndex: number;
};

function buildTableNode(
  header: string[],
  rows: string[][],
  alignments: Array<TableAlign | undefined>
): TableNode {
  const headerRow: TableHeaderRowNode = {
    type: "tr",

    cells: header.map<TableHeaderCellNode>((cellValue, cellIndex) => ({
      type: "th",
      align: alignments[cellIndex],
      children: parseInline(cellValue),
    })),
  };
  const bodyRows: TableBodyRowNode[] = rows.map((row) => ({
    type: "tr",

    cells: row.map<TableCellNode>((cellValue, cellIndex) => ({
      type: "td",

      align: alignments[cellIndex],
      children: parseInline(cellValue),
    })),
  }));

  return {
    type: "table",

    head: { type: "thead", row: headerRow },
    body: { type: "tbody", rows: bodyRows },
  };
}

function parseTableNode(
  lines: string[],
  lineIndex: number
): NodeParseResult<TableNode> | null {
  const line = lines[lineIndex];
  if (!isTableCandidate(line)) return null;
  if (lineIndex + 1 >= lines.length) return null;
  const headerHasOuterPipes = hasOuterPipes(line);
  const minDashes = headerHasOuterPipes ? 1 : 3;
  const alignments = parseTableAlignments(lines[lineIndex + 1], minDashes);
  if (!alignments) return null;

  const header = splitTableRow(line);
  let currentIndex = lineIndex + 2;

  const rows: string[][] = [];
  while (
    currentIndex < lines.length &&
    !isBlank(lines[currentIndex]) &&
    isTableCandidate(lines[currentIndex])
  ) {
    rows.push(splitTableRow(lines[currentIndex]));
    currentIndex++;
  }

  return {
    node: buildTableNode(header, rows, alignments),
    nextIndex: currentIndex,
  };
}

function parseListNode(
  lines: string[],
  startIndex: number,
  isTopLevelNodeStarter: (line: string) => boolean
): NodeParseResult<ListNode> | null {
  const firstLine = lines[startIndex];
  const firstMarker = parseListMarker(firstLine);
  if (!firstMarker) return null;
  if (shouldDisallowListStart(firstLine, firstMarker)) return null;

  const { ordered, start, indent } = firstMarker;
  const items: ListItemNode[] = [];
  let tight = true;

  const getSameListMarker = (line: string): ListMarker | null => {
    const marker = parseListMarker(line);
    if (!marker) return null;
    if (marker.ordered !== ordered) return null;
    if (!ordered && marker.markerChar !== firstMarker.markerChar) return null;
    if (!ordered && marker.indent !== indent) return null;
    if (ordered && (marker.indent < indent || marker.indent > indent + 3))
      return null;
    if (shouldDisallowListStart(line, marker)) return null;
    return marker;
  };

  let lineIndex = startIndex;
  while (lineIndex < lines.length) {
    const listMarker = getSameListMarker(lines[lineIndex]);
    if (!listMarker) break;

    const contentAfterMarker = lines[lineIndex].slice(listMarker.contentIndent);
    lineIndex++;

    const listItem: string[] = [contentAfterMarker];

    while (lineIndex < lines.length) {
      const currentLine = lines[lineIndex];

      if (isBlank(currentLine)) {
        let lookaheadIndex = lineIndex + 1;
        while (lookaheadIndex < lines.length && isBlank(lines[lookaheadIndex]))
          lookaheadIndex++;

        const nextLine =
          lookaheadIndex < lines.length ? lines[lookaheadIndex] : null;
        if (!nextLine) break;

        if (getSameListMarker(nextLine)) {
          tight = false;
          lineIndex = lookaheadIndex;
          break;
        }

        const nextIndent = getIndent(nextLine);
        if (nextIndent < listMarker.contentIndent) break;
        if (nextIndent <= indent && isTopLevelNodeStarter(nextLine)) break;

        tight = false;
        listItem.push("");
        lineIndex++;
        continue;
      }

      const lineIndent = getIndent(currentLine);
      const otherMarker = parseListMarker(currentLine);

      if (getSameListMarker(currentLine)) break;

      if (otherMarker && otherMarker.indent <= indent) break;

      if (lineIndent <= indent && isTopLevelNodeStarter(currentLine)) break;

      if (lineIndent >= listMarker.contentIndent) {
        let sliceIndent = listMarker.contentIndent;
        if (lineIndent > listMarker.contentIndent) {
          const remainder = currentLine.slice(listMarker.contentIndent);
          if (!parseListMarker(remainder)) sliceIndent = lineIndent;
        }
        listItem.push(currentLine.slice(sliceIndent));
        lineIndex++;
      } else if (lineIndent > indent) {
        const stripIndent = Math.min(lineIndent, indent + 1);
        listItem.push(currentLine.slice(stripIndent));
        lineIndex++;
      } else {
        listItem.push(currentLine);
        lineIndex++;
      }
    }

    items.push({ type: "li", children: buildAst(listItem.join("\n")) });
    if (lineIndex < lines.length && isBlank(lines[lineIndex])) break;
  }

  if (tight) {
    for (const item of items) {
      item.children = item.children.flatMap((child) =>
        child.type === "p" ? child.children : child
      );
    }
  }

  return {
    node: { type: "list", ordered, start, tight, items },
    nextIndex: lineIndex,
  };
}

function parseBlockquoteNode(
  lines: string[],
  startIndex: number,
  isTopLevelNodeStarter: (line: string) => boolean
): NodeParseResult<BlockquoteNode> | null {
  const firstLine = lines[startIndex];
  const firstMarker = stripBlockquoteMarker(firstLine);
  if (firstMarker === null) return null;

  const blockquote: string[] = [];
  let lineIndex = startIndex;

  while (lineIndex < lines.length) {
    const currentLine = lines[lineIndex];
    const strippedLine = stripBlockquoteMarker(currentLine);

    if (strippedLine !== null) {
      blockquote.push(strippedLine);
      lineIndex++;
    } else if (isBlank(currentLine)) break;
    else {
      const currentIndent = getIndent(currentLine);
      if (currentIndent === 0 && parseListMarker(currentLine)) break;
      if (isTopLevelNodeStarter(currentLine)) break;

      blockquote.push(currentLine);
      lineIndex++;
    }
  }

  return {
    node: { type: "blockquote", children: buildAst(blockquote.join("\n")) },
    nextIndex: lineIndex,
  };
}

function appendText(nodes: IrNode[], value: string) {
  if (!value) return;
  const last = nodes[nodes.length - 1];
  if (last && last.type === "text") last.value += value;
  else nodes.push({ type: "text", value });
}

type InlineTokenByType = {
  [TokenType in InlineToken["type"]]: Extract<InlineToken, { type: TokenType }>;
};

type InlineTokenLiteralLambdas = {
  [TokenType in InlineToken["type"]]: (
    token: InlineTokenByType[TokenType]
  ) => string;
};

const INLINE_TOKEN_LITERALS: InlineTokenLiteralLambdas = {
  text: (token) => token.value,
  newline: () => "\n",
  lbracket: () => "[",
  rbracket: () => "]",
  lparen: () => "(",
  rparen: () => ")",
  bang: () => "!",
  "delimiter-run": (token) => token.ch.repeat(token.len),
  "backtick-run": (token) => "`".repeat(token.len),
  backslash: () => "\\",
};

function tokenToLiteral<TokenType extends InlineToken["type"]>(
  token: InlineTokenByType[TokenType]
): string {
  return INLINE_TOKEN_LITERALS[token.type](token);
}

function tokenize(str: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let text = "";

  const flushText = () => {
    if (!text) return;
    const last = tokens[tokens.length - 1];
    if (last && last.type === "text") last.value += text;
    else tokens.push({ type: "text", value: text });
    text = "";
  };

  const pushToken = (token: InlineToken) => {
    flushText();
    tokens.push(token);
  };

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === "\n") pushToken({ type: "newline" });
    else if (char === "\\") pushToken({ type: "backslash" });
    else if (char === "!") pushToken({ type: "bang" });
    else if (char === "[") pushToken({ type: "lbracket" });
    else if (char === "]") pushToken({ type: "rbracket" });
    else if (char === "(") pushToken({ type: "lparen" });
    else if (char === ")") pushToken({ type: "rparen" });
    else if (char === "`") {
      let runIndex = i + 1;
      while (runIndex < str.length && str[runIndex] === "`") runIndex++;
      pushToken({ type: "backtick-run", len: runIndex - i });
      i = runIndex - 1;
    } else if (char === "_" && isAlphanum(str[i - 1]) && isAlphanum(str[i + 1]))
      text += char;
    else if (DELIMITER_CHARS.includes(char)) {
      let runIndex = i + 1;
      while (runIndex < str.length && str[runIndex] === char) runIndex++;
      const prevChar: string | undefined = str[i - 1];
      const nextChar: string | undefined = str[runIndex];
      const canOpen = !isSpace(nextChar);
      const canClose = !isSpace(prevChar);

      pushToken({
        type: "delimiter-run",
        ch: char as DelimiterChar,
        len: runIndex - i,
        canOpen,
        canClose,
      });

      i = runIndex - 1;
    } else text += char;
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

function applyBackslashEscapes(tokens: InlineToken[]): InlineToken[] {
  const transformed: InlineToken[] = [];

  const pushText = (value: string) => {
    if (!value) return;
    const last = transformed[transformed.length - 1];
    if (last && last.type === "text") last.value += value;
    else transformed.push({ type: "text", value });
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== "backslash") transformed.push(token);
    else {
      const nextToken = tokens[i + 1];
      if (!nextToken) pushText("\\");
      else {
        const literal = tokenToLiteral(nextToken);
        const escapedChar = literal[0];

        if (ESCAPABLE.has(escapedChar)) {
          pushText(escapedChar);

          if (nextToken.type === "delimiter-run" && nextToken.len > 1)
            transformed.push({
              ...nextToken,
              len: nextToken.len - 1,
              canOpen: true,
              canClose: true,
            });
          else if (nextToken.type === "backtick-run" && nextToken.len > 1)
            transformed.push({ ...nextToken, len: nextToken.len - 1 });
          else if (nextToken.type === "text" && nextToken.value.length > 1)
            pushText(nextToken.value.slice(1));

          i++;
        } else pushText("\\");
      }
    }
  }

  const mergedTokens: InlineToken[] = [];
  for (const token of transformed) {
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

function resolveCodeSpans(tokens: InlineToken[]): IrNode[] {
  const nodes: IrNode[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type !== "backtick-run") nodes.push(token);
    else {
      const openerLen = token.len;

      let closingIndex = i + 1;
      while (closingIndex < tokens.length) {
        const candidateToken = tokens[closingIndex];
        if (
          candidateToken.type === "backtick-run" &&
          candidateToken.len === openerLen
        )
          break;
        closingIndex++;
      }

      if (closingIndex >= tokens.length)
        appendText(nodes, "`".repeat(openerLen));
      else {
        let code = "";
        for (let j = i + 1; j < closingIndex; j++) {
          code += tokenToLiteral(tokens[j]);
        }

        nodes.push({ type: "code", value: code });
        i = closingIndex;
      }
    }
  }

  const mergedNodes: IrNode[] = [];
  for (const node of nodes) {
    if (node.type === "text") appendText(mergedNodes, node.value);
    else mergedNodes.push(node);
  }
  return mergedNodes;
}

function irNodeToToken(node: IrNode): InlineToken | null {
  if ("block" in node) return null;
  if (
    node.type === "text" ||
    node.type === "newline" ||
    node.type === "backslash" ||
    node.type === "backtick-run" ||
    node.type === "delimiter-run" ||
    node.type === "lbracket" ||
    node.type === "rbracket" ||
    node.type === "lparen" ||
    node.type === "rparen" ||
    node.type === "bang"
  )
    return node;
  return null;
}

function irNodeToLiteral(node: IrNode): string {
  if (node.type === "text") return node.value;
  if (node.type === "code") return "`" + node.value + "`";
  if (node.type === "linebreak") return "\n";
  if (node.type === "a" || node.type === "img") return "";
  if (node.type === "em") return irNodesToLiteral(node.children);
  if (node.type === "strong") return irNodesToLiteral(node.children);
  if (node.type === "del") return irNodesToLiteral(node.children);
  if (node.type === "delimiter") return node.ch.repeat(node.len);

  return tokenToLiteral(node);
}

const irNodesToLiteral = (nodes: IrNode[]): string =>
  nodes.reduce((literalText, node) => literalText + irNodeToLiteral(node), "");

type LinkParseResult = {
  node: IrNode;
  nextIndex: number;
};

function parseLinkOrImage(
  nodes: IrNode[],
  startIndex: number
): LinkParseResult | null {
  const token = irNodeToToken(nodes[startIndex]);
  if (!token) return null;

  const isBang = token.type === "bang";
  const leftBracketIndex = isBang ? startIndex + 1 : startIndex;
  if (leftBracketIndex >= nodes.length) return null;

  const leftBracketToken = irNodeToToken(nodes[leftBracketIndex]);
  if (!leftBracketToken || leftBracketToken.type !== "lbracket") return null;

  let rightBracketIndex = leftBracketIndex + 1;
  let bracketDepth = 0;
  while (rightBracketIndex < nodes.length) {
    const candidateToken = irNodeToToken(nodes[rightBracketIndex]);
    if (!candidateToken) {
      rightBracketIndex++;
      continue;
    }
    if (candidateToken.type === "lbracket") {
      bracketDepth++;
      rightBracketIndex++;
      continue;
    }
    if (candidateToken.type === "rbracket") {
      if (bracketDepth === 0) break;
      bracketDepth--;
    }
    rightBracketIndex++;
  }
  if (rightBracketIndex >= nodes.length) return null;

  const leftParenToken = irNodeToToken(nodes[rightBracketIndex + 1]);
  if (!leftParenToken || leftParenToken.type !== "lparen") return null;

  let rightParenIndex = rightBracketIndex + 2;
  while (rightParenIndex < nodes.length) {
    const candidateToken = irNodeToToken(nodes[rightParenIndex]);
    if (candidateToken && candidateToken.type === "rparen") break;
    rightParenIndex++;
  }
  if (rightParenIndex >= nodes.length) return null;

  const labelNodes = nodes.slice(leftBracketIndex + 1, rightBracketIndex);
  const urlNodes = nodes.slice(rightBracketIndex + 2, rightParenIndex);

  const url = irNodesToLiteral(urlNodes).trim();
  const label = irNodesToLiteral(labelNodes);

  if (isBang) {
    return {
      node: { type: "img", url, alt: label },
      nextIndex: rightParenIndex,
    };
  }

  const children = parseInline(label);
  return {
    node: { type: "a", url, children },
    nextIndex: rightParenIndex,
  };
}

function resolveLinksAndImages(nodes: IrNode[]): IrNode[] {
  const nodesOut: IrNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const parsed = parseLinkOrImage(nodes, i);
    const node = nodes[i];
    if (parsed) {
      nodesOut.push(parsed.node);
      i = parsed.nextIndex;
    } else if (node.type === "text")
      nodesOut.push(...parseAutolinksFromText(node.value));
    else nodesOut.push(node);
  }

  const mergedNodes: IrNode[] = [];
  for (const node of nodesOut) {
    if (node.type === "text") appendText(mergedNodes, node.value);
    else mergedNodes.push(node);
  }
  return mergedNodes;
}

function parseAutolinksFromText(text: string): IrNode[] {
  if (!text.includes("http://") && !text.includes("https://"))
    return [{ type: "text", value: text }];

  const nodes: IrNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  RE_AUTOLINK_URL.lastIndex = 0;
  while ((match = RE_AUTOLINK_URL.exec(text))) {
    if (match.index > lastIndex)
      nodes.push({ type: "text", value: text.slice(lastIndex, match.index) });

    const textPrefix = match[1] || "";
    if (textPrefix) nodes.push({ type: "text", value: textPrefix });

    const rawUrl = match[0].slice(textPrefix.length);
    const { url, trailing } = trimUrl(rawUrl);
    nodes.push({ type: "a", url });
    if (trailing) nodes.push({ type: "text", value: trailing });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length)
    nodes.push({ type: "text", value: text.slice(lastIndex) });

  return nodes;
}

function trimUrl(url: string): { url: string; trailing: string } {
  let trailing = "";

  while (url.length) {
    const lastChar = url[url.length - 1];
    if (!RE_AUTOLINK_TRAILING_PUNCT.test(lastChar)) break;
    if (lastChar === ")" && countChar(url, "(") >= countChar(url, ")")) break;
    url = url.slice(0, -1);
    trailing = lastChar + trailing;
  }

  return { url, trailing };
}

function countChar(text: string, targetChar: string): number {
  let count = 0;
  for (const char of text) if (char === targetChar) count++;
  return count;
}

function irNodeToLiteralForFinalize(node: IrNode): string {
  if (node.type === "delimiter") return node.ch.repeat(node.len);
  if (
    node.type === "text" ||
    node.type === "newline" ||
    node.type === "lbracket" ||
    node.type === "rbracket" ||
    node.type === "lparen" ||
    node.type === "rparen" ||
    node.type === "bang" ||
    node.type === "delimiter-run" ||
    node.type === "backtick-run" ||
    node.type === "backslash"
  ) {
    return tokenToLiteral(node);
  }
  return "";
}

type RunLength = 1 | 2;

type Frame = {
  delimiterChar: DelimiterChar;
  delimiterLength: RunLength;
  nodes: IrNode[];
};

function resolveDelimiters(nodes: IrNode[]): IrNode[] {
  nodes = nodes.map((node) =>
    node.type !== "delimiter-run"
      ? node
      : {
          type: "delimiter",
          ch: DELIMITER_CLASS_MAP[node.ch],
          len: node.len,
          canOpen: node.canOpen,
          canClose: node.canClose,
        }
  );

  const stack: Frame[] = [];
  let currentNodes: IrNode[] = [];

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
      currentNodes.push({ type: "del", children: finalizeInlineNodes(inner) });
    } else if (delimiterLength === 2) {
      currentNodes.push({
        type: "strong",
        children: finalizeInlineNodes(inner),
      });
    } else {
      currentNodes.push({ type: "em", children: finalizeInlineNodes(inner) });
    }
  };

  function consumeDelimRun(delimiter: InlineDelimiter) {
    if (delimiter.ch === "~") {
      const odd = delimiter.len & 1;
      const pairs = Math.floor((delimiter.len - odd) / 2);
      const putOddBefore = odd && !(delimiter.canClose && !delimiter.canOpen);

      if (putOddBefore) currentNodes.push({ type: "text", value: "~" });

      for (let i = 0; i < pairs; i++) {
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

      if (odd && !putOddBefore) currentNodes.push({ type: "text", value: "~" });
      return;
    }

    let remaining = delimiter.len;

    const pieces: RunLength[] = [];
    while (remaining >= 2) {
      pieces.push(2);
      remaining -= 2;
    }
    if (remaining === 1) pieces.push(1);

    const canOpenOnly = delimiter.canOpen && !delimiter.canClose;
    const canCloseOnly = delimiter.canClose && !delimiter.canOpen;
    if (pieces.length === 2 && pieces[0] === 2 && pieces[1] === 1) {
      if (canOpenOnly) pieces.splice(0, 2, 1, 2);
      else if (!canCloseOnly) {
        const top = stack[stack.length - 1];
        if (
          delimiter.canClose &&
          top &&
          top.delimiterChar === delimiter.ch &&
          top.delimiterLength === 1
        ) {
          pieces.splice(0, 2, 1, 2);
        }
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

  for (const node of nodes) {
    if (
      node.type === "code" ||
      node.type === "a" ||
      node.type === "img" ||
      node.type === "em" ||
      node.type === "strong" ||
      node.type === "del"
    ) {
      currentNodes.push(node);
    } else if (node.type === "text") {
      currentNodes.push(node);
    } else if (node.type === "delimiter") {
      if (!node.canOpen && !node.canClose) {
        currentNodes.push({ type: "text", value: node.ch.repeat(node.len) });
      } else {
        consumeDelimRun(node);
      }
    } else {
      currentNodes.push(node);
    }
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

  const mergedNodes: IrNode[] = [];
  for (const node of currentNodes) {
    const last = mergedNodes[mergedNodes.length - 1];
    if (node.type === "text" && last && last.type === "text")
      last.value += node.value;
    else mergedNodes.push(node);
  }

  return mergedNodes;
}

function handleInlineNewline(inlineNodes: InlineAstNode[]): void {
  const hard =
    trimTwoTrailingSpaces(inlineNodes) || trimTrailingBackslash(inlineNodes);
  inlineNodes.push({ type: "linebreak", hard });
}

function trimTwoTrailingSpaces(inlineNodes: InlineAstNode[]): boolean {
  const last = inlineNodes[inlineNodes.length - 1];
  if (!last || last.type !== "text") return false;
  if (!last.value.endsWith("  ")) return false;
  last.value = last.value.slice(0, -2);
  if (last.value.length === 0) inlineNodes.pop();
  return true;
}

function trimTrailingBackslash(inlineNodes: InlineAstNode[]): boolean {
  const last = inlineNodes[inlineNodes.length - 1];
  if (!last || last.type !== "text") return false;
  if (!last.value.endsWith("\\")) return false;
  last.value = last.value.slice(0, -1);
  if (last.value.length === 0) inlineNodes.pop();
  return true;
}

function finalizeInlineNodes(nodesList: IrNode[]): InlineAstNode[] {
  const inlineNodes: InlineAstNode[] = [];

  for (const node of nodesList) {
    if (
      node.type === "code" ||
      node.type === "a" ||
      node.type === "img" ||
      node.type === "em" ||
      node.type === "strong" ||
      node.type === "del"
    ) {
      inlineNodes.push(node);
    } else if (node.type === "text") {
      appendText(inlineNodes, node.value);
    } else if (node.type === "newline") {
      handleInlineNewline(inlineNodes);
    } else {
      appendText(inlineNodes, irNodeToLiteralForFinalize(node));
    }
  }

  return inlineNodes;
}

function parseInline(str: string): InlineAstNode[] {
  let tokens = tokenize(str);
  tokens = applyBackslashEscapes(tokens);

  let nodes: IrNode[] = resolveCodeSpans(tokens);
  nodes = resolveLinksAndImages(nodes);
  nodes = resolveDelimiters(nodes);

  return finalizeInlineNodes(nodes);
}

// Types
type InlineAstNode =
  | TextNode
  | CodeNode
  | LinkNode
  | ImageNode
  | EmNode
  | StrongNode
  | DelNode
  | LinebreakNode;

type BlockAstNode =
  | ParagraphNode
  | HeadingNode
  | HorizontalRuleNode
  | PreNode
  | BlockquoteNode
  | ListNode
  | ListItemNode
  | TableNode
  | TableHeadNode
  | TableBodyNode
  | TableHeaderRowNode
  | TableBodyRowNode
  | TableHeaderCellNode
  | TableCellNode;

// Main AST node type returned by the exported AST builder
export type AstNode = InlineAstNode | BlockAstNode;
export type InlineNode = InlineAstNode;

type ParagraphNode = { type: "p"; children: InlineAstNode[] };

type Level = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingNode = {
  type: "h";

  level: Level;
  children: InlineAstNode[];
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

  align?: TableAlign;
  children: InlineAstNode[];
};

type TableCellNode = {
  type: "td";

  align?: TableAlign;
  children: InlineAstNode[];
};

type TextNode = { type: "text"; value: string };
type CodeNode = { type: "code"; value: string };
type LinkNode = {
  type: "a";

  url: string;
  children?: InlineAstNode[];
};
type ImageNode = { type: "img"; url: string; alt: string };
type EmNode = { type: "em"; children: InlineAstNode[] };
type StrongNode = { type: "strong"; children: InlineAstNode[] };
type DelNode = { type: "del"; children: InlineAstNode[] };
type LinebreakNode = { type: "linebreak"; hard: boolean };

type DelimiterChar = keyof typeof DELIMITER_CLASS_MAP;

type InlineToken =
  | { type: "text"; value: string }
  | { type: "newline" }
  | { type: "backslash" }
  | { type: "backtick-run"; len: number }
  | {
      type: "delimiter-run";
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

type InlineDelimiter = {
  type: "delimiter";
  ch: DelimiterChar;
  len: number;
  canOpen: boolean;
  canClose: boolean;
};

// intermediate representation node
type IrNode = InlineToken | InlineAstNode | InlineDelimiter;
