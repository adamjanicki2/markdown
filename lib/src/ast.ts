/**
 * Construct an AST given a markdown source string.
 * @param markdown the source to parse
 * @returns an AST representing the markdown source
 */
export function buildAst(
  markdown: string,
  options: BuildAstOptions = {}
): AstNode[] {
  const modifierConfigs: ModifierConfigs = {
    ...options.modifierConfigs,
    ...MODIFIER_CONFIGS,
  };
  return walkAndBuildAst(markdown, modifierConfigs);
}

// helpers
const splitLines = (str: string) => str.replace(RE_NEWLINES, "\n").split("\n");
const isBlank = (str: string) => !str.trim();
const getIndent = (line: string) =>
  RE_LEADING_SPACES.exec(line)?.[0].length ?? 0;
const isSpace = (char?: string) =>
  char === undefined || char === " " || char === "\t" || char === "\n";
const isAlphanum = (char?: string) => !!char && RE_ALPHANUM.test(char);
const isToken = (node: IrNode): node is InlineToken =>
  (TOKEN_TYPES as Set<string>).has(node.type);
const isTextNode = (node: IrNode | InlineToken): node is TextNode =>
  node.type === "text";

function appendText(nodes: IrNode[], value: string) {
  if (!value) return;
  const last = nodes[nodes.length - 1];
  if (last && last.type === "text") last.value += value;
  else nodes.push({ type: "text", value });
}

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
  if (node.type === "modifier")
    return node.children.reduce((acc, child) => acc + nodeToLiteral(child), "");
  return "";
}

const nodesToLiteral = (nodes: IrNode[]) =>
  nodes.reduce((acc, node) => acc + nodeToLiteral(node), "");

const isHorizontalRule = (str: string) => RE_HR.test(str);

function parseHeading(line: string) {
  const match = RE_HEADING.exec(line);
  return match
    ? {
        level: Math.min(match[1].length, 6) as Level,
        raw: match[2].replace(RE_HEADING_TRAIL, ""),
      }
    : null;
}

function parseFenceOpening(line: string) {
  const match = RE_FENCE_START.exec(line);
  return match
    ? { fenceLen: match[1].length, info: (match[2] || "").trim() }
    : null;
}

function isFenceClosing(line: string, fenceLen: number) {
  const trimmed = line.replace(RE_FENCE_LEADING_SPACES, "").trimEnd();
  return RE_FENCE_TICKS.test(trimmed) && trimmed.length >= fenceLen;
}

function parseListMarker(line: string): ListMarker | null {
  const indent = getIndent(line);
  const lineRemainder = line.slice(indent);

  const unorderedMarkerMatch = RE_UL_MARKER.exec(lineRemainder);
  if (unorderedMarkerMatch) {
    const markerWidth = unorderedMarkerMatch[0].length;
    return {
      ordered: false,
      indent,
      markerWidth,
      contentIndent: indent + markerWidth,
      markerChar: unorderedMarkerMatch[1],
    };
  }

  const orderedMarkerMatch = RE_OL_MARKER.exec(lineRemainder);
  if (orderedMarkerMatch) {
    const markerWidth = orderedMarkerMatch[0].length;
    return {
      ordered: true,
      start: parseInt(orderedMarkerMatch[1], 10),
      indent,
      markerWidth,
      contentIndent: indent + markerWidth,
      markerChar: orderedMarkerMatch[2],
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
    rest[0] === marker.markerChar &&
    rest.split("").every((c) => c === rest[0])
  );
}

function getBlockquoteInfo(str: string) {
  let index = 0;
  while (index < str.length && index < 3 && str[index] === " ") index++;

  let depth = 0;
  while (index < str.length && str[index] === ">") {
    depth++;
    index++;
    if (str[index] === " " || str[index] === "\t") index++;
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

const isTopLevelNodeStarter = (line: string) =>
  !!(
    isBlank(line) ||
    parseFenceOpening(line) ||
    isHorizontalRule(line) ||
    parseHeading(line) ||
    parseListMarker(line) ||
    stripBlockquoteMarker(line) !== null
  );

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
  line: string
): Array<TableAlign | undefined> | null {
  const minDashes = !line.trim().startsWith("|");
  const cells = splitTableRow(line);
  if (cells.length <= 0) return null;

  const alignments: Array<TableAlign | undefined> = [];

  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index];
    const trimmed = cell.replace(RE_WHITESPACE, "");
    if (trimmed.length === 0) return null;
    const withoutColons = trimmed.replace(RE_COLON, "");
    const dashCount = (withoutColons.match(RE_DASH) || []).length;
    if (dashCount < 1 || (index === 0 && dashCount < 2 && minDashes))
      return null;

    if (RE_TABLE_ALIGN_CENTER.test(trimmed)) alignments.push("center");
    else if (RE_TABLE_ALIGN_LEFT.test(trimmed)) alignments.push("left");
    else if (RE_TABLE_ALIGN_RIGHT.test(trimmed)) alignments.push("right");
    else if (RE_TABLE_DIVIDER.test(trimmed)) alignments.push(undefined);
    else return null;
  }

  return alignments;
}

