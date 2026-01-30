import React from "react";

import { type AstNode, buildAst, type ModifierConfig } from "./ast";

/** Props for the Markdown component */
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

/**
 * Defines a custom inline modifier.
 * The token must a unique repeated character (e.g. "=", "%%").
 */
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
): {
  modifierConfigs: ModifierConfigs;
  inlineExtensionMap: InlineExtensionMap;
} {
  const modifierConfigs: ModifierConfigs = {};
  const inlineExtensionMap: InlineExtensionMap = {};

  for (const ext of inlineExtensions) {
    const { token } = ext;
    const char = token[0];
    if (!char) continue;
    if (!token.split("").every((c) => c === char)) continue;

    inlineExtensionMap[token] = ext;

    const existing = modifierConfigs[char];
    const lengths = existing?.lengths || new Set();
    lengths.add(token.length);
    modifierConfigs[char] = {
      intraword: ext.intraword,
      lengths,
    };
  }

  return { modifierConfigs, inlineExtensionMap };
}

function getNodeKey(node: AstNode) {
  const type = node.type;
  if (type === "list") return node.ordered ? "ol" : "ul";
  if (type === "h") return `h${node.level}`;
  if (type === "modifier") return `modifier-${node.delimiter}`;
  return type;
}

function getTagFromNode(node: Exclude<AstNode, { type: "text" }>): Tag | null {
  const type = node.type;
  if (type === "list") return node.ordered ? "ol" : "ul";
  if (type === "h") return `h${node.level}`;
  if (type === "modifier") return BUILTIN_MODIFIERS[node.delimiter] ?? null;
  return type;
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

  const tag = getTagFromNode(node);
  const hideBehavior = tag ? hideTags.get(tag) : undefined;
  if (hideBehavior) {
    // drop entire subtree
    if (hideBehavior === "drop") return null;
    // unwrap and return children
    if ("children" in node)
      return render(node.children, renderers, hideTags, inlineExtensionMap);
    // return raw code strings
    if (node.type === "code" || node.type === "pre") return node.value;
    // elements without children (img, hr, br) return null
    return null;
  }

  if (type === "code") return renderers.code({ children: node.value });
  if (type === "modifier") {
    const inlineExtension = inlineExtensionMap[node.delimiter];
    if (inlineExtension) {
      return inlineExtension.renderer({
        children: render(
          node.children,
          renderers,
          hideTags,
          inlineExtensionMap
        ),
      });
    }

    const builtinTag = BUILTIN_MODIFIERS[node.delimiter];
    const renderer = builtinTag ? renderers[builtinTag] : null;
    if (!renderer) {
      return render(node.children, renderers, hideTags, inlineExtensionMap);
    }

    return renderer({
      children: render(node.children, renderers, hideTags, inlineExtensionMap),
    });
  }
  if (type === "a")
    return renderers.a({
      children: render(node.children, renderers, hideTags, inlineExtensionMap),
      href: node.url,
    });
  if (type === "img") return renderers.img({ src: node.url, alt: node.alt });
  if (type === "br") return renderers.br();
  if (type === "p")
    return renderers.p({
      children: render(node.children, renderers, hideTags, inlineExtensionMap),
    });
  if (type === "h") {
    const Heading = renderers[`h${node.level}`];
    return Heading({
      children: render(node.children, renderers, hideTags, inlineExtensionMap),
    });
  }
  if (type === "hr") return renderers.hr();
  if (type === "pre")
    return renderers.pre({ children: node.value, lang: node.lang });
  if (type === "list") {
    const children = render(
      node.children,
      renderers,
      hideTags,
      inlineExtensionMap
    );
    if (node.ordered) {
      const start =
        node.start !== undefined && node.start !== 1 ? node.start : undefined;
      return renderers.ol({ children, start });
    }
    return renderers.ul({ children });
  }
  if (type === "li")
    return renderers.li({
      children: render(node.children, renderers, hideTags, inlineExtensionMap),
    });
  if (type === "thead")
    return renderers.thead({
      children: render(node.children, renderers, hideTags, inlineExtensionMap),
    });
  if (type === "tbody")
    return renderers.tbody({
      children: render(node.children, renderers, hideTags, inlineExtensionMap),
    });
  if (type === "tr")
    return renderers.tr({
      children: render(node.children, renderers, hideTags, inlineExtensionMap),
    });
  if (type === "th")
    return renderers.th({
      children: render(node.children, renderers, hideTags, inlineExtensionMap),
      align: node.align,
    });
  if (type === "td")
    return renderers.td({
      children: render(node.children, renderers, hideTags, inlineExtensionMap),
      align: node.align,
    });
  if (type === "table")
    return renderers.table({
      children: render(node.children, renderers, hideTags, inlineExtensionMap),
    });
  return renderers.blockquote({
    children: render(node.children, renderers, hideTags, inlineExtensionMap),
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

const BUILTIN_MODIFIERS: Record<string, ModifierTag> = {
  "**": "strong",
  __: "strong",
  "*": "em",
  _: "em",
  "~~": "del",
};

export default Markdown;
