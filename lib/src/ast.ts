import {
  appendNode,
  insertNode,
  mapWhile,
  removeNode,
  type LinkedList,
  type LinkedListNode,
} from "./list";

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

      nodes.push({ type: "pre", lang, value: pre.join("\n") });
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

function nodeToLiteral(node: IrNode): string {
  if (node.type === "text") return node.value;
  if (node.type === "punct") return node.char;
  if (node.type === "delimiter") return node.char.repeat(node.len);
  if (node.type === "backtick") return "`".repeat(node.len);
  if (node.type === "code") return "`" + node.value + "`";
  if (node.type === "br" || node.type === "newline") return "\n";
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
  const thead: TableHeadNode = {
    type: "thead",
    children: [
      {
        type: "tr",
        children: header.map((cellValue, cellIndex) => ({
          type: "th",
          align: alignments[cellIndex],
          children: parseInline(cellValue),
        })),
      },
    ],
  };

  const tbody: TableBodyNode = {
    type: "tbody",
    children: rows.map((row) => ({
      type: "tr",
      children: row.map((cellValue, cellIndex) => ({
        type: "td",
        align: alignments[cellIndex],
        children: parseInline(cellValue),
      })),
    })),
  };

  return {
    type: "table",
    children: [thead, tbody],
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
  const children: ListItemNode[] = [];
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

    children.push({ type: "li", children: buildAst(listItem.join("\n")) });
    if (lineIndex < lines.length && isBlank(lines[lineIndex])) break;
  }

  if (tight) {
    for (const child of children) {
      child.children = child.children.flatMap((grandchild) =>
        grandchild.type === "p" ? grandchild.children : grandchild
      );
    }
  }

  return {
    node: { type: "list", ordered, start, tight, children },
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

    if (char === "\n") pushToken({ type: "newline" });
    else if (char === "\\") {
      const nextChar = str[i + 1];
      if (nextChar && ESCAPABLE.has(nextChar)) {
        text += nextChar;
        i++;
      } else {
        text += "\\";
      }
    } else if ("[]()!".includes(char)) pushToken({ type: "punct", char });
    else if (char === "`" || char in DELIMITER_CONFIGS) {
      let runIndex = i + 1;
      while (runIndex < str.length && str[runIndex] === char) runIndex++;

      if (char === "`") {
        pushToken({ type: "backtick", len: runIndex - i });
      } else {
        const config = DELIMITER_CONFIGS[char];
        const prevChar = str[i - 1];
        const nextChar = str[runIndex];

        if (
          !config?.intraword &&
          isAlphanum(prevChar) &&
          isAlphanum(nextChar)
        ) {
          text += char.repeat(runIndex - i);
        } else {
          pushToken({
            type: "delimiter",
            char,
            len: runIndex - i,
            canOpen: !isSpace(nextChar),
            canClose: !isSpace(prevChar),
          });
        }
      }
      i = runIndex - 1;
    } else text += char;
  }

  flushText();
  return tokens;
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

function isPunctChar(node: IrNode, char: string): node is PunctToken {
  return isToken(node) && node.type === "punct" && node.char === char;
}

function parseLinkOrImage(
  nodes: IrNode[],
  startIndex: number
): { node: IrNode; nextIndex: number } | null {
  const startNode = nodes[startIndex];
  if (!isToken(startNode)) return null;

  const isBang = isPunctChar(startNode, "!");
  const leftBracketIndex = isBang ? startIndex + 1 : startIndex;
  if (
    leftBracketIndex >= nodes.length ||
    !isPunctChar(nodes[leftBracketIndex], "[")
  )
    return null;

  let rightBracketIndex = leftBracketIndex + 1;
  let bracketDepth = 0;
  while (rightBracketIndex < nodes.length) {
    const candidate = nodes[rightBracketIndex];
    if (isPunctChar(candidate, "[")) bracketDepth++;
    else if (isPunctChar(candidate, "]")) {
      if (bracketDepth === 0) break;
      bracketDepth--;
    }
    rightBracketIndex++;
  }
  if (rightBracketIndex >= nodes.length) return null;

  const leftParenNode = nodes[rightBracketIndex + 1];
  if (!leftParenNode || !isPunctChar(leftParenNode, "(")) return null;

  let rightParenIndex = rightBracketIndex + 2;
  let parenDepth = 0;
  while (rightParenIndex < nodes.length) {
    const candidate = nodes[rightParenIndex];
    if (isPunctChar(candidate, "(")) parenDepth++;
    else if (isPunctChar(candidate, ")")) {
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
    } else {
      nodesOut.push(node);
    }
  }

  return mergeAdjacentText(nodesOut);
}

function resolveDelimiters(nodes: IrNode[]): IrNode[] {
  const list: LinkedList<IrNode> = {};
  const delimiterList: LinkedList<Delimiter> = {};

  for (const node of nodes) {
    if (node.type === "delimiter") {
      if (!node.canOpen && !node.canClose) {
        appendNode(list, { type: "text", value: node.char.repeat(node.len) });
      } else {
        appendNode(delimiterList, {
          char: node.char,
          length: node.len,
          canOpen: node.canOpen,
          canClose: node.canClose,
          node: appendNode(list, {
            type: "text",
            value: node.char.repeat(node.len),
          }),
        });
      }
    } else {
      appendNode(list, node);
    }
  }

  const canMatch = (opener: Delimiter, closer: Delimiter) => {
    if (opener.char !== closer.char) return false;
    if (opener.length === 0 || closer.length === 0) return false;
    if (opener.char === "~") return opener.length >= 2 && closer.length >= 2;
    return true;
  };

  const useLength = (opener: Delimiter, closer: Delimiter) => {
    if (opener.char === "~") return 2;
    return opener.length >= 2 && closer.length >= 2 ? 2 : 1;
  };

  const openersBottom = new Map<
    string,
    LinkedListNode<Delimiter> | undefined
  >();

  let closer = delimiterList.head;
  while (closer) {
    const nextCloser = closer.next;
    if (!closer.value.canClose) {
      closer = nextCloser;
      continue;
    }

    const bottom = openersBottom.get(closer.value.char);
    let opener = closer.prev;
    while (opener && opener !== bottom) {
      if (opener.value.canOpen && canMatch(opener.value, closer.value)) break;
      opener = opener.prev;
    }

    if (!opener || opener === bottom) {
      openersBottom.set(closer.value.char, closer.prev);
      closer = nextCloser;
      continue;
    }

    const used = useLength(opener.value, closer.value);
    const openerNode = opener.value.node;
    const closerNode = closer.value.node;

    const innerNodes = mapWhile(
      openerNode.next,
      (node) => node,
      (node) => node !== closerNode
    );

    const children = finalizeInlineNodes(innerNodes.map((item) => item.value));
    const type =
      closer.value.char === "~" ? "del" : used === 2 ? "strong" : "em";
    const emphasisNode: IrNode = { type, children };

    for (const item of innerNodes) removeNode(list, item);

    opener.value.length -= used;
    if (opener.value.length === 0) {
      const insertAfterNode = openerNode.prev;
      removeNode(list, openerNode);
      removeNode(delimiterList, opener);
      insertNode(list, insertAfterNode, emphasisNode);
    } else if (openerNode.value.type === "text") {
      openerNode.value.value = opener.value.char.repeat(opener.value.length);
      insertNode(list, openerNode, emphasisNode);
    }

    closer.value.length -= used;
    if (closer.value.length === 0) {
      removeNode(list, closerNode);
      removeNode(delimiterList, closer);
    } else if (closerNode.value.type === "text") {
      closerNode.value.value = closer.value.char.repeat(closer.value.length);
    }

    let between = opener.next;
    while (between && between !== closer) {
      const nextBetween = between.next;
      removeNode(delimiterList, between);
      between = nextBetween;
    }

    if (closer.value.length > 0) {
      continue;
    }
    closer = nextCloser;
  }

  return mergeAdjacentText(
    mapWhile(
      list.head,
      (node) => node.value,
      () => true
    )
  );
}

function handleInlineNewline(inlineNodes: InlineAstNode[]): void {
  const last = inlineNodes[inlineNodes.length - 1];
  let hard = false;
  if (last && last.type === "text" && last.value.endsWith("  ")) {
    last.value = last.value.slice(0, -2);
    hard = true;
    if (!last.value) inlineNodes.pop();
  }
  inlineNodes.push(hard ? { type: "br" } : { type: "text", value: "\n" });
}

function finalizeInlineNodes(nodesList: IrNode[]): InlineAstNode[] {
  const inlineNodes: InlineAstNode[] = [];

  for (const node of nodesList) {
    if (node.type === "text") {
      appendText(inlineNodes, node.value);
    } else if (node.type === "newline") {
      handleInlineNewline(inlineNodes);
    } else if (isToken(node)) {
      appendText(inlineNodes, nodeToLiteral(node));
    } else {
      inlineNodes.push(node);
    }
  }

  return inlineNodes;
}

function parseInline(str: string): InlineAstNode[] {
  const tokens = tokenize(str);

  let nodes: IrNode[] = resolveCodeSpans(tokens);
  nodes = resolveLinksAndImages(nodes);
  nodes = resolveDelimiters(nodes);

  return finalizeInlineNodes(nodes);
}

// Constants
const DELIMITER_CONFIGS: Record<
  string,
  { intraword: boolean; pairs: boolean } | undefined
> = {
  "*": { intraword: true, pairs: false },
  _: { intraword: false, pairs: false },
  "~": { intraword: true, pairs: true },
};

const RE_HR = /^[ ]{0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const RE_NEWLINES = /\r\n?/g;
const RE_LEADING_SPACES = /^ */;
const RE_HEADING = /^[ ]{0,3}(#{1,6})[ \t]+(.*)$/;
const RE_HEADING_TRAIL = /[ \t]+#+[ \t]*$/;
const RE_FENCE_START = /^[ ]{0,3}(`{3,})(.*)$/;
const RE_FENCE_LEADING_SPACES = /^[ ]{0,3}/;
const RE_FENCE_TICKS = /^`{3,}$/;
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

const ESCAPABLE = new Set("\\`*_~{}[]()#+-.!|>".split(""));

const TOKEN_TYPES = new Set<InlineToken["type"]>([
  "text",
  "newline",
  "backtick",
  "delimiter",
  "punct",
]);

// Types
type Level = 1 | 2 | 3 | 4 | 5 | 6;
type TableAlign = "left" | "right" | "center";

type TextNode = { type: "text"; value: string };
type CodeNode = { type: "code"; value: string };
type LinkNode = { type: "a"; url: string; children: InlineAstNode[] };
type ImageNode = { type: "img"; url: string; alt: string };
type EmNode = { type: "em"; children: InlineAstNode[] };
type StrongNode = { type: "strong"; children: InlineAstNode[] };
type DelNode = { type: "del"; children: InlineAstNode[] };
type BrNode = { type: "br" };

type InlineAstNode =
  | TextNode
  | CodeNode
  | LinkNode
  | ImageNode
  | EmNode
  | StrongNode
  | DelNode
  | BrNode;

type DelimiterToken = {
  type: "delimiter";
  char: string;
  len: number;
  canOpen: boolean;
  canClose: boolean;
};

type PunctToken = { type: "punct"; char: string };

type InlineToken =
  | TextNode
  | DelimiterToken
  | PunctToken
  | { type: "newline" }
  | { type: "backtick"; len: number };

type IrNode = InlineToken | InlineAstNode;

type ParagraphNode = { type: "p"; children: InlineAstNode[] };
type HeadingNode = { type: "h"; level: Level; children: InlineAstNode[] };
type HorizontalRuleNode = { type: "hr" };
type PreNode = { type: "pre"; lang?: string; value: string };
type BlockquoteNode = { type: "blockquote"; children: AstNode[] };

type ListItemNode = { type: "li"; children: AstNode[] };
type ListNode = {
  type: "list";
  ordered: boolean;
  start?: number;
  tight: boolean;
  children: ListItemNode[];
};

type TableHeadCellNode = {
  type: "th";
  align?: TableAlign;
  children: InlineAstNode[];
};

type TableBodyCellNode = {
  type: "td";
  align?: TableAlign;
  children: InlineAstNode[];
};

type TableRowNode = {
  type: "tr";
  children: Array<TableHeadCellNode | TableBodyCellNode>;
};

type TableHeadNode = {
  type: "thead";
  children: [TableRowNode];
};

type TableBodyNode = {
  type: "tbody";
  children: TableRowNode[];
};

type TableNode = {
  type: "table";
  children: [TableHeadNode, TableBodyNode];
};

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
  | TableRowNode
  | TableHeadCellNode
  | TableBodyCellNode;

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

type Delimiter = {
  char: string;
  length: number;
  canOpen: boolean;
  canClose: boolean;
  node: LinkedListNode<IrNode>;
};
