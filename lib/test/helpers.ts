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
        case "br":
          return "<br />";
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
            node.ordered && node.start !== undefined && node.start !== 1
              ? ` start="${node.start}"`
              : "";
          const items = node.items
            .map((item) => `<li>${renderHtml(item.children)}</li>`)
            .join("");
          return `<${tag}${startAttr}>${items}</${tag}>`;
        }
        case "tr":
          return `<tr>${renderHtml(node.children)}</tr>`;
        case "th": {
          const alignAttr = node.align ? ` align="${node.align}"` : "";
          return `<th${alignAttr}>${renderHtml(node.children)}</th>`;
        }
        case "td": {
          const alignAttr = node.align ? ` align="${node.align}"` : "";
          return `<td${alignAttr}>${renderHtml(node.children)}</td>`;
        }
        case "table": {
          const headRows = node.children
            .filter((row) => row.section === "head")
            .map((row) => renderHtml([row]))
            .join("");
          const bodyRows = node.children
            .filter((row) => row.section === "body")
            .map((row) => renderHtml([row]))
            .join("");

          const thead = headRows ? `<thead>${headRows}</thead>` : "";
          const tbody = bodyRows ? `<tbody>${bodyRows}</tbody>` : "";
          return `<table>${thead}${tbody}</table>`;
        }
        default: {
          throw new Error("should not get here");
        }
      }
    })
    .join("");
}
