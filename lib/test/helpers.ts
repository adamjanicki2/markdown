import type { AstNode } from "../src/ast";

export function renderHtml(nodes: AstNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.value;
        case "code":
          return `<code>${node.value}</code>`;
        case "em":
          return `<em>${renderHtml(node.children)}</em>`;
        case "strong":
          return `<strong>${renderHtml(node.children)}</strong>`;
        case "del":
          return `<del>${renderHtml(node.children)}</del>`;
        case "a": {
          const href = node.url;
          const children = node.children ?? [{ type: "text", value: node.url }];
          return `<a href="${href}">${renderHtml(children)}</a>`;
        }
        case "img": {
          const src = node.url;
          const alt = node.alt;
          return `<img src="${src}" alt="${alt}" />`;
        }
        case "linebreak":
          return node.hard ? "<br />" : "\n";
        case "p":
          return `<p>${renderHtml(node.children)}</p>`;
        case "h":
          return `<h${node.level}>${renderHtml(node.children)}</h${node.level}>`;
        case "hr":
          return `<hr />`;
        case "pre": {
          const klass = node.lang ? ` class="language-${node.lang}"` : "";
          return `<pre><code${klass}>${node.raw}</code></pre>`;
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
            .map((cell) => `<th>${renderHtml(cell.children)}</th>`)
            .join("");
          const headRows = `<tr>${headCells}</tr>`;
          const head = `<thead>${headRows}</thead>`;

          const bodyRows = node.body.rows
            .map((row) => {
              const cells = row.cells
                .map((cell) => `<td>${renderHtml(cell.children)}</td>`)
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
