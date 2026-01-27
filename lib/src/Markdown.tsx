import React from "react";

import { type AstNode, buildAst } from "./ast";

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
  renderers?: Partial<Renderers>;
};

const getNodeKey = (node: AstNode): string => {
  if (node.type === "list") return node.ordered ? "ol" : "ul";
  if (node.type === "h") return `h${node.level}`;
  return node.type;
};

// Renderer prop types
type ChildrenProps = { children: React.ReactNode };
type ImgProps = React.ComponentPropsWithoutRef<"img">;
type LinkProps = { children: React.ReactNode; href: string };
type TableCellProps = {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
};
type OlProps = { children: React.ReactNode; start?: number };
type PreProps = { children: string; lang?: string };
type CodeProps = { children: string };

// Renderer types for each DomKey
type Renderers = {
  code: (props: CodeProps) => React.ReactNode;
  em: (props: ChildrenProps) => React.ReactNode;
  strong: (props: ChildrenProps) => React.ReactNode;
  del: (props: ChildrenProps) => React.ReactNode;
  a: (props: LinkProps) => React.ReactNode;
  img: (props: ImgProps) => React.ReactNode;
  br: () => React.ReactNode;
  p: (props: ChildrenProps) => React.ReactNode;
  h1: (props: ChildrenProps) => React.ReactNode;
  h2: (props: ChildrenProps) => React.ReactNode;
  h3: (props: ChildrenProps) => React.ReactNode;
  h4: (props: ChildrenProps) => React.ReactNode;
  h5: (props: ChildrenProps) => React.ReactNode;
  h6: (props: ChildrenProps) => React.ReactNode;
  hr: () => React.ReactNode;
  pre: (props: PreProps) => React.ReactNode;
  blockquote: (props: ChildrenProps) => React.ReactNode;
  ol: (props: OlProps) => React.ReactNode;
  ul: (props: ChildrenProps) => React.ReactNode;
  li: (props: ChildrenProps) => React.ReactNode;
  table: (props: ChildrenProps) => React.ReactNode;
  tr: (props: ChildrenProps) => React.ReactNode;
  th: (props: TableCellProps) => React.ReactNode;
  td: (props: TableCellProps) => React.ReactNode;
};

const DEFAULT_RENDERERS: Renderers = {
  code: ({ children }) => <code>{children}</code>,
  em: ({ children }) => <em>{children}</em>,
  strong: ({ children }) => <strong>{children}</strong>,
  del: ({ children }) => <del>{children}</del>,
  a: ({ children, href }) => <a href={href}>{children}</a>,
  img: ({ alt, src }) => <img src={src} alt={alt} />,
  br: () => <br />,
  p: ({ children }) => <p>{children}</p>,
  h1: ({ children }) => <h1>{children}</h1>,
  h2: ({ children }) => <h2>{children}</h2>,
  h3: ({ children }) => <h3>{children}</h3>,
  h4: ({ children }) => <h4>{children}</h4>,
  h5: ({ children }) => <h5>{children}</h5>,
  h6: ({ children }) => <h6>{children}</h6>,
  hr: () => <hr />,
  pre: ({ children, lang }) => (
    <pre data-lang={lang}>
      <code>{children}</code>
    </pre>
  ),
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  ol: ({ children, start }) => <ol start={start}>{children}</ol>,
  ul: ({ children }) => <ul>{children}</ul>,
  li: ({ children }) => <li>{children}</li>,
  table: ({ children }) => <table>{children}</table>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children, align }) => <th align={align}>{children}</th>,
  td: ({ children, align }) => <td align={align}>{children}</td>,
};

function Tree({ children, renderers }: TreeProps) {
  return children.map((node, index) => (
    <React.Fragment key={`${getNodeKey(node)}-${index}`}>
      {renderNode(node, { ...DEFAULT_RENDERERS, ...renderers })}
    </React.Fragment>
  ));
}

function renderNode(node: AstNode, renderers: Renderers): React.ReactNode {
  switch (node.type) {
    case "text":
      return node.value;
    case "code":
      return renderers.code({ children: node.value });
    case "em":
      return renderers.em({
        children: <Tree renderers={renderers}>{node.children}</Tree>,
      });
    case "strong":
      return renderers.strong({
        children: <Tree renderers={renderers}>{node.children}</Tree>,
      });
    case "del":
      return renderers.del({
        children: <Tree renderers={renderers}>{node.children}</Tree>,
      });
    case "a":
      return renderers.a({
        children: <Tree renderers={renderers}>{node.children}</Tree>,
        href: node.url,
      });
    case "img":
      return renderers.img({ src: node.url, alt: node.alt });
    case "br":
      return renderers.br();
    case "p":
      return renderers.p({
        children: <Tree renderers={renderers}>{node.children}</Tree>,
      });
    case "h":
      const Heading = renderers[`h${node.level}`];
      return Heading({
        children: <Tree renderers={renderers}>{node.children}</Tree>,
      });
    case "hr":
      return renderers.hr();
    case "pre":
      return renderers.pre({ children: node.raw, lang: node.lang });
    case "blockquote":
      return renderers.blockquote({
        children: <Tree renderers={renderers}>{node.children}</Tree>,
      });
    case "list":
      if (node.ordered) {
        const items = node.items.map((item, itemIndex) => (
          <React.Fragment key={itemIndex}>
            {renderers.li({
              children: <Tree renderers={renderers}>{item.children}</Tree>,
            })}
          </React.Fragment>
        ));
        const start =
          node.start !== undefined && node.start !== 1 ? node.start : undefined;
        return renderers.ol({ children: items, start });
      } else {
        const items = node.items.map((item, itemIndex) => (
          <React.Fragment key={itemIndex}>
            {renderers.li({
              children: <Tree renderers={renderers}>{item.children}</Tree>,
            })}
          </React.Fragment>
        ));
        return renderers.ul({ children: items });
      }
    case "li":
      return renderers.li({
        children: <Tree renderers={renderers}>{node.children}</Tree>,
      });
    case "table":
      const headerCells = node.head.row.cells.map((cell, cellIndex) => (
        <React.Fragment key={cellIndex}>
          {renderers.th({
            children: <Tree renderers={renderers}>{cell.children}</Tree>,
            align: cell.align,
          })}
        </React.Fragment>
      ));
      const headerRow = renderers.tr({ children: headerCells });

      const bodyRows = node.body.rows.map((row, rowIndex) => {
        const cells = row.cells.map((cell, cellIndex) => (
          <React.Fragment key={cellIndex}>
            {renderers.td({
              children: <Tree renderers={renderers}>{cell.children}</Tree>,
              align: cell.align,
            })}
          </React.Fragment>
        ));
        return (
          <React.Fragment key={rowIndex}>
            {renderers.tr({ children: cells })}
          </React.Fragment>
        );
      });

      return renderers.table({
        children: [
          <thead key="thead">{headerRow}</thead>,
          <tbody key="tbody">{bodyRows}</tbody>,
        ],
      });
    default:
      return null;
  }
}

export default Markdown;
