import React from "react";
import { buildAst, type AstNode } from "./ast";

type Props = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
  /** The Markdown source string to convert into a react component */
  children: string;
};

const Markdown = React.forwardRef<HTMLDivElement, Props>(
  ({ children, ...props }, ref) => {
    const ast = React.useMemo(() => buildAst(children), [children]);

    return (
      <div {...props} ref={ref}>
        <Tree>{ast}</Tree>
      </div>
    );
  }
);

type TreeProps = {
  children: AstNode[];
};

type DomKey =
  | "text"
  | "code"
  | "em"
  | "strong"
  | "del"
  | "a"
  | "img"
  | "br"
  | "p"
  | "h"
  | "hr"
  | "pre"
  | "blockquote"
  | "ol"
  | "ul"
  | "li"
  | "table";

const NODE_TO_DOM_KEY: {
  [K in Exclude<AstNode["type"], "list">]: DomKey;
} = {
  text: "text",
  code: "code",
  em: "em",
  strong: "strong",
  del: "del",
  a: "a",
  img: "img",
  linebreak: "br",
  p: "p",
  h: "h",
  hr: "hr",
  pre: "pre",
  blockquote: "blockquote",
  li: "li",
  table: "table",
};

const getDomKey = (node: AstNode): DomKey =>
  node.type === "list" ? (node.ordered ? "ol" : "ul") : NODE_TO_DOM_KEY[node.type];

type Renderer = (node: AstNode) => React.ReactNode;
type Renderers = Record<DomKey, Renderer>;

const DEFAULT_RENDERERS: Renderers = {
  text: (node) => (node.type === "text" ? node.value : null),
  code: (node) => (node.type === "code" ? <code>{node.value}</code> : null),
  em: (node) =>
    node.type === "em" ? (
      <em>
        <Tree>{node.children}</Tree>
      </em>
    ) : null,
  strong: (node) =>
    node.type === "strong" ? (
      <strong>
        <Tree>{node.children}</Tree>
      </strong>
    ) : null,
  del: (node) =>
    node.type === "del" ? (
      <del>
        <Tree>{node.children}</Tree>
      </del>
    ) : null,
  a: (node) =>
    node.type === "a" ? (
      <a href={node.url}>{<Tree>{node.children}</Tree>}</a>
    ) : null,
  img: (node) =>
    node.type === "img" ? <img src={node.url} alt={node.alt} /> : null,
  br: (node) =>
    node.type === "linebreak" ? (node.hard ? <br /> : "\n") : null,
  p: (node) =>
    node.type === "p" ? (
      <p>
        <Tree>{node.children}</Tree>
      </p>
    ) : null,
  h: (node) =>
    node.type === "h"
      ? React.createElement(`h${node.level}`, {}, <Tree>{node.children}</Tree>)
      : null,
  hr: (node) => node.type === "hr" ? <hr /> : null,
  pre: (node) =>
    node.type === "pre" ? (
      <pre>
        <code>{node.raw}</code>
      </pre>
    ) : null,
  blockquote: (node) =>
    node.type === "blockquote" ? (
      <blockquote>
        <Tree>{node.children}</Tree>
      </blockquote>
    ) : null,
  ol: (node) => {
    if (node.type !== "list" || !node.ordered) return null;
    const start =
      node.start !== undefined && node.start !== 1 ? node.start : undefined;
    const items = node.items.map((item, itemIndex) => (
      <li key={itemIndex}>
        <Tree>{item.children}</Tree>
      </li>
    ));
    return React.createElement("ol", { start }, items);
  },
  ul: (node) => {
    if (node.type !== "list" || node.ordered) return null;
    const items = node.items.map((item, itemIndex) => (
      <li key={itemIndex}>
        <Tree>{item.children}</Tree>
      </li>
    ));
    return React.createElement("ul", {}, items);
  },
  li: (node) =>
    node.type === "li" ? (
      <li>
        <Tree>{node.children}</Tree>
      </li>
    ) : null,
  table: (node) =>
    node.type === "table" ? (
      <table>
        <thead>
          <tr>
            {node.head.row.cells.map((cell, cellIndex) => (
              <th key={cellIndex} align={cell.align}>
                <Tree>{cell.children}</Tree>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {node.body.rows.map((row, rowIndex) => {
            const cells = row.cells.map((cell, cellIndex) => (
              <td key={cellIndex} align={cell.align}>
                <Tree>{cell.children}</Tree>
              </td>
            ));
          return <tr key={rowIndex}>{cells}</tr>;
        })}
      </tbody>
    </table>
  ) : null,
};

function Tree({ children }: TreeProps) {
  return children.map((node, index) => (
    <React.Fragment key={`${getDomKey(node)}-${index}`}>
      {DEFAULT_RENDERERS[getDomKey(node)](node)}
    </React.Fragment>
  ));
}

export default Markdown;
