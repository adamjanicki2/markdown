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
          const children = node.children
            .map((child) => `<li>${renderHtml(child.children)}</li>`)
            .join("");
          return `<${tag}${startAttr}>${children}</${tag}>`;
        }
        case "thead":
          return `<thead>${renderHtml([node.children])}</thead>`;
        case "tbody":
          return `<tbody>${renderHtml(node.children)}</tbody>`;
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
        case "table":
          return `<table>${renderHtml(node.children)}</table>`;
        default: {
          throw new Error("should not get here");
        }
      }
    })
    .join("");
}
