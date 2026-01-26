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
      continue;
    }

    if (getIndent(line) >= 4) {
      flushParagraph();
      const pre: string[] = [];
      while (lineIndex < lines.length) {
        const currentLine = lines[lineIndex];
        if (isBlank(currentLine)) {
          pre.push("");
          lineIndex++;
          continue;
        }
        if (!RE_INDENTED_CODE.test(currentLine)) break;
        pre.push(currentLine.slice(4));
        lineIndex++;
      }
      nodes.push({ type: "pre", lang: undefined, raw: pre.join("\n") });
      continue;
    }

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
      continue;
    }

    const list = parseListNode(lines, lineIndex, isTopLevelNodeStarter);
    if (list) {
      flushParagraph();
      nodes.push(list.node);
      lineIndex = list.nextIndex;
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

    const table = parseTableNode(lines, lineIndex);
    if (table) {
      flushParagraph();
      nodes.push(table.node);
      lineIndex = table.nextIndex;
      continue;
    }

    const blockquote = parseBlockquoteNode(
      lines,
      lineIndex,
      isTopLevelNodeStarter
    );
    if (blockquote) {
      flushParagraph();
      nodes.push(blockquote.node);
      lineIndex = blockquote.nextIndex;
      continue;
    }

    paragraph.push(line);
    lineIndex++;
  }

  flushParagraph();
  return nodes;
}

// Helper functions
const splitLines = (str: string) => str.replace(RE_NEWLINES, "\n").split("\n");
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

function isToken(node: IrNode): node is InlineToken {
  return (TOKEN_TYPES as Set<string>).has(node.type);
}

function appendText(nodes: IrNode[], value: string) {
  if (!value) return;
  const last = nodes[nodes.length - 1];
  if (last && last.type === "text") last.value += value;
  else nodes.push({ type: "text", value });
}

const isTextNode = (node: IrNode | InlineToken): node is TextNode =>
  node.type === "text";
function mergeAdjacentText<T extends IrNode | InlineToken>(nodes: T[]): T[] {
  const merged: T[] = [];
  for (const node of nodes) {
    const last = merged[merged.length - 1];
    if (last && isTextNode(node) && isTextNode(last)) {
      last.value += node.value;
    } else {
      merged.push(node);
    }
  }
  return merged;
}

const LITERAL_MAP: Record<string, string> = {
  newline: "\n",
  linebreak: "\n",
  lbracket: "[",
  rbracket: "]",
  lparen: "(",
  rparen: ")",
  bang: "!",
  backslash: "\\",
  "escaped-backslash": "\\",
};

function nodeToLiteral(node: IrNode): string {
  if (node.type === "text") return node.value;
  if (node.type in LITERAL_MAP) return LITERAL_MAP[node.type];
  if (node.type === "delimiter") return node.ch.repeat(node.len);
  if (node.type === "backtick") return "`".repeat(node.len);
  if (node.type === "code") return "`" + node.value + "`";
  if (node.type === "em" || node.type === "strong" || node.type === "del")
    return nodesToLiteral(node.children);
  return "";
}

function nodesToLiteral(nodes: IrNode[]): string {
  return nodes.reduce((acc, node) => acc + nodeToLiteral(node), "");
}

const isHorizontalRule = (str: string) => RE_HR.test(str);

function parseHeading(line: string) {
  const m = RE_HEADING.exec(line);
  return m
    ? {
        level: Math.min(m[1].length, 6) as Level,
        raw: m[2].replace(RE_HEADING_TRAIL, ""),
      }
    : null;
}

function parseFenceStart(line: string) {
  const m = RE_FENCE_START.exec(line);
  return m ? { fenceLen: m[1].length, info: (m[2] || "").trim() } : null;
}

function isFenceEnd(str: string, fenceLen: number) {
  const s = str.replace(RE_FENCE_LEADING_SPACES, "").trimEnd();
  return RE_FENCE_TICKS.test(s) && s.length >= fenceLen;
}

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
      markerChar: uliMatches[1],
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
  if (marker.ordered) return false;
  if (isHorizontalRule(line)) return true;
  const rest = line.slice(marker.contentIndent).replace(/[ \t]/g, "");
  return (
    rest.length >= 3 &&
    new Set(rest).size === 1 &&
    rest[0] === marker.markerChar
  );
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
  const info = getBlockquoteInfo(str);
  if (!info) return null;
  return info.depth === 1
    ? info.content
    : ">".repeat(info.depth - 1) + " " + info.content;
}

