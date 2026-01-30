# @adamjanicki/markdown

A lightweight and customizable Markdown to React renderer.

## Overview

This library is **not a strict CommonMark implementation**. It supports a **subset of GitHub Flavored Markdown (GFM)** with some intentional omissions for security and simplicity.

### Important Disclaimers

- **Not a full CommonMark implementation**: Some edge cases and advanced features are not supported
- **Subset of GFM**: Supports tables, strikethrough, and fenced code blocks, but not all GFM extensions
- **No raw HTML**: HTML is not parsed or rendered for security's sake
- **Prioritizes safety and customization**: Built for controlled environments where you need precise rendering control
- **I built this for fun**: There are probably bugs, so use caution!

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

## Supported Markdown Syntax

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
- Task lists, footnotes, emoji shortcodes
- Autolinks

## Examples

### Renderers

**Syntax Highlighting:**

```tsx
import Markdown from "@adamjanicki/markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

<Markdown
  renderers={{
    pre: ({ children, lang }) => (
      <SyntaxHighlighter language={lang || "text"}>
        {children}
      </SyntaxHighlighter>
    ),
  }}
>
  {markdownWithCode}
</Markdown>;
```

**Link Sanitization:**

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

### Extensions

**Custom Syntax (Highlight, Superscript, Small):**

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