function buildTableNode(
  header: string[],
  rows: string[][],
  alignments: Array<TableAlign | undefined>,
  parseInlineValue: InlineParser
): TableNode {
  const thead: TableHeadNode = {
    type: "thead",
    children: [
      {
        type: "tr",
        children: header.map((cellValue, cellIndex) => ({
          type: "th",
          align: alignments[cellIndex],
          children: parseInlineValue(cellValue),
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
        children: parseInlineValue(cellValue),
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
  lineIndex: number,
  parseInlineValue: InlineParser
): NodeParseResult<TableNode> | null {
  const line = lines[lineIndex];
  const header = splitTableRow(line);
  const divider = lines[lineIndex + 1];
  if (!divider) return null;
  if (header.length <= 1 && !divider.includes("|")) return null;
  const alignments = parseTableAlignments(lines[lineIndex + 1]);
  if (!alignments || alignments.length !== header.length) return null;

  const headerLength = header.length;
  let currentIndex = lineIndex + 2;

  const rows: string[][] = [];
  while (currentIndex < lines.length && !isBlank(lines[currentIndex])) {
    const rowLine = lines[currentIndex];
    const rowCells = rowLine.includes("|") ? splitTableRow(rowLine) : null;
    const isRowCandidate =
      rowCells !== null && (rowCells.length > 1 || headerLength === 1);
    if (!isRowCandidate && isTopLevelNodeStarter(rowLine)) break;

    const rowValues = isRowCandidate ? rowCells : [rowLine.trim()];
    while (rowValues.length < headerLength) rowValues.push("");
    rows.push(rowValues.slice(0, headerLength));
    currentIndex++;
  }

  return {
    node: buildTableNode(header, rows, alignments, parseInlineValue),
    nextIndex: currentIndex,
  };
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

function tokenize(
  str: string,
  modifierConfigs: ModifierConfigs
): InlineToken[] {
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

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === "\n") pushToken({ type: "newline" });
    else if (char === "\\") {
      const nextChar = str[i + 1];
      if (nextChar && ESCAPABLE.has(nextChar)) {
        textBuffer += nextChar;
        i++;
      } else {
        textBuffer += "\\";
      }
    } else if ("[]()!".includes(char)) pushToken({ type: "punct", char });
    else if (char === "`" || char in modifierConfigs) {
      let runIndex = i + 1;
      while (runIndex < str.length && str[runIndex] === char) runIndex++;

      if (char === "`") {
        pushToken({ type: "backtick", len: runIndex - i });
      } else {
        const intraword = modifierConfigs[char]?.intraword;
        const prevChar = str[i - 1];
        const nextChar = str[runIndex];

        if (!intraword && isAlphanum(prevChar) && isAlphanum(nextChar)) {
          textBuffer += char.repeat(runIndex - i);
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
    } else textBuffer += char;
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
        const code = tokens
          .slice(i + 1, closingIndex)
          .map(nodeToLiteral)
          .join("");

        nodes.push({ type: "code", value: code });
        i = closingIndex;
      }
    }
  }

  return mergeAdjacentText(nodes);
}

const isPunctChar = (node: IrNode, char: string): node is PunctToken =>
  isToken(node) && node.type === "punct" && node.char === char;

function findMatchingCloser(
  nodes: IrNode[],
  startIndex: number,
  open: string,
  close: string
): number {
  let index = startIndex;
  let depth = 0;
  while (index < nodes.length) {
    const candidate = nodes[index];
    if (isPunctChar(candidate, open)) depth++;
    else if (isPunctChar(candidate, close)) {
      if (depth === 0) return index;
      depth--;
    }
    index++;
  }
  return index;
}

function parseLinkOrImage(
  nodes: IrNode[],
  startIndex: number,
  parseInlineValue: InlineParser
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

  const rightBracketIndex = findMatchingCloser(
    nodes,
    leftBracketIndex + 1,
    "[",
    "]"
  );
  if (rightBracketIndex >= nodes.length) return null;

  const leftParenNode = nodes[rightBracketIndex + 1];
  if (!leftParenNode || !isPunctChar(leftParenNode, "(")) return null;

  const rightParenIndex = findMatchingCloser(
    nodes,
    rightBracketIndex + 2,
    "(",
    ")"
  );
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

  const children = parseInlineValue(label);
  return {
    node: { type: "a", url, children },
    nextIndex: rightParenIndex,
  };
}

function resolveLinksAndImages(
  nodes: IrNode[],
  parseInlineValue: InlineParser
): IrNode[] {
  const nodesOut: IrNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const linkOrImageMatch = parseLinkOrImage(nodes, i, parseInlineValue);
    const node = nodes[i];
    if (linkOrImageMatch) {
      nodesOut.push(linkOrImageMatch.node);
      i = linkOrImageMatch.nextIndex;
    } else {
      nodesOut.push(node);
    }
  }

  return mergeAdjacentText(nodesOut);
}

function getMaxSupportedDelimiterLength(
  opener: DelimiterRun,
  closer: DelimiterRun,
  modifierConfigs: ModifierConfigs
): number {
  if (opener.char !== closer.char) return 0;
  if (opener.length === 0 || closer.length === 0) return 0;

  const supported = modifierConfigs[opener.char]?.lengths;
  if (!supported) return 0;

  const maxPossible = Math.min(opener.length, closer.length);
  for (let length = maxPossible; length >= 1; length--) {
    if (supported.has(length)) return length;
  }
  return 0;
}

function resolveDelimiters(
  nodes: IrNode[],
  modifierConfigs: ModifierConfigs
): IrNode[] {
  const nodeList: LinkedList<IrNode> = {};
  const delimiterRunList: LinkedList<DelimiterRun> = {};
  const pushText = (value: string) =>
    appendNode(nodeList, { type: "text", value });

  for (const node of nodes) {
    if (node.type === "delimiter") {
      if (!node.canOpen && !node.canClose) {
        pushText(node.char.repeat(node.len));
      } else {
        appendNode(delimiterRunList, {
          char: node.char,
          length: node.len,
          canOpen: node.canOpen,
          canClose: node.canClose,
          node: pushText(node.char.repeat(node.len)),
        });
      }
    } else {
      appendNode(nodeList, node);
    }
  }

  const canMatch = (opener: DelimiterRun, closer: DelimiterRun) =>
    getMaxSupportedDelimiterLength(opener, closer, modifierConfigs) > 0;

  const getDelimiterLength = (opener: DelimiterRun, closer: DelimiterRun) =>
    getMaxSupportedDelimiterLength(opener, closer, modifierConfigs);

  const lastOpenerByChar = new Map<
    string,
    LinkedListNode<DelimiterRun> | null
  >();

  let closer = delimiterRunList.head;
  while (closer) {
    const nextCloser = closer.next;
    if (!closer.value.canClose) {
      closer = nextCloser;
      continue;
    }

    const bottom = lastOpenerByChar.get(closer.value.char) ?? null;
    let opener = closer.prev;
    while (opener && opener !== bottom) {
      if (opener.value.canOpen && canMatch(opener.value, closer.value)) break;
      opener = opener.prev;
    }

    if (!opener || opener === bottom) {
      lastOpenerByChar.set(closer.value.char, closer.prev ?? null);
      closer = nextCloser;
      continue;
    }

    const used = getDelimiterLength(opener.value, closer.value);
    const openerNode = opener.value.node;
    const closerNode = closer.value.node;

    const innerNodes = mapWhile(
      openerNode.next,
      (node) => node,
      (node) => node !== closerNode
    );

    const children = finalizeInlineNodes(innerNodes.map((item) => item.value));
    const delimiter = closer.value.char.repeat(used);
    const emphasisNode: IrNode = {
      type: "modifier",
      delimiter,
      children,
    };

    for (const item of innerNodes) removeNode(nodeList, item);

    opener.value.length -= used;
    if (opener.value.length === 0) {
      const insertAfterNode = openerNode.prev;
      removeNode(nodeList, openerNode);
      removeNode(delimiterRunList, opener);
      insertNode(nodeList, insertAfterNode, emphasisNode);
    } else if (openerNode.value.type === "text") {
      openerNode.value.value = opener.value.char.repeat(opener.value.length);
      insertNode(nodeList, openerNode, emphasisNode);
    }

    closer.value.length -= used;
    if (closer.value.length === 0) {
      removeNode(nodeList, closerNode);
      removeNode(delimiterRunList, closer);
    } else if (closerNode.value.type === "text") {
      closerNode.value.value = closer.value.char.repeat(closer.value.length);
    }

    let betweenRun = opener.next;
    while (betweenRun && betweenRun !== closer) {
      const nextBetween = betweenRun.next;
      removeNode(delimiterRunList, betweenRun);
      betweenRun = nextBetween;
    }

    if (closer.value.length > 0) {
      continue;
    }
    closer = nextCloser;
  }

  return mergeAdjacentText(
    mapWhile(
      nodeList.head,
      (node) => node.value,
      () => true
    )
  );
}

function parseInline(
  str: string,
  modifierConfigs: ModifierConfigs
): InlineAstNode[] {
  const tokens = tokenize(str, modifierConfigs);
  const parseInlineValue: InlineParser = (value) =>
    parseInline(value, modifierConfigs);

  let nodes: IrNode[] = resolveCodeSpans(tokens);
  nodes = resolveLinksAndImages(nodes, parseInlineValue);
  nodes = resolveDelimiters(nodes, modifierConfigs);

  return finalizeInlineNodes(nodes);
}

function parseListNode(
  lines: string[],
  startIndex: number,
  parseBlocks: BlockParser
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

    const markerContent = lines[lineIndex].slice(listMarker.contentIndent);
    lineIndex++;

    const listItemLines: string[] = [markerContent];

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
        listItemLines.push("");
        lineIndex++;
        continue;
      }

      const lineIndent = getIndent(currentLine);
      const otherMarker = parseListMarker(currentLine);

      if (getSameListMarker(currentLine)) break;

      if (otherMarker && otherMarker.indent <= indent) break;
      if (otherMarker && otherMarker.ordered && otherMarker.indent >= 4) {
        const trimmedLine = currentLine.slice(lineIndent);
        const lastIndex = listItemLines.length - 1;
        listItemLines[lastIndex] = listItemLines[lastIndex] + trimmedLine;
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
      listItemLines.push(currentLine.slice(sliceAt));
      lineIndex++;
    }

    children.push({
      type: "li",
      children: parseBlocks(listItemLines.join("\n")),
    });
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
  parseBlocks: BlockParser
): NodeParseResult<BlockquoteNode> | null {
  const firstLine = lines[startIndex];
  const firstMarker = stripBlockquoteMarker(firstLine);
  if (firstMarker === null) return null;

  const blockquoteLines: string[] = [];
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
      blockquoteLines.push(strippedLine);
      lineIndex++;
    } else if (isBlank(currentLine)) break;
    else {
      const currentIndent = getIndent(currentLine);
      if (currentIndent === 0 && parseListMarker(currentLine)) break;
      if (isTopLevelNodeStarter(currentLine)) break;

      blockquoteLines.push(currentLine);
      lineIndex++;
    }
  }

  return {
    node: {
      type: "blockquote",
      children: parseBlocks(blockquoteLines.join("\n")),
    },
    nextIndex: lineIndex,
  };
}

function walkAndBuildAst(
  markdown: string,
  modifierConfigs: ModifierConfigs
): AstNode[] {
  const parseInlineWithConfigs: InlineParser = (value) =>
    parseInline(value, modifierConfigs);
  const parseBlocks: BlockParser = (value) =>
    walkAndBuildAst(value, modifierConfigs);
  const lines = splitLines(markdown);
  const nodes: AstNode[] = [];

  let lineIndex = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    nodes.push({
      type: "p",
      children: parseInlineWithConfigs(paragraph.join("\n")),
    });
    paragraph = [];
  };

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];

    if (isBlank(line)) {
      flushParagraph();
      lineIndex++;
      continue;
    }

    const fence = parseFenceOpening(line);
    if (fence) {
      flushParagraph();
      const lang: string | undefined = fence.info.split(RE_SPLIT_LANG)[0];

      lineIndex++;
      const pre: string[] = [];
      while (
        lineIndex < lines.length &&
        !isFenceClosing(lines[lineIndex], fence.fenceLen)
      ) {
        pre.push(lines[lineIndex]);
        lineIndex++;
      }
      if (lineIndex < lines.length) lineIndex++;

      nodes.push({ type: "pre", lang, value: pre.join("\n") });
      continue;
    }

    const list = parseListNode(lines, lineIndex, parseBlocks);
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
        children: parseInlineWithConfigs(heading.raw),
      });
      lineIndex++;
      continue;
    }

    const table = parseTableNode(lines, lineIndex, parseInlineWithConfigs);
    if (table) {
      flushParagraph();
      nodes.push(table.node);
      lineIndex = table.nextIndex;
      continue;
    }

    const blockquote = parseBlockquoteNode(lines, lineIndex, parseBlocks);
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