function splitTableRow(str: string): string[] {
  let text = str.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);

  const cells: string[] = [];
  let current = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    const nextChar = text[index + 1];
    if (char === "\\" && nextChar === "|") {
      current += "|";
      index += 2;
      continue;
    }
    if (char === "|") {
      cells.push(current.trim());
      current = "";
      index++;
      continue;
    }
    current += char;
    index++;
  }
  cells.push(current.trim());
  return cells;
}

function parseTableAlignments(
  line: string,
  minDashes: number,
  allowColons: boolean
): Array<TableAlign | undefined> | null {
  const cells = splitTableRow(line);
  if (cells.length <= 1) return null;

  const delimRegex = minDashes >= 3 ? RE_TABLE_DELIM_MIN3 : RE_TABLE_DELIM_MIN1;
  const alignments: Array<TableAlign | undefined> = [];

  for (const cell of cells) {
    const trimmed = cell.replace(RE_WHITESPACE, "");
    if (trimmed.length === 0) return null;
    if (!allowColons && trimmed.includes(":")) return null;
    const nocolon = trimmed.replace(RE_COLON, "");
    const dashCount = nocolon.split("-").length - 1;
    if (dashCount < minDashes) return null;

    if (RE_TABLE_ALIGN_CENTER.test(trimmed)) alignments.push("center");
    else if (RE_TABLE_ALIGN_LEFT.test(trimmed)) alignments.push("left");
    else if (RE_TABLE_ALIGN_RIGHT.test(trimmed)) alignments.push("right");
    else if (delimRegex.test(trimmed)) alignments.push(undefined);
    else return null;
  }

  return alignments;
}

function buildTableNode(
  header: string[],
  rows: string[][],
  alignments: Array<TableAlign | undefined>
): TableNode {
  const headRow: TableRowNode<TableHeaderCellNode> = {
    type: "tr",
    cells: header.map((cellValue, cellIndex) => ({
      type: "th",
      align: alignments[cellIndex],
      children: parseInline(cellValue),
    })),
  };

  const bodyRows: TableRowNode<TableBodyCellNode>[] = rows.map((row) => ({
    type: "tr",
    cells: row.map((cellValue, cellIndex) => ({
      type: "td",
      align: alignments[cellIndex],
      children: parseInline(cellValue),
    })),
  }));

  return {
    type: "table",
    head: { type: "thead", row: headRow },
    body: { type: "tbody", rows: bodyRows },
  };
}

