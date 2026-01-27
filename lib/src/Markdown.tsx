import React from "react";

import { type AstNode, buildAst } from "./ast";

type Props = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
  /** The Markdown source string to convert into a react component */
  children: string;
  /** Custom renderers to use for each DOM Element */
  renderers?: Partial<Renderers>;
  /**
   * HTML elements to drop from output. Elements in this list will be omitted along with their entire subtree
   * @example ["img", "a"] // will not render any images or links
   */
  dropTags?: readonly Tag[] | Tag[];
};

const Markdown = React.forwardRef<HTMLDivElement, Props>(
  ({ children, renderers, dropTags, ...props }, ref) => {
    const ast = React.useMemo(() => buildAst(children), [children]);
    const dropTagsSet = React.useMemo(
      () => (dropTags ? new Set(dropTags) : undefined),
      [dropTags]
    );

    return (
      <div {...props} ref={ref}>
        {renderChildren(
          ast,
          { ...DEFAULT_RENDERERS, ...renderers },
          dropTagsSet
        )}
      </div>
    );
  }
);

function getNodeKey(node: AstNode) {
  const type = node.type;
  if (type === "list") return node.ordered ? "ol" : "ul";
  if (type === "h") return `h${node.level}`;
  return type;
}

function getTagFromNode(node: AstNode): Tag | null {
  const type = node.type;
  if (type === "text") return null;
  if (type === "list") return node.ordered ? "ol" : "ul";
  if (type === "h") return `h${node.level}`;
  return type;
}

// Render an array of AST nodes with proper keying and null filtering
function renderChildren(
  children: AstNode[],
  renderers: Renderers,
  dropTags?: Set<Tag>
): React.ReactNode {
  return (
    <>
      {children
        .map((node, index) => ({
          key: `${getNodeKey(node)}-${index}`,
          rendered: renderNode(node, renderers, dropTags),
        }))
        .filter(({ rendered }) => rendered !== null)
        .map(({ key, rendered }) => (
          <React.Fragment key={key}>{rendered}</React.Fragment>
        ))}
    </>
  );
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

type Tag = keyof Renderers;

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

function renderNode(
  node: AstNode,
  renderers: Renderers,
  dropTags?: Set<Tag>
): React.ReactNode {
  const type = node.type;
  if (type === "text") return node.value;

  if (dropTags) {
    const tag = getTagFromNode(node);
    if (tag && dropTags.has(tag)) {
      return null;
    }
  }

  if (type === "code") return renderers.code({ children: node.value });
  if (type === "em")
    return renderers.em({
      children: renderChildren(node.children, renderers, dropTags),
    });
  if (type === "strong")
    return renderers.strong({
      children: renderChildren(node.children, renderers, dropTags),
    });
  if (type === "del")
    return renderers.del({
      children: renderChildren(node.children, renderers, dropTags),
    });
  if (type === "a")
    return renderers.a({
      children: renderChildren(node.children, renderers, dropTags),
      href: node.url,
    });
  if (type === "img") return renderers.img({ src: node.url, alt: node.alt });
  if (type === "br") return renderers.br();
  if (type === "p")
    return renderers.p({
      children: renderChildren(node.children, renderers, dropTags),
    });
  if (type === "h") {
    const Heading = renderers[`h${node.level}`];
    return Heading({
      children: renderChildren(node.children, renderers, dropTags),
    });
  }
  if (type === "hr") return renderers.hr();
  if (type === "pre")
    return renderers.pre({ children: node.raw, lang: node.lang });
  if (type === "list") {
    const items = node.items.map((item, itemIndex) => {
      if (dropTags?.has("li")) return null;
      return (
        <React.Fragment key={itemIndex}>
          {renderers.li({
            children: renderChildren(item.children, renderers, dropTags),
          })}
        </React.Fragment>
      );
    });

    if (node.ordered) {
      const start =
        node.start !== undefined && node.start !== 1 ? node.start : undefined;
      return renderers.ol({ children: items, start });
    }
    return renderers.ul({ children: items });
  }
  if (type === "li")
    return renderers.li({
      children: renderChildren(node.children, renderers, dropTags),
    });
  if (type === "table") {
    const headerCells = node.head.row.cells.map((cell, cellIndex) => {
      if (dropTags?.has("th")) return null;
      return (
        <React.Fragment key={cellIndex}>
          {renderers.th({
            children: renderChildren(cell.children, renderers, dropTags),
            align: cell.align,
          })}
        </React.Fragment>
      );
    });

    const headerRow = dropTags?.has("tr")
      ? null
      : renderers.tr({ children: headerCells });

    const bodyRows = node.body.rows.map((row, rowIndex) => {
      if (dropTags?.has("tr")) return null;

      const cells = row.cells.map((cell, cellIndex) => {
        if (dropTags?.has("td")) return null;
        return (
          <React.Fragment key={cellIndex}>
            {renderers.td({
              children: renderChildren(cell.children, renderers, dropTags),
              align: cell.align,
            })}
          </React.Fragment>
        );
      });

      return (
        <React.Fragment key={rowIndex}>
          {renderers.tr({ children: cells })}
        </React.Fragment>
      );
    });

    const tableChildren = [
      headerRow && <thead key="thead">{headerRow}</thead>,
      <tbody key="tbody">{bodyRows}</tbody>,
    ];

    return renderers.table({ children: tableChildren });
  }
  return renderers.blockquote({
    children: renderChildren(node.children, renderers, dropTags),
  });
}

export default Markdown;
