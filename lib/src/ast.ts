/**
 * Parse a markdown string and build an AST
 *
 * @param markdown the markdown string to parse
 * @returns a list of AST nodes, to be bundled inside a single root div element.
 */
export function constructAst(markdown: string): AstNode[] {
  const lines = cleanNewlines(markdown).split("\n");
  const nodes: AstNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
    }
    // pre
    else if (preRegex.test(line)) {
      const preMatch = line.match(preRegex);
      const lang = preMatch ? preMatch[1] : undefined;

      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !isFenceLine(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && isFenceLine(lines[i])) {
        i += 1;
      }
      nodes.push({ type: "pre", lang, value: codeLines.join("\n") });
    }
    // blockquote
    else if (blockquoteRegex.test(line)) {
      const blockquoteLines: string[] = [];
      while (i < lines.length && blockquoteRegex.test(lines[i])) {
        blockquoteLines.push(lines[i].replace(blockquoteRegex, ""));
        i += 1;
      }
      nodes.push({
        type: "blockquote",
        children: constructAst(blockquoteLines.join("\n")),
      });
    }
    // ul
    else if (ulRegex.test(line)) {
      const items: ListItemNode[] = [];
      while (i < lines.length && ulRegex.test(lines[i])) {
        const match = lines[i].match(ulItemRegex);
        const content = match ? match[1] : "";
        items.push({
          type: "li",
          children: [{ type: "p", children: parseBlock(content) }],
        });
        i += 1;
      }
      nodes.push({ type: "ul", items });
    }
    // ol
    else if (olRegex.test(line)) {
      const items: ListItemNode[] = [];
      while (i < lines.length && olRegex.test(lines[i])) {
        const match = lines[i].match(olItemRegex);
        const content = match ? match[1] : "";
        items.push({
          type: "li",
          children: [{ type: "p", children: parseBlock(content) }],
        });
        i += 1;
      }
      nodes.push({ type: "ol", items });
    } else if (headingRegex.test(line)) {
      const headingMatch = line.match(headingLineRegex);
      if (headingMatch) {
        nodes.push({
          type: "heading",
          level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
          children: parseBlock(headingMatch[2]),
        });
      }
      i += 1;
    }
    // hr
    else if (isHrLine(line)) {
      nodes.push({ type: "hr" });
      i += 1;
    }
    // p
    else {
      const paraLines: string[] = [line];
      i += 1;
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
        paraLines.push(lines[i]);
        i += 1;
      }
      nodes.push({ type: "p", children: parseBlock(paraLines.join("\n")) });
    }
  }

  return nodes;
}

const cleanNewlines = (str: string) => str.replace(/\r\n?/g, "\n");

const hrRegex = /^(?:-{3,}|\*{3,}|_{3,})$/;
const preRegex = /^\s*```(\S*)\s*$/;
const blockquoteRegex = /^\s*>\s?/;
const ulRegex = /^\s*[-+*]\s+/;
const olRegex = /^\s*\d+\.\s+/;
const headingRegex = /^#{1,6}\s+/;
const ulItemRegex = /^\s*[-+*]\s+(.*)$/;
const olItemRegex = /^\s*\d+\.\s+(.*)$/;
const headingLineRegex = /^(#{1,6})\s+(.*)$/;

function isFenceLine(line: string) {
  return preRegex.test(line);
}

function isHrLine(line: string) {
  return hrRegex.test(line.trim());
}

function isBlockStart(line: string) {
  const trimmedLine = line.trim();
  if (!trimmedLine) return false;
  if (preRegex.test(line)) return true;
  if (blockquoteRegex.test(line)) return true;
  if (ulRegex.test(line)) return true;
  if (olRegex.test(line)) return true;
  if (headingRegex.test(line)) return true;
  if (hrRegex.test(trimmedLine)) return true;
  return false;
}

/**
 * Parse a single block into the simpler node types
 *
 * @param block a single markdown chunk
 * @returns list of inline nodes
 */
function parseBlock(block: string): InlineNode[] {
  const tokens = tokenizeInline(block);
  return resolveDelimiters(tokens);
}

const markers = ["*", "~", "_"] as const;
type Marker = (typeof markers)[number];
type DelimiterLength = 1 | 2;

type DelimiterToken = {
  type: "delim";
  marker: Marker;
  length: DelimiterLength;
};

type InlineToken = InlineNode | DelimiterToken;

function tokenizeInline(block: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let text = "";

  const addTextToken = (value: string) => {
    if (!value) return;
    const last = tokens[tokens.length - 1];
    if (last && last.type === "text") {
      last.value += value;
    } else {
      tokens.push({ type: "text", value });
    }
  };

  const flushText = () => {
    if (text) {
      addTextToken(text);
      text = "";
    }
  };

  for (let i = 0; i < block.length; i++) {
    const char = block[i];

    // soft vs hard newlines
    if (char === "\n") {
      if (text.endsWith("  ")) {
        text = text.slice(0, -2);
        flushText();
        tokens.push({ type: "br" });
      } else {
        text += " ";
      }
      continue;
    }

    // code
    if (char === "`") {
      const end = block.indexOf("`", i + 1);
      if (end !== -1) {
        flushText();
        tokens.push({ type: "code", value: block.slice(i + 1, end) });
        i = end;
        continue;
      }
    }

    // image
    if (char === "!" && block[i + 1] === "[") {
      const labelEnd = block.indexOf("]", i + 2);
      if (labelEnd !== -1 && block[labelEnd + 1] === "(") {
        const urlEnd = block.indexOf(")", labelEnd + 2);
        if (urlEnd !== -1) {
          const alt = block.slice(i + 2, labelEnd);
          const url = block.slice(labelEnd + 2, urlEnd);
          flushText();
          tokens.push({ type: "img", url, alt });
          i = urlEnd;
          continue;
        }
      }
    }

    // link
    if (char === "[") {
      const labelEnd = block.indexOf("]", i + 1);
      if (labelEnd !== -1 && block[labelEnd + 1] === "(") {
        const urlEnd = block.indexOf(")", labelEnd + 2);
        if (urlEnd !== -1) {
          const label = block.slice(i + 1, labelEnd);
          const url = block.slice(labelEnd + 2, urlEnd);
          flushText();
          tokens.push({ type: "a", url, children: parseBlock(label) });
          i = urlEnd;
          continue;
        }
      }
    }

    if ((markers as readonly string[]).includes(char)) {
      let runLength = 1;
      while (i + runLength < block.length && block[i + runLength] === char) {
        runLength += 1;
      }

      flushText();

      if (char === "~") {
        const pairs = Math.floor(runLength / 2);
        for (let j = 0; j < pairs; j += 1) {
          tokens.push({ type: "delim", marker: "~", length: 2 });
        }
        if (runLength % 2 === 1) {
          addTextToken("~");
        }
      } else if (char === "*") {
        let remaining = runLength;
        if (remaining === 2) {
          tokens.push({ type: "delim", marker: "*", length: 2 });
        } else if (remaining === 1) {
          tokens.push({ type: "delim", marker: "*", length: 1 });
        } else if (remaining > 2) {
          tokens.push({ type: "delim", marker: "*", length: 2 });
          tokens.push({ type: "delim", marker: "*", length: 1 });
        }
      } else {
        if (runLength >= 2) {
          tokens.push({ type: "delim", marker: "_", length: 2 });
          if (runLength > 2) {
            tokens.push({ type: "delim", marker: "_", length: 1 });
            if (runLength > 3) {
              addTextToken("_".repeat(runLength - 3));
            }
          }
        } else {
          tokens.push({ type: "delim", marker: "_", length: 1 });
        }
      }

      i += runLength - 1;
      continue;
    }

    text += char;
  }

  flushText();
  return tokens;
}

