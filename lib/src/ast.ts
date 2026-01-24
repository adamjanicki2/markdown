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
    } else {
      const fence = parseFenceStart(line);
      if (fence) {
        flushParagraph();
        const lang = fence.info
          ? fence.info.split(RE_SPLIT_LANG)[0]
          : undefined;

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
        } else if (
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
        } else {
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
              } else if (isBlank(currentLine)) {
                break;
              } else {
                const currentIndent = getIndent(currentLine);
                if (currentIndent === 0 && parseListMarker(currentLine)) break;
                if (isOuterBlockStarter(currentLine)) break;

                blockquoteLines.push(currentLine);
                lineIndex++;
              }
            }

            nodes.push({
              type: "blockquote",
              children: buildAst(blockquoteLines.join("\n")),
            });
          } else {
            const firstListMarker = parseListMarker(line);
            if (firstListMarker) {
              flushParagraph();

              const ordered = firstListMarker.ordered;
              const start = firstListMarker.ordered
                ? firstListMarker.start
                : undefined;

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
                  } else {
                    const lineIndent = getIndent(currentLine);

                    if (sawBlankLine && lineIndent < listMarker.contentIndent)
                      break;

                    const nextListMarker = parseListMarker(currentLine);
                    if (
                      nextListMarker &&
                      nextListMarker.ordered === ordered &&
                      nextListMarker.indent === listIndent
                    ) {
                      break;
                    }

                    if (
                      lineIndent <= listIndent &&
                      isOuterBlockStarter(currentLine)
                    )
                      break;

                    if (lineIndent >= listMarker.contentIndent) {
                      listItemLines.push(
                        currentLine.slice(listMarker.contentIndent)
                      );
                      lineIndex++;
                    } else if (lineIndent > listIndent) {
                      const stripIndent = Math.min(lineIndent, listIndent + 1);
                      listItemLines.push(currentLine.slice(stripIndent));
                      lineIndex++;
                    } else {
                      listItemLines.push(currentLine);
                      lineIndex++;
                    }
                  }
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
            } else {
              paragraphLines.push(line);
              lineIndex++;
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
const DELIMITER_CHARS = Object.keys(DELIMITER_CLASS_MAP);

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

function mergeTextNodes(nodes: IrNode[] | InlineNode[], value: string) {
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

type InlineTokenByType = {
  [T in InlineToken["type"]]: Extract<InlineToken, { type: T }>;
};

type InlineTokenLiteralHandlers = {
  [T in InlineToken["type"]]: (token: InlineTokenByType[T]) => string;
};

const INLINE_TOKEN_LITERAL_HANDLERS: InlineTokenLiteralHandlers = {
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

function tokenToLiteral<T extends InlineToken["type"]>(
  token: InlineTokenByType[T]
): string {
  return INLINE_TOKEN_LITERAL_HANDLERS[token.type](token);
}

function tokenize(raw: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let textBuffer = "";

  const flushText = () => {
    if (!textBuffer) return;
    const last = tokens[tokens.length - 1];
    if (last && last.type === "text") last.value += textBuffer;
    else tokens.push({ type: "text", value: textBuffer });
    textBuffer = "";
  };

  const pushToken = (token: InlineToken) => {
    flushText();
    tokens.push(token);
  };

  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];

    if (char === "\n") {
      pushToken({ type: "newline" });
    } else if (char === "\\") {
      pushToken({ type: "backslash" });
    } else if (char === "!") {
      pushToken({ type: "bang" });
    } else if (char === "[") {
      pushToken({ type: "lbracket" });
    } else if (char === "]") {
      pushToken({ type: "rbracket" });
    } else if (char === "(") {
      pushToken({ type: "lparen" });
    } else if (char === ")") {
      pushToken({ type: "rparen" });
    } else if (char === "`") {
      let runIndex = index + 1;
      while (runIndex < raw.length && raw[runIndex] === "`") runIndex++;
      pushToken({ type: "backtick_run", len: runIndex - index });
      index = runIndex - 1;
    } else if (
      char === "_" &&
      isAlphanum(raw[index - 1]) &&
      isAlphanum(raw[index + 1])
    ) {
      textBuffer += char;
    } else if (DELIMITER_CHARS.includes(char)) {
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
    } else {
      textBuffer += char;
    }
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
  const tokensOut: InlineToken[] = [];

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
    } else {
      const nextToken = tokens[tokenIndex + 1];
      if (!nextToken) {
        pushText("\\");
      } else {
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
        } else {
          pushText("\\");
        }
      }
    }
  }

  const mergedTokens: InlineToken[] = [];
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

function resolveCodeSpans(tokens: InlineToken[]): IrNode[] {
  const nodesOut: IrNode[] = [];

  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    const token = tokens[tokenIndex];

    if (token.type !== "backtick_run") {
      nodesOut.push(token);
    } else {
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
        mergeTextNodes(nodesOut, "`".repeat(openerLen));
      } else {
        let codeRaw = "";
        for (
          let innerIndex = tokenIndex + 1;
          innerIndex < closingIndex;
          innerIndex++
        ) {
          codeRaw += tokenToLiteral(tokens[innerIndex]);
        }

        nodesOut.push({ type: "code", value: codeRaw });
        tokenIndex = closingIndex;
      }
    }
  }

  const mergedNodes: IrNode[] = [];
  for (const node of nodesOut) {
    if (node.type === "text") mergeTextNodes(mergedNodes, node.value);
    else mergedNodes.push(node);
  }
  return mergedNodes;
}

