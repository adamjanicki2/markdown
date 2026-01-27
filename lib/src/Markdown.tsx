import React from "react";

import { type AstNode, buildAst } from "./ast";

type Props = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
  /** The Markdown source string to convert into a react component */
  children: string;
  renderers?: Partial<Renderers>;
};

const Markdown = React.forwardRef<HTMLDivElement, Props>(
  ({ children, renderers, ...props }, ref) => {
    const ast = React.useMemo(() => buildAst(children), [children]);

    return (
      <div {...props} ref={ref}>
        <Tree renderers={{ ...DEFAULT_RENDERERS, ...renderers }}>{ast}</Tree>
      </div>
    );
  }
);

type TreeProps = {
  children: AstNode[];
  renderers: Renderers;
};

function getNodeKey(node: AstNode) {
  if (node.type === "list") return node.ordered ? "ol" : "ul";
  if (node.type === "h") return `h${node.level}`;
  return node.type;
}

type ChildrenProps = { children: React.ReactNode };
type ImgProps = { src: string; alt: string };
type LinkProps = { children: React.ReactNode; href: string };
type TableCellProps = {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
};
type OlProps = { children: React.ReactNode; start?: number };
type PreProps = { children: string; lang?: string };
type CodeProps = { children: string };

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
  pre: ({ children }) => (
    <pre>
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

type NodeHandler<T extends AstNode> = (
  node: T,
  renderers: Renderers
) => React.ReactNode;

const NODE_HANDLERS: {
  [K in AstNode["type"]]: NodeHandler<Extract<AstNode, { type: K }>>;
} = {
  text: (node) => node.value,
  code: (node, renderers) => renderers.code({ children: node.value }),
  em: (node, renderers) =>
    renderers.em({
      children: <Tree renderers={renderers}>{node.children}</Tree>,
    }),
  strong: (node, renderers) =>
    renderers.strong({
      children: <Tree renderers={renderers}>{node.children}</Tree>,
    }),
  del: (node, renderers) =>
    renderers.del({
      children: <Tree renderers={renderers}>{node.children}</Tree>,
    }),
  a: (node, renderers) =>
    renderers.a({
      children: <Tree renderers={renderers}>{node.children}</Tree>,
      href: node.url,
    }),
  img: (node, renderers) => renderers.img({ src: node.url, alt: node.alt }),
  br: (_node, renderers) => renderers.br(),
  p: (node, renderers) =>
    renderers.p({
      children: <Tree renderers={renderers}>{node.children}</Tree>,
    }),
  h: (node, renderers) => {
    const Heading = renderers[`h${node.level}`];
    return Heading({
      children: <Tree renderers={renderers}>{node.children}</Tree>,
    });
  },
  hr: (_node, renderers) => renderers.hr(),
  pre: (node, renderers) =>
    renderers.pre({ children: node.raw, lang: node.lang }),
  blockquote: (node, renderers) =>
    renderers.blockquote({
      children: <Tree renderers={renderers}>{node.children}</Tree>,
    }),
  list: (node, renderers) => {
    const items = node.items.map((item, itemIndex) => (
      <React.Fragment key={itemIndex}>
        {renderers.li({
          children: <Tree renderers={renderers}>{item.children}</Tree>,
        })}
      </React.Fragment>
    ));

    if (node.ordered) {
      const start =
        node.start !== undefined && node.start !== 1 ? node.start : undefined;
      return renderers.ol({ children: items, start });
    }
    return renderers.ul({ children: items });
  },
  li: (node, renderers) =>
    renderers.li({
      children: <Tree renderers={renderers}>{node.children}</Tree>,
    }),
  table: (node, renderers) => {
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
  },
};

function renderNode(node: AstNode, renderers: Renderers): React.ReactNode {
  if (node.type === "text") return NODE_HANDLERS.text(node, renderers);
  if (node.type === "code") return NODE_HANDLERS.code(node, renderers);
  if (node.type === "em") return NODE_HANDLERS.em(node, renderers);
  if (node.type === "strong") return NODE_HANDLERS.strong(node, renderers);
  if (node.type === "del") return NODE_HANDLERS.del(node, renderers);
  if (node.type === "a") return NODE_HANDLERS.a(node, renderers);
  if (node.type === "img") return NODE_HANDLERS.img(node, renderers);
  if (node.type === "br") return NODE_HANDLERS.br(node, renderers);
  if (node.type === "p") return NODE_HANDLERS.p(node, renderers);
  if (node.type === "h") return NODE_HANDLERS.h(node, renderers);
  if (node.type === "hr") return NODE_HANDLERS.hr(node, renderers);
  if (node.type === "pre") return NODE_HANDLERS.pre(node, renderers);
  if (node.type === "list") return NODE_HANDLERS.list(node, renderers);
  if (node.type === "li") return NODE_HANDLERS.li(node, renderers);
  if (node.type === "table") return NODE_HANDLERS.table(node, renderers);
  return NODE_HANDLERS.blockquote(node, renderers);
}

export default Markdown;