// types
export type ModifierConfig = {
  intraword: boolean;
  lengths: Set<number>;
};

export type BuildAstOptions = {
  modifierConfigs?: Partial<Record<string, ModifierConfig>>;
};

type ModifierConfigs = Record<string, ModifierConfig | undefined>;
type Level = 1 | 2 | 3 | 4 | 5 | 6;
type TableAlign = "left" | "right" | "center";

type TextNode = { type: "text"; value: string };
type CodeNode = { type: "code"; value: string };
type LinkNode = { type: "a"; url: string; children: InlineAstNode[] };
type ImageNode = { type: "img"; url: string; alt: string };
type InlineModifierNode = {
  type: "modifier";
  delimiter: string;
  children: InlineAstNode[];
};
type BrNode = { type: "br" };

type InlineAstNode =
  | TextNode
  | CodeNode
  | LinkNode
  | ImageNode
  | InlineModifierNode
  | BrNode;

type DelimiterRunToken = {
  type: "delimiter";
  char: string;
  len: number;
  canOpen: boolean;
  canClose: boolean;
};

type PunctToken = { type: "punct"; char: string };

type InlineToken =
  | TextNode
  | DelimiterRunToken
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

type InlineParser = (value: string) => InlineAstNode[];
type BlockParser = (value: string) => AstNode[];

