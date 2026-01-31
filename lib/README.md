# @adamjanicki/markdown

A lightweight and customizable Markdown to React renderer.

## Overview

This library is not a strict CommonMark implementation; it supports the majority of it with an added subset of GitHub Flavored Markdown (GFM) with some intentional omissions for security and simplicity. It's unique in its own way; it's _Adamarkdown_ syntax. I built this for fun, so use with caution, there are likely small bugs, and slight mismatches between outputs of this and a true commonmark parser.

## Installation

```bash
npm install @adamjanicki/markdown
```

## Quick Start

```tsx
import Markdown from "@adamjanicki/markdown";

function App() {
  return <Markdown>{"# Hello World\n\nThis is **bold** text."}</Markdown>;
}
```

## Supported Features

| Feature              | Syntax                             |
| -------------------- | ---------------------------------- |
| **Bold**             | `**text**` or `__text__`           |
| **Italic**           | `*text*` or `_text_`               |
| **Strikethrough**    | `~~text~~` (GFM)                   |
| **Inline Code**      | `` `code` ``                       |
| **Links**            | `[text](url)`                      |
| **Images**           | `![alt](url)`                      |
| **Headings**         | `#` through `######`               |
| **Horizontal Rules** | `---`, `***`, or `___`             |
| **Code Fences**      | ` ```lang\ncode\n``` `             |
| **Blockquotes**      | `> text`                           |
| **Unordered Lists**  | `- item`                           |
| **Ordered Lists**    | `1. item` (preserves start number) |
| **Tables**           | GFM pipe tables with alignment     |
| **Hard Breaks**      | Two spaces + newline               |

## Unsupported Features

Notable omissions by design:

- Raw HTML (security)
- Reference-style links
- Indented code blocks (use fenced ` ``` ` instead)
- Setext headings (use `#` instead)
- Task lists
- Footnotes
- Autolinks

## Examples

### Custom Code Block

```tsx
import Markdown from "@adamjanicki/markdown";

<Markdown
  renderers={{
    pre: ({ children, lang }) => (
      <CodeBlock language={lang}>{children}</CodeBlock>
    ),
  }}
>
  {markdownWithCode}
</Markdown>;
```

### Link Sanitization

```tsx
<Markdown
  renderers={{
    a: ({ children, href }) =>
      href.startsWith("https://") ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        <span>{children}</span>
      ),
  }}
>
  {markdown}
</Markdown>
```

### Custom Syntax Extensions

```tsx
<Markdown
  inlineExtensions={[
    {
      token: "==",
      intraword: true,
      renderer: ({ children }) => <mark>{children}</mark>,
    },
    {
      token: "^^",
      intraword: true,
      renderer: ({ children }) => <sup>{children}</sup>,
    },
    {
      token: "%%",
      intraword: false,
      renderer: ({ children }) => <small>{children}</small>,
    },
  ]}
>
  {"Text with ==highlight==, ^^superscript^^, and %%small%% text"}
</Markdown>
```

_Want to play around with the component? Head over to the_ [Playground](https://adamjanicki.xyz/markdown#playground)
