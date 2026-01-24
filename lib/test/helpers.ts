import type { AstNode, InlineNode } from "../src/ast";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return escapeHtml(node.value);
        case "code":
          return `<code>${escapeHtml(node.value)}</code>`;
        case "em":
          return `<em>${renderInline(node.children)}</em>`;
        case "strong":
          return `<strong>${renderInline(node.children)}</strong>`;
        case "del":
          return `<del>${renderInline(node.children)}</del>`;
        case "a": {
          const href = escapeHtml(node.url);
          return `<a href="${href}">${renderInline(node.children)}</a>`;
        }
        case "img": {
          const src = escapeHtml(node.url);
          const alt = escapeHtml(node.alt);
          return `<img src="${src}" alt="${alt}" />`;
        }
        case "hardbreak":
          return `<br />`;
        default: {
          throw new Error("should not get here");
        }
      }
    })
    .join("");
}

export function renderHtml(nodes: AstNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "p":
          return `<p>${renderInline(node.children)}</p>`;
        case "h":
          return `<h${node.level}>${renderInline(node.children)}</h${node.level}>`;
        case "hr":
          return `<hr />`;
        case "pre": {
          const klass = node.lang
            ? ` class="language-${escapeHtml(node.lang)}"`
            : "";
          return `<pre><code${klass}>${escapeHtml(node.raw)}</code></pre>`;
        }
        case "blockquote":
          return `<blockquote>${renderHtml(node.children)}</blockquote>`;
        case "list": {
          const tag = node.ordered ? "ol" : "ul";
          const startAttr =
            node.ordered && node.start && node.start !== 1
              ? ` start="${node.start}"`
              : "";
          const items = node.items
            .map((item) => `<li>${renderHtml(item.children)}</li>`)
            .join("");
          return `<${tag}${startAttr}>${items}</${tag}>`;
        }
        case "table": {
          const headCells = node.head.row.cells
            .map((cell) => `<th>${renderInline(cell.children)}</th>`)
            .join("");
          const headRows = `<tr>${headCells}</tr>`;
          const head = `<thead>${headRows}</thead>`;

          const bodyRows = node.body.rows
            .map((row) => {
              const cells = row.cells
                .map((cell) => `<td>${renderInline(cell.children)}</td>`)
                .join("");
              return `<tr>${cells}</tr>`;
            })
            .join("");
          return `<table>${head}<tbody>${bodyRows}</tbody></table>`;
        }
        default: {
          throw new Error("should not get here");
        }
      }
    })
    .join("");
}