function parseTableNode(
  lines: string[],
  lineIndex: number
): NodeParseResult<TableNode> | null {
  const line = lines[lineIndex];
  const header = splitTableRow(line);
  if (header.length <= 1 || lineIndex + 1 >= lines.length) return null;
  const trimmed = line.trim();
  const outerPipes = trimmed.startsWith("|") && trimmed.endsWith("|");
  const minDashes = outerPipes ? 1 : 3;
  const alignments = parseTableAlignments(
    lines[lineIndex + 1],
    minDashes,
    outerPipes
  );
  if (!alignments || alignments.length !== header.length) return null;

  const headerLength = header.length;
  let currentIndex = lineIndex + 2;

  const rows: string[][] = [];
  while (currentIndex < lines.length && !isBlank(lines[currentIndex])) {
    const rowLine = lines[currentIndex];
    const rowCells = rowLine.includes("|") ? splitTableRow(rowLine) : null;
    const isCandidate = rowCells !== null && rowCells.length > 1;
    if (!isCandidate && isTopLevelNodeStarter(rowLine)) break;

    const row = isCandidate ? rowCells : [rowLine.trim()];
    while (row.length < headerLength) row.push("");
    rows.push(row.slice(0, headerLength));
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
      if (otherMarker && otherMarker.ordered && otherMarker.indent >= 4) {
        const trimmedLine = currentLine.slice(lineIndent);
        const lastIndex = listItem.length - 1;
        listItem[lastIndex] = listItem[lastIndex] + trimmedLine;
        lineIndex++;
        continue;
      }

      if (lineIndent <= indent && isTopLevelNodeStarter(currentLine)) break;

      let sliceAt = 0;
      if (lineIndent >= listMarker.contentIndent) {
        sliceAt = listMarker.contentIndent;
        if (
          lineIndent > listMarker.contentIndent &&
          !parseListMarker(currentLine.slice(listMarker.contentIndent))
        )
          sliceAt = lineIndent;
      } else if (lineIndent > indent) {
        sliceAt = Math.min(lineIndent, indent + 1);
      }
      listItem.push(currentLine.slice(sliceAt));
      lineIndex++;
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
      if (strippedLine.trim() === "") {
        let lookaheadIndex = lineIndex + 1;
        while (lookaheadIndex < lines.length && isBlank(lines[lookaheadIndex]))
          lookaheadIndex++;
        const nextLine =
          lookaheadIndex < lines.length ? lines[lookaheadIndex] : null;
        if (!nextLine || stripBlockquoteMarker(nextLine) === null) {
          lineIndex++;
          break;
        }
      }
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

    const simple = SIMPLE_TOKENS[char];
    if (simple) pushToken(simple);
    else if (char === "`") {
      let runIndex = i + 1;
      while (runIndex < str.length && str[runIndex] === "`") runIndex++;
      pushToken({ type: "backtick", len: runIndex - i });
      i = runIndex - 1;
    } else if (char === "_" && isAlphanum(str[i - 1]) && isAlphanum(str[i + 1]))
      text += char;
    else if ((DELIMITER_CHARS as readonly string[]).includes(char)) {
      let runIndex = i + 1;
      while (runIndex < str.length && str[runIndex] === char) runIndex++;
      const prevChar: string | undefined = str[i - 1];
      const nextChar: string | undefined = str[runIndex];
      if (char === "_" && isAlphanum(prevChar) && isAlphanum(nextChar)) {
        text += char.repeat(runIndex - i);
        i = runIndex - 1;
        continue;
      }
      const canOpen = !isSpace(nextChar);
      const canClose = !isSpace(prevChar);

      pushToken({
        type: "delimiter",
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

function applyBackslashEscapes(tokens: InlineToken[]): InlineToken[] {
  const transformed: InlineToken[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== "backslash") transformed.push(token);
    else {
      const nextToken = tokens[i + 1];
      if (!nextToken) appendText(transformed, "\\");
      else {
        const literal = nodeToLiteral(nextToken);
        const escapedChar = literal[0];

        if (ESCAPABLE.has(escapedChar)) {
          if (nextToken.type === "backslash")
            transformed.push({ type: "escaped-backslash" });
          else appendText(transformed, escapedChar);

          if (nextToken.type === "delimiter" && nextToken.len > 1)
            transformed.push({
              ...nextToken,
              len: nextToken.len - 1,
              canOpen: true,
              canClose: true,
            });
          else if (nextToken.type === "backtick" && nextToken.len > 1)
            transformed.push({ ...nextToken, len: nextToken.len - 1 });
          else if (nextToken.type === "text" && nextToken.value.length > 1)
            appendText(transformed, nextToken.value.slice(1));

          i++;
        } else appendText(transformed, "\\");
      }
    }
  }

  return mergeAdjacentText(transformed);
}

function resolveCodeSpans(tokens: InlineToken[]): IrNode[] {
  const nodes: IrNode[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type !== "backtick") nodes.push(token);
    else {
      const openerLen = token.len;

      let closingIndex = i + 1;
      while (closingIndex < tokens.length) {
        const candidateToken = tokens[closingIndex];
        if (
          candidateToken.type === "backtick" &&
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
          code += nodeToLiteral(tokens[j]);
        }

        nodes.push({ type: "code", value: code });
        i = closingIndex;
      }
    }
  }

  return mergeAdjacentText(nodes);
}

function parseLinkOrImage(
  nodes: IrNode[],
  startIndex: number
): { node: IrNode; nextIndex: number } | null {
  const startNode = nodes[startIndex];
  if (!isToken(startNode)) return null;

  const isBang = startNode.type === "bang";
  const leftBracketIndex = isBang ? startIndex + 1 : startIndex;
  if (leftBracketIndex >= nodes.length) return null;

  const leftBracketNode = nodes[leftBracketIndex];
  if (!isToken(leftBracketNode) || leftBracketNode.type !== "lbracket")
    return null;

  let rightBracketIndex = leftBracketIndex + 1;
  let bracketDepth = 0;
  while (rightBracketIndex < nodes.length) {
    const candidate = nodes[rightBracketIndex];
    if (!isToken(candidate)) {
      rightBracketIndex++;
      continue;
    }
    if (candidate.type === "lbracket") {
      bracketDepth++;
      rightBracketIndex++;
      continue;
    }
    if (candidate.type === "rbracket") {
      if (bracketDepth === 0) break;
      bracketDepth--;
    }
    rightBracketIndex++;
  }
  if (rightBracketIndex >= nodes.length) return null;

  const leftParenNode = nodes[rightBracketIndex + 1];
  if (
    !leftParenNode ||
    !isToken(leftParenNode) ||
    leftParenNode.type !== "lparen"
  )
    return null;

  let rightParenIndex = rightBracketIndex + 2;
  let parenDepth = 0;
  while (rightParenIndex < nodes.length) {
    const candidate = nodes[rightParenIndex];
    if (isToken(candidate) && candidate.type === "lparen") parenDepth++;
    else if (isToken(candidate) && candidate.type === "rparen") {
      if (parenDepth === 0) break;
      parenDepth--;
    }
    rightParenIndex++;
  }
  if (rightParenIndex >= nodes.length) return null;

  const labelNodes = nodes.slice(leftBracketIndex + 1, rightBracketIndex);
  const urlNodes = nodes.slice(rightBracketIndex + 2, rightParenIndex);

  const url = nodesToLiteral(urlNodes).trim();
  const label = nodesToLiteral(labelNodes);

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
    } else if (node.type === "text") {
      let combinedText = node.value;
      let lookaheadIndex = i + 1;
      while (lookaheadIndex < nodes.length) {
        const nextNode = nodes[lookaheadIndex];
        if (nextNode.type === "text") combinedText += nextNode.value;
        else if (nextNode.type === "lparen" || nextNode.type === "rparen")
          combinedText += nodeToLiteral(nextNode);
        else break;
        lookaheadIndex++;
      }
      nodesOut.push(...parseAutolinksFromText(combinedText));
      i = lookaheadIndex - 1;
    } else nodesOut.push(node);
  }

  return mergeAdjacentText(nodesOut);
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
    if (lastChar === ")") {
      const openCount = url.split("(").length - 1;
      const closeCount = url.split(")").length - 1;
      if (closeCount <= openCount) break;
    }
    url = url.slice(0, -1);
    trailing = lastChar + trailing;
  }

  return { url, trailing };
}

