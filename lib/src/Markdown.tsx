import React from "react";

import { type AstNode, buildAst, type ModifierConfig } from "./ast";

type Props = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
  /** The Markdown source string to convert into a react component */
  children: string;
  /** Custom renderers to use for each supported DOM element */
  renderers?: Partial<Renderers>;
  /**
   * HTML elements to hide from output JSX.
   * - `'unwrap'`: Remove wrapper element but preserve children.
   * - `'drop'`: Fully remove subtree rooted at the element.
   * @example { img: 'drop', a: 'unwrap' } // images removed entirely, link text preserved without anchor
   */
  hideTags?: Partial<Record<Tag, "unwrap" | "drop">>;
  /**
   * Custom inline expressions to add to your markdown.
   * @example [{ token: "==", intraword: true, renderer: (props) => <mark {...props} /> }] // can use "==highlight==" in the source!
   */
  inlineExtensions?: readonly InlineExtension[] | InlineExtension[];
};

type InlineExtension = {
  /** The delimiter token to match (e.g. "==") */
  token: string;
  /**
   * Whether the token is allowed to open/close within words.
   * If false, instances of this token between words will be treated as literals.
   */
  intraword: boolean;
  /** Renderer used for this custom modifier */
  renderer: (props: ChildrenProps) => React.ReactNode;
};

type InlineExtensionMap = Record<string, InlineExtension>;
type ModifierConfigs = Record<string, ModifierConfig | undefined>;
type ModifierTag = "em" | "strong" | "del";

/** Component to render a Markdown source string into React */
const Markdown = React.forwardRef<HTMLDivElement, Props>(
  ({ children, renderers, hideTags, inlineExtensions, ...props }, ref) => {
    const { modifierConfigs, inlineExtensionMap } = React.useMemo(
      () => buildInlineExtensionMaps(inlineExtensions),
      [inlineExtensions]
    );
    const ast = React.useMemo(
      () => buildAst(children, { modifierConfigs }),
      [children, modifierConfigs]
    );
    const hideTagsMap = React.useMemo(
      () => new Map(Object.entries(hideTags || [])),
      [hideTags]
    );
    const mergedRenderers = React.useMemo(
      () => ({ ...DEFAULT_RENDERERS, ...renderers }),
      [renderers]
    );

    return (
      <div {...props} ref={ref}>
        {render(ast, mergedRenderers, hideTagsMap, inlineExtensionMap)}
      </div>
    );
  }
);

function buildInlineExtensionMaps(
  inlineExtensions: readonly InlineExtension[] = []
) {
  const modifierConfigs: ModifierConfigs = {};
  const inlineExtensionMap: InlineExtensionMap = {};

  for (const ext of inlineExtensions) {
    const { token } = ext;
    const char = token[0];
    if (char) {
      inlineExtensionMap[token] = ext;
      const existing = modifierConfigs[char];
      const lengths = existing?.lengths || new Set();
      lengths.add(token.length);
      modifierConfigs[char] = {
        intraword: ext.intraword,
        lengths,
      };
    }
  }

  return { modifierConfigs, inlineExtensionMap };
}

function getNodeMetadata(node: AstNode): { key: string; tag: Tag | null } {
  const type = node.type;
  if (type === "list")
    return { key: node.ordered ? "ol" : "ul", tag: node.ordered ? "ol" : "ul" };
  if (type === "h") return { key: `h${node.level}`, tag: `h${node.level}` };
  if (type === "modifier")
    return {
      key: `modifier-${node.delimiter}`,
      tag: BUILTIN_MODIFIERS[node.delimiter] ?? null,
    };
  if (type === "text") return { key: type, tag: null };
  return { key: type, tag: type };
}

