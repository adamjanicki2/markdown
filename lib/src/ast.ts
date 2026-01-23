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
  const nodes: InlineNode[] = [];
  let text = "";

  const addTextNode = () => {
    if (text) {
      nodes.push({ type: "text", value: text });
      text = "";
    }
  };

  for (let i = 0; i < block.length; i++) {
    const char = block[i];

    // soft vs hard newlines
    if (char === "\n") {
      if (text.endsWith("  ")) {
        text = text.slice(0, -2);
        addTextNode();
        nodes.push({ type: "br" });
      } else {
        text += " ";
      }
      continue;
    }

    // code
    if (char === "`") {
      const end = block.indexOf("`", i + 1);
      if (end !== -1) {
        addTextNode();
        nodes.push({ type: "code", value: block.slice(i + 1, end) });
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
          addTextNode();
          nodes.push({ type: "img", url, alt });
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
          addTextNode();
          nodes.push({ type: "a", url, children: parseBlock(label) });
          i = urlEnd;
          continue;
        }
      }
    }

    text += char;
  }

  addTextNode();
  return nodes;
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