function resolveDelimiters(nodes: IrNode[]): IrNode[] {
  const stack: Frame[] = [];
  let currentNodes: IrNode[] = [];

  const open = (
    delimiterChar: Frame["delimiterChar"],
    delimiterLength: Frame["delimiterLength"]
  ) => {
    stack.push({ delimiterChar, delimiterLength, nodes: currentNodes });
    currentNodes = [];
  };

  const close = (ch: Frame["delimiterChar"], len: Frame["delimiterLength"]) => {
    const inner = currentNodes;
    const frame = stack.pop();
    if (!frame) return;
    currentNodes = frame.nodes;
    const children = finalizeInlineNodes(inner);
    if (ch === "~") currentNodes.push({ type: "del", children });
    else if (len === 2) currentNodes.push({ type: "strong", children });
    else currentNodes.push({ type: "em", children });
  };

  const emitText = (ch: string, len: number) =>
    currentNodes.push({ type: "text", value: ch.repeat(len) });

  function consumeDelimRun(delimiter: DelimiterToken) {
    if (delimiter.ch === "~") {
      const odd = delimiter.len & 1;
      const pairs = (delimiter.len - odd) >> 1;
      const putOddBefore = odd && !(delimiter.canClose && !delimiter.canOpen);
      if (putOddBefore) emitText("~", 1);
      for (let i = 0; i < pairs; i++) {
        const top = stack[stack.length - 1];
        if (
          delimiter.canClose &&
          top?.delimiterChar === "~" &&
          top.delimiterLength === 2
        )
          close("~", 2);
        else if (delimiter.canOpen) open("~", 2);
        else emitText("~", 2);
      }
      if (odd && !putOddBefore) emitText("~", 1);
      return;
    }

    let remaining = delimiter.len;
    const pieces: number[] = [];
    while (remaining >= 2) {
      pieces.push(2);
      remaining -= 2;
    }
    if (remaining === 1) pieces.push(1);
    if (pieces.length === 2 && pieces[0] === 2 && pieces[1] === 1) {
      const top = stack[stack.length - 1];
      if (
        delimiter.canOpen &&
        !(delimiter.canClose && top?.delimiterChar === delimiter.ch)
      )
        pieces.splice(0, 2, 1, 2);
    }

    for (const pieceLen of pieces) {
      while (true) {
        const top = stack[stack.length - 1];
        const canClose =
          delimiter.canClose &&
          top?.delimiterChar === delimiter.ch &&
          top.delimiterLength === pieceLen;
        if (canClose && !currentNodes.length) {
          emitText(delimiter.ch, pieceLen);
          break;
        }
        if (canClose) {
          close(delimiter.ch, pieceLen);
          break;
        }
        if (delimiter.canOpen) {
          open(delimiter.ch, pieceLen);
          break;
        }
        if (!currentNodes.length && top) {
          const frame = stack.pop()!;
          currentNodes = frame.nodes;
          emitText(frame.delimiterChar, frame.delimiterLength);
        } else {
          emitText(delimiter.ch, pieceLen);
          break;
        }
      }
    }
  }

  for (const node of nodes) {
    if (node.type === "delimiter") {
      if (!node.canOpen && !node.canClose) emitText(node.ch, node.len);
      else consumeDelimRun(node);
    } else currentNodes.push(node);
  }

  while (stack.length) {
    const frame = stack.pop();
    if (!frame) break;
    const inner = currentNodes;
    currentNodes = frame.nodes;
    emitText(frame.delimiterChar, frame.delimiterLength);
    currentNodes.push(...inner);
  }

  return mergeAdjacentText(currentNodes);
}

