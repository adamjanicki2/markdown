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

/** Component to render a Markdown source string into React */
const Markdown = React.forwardRef<HTMLDivElement, Props>(
  ({ children, renderers, dropTags = [], ...props }, ref) => {
    const ast = React.useMemo(() => buildAst(children), [children]);
    const dropTagsSet = React.useMemo(() => new Set(dropTags), [dropTags]);

    return (
      <div {...props} ref={ref}>
        {render(ast, { ...DEFAULT_RENDERERS, ...renderers }, dropTagsSet)}
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

function getTagFromNode(node: Exclude<AstNode, { type: "text" }>): Tag {
  const type = node.type;
  if (type === "list") return node.ordered ? "ol" : "ul";
  if (type === "h") return `h${node.level}`;
  return type;
}

function render(
  nodes: AstNode | AstNode[],
  renderers: Renderers,
  dropTags: Set<Tag>
): React.ReactNode {
  if (Array.isArray(nodes)) {
    return (
      <>
        {nodes.map((node, index) => {
          const child = render(node, renderers, dropTags);
          return child ? (
            <React.Fragment key={`${getNodeKey(node)}-${index}`}>
              {child}
            </React.Fragment>
          ) : null;
        })}
      </>
    );
  }

  const node = nodes;
  const type = node.type;

  if (type === "text") return node.value;

  // drop any nodes
  if (dropTags.has(getTagFromNode(node))) return null;

  if (type === "code") return renderers.code({ children: node.value });
  if (type === "em")
    return renderers.em({
      children: render(node.children, renderers, dropTags),
    });
  if (type === "strong")
    return renderers.strong({
      children: render(node.children, renderers, dropTags),
    });
  if (type === "del")
    return renderers.del({
      children: render(node.children, renderers, dropTags),
    });
  if (type === "a")
    return renderers.a({
      children: render(node.children, renderers, dropTags),
      href: node.url,
    });
  if (type === "img") return renderers.img({ src: node.url, alt: node.alt });
  if (type === "br") return renderers.br();
  if (type === "p")
    return renderers.p({
      children: render(node.children, renderers, dropTags),
    });
  if (type === "h") {
    const Heading = renderers[`h${node.level}`];
    return Heading({
      children: render(node.children, renderers, dropTags),
    });
  }
  if (type === "hr") return renderers.hr();
  if (type === "pre")
    return renderers.pre({ children: node.raw, lang: node.lang });
  if (type === "list") {
    const children = render(node.children, renderers, dropTags);
    if (node.ordered) {
      const start =
        node.start !== undefined && node.start !== 1 ? node.start : undefined;
      return renderers.ol({ children, start });
    }
    return renderers.ul({ children });
  }
  if (type === "li")
    return renderers.li({
      children: render(node.children, renderers, dropTags),
    });
  if (type === "thead")
    return renderers.thead({
      children: render([node.children], renderers, dropTags),
    });
  if (type === "tbody")
    return renderers.tbody({
      children: render(node.children, renderers, dropTags),
    });
  if (type === "tr")
    return renderers.tr({
      children: render(node.children, renderers, dropTags),
    });
  if (type === "th")
    return renderers.th({
      children: render(node.children, renderers, dropTags),
      align: node.align,
    });
  if (type === "td")
    return renderers.td({
      children: render(node.children, renderers, dropTags),
      align: node.align,
    });
  if (type === "table")
    return renderers.table({
      children: render(node.children, renderers, dropTags),
    });
  return renderers.blockquote({
    children: render(node.children, renderers, dropTags),
  });
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
  thead: (props: ChildrenProps) => React.ReactNode;
  tbody: (props: ChildrenProps) => React.ReactNode;
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
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children, align }) => <th align={align}>{children}</th>,
  td: ({ children, align }) => <td align={align}>{children}</td>,
};

export default Markdown;