function resolveDelimiters(tokens: InlineToken[]): InlineNode[] {
  const stack: Array<{
    marker: Marker;
    length: DelimiterLength;
    nodes: InlineNode[];
  }> = [];
  let current: InlineNode[] = [];

  const addTextNode = (value: string) => {
    if (!value) return;
    const last = current[current.length - 1];
    if (last && last.type === "text") {
      last.value += value;
    } else {
      current.push({ type: "text", value });
    }
  };

  const openDelimiter = (marker: Marker, length: DelimiterLength) => {
    stack.push({ marker, length, nodes: current });
    current = [];
  };

  const closeDelimiter = (frame: {
    marker: Marker;
    length: DelimiterLength;
  }) => {
    const inner = current;
    const parent = stack.pop();
    if (!parent) return;
    current = parent.nodes;

    if (frame.marker === "~") {
      current.push({ type: "del", children: inner });
      return;
    }

    if (frame.length === 2) {
      current.push({ type: "strong", children: inner });
    } else {
      current.push({ type: "em", children: inner });
    }
  };

  const handleDelimiter = (marker: Marker, length: DelimiterLength) => {
    const top = stack[stack.length - 1];
    if (top && top.marker === marker && top.length === length) {
      closeDelimiter({ marker, length });
    } else {
      openDelimiter(marker, length);
    }
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type !== "delim") {
      current.push(token);
      continue;
    }

    const next = tokens[i + 1];
    const isPair =
      (token.marker === "*" || token.marker === "_") &&
      token.length === 2 &&
      next &&
      next.type === "delim" &&
      next.marker === token.marker &&
      next.length === 1;

    if (isPair) {
      const top = stack[stack.length - 1];
      if (top && top.marker === token.marker && top.length === 1) {
        handleDelimiter(token.marker, 1);
        handleDelimiter(token.marker, 2);
      } else if (top && top.marker === token.marker && top.length === 2) {
        handleDelimiter(token.marker, 2);
        handleDelimiter(token.marker, 1);
      } else {
        handleDelimiter(token.marker, 2);
        handleDelimiter(token.marker, 1);
      }
      i += 1;
      continue;
    }

    handleDelimiter(token.marker, token.length);
  }

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    const literal = frame.marker.repeat(frame.length);
    const inner = current;
    current = frame.nodes;
    addTextNode(literal);
    current.push(...inner);
  }

  return current;
}

// Types

type LeafNode =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "br" };

type InlineNode =
  | LeafNode
  | { type: "em"; children: InlineNode[] }
  | { type: "strong"; children: InlineNode[] }
  | { type: "del"; children: InlineNode[] }
  | {
      type: "a";
      url: string;
      children?: InlineNode[];
    }
  | {
      type: "img";
      url: string;
      alt: string;
    };

type ListItemNode = {
  type: "li";
  children: AstNode[];
};

type AstNode =
  | { type: "p"; children: InlineNode[] }
  | {
      type: "heading";
      level: 1 | 2 | 3 | 4 | 5 | 6;
      children: InlineNode[];
    }
  | { type: "hr" }
  | { type: "pre"; lang?: string; value: string }
  | { type: "blockquote"; children: AstNode[] }
  | { type: "ol"; items: ListItemNode[] }
  | { type: "ul"; items: ListItemNode[] };