function irNodeToToken(node: IrNode): InlineToken | null {
  if (node.type === "code" || node.type === "a" || node.type === "img")
    return null;
  return node as InlineToken;
}

function irNodeToLiteral(node: IrNode): string {
  if (node.type === "text") return node.value;
  if (node.type === "code") return "`" + node.value + "`";

  if (node.type === "softbreak") return " ";
  if (node.type === "hardbreak") return "\n";

  if (node.type === "a") return "";
  if (node.type === "img") return "";

  if (node.type === "em") return irNodesToLiteral(node.children);
  if (node.type === "strong") return irNodesToLiteral(node.children);
  if (node.type === "del") return irNodesToLiteral(node.children);

  if (node.type === "delimiter") return node.ch.repeat(node.len);

  return tokenToLiteral(node);
}

function irNodesToLiteral(nodes: IrNode[] | InlineNode[]): string {
  let literalText = "";
  for (const node of nodes) {
    literalText += irNodeToLiteral(node);
  }
  return literalText;
}

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

  const leftBracketToken = irNodeToToken(nodes[leftBracketIndex]);
  if (!leftBracketToken || leftBracketToken.type !== "lbracket") return null;

  let rightBracketIndex = leftBracketIndex + 1;
  while (rightBracketIndex < nodes.length) {
    const candidateToken = irNodeToToken(nodes[rightBracketIndex]);
    if (candidateToken && candidateToken.type === "rbracket") break;
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
  const labelRaw = irNodesToLiteral(labelNodes);

  if (!url) return null;

  if (isBang) {
    return {
      node: { type: "img", url, alt: labelRaw },
      nextIndex: rightParenIndex,
    };
  }

  const children = parseInline(labelRaw);
  return {
    node: { type: "a", url, children },
    nextIndex: rightParenIndex,
  };
}

function resolveLinksAndImages(nodes: IrNode[]): IrNode[] {
  const nodesOut: IrNode[] = [];

  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
    const parsed = parseLinkOrImage(nodes, nodeIndex);
    if (parsed) {
      nodesOut.push(parsed.node);
      nodeIndex = parsed.nextIndex;
    } else {
      nodesOut.push(nodes[nodeIndex]);
    }
  }

  const mergedNodes: IrNode[] = [];
  for (const node of nodesOut) {
    if (node.type === "text") mergeTextNodes(mergedNodes, node.value);
    else mergedNodes.push(node);
  }
  return mergedNodes;
}

function expandDelimRuns(nodes: IrNode[]): IrNode[] {
  const nodesOut: IrNode[] = [];
  for (const node of nodes) {
    if (node.type !== "delimiter_run") {
      nodesOut.push(node);
    } else {
      nodesOut.push({
        type: "delimiter",
        ch: delimClass(node.ch),
        len: node.len,
        canOpen: node.canOpen,
        canClose: node.canClose,
      });
    }
  }
  return nodesOut;
}

function isDelimiter(node: IrNode): node is InlineDelimiter {
  return node.type === "delimiter";
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
    node.type === "delimiter_run" ||
    node.type === "backtick_run" ||
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

function resolveDelimiters(nodesIn: IrNode[]): IrNode[] {
  const nodes = expandDelimRuns(nodesIn);

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
      currentNodes.push({ type: "del", children: finalizeInline(inner) });
    } else if (delimiterLength === 2) {
      currentNodes.push({ type: "strong", children: finalizeInline(inner) });
    } else {
      currentNodes.push({ type: "em", children: finalizeInline(inner) });
    }
  };

  function finalizeInline(nodesList: IrNode[]): InlineNode[] {
    const inlineNodes: InlineNode[] = [];

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
        mergeTextNodes(inlineNodes, node.value);
      } else if (node.type === "newline") {
        const hard = trimTwoTrailingSpaces(inlineNodes);
        pushBreak(inlineNodes, hard);
      } else {
        mergeTextNodes(inlineNodes, irNodeToLiteralForFinalize(node));
      }
    }

    return inlineNodes;
  }

  function consumeDelimRun(delimiter: InlineDelimiter) {
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

    const pieces: RunLength[] = [];
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
    } else if (isDelimiter(node)) {
      if (!node.canOpen && !node.canClose) {
        currentNodes.push({
          type: "text",
          value: node.ch.repeat(node.len),
        });
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

  let nodes: IrNode[] = resolveCodeSpans(tokens);
  nodes = resolveLinksAndImages(nodes);
  nodes = resolveDelimiters(nodes);

  const inlineNodes: InlineNode[] = [];
  for (const node of nodes) {
    if (node.type === "newline") {
      const hard = trimTwoTrailingSpaces(inlineNodes);
      pushBreak(inlineNodes, hard);
    } else if (
      node.type === "code" ||
      node.type === "a" ||
      node.type === "img" ||
      node.type === "em" ||
      node.type === "strong" ||
      node.type === "del"
    ) {
      inlineNodes.push(node);
    } else if (node.type === "text") {
      mergeTextNodes(inlineNodes, node.value);
    } else {
      mergeTextNodes(inlineNodes, irNodeToLiteralForFinalize(node));
    }
  }
  return inlineNodes;
}

// Types

// Main AST node type returned by the exported AST builder
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

// Main inline node type for nodes that can be found within a single block
// and can't reenter into the main AstNode type
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

type DelimiterChar = keyof typeof DELIMITER_CLASS_MAP;

type InlineToken =
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

type InlineDelimiter = {
  type: "delimiter";
  ch: DelimiterChar;
  len: number;
  canOpen: boolean;
  canClose: boolean;
};

// intermediate representation node
type IrNode = InlineToken | InlineNode | InlineDelimiter;