type ListMarker = {
  ordered: boolean;
  indent: number;
  markerWidth: number;
  contentIndent: number;
  markerChar: string;
  start?: number;
};

type DelimiterRun = {
  char: string;
  length: number;
  canOpen: boolean;
  canClose: boolean;
  node: LinkedListNode<IrNode>;
};

// constants
const MODIFIER_CONFIGS: ModifierConfigs = {
  "*": { intraword: true, lengths: new Set([1, 2]) },
  _: { intraword: false, lengths: new Set([1, 2]) },
  "~": { intraword: true, lengths: new Set([2]) },
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
const RE_DASH = /-/g;
const RE_TABLE_DIVIDER = /^-+$/;
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

// Linked List utilities
type LinkedList<T> = {
  head?: LinkedListNode<T>;
  tail?: LinkedListNode<T>;
};

type LinkedListNode<T> = {
  prev?: LinkedListNode<T>;
  next?: LinkedListNode<T>;
  value: T;
};

function appendNode<T>(list: LinkedList<T>, value: T): LinkedListNode<T> {
  return insertNode(list, list.tail, value);
}

function insertNode<T>(
  list: LinkedList<T>,
  after: LinkedListNode<T> | undefined,
  value: T
): LinkedListNode<T> {
  const head = list.head;
  if (!after) {
    const node = { value, next: head };

    if (head) head.prev = node;
    else list.tail = node;

    list.head = node;
    return node;
  }

  const next = after.next;
  const node = { value, prev: after, next };

  if (next) next.prev = node;
  else list.tail = node;

  after.next = node;
  return node;
}

function removeNode<T>(list: LinkedList<T>, node: LinkedListNode<T>) {
  const { prev, next } = node;
  if (prev) prev.next = next;
  else list.head = next;

  if (next) next.prev = prev;
  else list.tail = prev;
}

function mapWhile<T, V>(
  start: LinkedListNode<T> | undefined,
  transform: (node: LinkedListNode<T>) => V,
  predicate: (node: LinkedListNode<T>) => boolean
): V[] {
  const arr: V[] = [];
  let node = start;
  while (node && predicate(node)) {
    arr.push(transform(node));
    node = node.next;
  }
  return arr;
}