function render(
  nodes: AstNode | AstNode[],
  renderers: Renderers,
  hideTags: Map<string, "unwrap" | "drop">,
  inlineExtensionMap: InlineExtensionMap
): React.ReactNode {
  if (Array.isArray(nodes)) {
    return (
      <>
        {nodes.map((node, index) => {
          const child = render(node, renderers, hideTags, inlineExtensionMap);
          return child ? (
            <React.Fragment key={`${getNodeMetadata(node).key}-${index}`}>
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

  const renderChildren = (node: { children: AstNode[] }) =>
    render(node.children, renderers, hideTags, inlineExtensionMap);

  const tag = getNodeMetadata(node).tag;
  const hideBehavior = tag ? hideTags.get(tag) : undefined;
  if (hideBehavior) {
    // drop entire subtree
    if (hideBehavior === "drop") return null;
    // unwrap and return children
    if ("children" in node) return renderChildren(node);
    // return raw code strings
    if (node.type === "code" || node.type === "pre") return node.value;
    // elements without children (img, hr, br) don't have meaningful children
    return null;
  }

  if (type === "p")
    return renderers.p({
      children: renderChildren(node),
    });
  if (type === "h")
    return renderers[`h${node.level}`]({
      children: renderChildren(node),
    });
  if (type === "a")
    return renderers.a({
      children: renderChildren(node),
      href: node.url,
    });
  if (type === "modifier") {
    const inlineExtension = inlineExtensionMap[node.delimiter];
    if (inlineExtension) {
      return inlineExtension.renderer({
        children: renderChildren(node),
      });
    }

    const builtinTag = BUILTIN_MODIFIERS[node.delimiter];
    const renderer = builtinTag ? renderers[builtinTag] : null;
    if (!renderer) {
      return renderChildren(node);
    }

    return renderer({
      children: renderChildren(node),
    });
  }
  if (type === "hr") return renderers.hr();
  if (type === "img") return renderers.img({ src: node.url, alt: node.alt });
  if (type === "br") return renderers.br();
  if (type === "list") {
    const children = renderChildren(node);
    return node.ordered
      ? renderers.ol({
          children,
          start:
            node.start !== undefined && node.start !== 1
              ? node.start
              : undefined,
        })
      : renderers.ul({ children });
  }
  if (type === "li")
    return renderers.li({
      children: renderChildren(node),
    });
  if (type === "code") return renderers.code({ children: node.value });
  if (type === "pre")
    return renderers.pre({ children: node.value, lang: node.lang });
  if (type === "thead")
    return renderers.thead({
      children: renderChildren(node),
    });
  if (type === "tbody")
    return renderers.tbody({
      children: renderChildren(node),
    });
  if (type === "tr")
    return renderers.tr({
      children: renderChildren(node),
    });
  if (type === "th")
    return renderers.th({
      children: renderChildren(node),
      align: node.align,
    });
  if (type === "td")
    return renderers.td({
      children: renderChildren(node),
      align: node.align,
    });
  if (type === "table")
    return renderers.table({
      children: renderChildren(node),
    });
  return renderers.blockquote({
    children: renderChildren(node),
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
  code: (props) => <code {...props} />,
  em: (props) => <em {...props} />,
  strong: (props) => <strong {...props} />,
  del: (props) => <del {...props} />,
  a: (props) => <a {...props} />,
  img: (props) => <img {...props} />,
  br: () => <br />,
  p: (props) => <p {...props} />,
  h1: (props) => <h1 {...props} />,
  h2: (props) => <h2 {...props} />,
  h3: (props) => <h3 {...props} />,
  h4: (props) => <h4 {...props} />,
  h5: (props) => <h5 {...props} />,
  h6: (props) => <h6 {...props} />,
  hr: () => <hr />,
  pre: ({ children }) => (
    <pre>
      <code>{children}</code>
    </pre>
  ),
  blockquote: (props) => <blockquote {...props} />,
  ol: (props) => <ol {...props} />,
  ul: (props) => <ul {...props} />,
  li: (props) => <li {...props} />,
  table: (props) => <table {...props} />,
  thead: (props) => <thead {...props} />,
  tbody: (props) => <tbody {...props} />,
  tr: (props) => <tr {...props} />,
  th: (props) => <th {...props} />,
  td: (props) => <td {...props} />,
};

const BUILTIN_MODIFIERS: Record<string, ModifierTag> = {
  "**": "strong",
  __: "strong",
  "*": "em",
  _: "em",
  "~~": "del",
};

export default Markdown;