function handleInlineNewline(inlineNodes: InlineAstNode[]): void {
  const last = inlineNodes[inlineNodes.length - 1];
  let hard = false;
  if (last && last.type === "text") {
    if (last.value.endsWith("  ")) {
      last.value = last.value.slice(0, -2);
      hard = true;
    } else if (last.value.endsWith("\\")) {
      last.value = last.value.slice(0, -1);
      hard = true;
    }
    if (hard && !last.value) inlineNodes.pop();
  }
  inlineNodes.push({ type: "linebreak", hard });
}

function finalizeInlineNodes(nodesList: IrNode[]): InlineAstNode[] {
  const inlineNodes: InlineAstNode[] = [];
  let lastEscapedBackslash = false;

  for (const node of nodesList) {
    if (node.type === "text") {
      appendText(inlineNodes, node.value);
      lastEscapedBackslash = false;
    } else if (node.type === "escaped-backslash") {
      appendText(inlineNodes, "\\");
      lastEscapedBackslash = true;
    } else if (node.type === "newline") {
      if (lastEscapedBackslash) {
        inlineNodes.push({ type: "linebreak", hard: false });
        lastEscapedBackslash = false;
      } else {
        handleInlineNewline(inlineNodes);
      }
    } else if (isToken(node)) {
      appendText(inlineNodes, nodeToLiteral(node));
      lastEscapedBackslash = false;
    } else {
      inlineNodes.push(node);
      lastEscapedBackslash = false;
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

// Constants
const DELIMITER_CHARS = ["*", "_", "~"] as const;
const SIMPLE_TOKENS: Record<string, InlineToken> = {
  "\n": { type: "newline" },
  "\\": { type: "backslash" },
  "!": { type: "bang" },
  "[": { type: "lbracket" },
  "]": { type: "rbracket" },
  "(": { type: "lparen" },
  ")": { type: "rparen" },
};

const RE_HR = /^[ ]{0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const RE_NEWLINES = /\r\n?/g;
const RE_LEADING_SPACES = /^ */;
const RE_HEADING = /^[ ]{0,3}(#{1,6})[ \t]+(.*)$/;
const RE_HEADING_TRAIL = /[ \t]+#+[ \t]*$/;
const RE_FENCE_START = /^[ ]{0,3}(`{3,})(.*)$/;
const RE_FENCE_LEADING_SPACES = /^[ ]{0,3}/;
const RE_FENCE_TICKS = /^`{3,}$/;
const RE_INDENTED_CODE = /^ {4}/;
const RE_UL_MARKER = /^([-+*])(?:[ \t]+|$)/;
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
const RE_AUTOLINK_URL = /(^|[^A-Za-z])https?:\/\/[^\s]+/g;
const RE_AUTOLINK_TRAILING_PUNCT = /[),.!?;:]/;

const ESCAPABLE = new Set("\\`*_~{}[]()#+-.!|>".split(""));

const TOKEN_TYPES = new Set<InlineToken["type"]>([
  "text",
  "newline",
  "backslash",
  "escaped-backslash",
  "backtick",
  "delimiter",
  "lbracket",
  "rbracket",
  "lparen",
  "rparen",
  "bang",
]);

// Types
type Level = 1 | 2 | 3 | 4 | 5 | 6;
type TableAlign = "left" | "right" | "center";
type DelimiterChar = (typeof DELIMITER_CHARS)[number];

type TextNode = { type: "text"; value: string };
type CodeNode = { type: "code"; value: string };
type LinkNode = { type: "a"; url: string; children?: InlineAstNode[] };
type ImageNode = { type: "img"; url: string; alt: string };
type EmNode = { type: "em"; children: InlineAstNode[] };
type StrongNode = { type: "strong"; children: InlineAstNode[] };
type DelNode = { type: "del"; children: InlineAstNode[] };
type LinebreakNode = { type: "linebreak"; hard: boolean };

type InlineAstNode =
  | TextNode
  | CodeNode
  | LinkNode
  | ImageNode
  | EmNode
  | StrongNode
  | DelNode
  | LinebreakNode;

type DelimiterToken = {
  type: "delimiter";
  ch: DelimiterChar;
  len: number;
  canOpen: boolean;
  canClose: boolean;
};

type InlineToken =
  | TextNode
  | DelimiterToken
  | { type: "newline" }
  | { type: "backslash" }
  | { type: "escaped-backslash" }
  | { type: "backtick"; len: number }
  | { type: "lbracket" }
  | { type: "rbracket" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "bang" };

type IrNode = InlineToken | InlineAstNode;

type ParagraphNode = { type: "p"; children: InlineAstNode[] };
type HeadingNode = { type: "h"; level: Level; children: InlineAstNode[] };
type HorizontalRuleNode = { type: "hr" };
type PreNode = { type: "pre"; lang?: string; raw: string };
type BlockquoteNode = { type: "blockquote"; children: AstNode[] };

type ListItemNode = { type: "li"; children: AstNode[] };
type ListNode = {
  type: "list";
  ordered: boolean;
  start?: number;
  tight: boolean;
  items: ListItemNode[];
};

type TableHeaderCellNode = {
  type: "th";
  align?: TableAlign;
  children: InlineAstNode[];
};

type TableBodyCellNode = {
  type: "td";
  align?: TableAlign;
  children: InlineAstNode[];
};

type TableRowNode<
  TableCellNode extends TableHeaderCellNode | TableBodyCellNode,
> = {
  type: "tr";
  cells: TableCellNode[];
};

type TableHeadNode = {
  type: "thead";
  row: TableRowNode<TableHeaderCellNode>;
};

type TableBodyNode = {
  type: "tbody";
  rows: TableRowNode<TableBodyCellNode>[];
};

type TableNode = {
  type: "table";
  head: TableHeadNode;
  body: TableBodyNode;
};

type BlockAstNode =
  | ParagraphNode
  | HeadingNode
  | HorizontalRuleNode
  | PreNode
  | BlockquoteNode
  | ListNode
  | ListItemNode
  | TableNode;

export type AstNode = InlineAstNode | BlockAstNode;

type NodeParseResult<NodeType extends AstNode> = {
  node: NodeType;
  nextIndex: number;
};

type ListMarker = {
  ordered: boolean;
  indent: number;
  markerWidth: number;
  contentIndent: number;
  markerChar: string;
  start?: number;
};

type Frame = {
  delimiterChar: DelimiterChar;
  delimiterLength: number;
  nodes: IrNode[];
};
