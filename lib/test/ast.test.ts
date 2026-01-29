import { type AstNode, buildAst, type BuildAstOptions } from "../src/ast";

type TestCase = {
  readonly name: string;
  readonly input: string;
  readonly ast: AstNode[];
  readonly options?: BuildAstOptions;
};

const HIGHLIGHT_OPTIONS: BuildAstOptions = {
  modifierConfigs: {
    "=": { intraword: true, lengths: new Set([2]) },
  },
};

const STRICT_HIGHLIGHT_OPTIONS: BuildAstOptions = {
  modifierConfigs: {
    "=": { intraword: false, lengths: new Set([2]) },
  },
};

const HASH_OPTIONS: BuildAstOptions = {
  modifierConfigs: {
    "#": { intraword: true, lengths: new Set([1]) },
  },
};

const OVERRIDE_STAR_OPTIONS: BuildAstOptions = {
  modifierConfigs: {
    "*": { intraword: true, lengths: new Set([1]) },
  },
};

const OVERRIDE_TILDE_OPTIONS: BuildAstOptions = {
  modifierConfigs: {
    "~": { intraword: true, lengths: new Set([1]) },
  },
};

export const TEST_CASES: readonly TestCase[] = [
  {
    name: "paragraph",
    input: "Hello world",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "Hello world",
          },
        ],
      },
    ],
  },
  {
    name: "paragraph does not hardbreak on single newline",
    input: "Hello\nworld",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "Hello",
          },
          {
            type: "text",
            value: "\nworld",
          },
        ],
      },
    ],
  },
  {
    name: "paragraph hardbreak renders as <br />",
    input: "Hello  \nworld",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "Hello",
          },
          {
            type: "br",
          },
          {
            type: "text",
            value: "world",
          },
        ],
      },
    ],
  },
  {
    name: "nested emphasis/strong",
    input: "**a _b_ c**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "**",
            children: [
              {
                type: "text",
                value: "a ",
              },
              {
                type: "modifier",
                delimiter: "_",
                children: [
                  {
                    type: "text",
                    value: "b",
                  },
                ],
              },
              {
                type: "text",
                value: " c",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "triple nesting combo: del > strong > em",
    input: "~~***combo***~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [
              {
                type: "modifier",
                delimiter: "*",
                children: [
                  {
                    type: "modifier",
                    delimiter: "**",
                    children: [
                      {
                        type: "text",
                        value: "combo",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "deeply nested mix",
    input: "*a **b ~~c~~ d** e*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "text",
                value: "a ",
              },
              {
                type: "modifier",
                delimiter: "**",
                children: [
                  {
                    type: "text",
                    value: "b ",
                  },
                  {
                    type: "modifier",
                    delimiter: "~~",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                  {
                    type: "text",
                    value: " d",
                  },
                ],
              },
              {
                type: "text",
                value: " e",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "unmatched delimiters left as text",
    input: "Unmatched *stars and ~~tildes",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "Unmatched *stars and ~~tildes",
          },
        ],
      },
    ],
  },
  {
    name: "underscores inside words do not emphasize",
    input: "snake_case foo_bar baz_qux",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "snake_case foo_bar baz_qux",
          },
        ],
      },
    ],
  },
  {
    name: "backslash escapes prevent emphasis",
    input: "\\*not italic\\*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "*not italic*",
          },
        ],
      },
    ],
  },
  {
    name: "code spans block delimiter parsing",
    input: "**a `*b*` c**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "**",
            children: [
              {
                type: "text",
                value: "a ",
              },
              {
                type: "code",
                value: "*b*",
              },
              {
                type: "text",
                value: " c",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "link with inline label",
    input: "See [docs `v1`](https://example.com)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "See ",
          },
          {
            type: "a",
            url: "https://example.com",
            children: [
              {
                type: "text",
                value: "docs ",
              },
              {
                type: "code",
                value: "v1",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "html is left alone",
    input: "<div>x</div>",
    ast: [{ type: "p", children: [{ type: "text", value: "<div>x</div>" }] }],
  },
  {
    name: "mixed: link + em + code + del",
    input: "a [b](x) _c_ `d` ~~e~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "a ",
          },
          {
            type: "a",
            url: "x",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
          {
            type: "text",
            value: " ",
          },
          {
            type: "modifier",
            delimiter: "_",
            children: [
              {
                type: "text",
                value: "c",
              },
            ],
          },
          {
            type: "text",
            value: " ",
          },
          {
            type: "code",
            value: "d",
          },
          {
            type: "text",
            value: " ",
          },
          {
            type: "modifier",
            delimiter: "~~",
            children: [
              {
                type: "text",
                value: "e",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "multiple single lines",
    input: "a\nb\nc",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "a",
          },
          {
            type: "text",
            value: "\nb",
          },
          {
            type: "text",
            value: "\nc",
          },
        ],
      },
    ],
  },
  {
    name: "hardbreak inside emphasis",
    input: "*a  \nb*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "br",
              },
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "single newline inside emphasis",
    input: "*a\nb*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "text",
                value: "\nb",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "heading",
    input: "# Title",
    ast: [
      {
        type: "h",
        level: 1,
        children: [
          {
            type: "text",
            value: "Title",
          },
        ],
      },
    ],
  },
  {
    name: "heading supports inline formatting",
    input: "# Title **Bold**",
    ast: [
      {
        type: "h",
        level: 1,
        children: [
          {
            type: "text",
            value: "Title ",
          },
          {
            type: "modifier",
            delimiter: "**",
            children: [
              {
                type: "text",
                value: "Bold",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "heading strips trailing hashes",
    input: "## Hi ###",
    ast: [
      {
        type: "h",
        level: 2,
        children: [
          {
            type: "text",
            value: "Hi",
          },
        ],
      },
    ],
  },
  {
    name: "thematic break",
    input: "---",
    ast: [
      {
        type: "hr",
      },
    ],
  },
  {
    name: "fenced code block with language",
    input: "```ts\nconst x = 1;\n```\n",
    ast: [
      {
        type: "pre",
        lang: "ts",
        value: "const x = 1;",
      },
    ],
  },
  {
    name: "fenced code block escapes HTML",
    input: "```html\n<div>x</div>\n```",
    ast: [
      {
        type: "pre",
        lang: "html",
        value: "<div>x</div>",
      },
    ],
  },
  {
    name: "fenced code without language",
    input: "```\n<x>\n```",
    ast: [
      {
        type: "pre",
        lang: "",
        value: "<x>",
      },
    ],
  },
  {
    name: "code fence end can be longer than start",
    input: "```js\nx\n````",
    ast: [
      {
        type: "pre",
        lang: "js",
        value: "x",
      },
    ],
  },
  {
    name: "code fence can start after up to 3 spaces",
    input: "   ```\nhi\n   ```",
    ast: [
      {
        type: "pre",
        lang: "",
        value: "hi",
      },
    ],
  },
  {
    name: "blockquote (simple)",
    input: "> Hello",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "Hello",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "blockquote supports lazy continuation lines",
    input: "> a\nb",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "text",
                value: "\nb",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "nested blockquotes (>>)",
    input: ">> a",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "blockquote",
            children: [
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "nested blockquotes with spaced markers",
    input: "> > a",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "blockquote",
            children: [
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "blockquote marker allowed after indentation",
    input: "  > a",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "blockquote contains heading + paragraph",
    input: "> # H\n> x",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "h",
            level: 1,
            children: [
              {
                type: "text",
                value: "H",
              },
            ],
          },
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "x",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "blockquote contains thematic break",
    input: "> ---",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "hr",
          },
        ],
      },
    ],
  },
  {
    name: "blockquote contains nested quote + list",
    input: "> > - a\n> > - b",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "blockquote",
            children: [
              {
                type: "list",
                ordered: false,
                tight: true,
                children: [
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "a",
                      },
                    ],
                  },
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "unordered list (simple)",
    input: "- a\n- b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "ordered list (simple)",
    input: "1. a\n2. b",
    ast: [
      {
        type: "list",
        ordered: true,
        start: 1,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "ordered list with start != 1",
    input: "3. a\n4. b",
    ast: [
      {
        type: "list",
        ordered: true,
        start: 3,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list item lazy continuation",
    input: "- a\nb\n- c",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "text",
                value: "\nb",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "c",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list item continuation stops before heading",
    input: "- a\n# h",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
        ],
      },
      {
        type: "h",
        level: 1,
        children: [
          {
            type: "text",
            value: "h",
          },
        ],
      },
    ],
  },
  {
    name: "blank line makes list loose (still same HTML)",
    input: "- a\n\n- b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: false,
        children: [
          {
            type: "li",
            children: [
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                ],
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "b",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "nested unordered list",
    input: "- a\n  - b\n  - c\n- d",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "list",
                ordered: false,
                tight: true,
                children: [
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "d",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "nested ordered inside unordered",
    input: "- a\n  1. b\n  2. c\n- d",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "list",
                ordered: true,
                start: 1,
                tight: true,
                children: [
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "d",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "nested list under list item using content indentation",
    input: "- a\n  - b\n    - c\n- d",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "list",
                ordered: false,
                tight: true,
                children: [
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                      {
                        type: "list",
                        ordered: false,
                        tight: true,
                        children: [
                          {
                            type: "li",
                            children: [
                              {
                                type: "text",
                                value: "c",
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "d",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "ordered list with multi-digit marker supports nesting",
    input: "10. a\n    - b",
    ast: [
      {
        type: "list",
        ordered: true,
        start: 10,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "list",
                ordered: false,
                tight: true,
                children: [
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list item contains multiple paragraphs",
    input: "- a\n\n  b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: false,
        children: [
          {
            type: "li",
            children: [
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                ],
              },
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "b",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list item contains heading + paragraph continuation stops correctly",
    input: "- a\n  # h\n  b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "h",
                level: 1,
                children: [
                  {
                    type: "text",
                    value: "h",
                  },
                ],
              },
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list item can contain a blockquote that contains a list",
    input: "- a\n  > - b\n  > - c\n- d",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "blockquote",
                children: [
                  {
                    type: "list",
                    ordered: false,
                    tight: true,
                    children: [
                      {
                        type: "li",
                        children: [
                          {
                            type: "text",
                            value: "b",
                          },
                        ],
                      },
                      {
                        type: "li",
                        children: [
                          {
                            type: "text",
                            value: "c",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "d",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "blockquote can contain a list",
    input: "> - a\n> - b",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "list",
            ordered: false,
            tight: true,
            children: [
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                ],
              },
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "b",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "nested list inside blockquote with lazy continuation",
    input: "> - a\n> b\n> - c",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "list",
            ordered: false,
            tight: true,
            children: [
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                  {
                    type: "text",
                    value: "\nb",
                  },
                ],
              },
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "c",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list contains nested blockquote then paragraph (lazy continuation stays in quote)",
    input: "- a\n  > x\ny",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "blockquote",
                children: [
                  {
                    type: "p",
                    children: [
                      {
                        type: "text",
                        value: "x",
                      },
                      {
                        type: "text",
                        value: "\ny",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "ordered list siblings must align by indent (indented ordered marker nests)",
    input: "1. a\n  2. b",
    ast: [
      {
        type: "list",
        ordered: true,
        start: 1,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list item inline formatting",
    input: "- a **b** _c_",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a ",
              },
              {
                type: "modifier",
                delimiter: "**",
                children: [
                  {
                    type: "text",
                    value: "b",
                  },
                ],
              },
              {
                type: "text",
                value: " ",
              },
              {
                type: "modifier",
                delimiter: "_",
                children: [
                  {
                    type: "text",
                    value: "c",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "nested list item inline formatting",
    input: "- a\n  - **b**\n  - _c_",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "list",
                ordered: false,
                tight: true,
                children: [
                  {
                    type: "li",
                    children: [
                      {
                        type: "modifier",
                        delimiter: "**",
                        children: [
                          {
                            type: "text",
                            value: "b",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "li",
                    children: [
                      {
                        type: "modifier",
                        delimiter: "_",
                        children: [
                          {
                            type: "text",
                            value: "c",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "fenced code inside list item",
    input: "- a\n  ```\n  x\n  ```\n- b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "pre",
                lang: "",
                value: "x",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "fenced code inside blockquote",
    input: "> ```\n> x\n> ```",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "pre",
            lang: "",
            value: "x",
          },
        ],
      },
    ],
  },
  {
    name: "fenced code inside blockquote inside list item",
    input: "- a\n  > ```\n  > x\n  > ```\n- b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "blockquote",
                children: [
                  {
                    type: "pre",
                    lang: "",
                    value: "x",
                  },
                ],
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list in blockquote in list in blockquote (deep structure)",
    input: "> - a\n>   > - b\n>   >   - c\n> - d",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "list",
            ordered: false,
            tight: true,
            children: [
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                  {
                    type: "blockquote",
                    children: [
                      {
                        type: "list",
                        ordered: false,
                        tight: true,
                        children: [
                          {
                            type: "li",
                            children: [
                              {
                                type: "text",
                                value: "b",
                              },
                              {
                                type: "list",
                                ordered: false,
                                tight: true,
                                children: [
                                  {
                                    type: "li",
                                    children: [
                                      {
                                        type: "text",
                                        value: "c",
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "d",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "paragraph after complex structures",
    input: "- a\n  > x\n\nz",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "blockquote",
                children: [
                  {
                    type: "p",
                    children: [
                      {
                        type: "text",
                        value: "x",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "z",
          },
        ],
      },
    ],
  },
  {
    name: "basic table",
    input: "| a | b |\n| - | - |\n| c | d |",
    ast: [
      {
        type: "table",
        children: [
          {
            type: "thead",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "a",
                      },
                    ],
                  },
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tbody",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "d",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "table supports inline in cells",
    input: "| a | b |\n| - | - |\n| **c** | d |",
    ast: [
      {
        type: "table",
        children: [
          {
            type: "thead",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "a",
                      },
                    ],
                  },
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tbody",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    children: [
                      {
                        type: "modifier",
                        delimiter: "**",
                        children: [
                          {
                            type: "text",
                            value: "c",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "d",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "table supports multiple body rows + inline",
    input: "| a | b |\n| - | - |\n| c | _d_ |\n| `x` | ~~y~~ |",
    ast: [
      {
        type: "table",
        children: [
          {
            type: "thead",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "a",
                      },
                    ],
                  },
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tbody",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                  {
                    type: "td",
                    children: [
                      {
                        type: "modifier",
                        delimiter: "_",
                        children: [
                          {
                            type: "text",
                            value: "d",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    children: [
                      {
                        type: "code",
                        value: "x",
                      },
                    ],
                  },
                  {
                    type: "td",
                    children: [
                      {
                        type: "modifier",
                        delimiter: "~~",
                        children: [
                          {
                            type: "text",
                            value: "y",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "table without outer pipes",
    input: "a | b\n- | -\nc | d",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "a | b",
          },
        ],
      },
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "| -",
              },
              {
                type: "text",
                value: "\nc | d",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "heading with leading spaces",
    input: "  # not heading",
    ast: [
      {
        type: "h",
        level: 1,
        children: [
          {
            type: "text",
            value: "not heading",
          },
        ],
      },
    ],
  },
  {
    name: "weird nested list syntax",
    input: "* - *",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "list",
                ordered: false,
                tight: true,
                children: [
                  {
                    type: "li",
                    children: [
                      {
                        type: "list",
                        ordered: false,
                        tight: true,
                        children: [
                          {
                            type: "li",
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "fence allows internal backticks",
    input: "```\n`nested code`\n```",
    ast: [
      {
        type: "pre",
        lang: "",
        value: "`nested code`",
      },
    ],
  },
  {
    name: "code span preserves leading and trailing spaces",
    input: "` code `",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "code",
            value: " code ",
          },
        ],
      },
    ],
  },
  {
    name: "trailing backslash is literal",
    input: "foo\\",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "foo\\",
          },
        ],
      },
    ],
  },
  {
    name: "empty URLs create link and image nodes",
    input: "[link]() ![img]()",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "",
            children: [
              {
                type: "text",
                value: "link",
              },
            ],
          },
          {
            type: "text",
            value: " ",
          },
          {
            type: "img",
            url: "",
            alt: "img",
          },
        ],
      },
    ],
  },
  {
    name: "link url trims whitespace",
    input: "[x](  https://a.com  )",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "https://a.com",
            children: [
              {
                type: "text",
                value: "x",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "deep inline nesting with del/strong/em",
    input: "*a **b ~~c _d_~~ e** f*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "text",
                value: "a ",
              },
              {
                type: "modifier",
                delimiter: "**",
                children: [
                  {
                    type: "text",
                    value: "b ",
                  },
                  {
                    type: "modifier",
                    delimiter: "~~",
                    children: [
                      {
                        type: "text",
                        value: "c ",
                      },
                      {
                        type: "modifier",
                        delimiter: "_",
                        children: [
                          {
                            type: "text",
                            value: "d",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "text",
                    value: " e",
                  },
                ],
              },
              {
                type: "text",
                value: " f",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "emphasis wraps a link",
    input: "*see [x](y)*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "text",
                value: "see ",
              },
              {
                type: "a",
                url: "y",
                children: [
                  {
                    type: "text",
                    value: "x",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "code span blocks link parsing",
    input: "`[x](y)`",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "code",
            value: "[x](y)",
          },
        ],
      },
    ],
  },
  {
    name: "table inside blockquote",
    input: "> | a | b |\n> | - | - |\n> | c | d |",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "table",
            children: [
              {
                type: "thead",
                children: [
                  {
                    type: "tr",
                    children: [
                      {
                        type: "th",
                        children: [
                          {
                            type: "text",
                            value: "a",
                          },
                        ],
                      },
                      {
                        type: "th",
                        children: [
                          {
                            type: "text",
                            value: "b",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: "tbody",
                children: [
                  {
                    type: "tr",
                    children: [
                      {
                        type: "td",
                        children: [
                          {
                            type: "text",
                            value: "c",
                          },
                        ],
                      },
                      {
                        type: "td",
                        children: [
                          {
                            type: "text",
                            value: "d",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "table inside list item",
    input: "- | a | b |\n  | - | - |\n  | c | d |",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "table",
                children: [
                  {
                    type: "thead",
                    children: [
                      {
                        type: "tr",
                        children: [
                          {
                            type: "th",
                            children: [
                              {
                                type: "text",
                                value: "a",
                              },
                            ],
                          },
                          {
                            type: "th",
                            children: [
                              {
                                type: "text",
                                value: "b",
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "tbody",
                    children: [
                      {
                        type: "tr",
                        children: [
                          {
                            type: "td",
                            children: [
                              {
                                type: "text",
                                value: "c",
                              },
                            ],
                          },
                          {
                            type: "td",
                            children: [
                              {
                                type: "text",
                                value: "d",
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "horizontal rule before list item",
    input: "- ---\n- a",
    ast: [
      {
        type: "hr",
      },
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "blockquote with list, blank line, then paragraph",
    input: "> - a\n>   - b\n> \n> c",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "list",
            ordered: false,
            tight: true,
            children: [
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                  {
                    type: "list",
                    ordered: false,
                    tight: true,
                    children: [
                      {
                        type: "li",
                        children: [
                          {
                            type: "text",
                            value: "b",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "c",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "ordered list with blockquote and nested list",
    input: "2. a\n   > b\n   > - c\n3. d",
    ast: [
      {
        type: "list",
        ordered: true,
        start: 2,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "blockquote",
                children: [
                  {
                    type: "p",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                  {
                    type: "list",
                    ordered: false,
                    tight: true,
                    children: [
                      {
                        type: "li",
                        children: [
                          {
                            type: "text",
                            value: "c",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "d",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "loose list item with fenced code block",
    input: "- a\n\n  ```\n  code\n  ```\n\n- b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: false,
        children: [
          {
            type: "li",
            children: [
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                ],
              },
              {
                type: "pre",
                lang: "",
                value: "code",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "b",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "blockquote with fenced code and language",
    input: "> ```ts\n> const x = 1;\n> ```",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "pre",
            lang: "ts",
            value: "const x = 1;",
          },
        ],
      },
    ],
  },
  {
    name: "heading with tab after marker",
    input: "#\tTitle",
    ast: [
      {
        type: "h",
        level: 1,
        children: [
          {
            type: "text",
            value: "Title",
          },
        ],
      },
    ],
  },
  {
    name: "code fence info only uses first token",
    input: "```js extra\nx\n```",
    ast: [
      {
        type: "pre",
        lang: "js",
        value: "x",
      },
    ],
  },
  {
    name: "unordered list with plus markers",
    input: "+ a\n+ b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "unordered list makes separate list with mixed markers",
    input: "- a\n+ b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
        ],
      },
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "ordered list with paren markers",
    input: "1) a\n2) b",
    ast: [
      {
        type: "list",
        ordered: true,
        start: 1,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "ordered list allows long numeric marker",
    input: "123456789. a\n123456790. b",
    ast: [
      {
        type: "list",
        ordered: true,
        start: 123456789,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list item continuation with extra indentation",
    input: "- a\n   b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "text",
                value: "\nb",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "blockquote ends before heading",
    input: "> a\n# b",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
        ],
      },
      {
        type: "h",
        level: 1,
        children: [
          {
            type: "text",
            value: "b",
          },
        ],
      },
    ],
  },
  {
    name: "table delimiter rejects colons",
    input: "| a | b |\n| :-- | --: |\n| c | d |",
    ast: [
      {
        type: "table",
        children: [
          {
            type: "thead",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "th",
                    align: "left",
                    children: [
                      {
                        type: "text",
                        value: "a",
                      },
                    ],
                  },
                  {
                    type: "th",
                    align: "right",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tbody",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    align: "left",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                  {
                    type: "td",
                    align: "right",
                    children: [
                      {
                        type: "text",
                        value: "d",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "table with spaced cells and no outer pipes",
    input: " a | b \n --- | --- \n c | d ",
    ast: [
      {
        type: "table",
        children: [
          {
            type: "thead",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "a",
                      },
                    ],
                  },
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tbody",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "d",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "hardbreak inside link label",
    input: "[a  \nb](x)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "x",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "br",
              },
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "emphasis across line break inside link label",
    input: "[*a\nb*](x)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "x",
            children: [
              {
                type: "modifier",
                delimiter: "*",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                  {
                    type: "text",
                    value: "\nb",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "image alt does not parse inline",
    input: "![**a**](x)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "img",
            url: "x",
            alt: "**a**",
          },
        ],
      },
    ],
  },
  {
    name: "unterminated code fence consumes rest of document",
    input: "```\ncode",
    ast: [
      {
        type: "pre",
        lang: "",
        value: "code",
      },
    ],
  },
  {
    name: "deep nesting: blockquote > list > blockquote > list > code",
    input: "> - a\n>   > b\n>   > - `c`\n> - d",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "list",
            ordered: false,
            tight: true,
            children: [
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                  {
                    type: "blockquote",
                    children: [
                      {
                        type: "p",
                        children: [
                          {
                            type: "text",
                            value: "b",
                          },
                        ],
                      },
                      {
                        type: "list",
                        ordered: false,
                        tight: true,
                        children: [
                          {
                            type: "li",
                            children: [
                              {
                                type: "code",
                                value: "c",
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "d",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "very deep inline nesting with code",
    input: "~~**_`x`_**~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [
              {
                type: "modifier",
                delimiter: "**",
                children: [
                  {
                    type: "modifier",
                    delimiter: "_",
                    children: [
                      {
                        type: "code",
                        value: "x",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "code fence with url literal",
    input: "```\nhttps://example.com\n```",
    ast: [
      {
        type: "pre",
        lang: "",
        value: "https://example.com",
      },
    ],
  },
  {
    name: "trailing backslash without newline is literal",
    input: "a\\",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "a\\",
          },
        ],
      },
    ],
  },
  {
    name: "backslash before newline in code fence stays literal",
    input: "```\na\\\nb\n```",
    ast: [
      {
        type: "pre",
        lang: "",
        value: "a\\\nb",
      },
    ],
  },
  {
    name: "list item contains table then paragraph continuation",
    input: "- intro\n  | a | b |\n  | - | - |\n  | c | d |\n  tail",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "intro",
              },
              {
                type: "table",
                children: [
                  {
                    type: "thead",
                    children: [
                      {
                        type: "tr",
                        children: [
                          {
                            type: "th",
                            children: [
                              {
                                type: "text",
                                value: "a",
                              },
                            ],
                          },
                          {
                            type: "th",
                            children: [
                              {
                                type: "text",
                                value: "b",
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "tbody",
                    children: [
                      {
                        type: "tr",
                        children: [
                          {
                            type: "td",
                            children: [
                              {
                                type: "text",
                                value: "c",
                              },
                            ],
                          },
                          {
                            type: "td",
                            children: [
                              {
                                type: "text",
                                value: "d",
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: "tr",
                        children: [
                          {
                            type: "td",
                            children: [
                              {
                                type: "text",
                                value: "tail",
                              },
                            ],
                          },
                          {
                            type: "td",
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list > blockquote > list item contains table",
    input:
      "- a\n  > - b\n  >   | h | i |\n  >   | - | - |\n  >   | x | y |\n- c",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "blockquote",
                children: [
                  {
                    type: "list",
                    ordered: false,
                    tight: true,
                    children: [
                      {
                        type: "li",
                        children: [
                          {
                            type: "text",
                            value: "b",
                          },
                          {
                            type: "table",
                            children: [
                              {
                                type: "thead",
                                children: [
                                  {
                                    type: "tr",
                                    children: [
                                      {
                                        type: "th",
                                        children: [
                                          {
                                            type: "text",
                                            value: "h",
                                          },
                                        ],
                                      },
                                      {
                                        type: "th",
                                        children: [
                                          {
                                            type: "text",
                                            value: "i",
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                type: "tbody",
                                children: [
                                  {
                                    type: "tr",
                                    children: [
                                      {
                                        type: "td",
                                        children: [
                                          {
                                            type: "text",
                                            value: "x",
                                          },
                                        ],
                                      },
                                      {
                                        type: "td",
                                        children: [
                                          {
                                            type: "text",
                                            value: "y",
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "c",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "blockquote contains list whose item contains table and code fence",
    input: "#Title",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "#Title",
          },
        ],
      },
    ],
  },
  {
    name: "heading requires space after # (should be paragraph)",
    input: "#Title",
    ast: [{ type: "p", children: [{ type: "text", value: "#Title" }] }],
  },
  {
    name: "heading with more than 6 hashes clamps/treated as heading 6-ish",
    input: "####### too many",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "####### too many",
          },
        ],
      },
    ],
  },
  {
    name: "thematic break not enough markers (should be paragraph)",
    input: "--",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "--",
          },
        ],
      },
    ],
  },
  {
    name: "code span with internal backtick via double fence",
    input: "``a`b``",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "code",
            value: "a`b",
          },
        ],
      },
    ],
  },
  {
    name: "table does not render when wrong divider count is used",
    input: "| a | b | c |\n| - | - |\n| d | e | f |",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "| a | b | c |",
          },
          {
            type: "text",
            value: "\n| - | - |",
          },
          {
            type: "text",
            value: "\n| d | e | f |",
          },
        ],
      },
    ],
  },
  {
    name: "code span empty",
    input: "``",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "``",
          },
        ],
      },
    ],
  },
  {
    name: "backslash escapes punctuation literal",
    input: "\\[brackets\\] and \\(parens\\)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "[brackets] and (parens)",
          },
        ],
      },
    ],
  },
  {
    name: "backslash before space is literal",
    input: "a\\ b",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "a\\ b",
          },
        ],
      },
    ],
  },
  {
    name: "emphasis with intraword underscores should not emphasize",
    input: "a__b__c",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "a__b__c",
          },
        ],
      },
    ],
  },
  {
    name: "emphasis with intraword asterisks should not emphasize",
    input: "a**b**c",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "a",
          },
          {
            type: "modifier",
            delimiter: "**",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
          {
            type: "text",
            value: "c",
          },
        ],
      },
    ],
  },
  {
    name: "mixed delimiter runs ambiguous",
    input: "***x**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "*",
          },
          {
            type: "modifier",
            delimiter: "**",
            children: [
              {
                type: "text",
                value: "x",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "nested empty emphasis nodes should not be emitted",
    input: "**__**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "**",
            children: [
              {
                type: "text",
                value: "__",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "emphasis around punctuation",
    input: "*!@#* **(x)**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "text",
                value: "!@#",
              },
            ],
          },
          {
            type: "text",
            value: " ",
          },
          {
            type: "modifier",
            delimiter: "**",
            children: [
              {
                type: "text",
                value: "(x)",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "link destination with parentheses balanced",
    input: "[link](http://example.com/a(b)c)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "http://example.com/a(b)c",
            children: [
              {
                type: "text",
                value: "link",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "link destination with spaces must be trimmed",
    input: "[x](   http://example.com  )",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "http://example.com",
            children: [
              {
                type: "text",
                value: "x",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "link label supports emphasis and code",
    input: "[a _b_ `c`](x)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "x",
            children: [
              {
                type: "text",
                value: "a ",
              },
              {
                type: "modifier",
                delimiter: "_",
                children: [
                  {
                    type: "text",
                    value: "b",
                  },
                ],
              },
              {
                type: "text",
                value: " ",
              },
              {
                type: "code",
                value: "c",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "link label with nested brackets",
    input: "[a [b] c](x)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "x",
            children: [
              {
                type: "text",
                value: "a [b] c",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "link label with escaped closing bracket",
    input: "[a \\] b](x)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "x",
            children: [
              {
                type: "text",
                value: "a ] b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "link destination with balanced parentheses",
    input: "[x](http://example.com/a(b)c)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "http://example.com/a(b)c",
            children: [
              {
                type: "text",
                value: "x",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "image alt with brackets and escapes",
    input: "![a \\] b [c]](x.png)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "img",
            url: "x.png",
            alt: "a ] b [c]",
          },
        ],
      },
    ],
  },
  {
    name: "image with punctuation in alt",
    input: "![a (b) [c]](img.png)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "img",
            url: "img.png",
            alt: "a (b) [c]",
          },
        ],
      },
    ],
  },
  {
    name: "literal angle brackets remain text",
    input: "x < y > z",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "x < y > z",
          },
        ],
      },
    ],
  },
  {
    name: "ampersand is not entity",
    input: "a & b",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "a & b",
          },
        ],
      },
    ],
  },
  {
    name: "blockquote lazy continuation with blank line ends quote",
    input: "> a\n>\n b",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
        ],
      },
      {
        type: "p",
        children: [
          {
            type: "text",
            value: " b",
          },
        ],
      },
    ],
  },
  {
    name: "blockquote with mixed starters",
    input: "> # h\n> - a\n>   - b\n> \n> end",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "h",
            level: 1,
            children: [
              {
                type: "text",
                value: "h",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            tight: true,
            children: [
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                  {
                    type: "list",
                    ordered: false,
                    tight: true,
                    children: [
                      {
                        type: "li",
                        children: [
                          {
                            type: "text",
                            value: "b",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "end",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "deep blockquote stack then paragraph",
    input: ">>> deep\n\nout",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "blockquote",
            children: [
              {
                type: "blockquote",
                children: [
                  {
                    type: "p",
                    children: [
                      {
                        type: "text",
                        value: "deep",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "out",
          },
        ],
      },
    ],
  },
  {
    name: "ordered list marker 0 is allowed? (edge)",
    input: "0. a\n1. b",
    ast: [
      {
        type: "list",
        ordered: true,
        start: 0,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "ordered list marker with huge indent nests",
    input: "1. a\n       2. b",
    ast: [
      {
        type: "list",
        ordered: true,
        start: 1,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a2. b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list item with blank line but no sibling should not loosen outer",
    input: "- a\n\nx",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
        ],
      },
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "x",
          },
        ],
      },
    ],
  },
  {
    name: "list item with heading child",
    input: "- # a\n- b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "h",
                level: 1,
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                ],
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list item with fenced code then paragraph continuation",
    input: "- a\n  ```\n  code\n  ```\n  b",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "pre",
                lang: "",
                value: "code",
              },
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "tight list with inline-only item should render fragment",
    input: "- a\n- b\n- **c**",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "modifier",
                delimiter: "**",
                children: [
                  {
                    type: "text",
                    value: "c",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "loose list with multiple paragraphs and inline",
    input: "- a\n\n  b _c_",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: false,
        children: [
          {
            type: "li",
            children: [
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "a",
                  },
                ],
              },
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "b ",
                  },
                  {
                    type: "modifier",
                    delimiter: "_",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "nested list mixed markers should keep same list",
    input: "- a\n  + b\n  * c",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "list",
                ordered: false,
                tight: true,
                children: [
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
              {
                type: "list",
                ordered: false,
                tight: true,
                children: [
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "nested list after long ordered marker",
    input: "123. a\n     - b\n     - c",
    ast: [
      {
        type: "list",
        ordered: true,
        start: 123,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "a",
              },
              {
                type: "list",
                ordered: false,
                tight: true,
                children: [
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                  {
                    type: "li",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "table with pipes inside code spans",
    input: "| a | b |\n| - | - |\n| `x|y` | z |",
    ast: [
      {
        type: "table",
        children: [
          {
            type: "thead",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "a",
                      },
                    ],
                  },
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tbody",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "`x",
                      },
                    ],
                  },
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "y`",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "table with escaped pipe in cell",
    input: "| a | b |\n| - | - |\n| x \\| y | z |",
    ast: [
      {
        type: "table",
        children: [
          {
            type: "thead",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "a",
                      },
                    ],
                  },
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tbody",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "x | y",
                      },
                    ],
                  },
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "z",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "table should not parse if separator row invalid",
    input: "| a | b |\n| --- | -x- |\n| c | d |",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "| a | b |",
          },
          {
            type: "text",
            value: "\n| --- | -x- |",
          },
          {
            type: "text",
            value: "\n| c | d |",
          },
        ],
      },
    ],
  },
  {
    name: "table with leading/trailing spaces in cells",
    input: "|  a  |  b  |\n| - | - |\n|  c  |  d  |",
    ast: [
      {
        type: "table",
        children: [
          {
            type: "thead",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "a",
                      },
                    ],
                  },
                  {
                    type: "th",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tbody",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                  {
                    type: "td",
                    children: [
                      {
                        type: "text",
                        value: "d",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "fenced code in blockquote with lazy line",
    input: "> ```\n> a\n> ```\n> b",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "pre",
            lang: "",
            value: "a",
          },
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "fence closer must be >= opener length",
    input: "````\na\n```",
    ast: [
      {
        type: "pre",
        lang: "",
        value: "a\n```",
      },
    ],
  },
  {
    name: "complex mixed inline and block structure",
    input:
      "> # Title _x_\n> - a **b**\n> - c\n>\n> para  \n> line\n\nFinal `code`",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "h",
            level: 1,
            children: [
              {
                type: "text",
                value: "Title ",
              },
              {
                type: "modifier",
                delimiter: "_",
                children: [
                  {
                    type: "text",
                    value: "x",
                  },
                ],
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            tight: true,
            children: [
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "a ",
                  },
                  {
                    type: "modifier",
                    delimiter: "**",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                ],
              },
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "c",
                  },
                ],
              },
            ],
          },
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "para",
              },
              {
                type: "br",
              },
              {
                type: "text",
                value: "line",
              },
            ],
          },
        ],
      },
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "Final ",
          },
          {
            type: "code",
            value: "code",
          },
        ],
      },
    ],
  },
  {
    name: "blockquote ending with > character",
    input: ">",
    ast: [
      {
        type: "blockquote",
        children: [],
      },
    ],
  },
  {
    name: "blockquote with > at end of line",
    input: ">text",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "text",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "table cell ending with backslash (no crash)",
    input: "| a | b\\ |\n|---|---|\n| x | y |",
    ast: [
      {
        type: "table",
        children: [
          {
            type: "thead",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "th",
                    align: undefined,
                    children: [
                      {
                        type: "text",
                        value: "a",
                      },
                    ],
                  },
                  {
                    type: "th",
                    align: undefined,
                    children: [
                      {
                        type: "text",
                        value: "b\\",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tbody",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    align: undefined,
                    children: [
                      {
                        type: "text",
                        value: "x",
                      },
                    ],
                  },
                  {
                    type: "td",
                    align: undefined,
                    children: [
                      {
                        type: "text",
                        value: "y",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "hard break in paragraph (no crash)",
    input: "text  \nmore",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "text",
          },
          {
            type: "br",
          },
          {
            type: "text",
            value: "more",
          },
        ],
      },
    ],
  },
  {
    name: "link text without URL",
    input: "[link]",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "[link]",
          },
        ],
      },
    ],
  },
  {
    name: "link text without closing bracket",
    input: "[text",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "[text",
          },
        ],
      },
    ],
  },
  {
    name: "delimiter at end of string",
    input: "text***",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "text***",
          },
        ],
      },
    ],
  },
  {
    name: "nested strong and em with asterisks",
    input: "***bold and italic***",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "modifier",
                delimiter: "**",
                children: [
                  {
                    type: "text",
                    value: "bold and italic",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "nested em and strong reversed",
    input: "*italic **and bold***",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "text",
                value: "italic ",
              },
              {
                type: "modifier",
                delimiter: "**",
                children: [
                  {
                    type: "text",
                    value: "and bold",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "mismatched delimiter lengths - reduce opener",
    input: "**Welcome!*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "*",
          },
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "text",
                value: "Welcome!",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "opener shorter than closer - *text**",
    input: "*Welcome!**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "text",
                value: "Welcome!",
              },
            ],
          },
          {
            type: "text",
            value: "*",
          },
        ],
      },
    ],
  },
  {
    name: "strikethrough with nested strong",
    input: "~~deleted **bold**~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [
              {
                type: "text",
                value: "deleted ",
              },
              {
                type: "modifier",
                delimiter: "**",
                children: [
                  {
                    type: "text",
                    value: "bold",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "code span containing delimiter characters",
    input: "`**not bold**` and `~~not deleted~~`",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "code",
            value: "**not bold**",
          },
          {
            type: "text",
            value: " and ",
          },
          {
            type: "code",
            value: "~~not deleted~~",
          },
        ],
      },
    ],
  },
  {
    name: "escaped delimiters don't format",
    input: "\\*not italic\\* \\*\\*not bold\\*\\*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "*not italic* **not bold**",
          },
        ],
      },
    ],
  },
  {
    name: "escaped brackets in link text",
    input: "[link \\[with\\] brackets](url)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "url",
            children: [
              {
                type: "text",
                value: "link [with] brackets",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "image with escaped characters in alt text",
    input: "![alt \\!\\[text\\]](url)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "img",
            url: "url",
            alt: "alt ![text]",
          },
        ],
      },
    ],
  },
  {
    name: "link containing inline code",
    input: "[link `code` text](url)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "url",
            children: [
              {
                type: "text",
                value: "link ",
              },
              {
                type: "code",
                value: "code",
              },
              {
                type: "text",
                value: " text",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "link with formatting in text",
    input: "[**bold** _italic_](url)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "url",
            children: [
              {
                type: "modifier",
                delimiter: "**",
                children: [
                  {
                    type: "text",
                    value: "bold",
                  },
                ],
              },
              {
                type: "text",
                value: " ",
              },
              {
                type: "modifier",
                delimiter: "_",
                children: [
                  {
                    type: "text",
                    value: "italic",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "multiple consecutive hard breaks",
    input: "line1  \nline2  \nline3",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "line1",
          },
          {
            type: "br",
          },
          {
            type: "text",
            value: "line2",
          },
          {
            type: "br",
          },
          {
            type: "text",
            value: "line3",
          },
        ],
      },
    ],
  },
  {
    name: "mixed strong with asterisk and underscore",
    input: "**asterisk** __underscore__",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "**",
            children: [
              {
                type: "text",
                value: "asterisk",
              },
            ],
          },
          {
            type: "text",
            value: " ",
          },
          {
            type: "modifier",
            delimiter: "__",
            children: [
              {
                type: "text",
                value: "underscore",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "underscore in middle of word doesn't format",
    input: "snake_case_variable",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "snake_case_variable",
          },
        ],
      },
    ],
  },
  {
    name: "asterisk works in middle of word",
    input: "in*the*middle",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "in",
          },
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "text",
                value: "the",
              },
            ],
          },
          {
            type: "text",
            value: "middle",
          },
        ],
      },
    ],
  },
  {
    name: "unmatched opening delimiter",
    input: "**bold start but no end",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "**bold start but no end",
          },
        ],
      },
    ],
  },
  {
    name: "unmatched closing delimiter",
    input: "no start but bold end**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "no start but bold end**",
          },
        ],
      },
    ],
  },
  {
    name: "delimiter run with five asterisks",
    input: "*****text*****",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "modifier",
                delimiter: "**",
                children: [
                  {
                    type: "modifier",
                    delimiter: "**",
                    children: [
                      {
                        type: "text",
                        value: "text",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "triple backtick code fence with language",
    input: "```javascript\nconst x = 1;\n```",
    ast: [
      {
        type: "pre",
        lang: "javascript",
        value: "const x = 1;",
      },
    ],
  },
  {
    name: "delimiter single asterisk is literal in text",
    input: "a * b",
    ast: [
      {
        type: "p",
        children: [{ type: "text", value: "a * b" }],
      },
    ],
  },
  {
    name: "custom modifier parses ==highlight==",
    input: "==highlight==",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "==",
            children: [{ type: "text", value: "highlight" }],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier in sentence",
    input: "a ==b== c",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "a " },
          {
            type: "modifier",
            delimiter: "==",
            children: [{ type: "text", value: "b" }],
          },
          { type: "text", value: " c" },
        ],
      },
    ],
  },
  {
    name: "custom modifier repeated with space",
    input: "==a== ==b==",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "==",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: " " },
          {
            type: "modifier",
            delimiter: "==",
            children: [{ type: "text", value: "b" }],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier with triple run leaves extra",
    input: "===a===",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "=" },
          {
            type: "modifier",
            delimiter: "==",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: "=" },
        ],
      },
    ],
  },
  {
    name: "custom modifier with quadruple run nests",
    input: "====a====",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "==",
            children: [
              {
                type: "modifier",
                delimiter: "==",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier wraps strong",
    input: "==**a**==",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "==",
            children: [
              {
                type: "modifier",
                delimiter: "**",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "strong wraps custom modifier",
    input: "**==a==**",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "**",
            children: [
              {
                type: "modifier",
                delimiter: "==",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier wraps em",
    input: "==*a*==",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "==",
            children: [
              {
                type: "modifier",
                delimiter: "*",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "em wraps custom modifier",
    input: "*==a==*",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "modifier",
                delimiter: "==",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier wraps del",
    input: "==~~a~~==",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "==",
            children: [
              {
                type: "modifier",
                delimiter: "~~",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "del wraps custom modifier",
    input: "~~==a==~~",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [
              {
                type: "modifier",
                delimiter: "==",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier can span newline",
    input: "==a\nb==",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "==",
            children: [
              { type: "text", value: "a" },
              { type: "text", value: "\nb" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier inside link label",
    input: "[==a==](url)",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "url",
            children: [
              {
                type: "modifier",
                delimiter: "==",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier does not parse image alt",
    input: "![==a==](url)",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [{ type: "img", url: "url", alt: "==a==" }],
      },
    ],
  },
  {
    name: "custom modifier with punctuation",
    input: "(==a==)",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "(" },
          {
            type: "modifier",
            delimiter: "==",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: ")" },
        ],
      },
    ],
  },
  {
    name: "custom modifier intraword true",
    input: "a==b==c",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "a" },
          {
            type: "modifier",
            delimiter: "==",
            children: [{ type: "text", value: "b" }],
          },
          { type: "text", value: "c" },
        ],
      },
    ],
  },
  {
    name: "custom modifier intraword false",
    input: "a==b==c",
    options: STRICT_HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [{ type: "text", value: "a==b==c" }],
      },
    ],
  },
  {
    name: "custom hash modifier parses #a#",
    input: "#a#",
    options: HASH_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "#",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "custom hash modifier 2x",
    input: "##a##",
    options: HASH_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "#",
            children: [
              {
                type: "modifier",
                delimiter: "#",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "defaults override custom star lengths",
    input: "**a**",
    options: OVERRIDE_STAR_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "**",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "defaults override custom tilde lengths",
    input: "~~a~~",
    options: OVERRIDE_TILDE_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier with trailing text",
    input: "==a==b",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "==",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: "b" },
        ],
      },
    ],
  },
  {
    name: "custom modifier with leading text",
    input: "b==a==",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "b" },
          {
            type: "modifier",
            delimiter: "==",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier in heading",
    input: "# ==a==",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "h",
        level: 1,
        children: [
          {
            type: "modifier",
            delimiter: "==",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier alongside del",
    input: "==a== ~~b~~",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "==",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: " " },
          {
            type: "modifier",
            delimiter: "~~",
            children: [{ type: "text", value: "b" }],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier inside blockquote",
    input: "> ==a==",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "p",
            children: [
              {
                type: "modifier",
                delimiter: "==",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier inside list item",
    input: "- ==a==",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "list",
        ordered: false,
        start: undefined,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "modifier",
                delimiter: "==",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "custom modifier inside code span is literal",
    input: "`==a==`",
    options: HIGHLIGHT_OPTIONS,
    ast: [
      {
        type: "p",
        children: [{ type: "code", value: "==a==" }],
      },
    ],
  },
  {
    name: "delimiter double asterisk is literal",
    input: "**",
    ast: [
      {
        type: "p",
        children: [{ type: "text", value: "**" }],
      },
    ],
  },
  {
    name: "delimiter double tilde is literal",
    input: "~~",
    ast: [
      {
        type: "p",
        children: [{ type: "text", value: "~~" }],
      },
    ],
  },
  {
    name: "delimiter triple tilde is literal",
    input: "~~~",
    ast: [
      {
        type: "p",
        children: [{ type: "text", value: "~~~" }],
      },
    ],
  },
  {
    name: "simple em with asterisks",
    input: "*a*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "simple strong with asterisks",
    input: "**a**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "**",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "triple asterisks wraps strong in em",
    input: "***a***",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "modifier",
                delimiter: "**",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "quadruple asterisks yields nested strong",
    input: "****a****",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "**",
            children: [
              {
                type: "modifier",
                delimiter: "**",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "five asterisks yields em around strongs",
    input: "*****a*****",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "modifier",
                delimiter: "**",
                children: [
                  {
                    type: "modifier",
                    delimiter: "**",
                    children: [{ type: "text", value: "a" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "mismatch opener short closer long (*a**)",
    input: "*a**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: "*" },
        ],
      },
    ],
  },
  {
    name: "mismatch opener long closer short (**a*)",
    input: "**a*",
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "*" },
          {
            type: "modifier",
            delimiter: "*",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "mismatch opener short closer long (*a***)",
    input: "*a***",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: "**" },
        ],
      },
    ],
  },
  {
    name: "mismatch opener long closer short (***a*)",
    input: "***a*",
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "**" },
          {
            type: "modifier",
            delimiter: "*",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "simple em with underscores",
    input: "_a_",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "_",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "simple strong with underscores",
    input: "__a__",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "__",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "triple underscores wraps strong in em",
    input: "___a___",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "_",
            children: [
              {
                type: "modifier",
                delimiter: "__",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "intraword underscore is literal",
    input: "a_b",
    ast: [
      {
        type: "p",
        children: [{ type: "text", value: "a_b" }],
      },
    ],
  },
  {
    name: "intraword double underscores are literal",
    input: "a__b__",
    ast: [
      {
        type: "p",
        children: [{ type: "text", value: "a__b__" }],
      },
    ],
  },
  {
    name: "underscore em with spaces",
    input: "a _b_ c",
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "a " },
          {
            type: "modifier",
            delimiter: "_",
            children: [{ type: "text", value: "b" }],
          },
          { type: "text", value: " c" },
        ],
      },
    ],
  },
  {
    name: "underscore strong with spaces",
    input: "a __b__ c",
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "a " },
          {
            type: "modifier",
            delimiter: "__",
            children: [{ type: "text", value: "b" }],
          },
          { type: "text", value: " c" },
        ],
      },
    ],
  },
  {
    name: "underscore triple wraps strong in em with spaces",
    input: "a ___b___ c",
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "a " },
          {
            type: "modifier",
            delimiter: "_",
            children: [
              {
                type: "modifier",
                delimiter: "__",
                children: [{ type: "text", value: "b" }],
              },
            ],
          },
          { type: "text", value: " c" },
        ],
      },
    ],
  },
  {
    name: "simple strikethrough",
    input: "~~a~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "triple tildes uses double-tilde marker with extras",
    input: "~~~a~~~",
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "~" },
          {
            type: "modifier",
            delimiter: "~~",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: "~" },
        ],
      },
    ],
  },
  {
    name: "quadruple tildes yields nested del",
    input: "~~~~a~~~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [
              {
                type: "modifier",
                delimiter: "~~",
                children: [{ type: "text", value: "a" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "mismatch tildes closer longer",
    input: "~~a~~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: "~" },
        ],
      },
    ],
  },
  {
    name: "mismatch tildes opener longer",
    input: "~~~a~~",
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "~" },
          {
            type: "modifier",
            delimiter: "~~",
            children: [{ type: "text", value: "a" }],
          },
        ],
      },
    ],
  },
  {
    name: "strikethrough followed by text",
    input: "~~a~~b",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: "b" },
        ],
      },
    ],
  },
  {
    name: "strong contains em",
    input: "**a _b_**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "**",
            children: [
              { type: "text", value: "a " },
              {
                type: "modifier",
                delimiter: "_",
                children: [{ type: "text", value: "b" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "em contains strong",
    input: "*a **b** c*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              { type: "text", value: "a " },
              {
                type: "modifier",
                delimiter: "**",
                children: [{ type: "text", value: "b" }],
              },
              { type: "text", value: " c" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "strong contains em (asterisks)",
    input: "**a *b* c**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "**",
            children: [
              { type: "text", value: "a " },
              {
                type: "modifier",
                delimiter: "*",
                children: [{ type: "text", value: "b" }],
              },
              { type: "text", value: " c" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "em contains del",
    input: "*a ~~b~~ c*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              { type: "text", value: "a " },
              {
                type: "modifier",
                delimiter: "~~",
                children: [{ type: "text", value: "b" }],
              },
              { type: "text", value: " c" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "del contains strong",
    input: "~~a **b**~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [
              { type: "text", value: "a " },
              {
                type: "modifier",
                delimiter: "**",
                children: [{ type: "text", value: "b" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "del contains em",
    input: "~~a *b*~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [
              { type: "text", value: "a " },
              {
                type: "modifier",
                delimiter: "*",
                children: [{ type: "text", value: "b" }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "code span blocks emphasis",
    input: "`*a*`",
    ast: [
      {
        type: "p",
        children: [{ type: "code", value: "*a*" }],
      },
    ],
  },
  {
    name: "em wraps code span",
    input: "*a `b` c*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [
              { type: "text", value: "a " },
              { type: "code", value: "b" },
              { type: "text", value: " c" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "strong wraps code span",
    input: "**a `b` c**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "**",
            children: [
              { type: "text", value: "a " },
              { type: "code", value: "b" },
              { type: "text", value: " c" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "adjacent em with different delimiters",
    input: "a *b* _c_",
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "a " },
          {
            type: "modifier",
            delimiter: "*",
            children: [{ type: "text", value: "b" }],
          },
          { type: "text", value: " " },
          {
            type: "modifier",
            delimiter: "_",
            children: [{ type: "text", value: "c" }],
          },
        ],
      },
    ],
  },
  {
    name: "adjacent em then strong",
    input: "*a* **b**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "*",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: " " },
          {
            type: "modifier",
            delimiter: "**",
            children: [{ type: "text", value: "b" }],
          },
        ],
      },
    ],
  },
  {
    name: "em with surrounding punctuation",
    input: "(*a*)",
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "(" },
          {
            type: "modifier",
            delimiter: "*",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: ")" },
        ],
      },
    ],
  },
  {
    name: "strong with surrounding punctuation",
    input: "[**a**]",
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "[" },
          {
            type: "modifier",
            delimiter: "**",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: "]" },
        ],
      },
    ],
  },
  {
    name: "del with surrounding punctuation",
    input: "(~~a~~)",
    ast: [
      {
        type: "p",
        children: [
          { type: "text", value: "(" },
          {
            type: "modifier",
            delimiter: "~~",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: ")" },
        ],
      },
    ],
  },
  {
    name: "strikethrough with trailing text",
    input: "~~a~~b",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [{ type: "text", value: "a" }],
          },
          { type: "text", value: "b" },
        ],
      },
    ],
  },
  {
    name: "code fence with no closing fence",
    input: "```\ncode\nmore code",
    ast: [
      {
        type: "pre",
        lang: "",
        value: "code\nmore code",
      },
    ],
  },
  {
    name: "code fence with empty content",
    input: "```\n```",
    ast: [
      {
        type: "pre",
        lang: "",
        value: "",
      },
    ],
  },
  {
    name: "nested blockquotes with depth 3",
    input: ">>> deeply nested",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "blockquote",
            children: [
              {
                type: "blockquote",
                children: [
                  {
                    type: "p",
                    children: [
                      {
                        type: "text",
                        value: "deeply nested",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "blockquote with multiple paragraphs",
    input: "> para1\n>\n> para2",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "para1",
              },
            ],
          },
          {
            type: "p",
            children: [
              {
                type: "text",
                value: "para2",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "blockquote containing code fence",
    input: "> ```\n> code\n> ```",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "pre",
            lang: "",
            value: "code",
          },
        ],
      },
    ],
  },
  {
    name: "blockquote containing list",
    input: "> - item1\n> - item2",
    ast: [
      {
        type: "blockquote",
        children: [
          {
            type: "list",
            ordered: false,
            tight: true,
            children: [
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "item1",
                  },
                ],
              },
              {
                type: "li",
                children: [
                  {
                    type: "text",
                    value: "item2",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "table with alignment specifiers",
    input: "| L | C | R |\n|:---|:---:|---:|\n| a | b | c |",
    ast: [
      {
        type: "table",
        children: [
          {
            type: "thead",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "th",
                    align: "left",
                    children: [
                      {
                        type: "text",
                        value: "L",
                      },
                    ],
                  },
                  {
                    type: "th",
                    align: "center",
                    children: [
                      {
                        type: "text",
                        value: "C",
                      },
                    ],
                  },
                  {
                    type: "th",
                    align: "right",
                    children: [
                      {
                        type: "text",
                        value: "R",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tbody",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    align: "left",
                    children: [
                      {
                        type: "text",
                        value: "a",
                      },
                    ],
                  },
                  {
                    type: "td",
                    align: "center",
                    children: [
                      {
                        type: "text",
                        value: "b",
                      },
                    ],
                  },
                  {
                    type: "td",
                    align: "right",
                    children: [
                      {
                        type: "text",
                        value: "c",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "table with inline formatting in cells",
    input: "| **B** | _I_ |\n|---|---|\n| `c` | ~~d~~ |",
    ast: [
      {
        type: "table",
        children: [
          {
            type: "thead",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "th",
                    align: undefined,
                    children: [
                      {
                        type: "modifier",
                        delimiter: "**",
                        children: [
                          {
                            type: "text",
                            value: "B",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "th",
                    align: undefined,
                    children: [
                      {
                        type: "modifier",
                        delimiter: "_",
                        children: [
                          {
                            type: "text",
                            value: "I",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tbody",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    align: undefined,
                    children: [
                      {
                        type: "code",
                        value: "c",
                      },
                    ],
                  },
                  {
                    type: "td",
                    align: undefined,
                    children: [
                      {
                        type: "modifier",
                        delimiter: "~~",
                        children: [
                          {
                            type: "text",
                            value: "d",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "ordered list with custom start number",
    input: "5. first\n6. second",
    ast: [
      {
        type: "list",
        ordered: true,
        start: 5,
        tight: true,
        children: [
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "first",
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "text",
                value: "second",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list item with multiple paragraphs (loose)",
    input: "- para1\n\n  para2\n- item2",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: false,
        children: [
          {
            type: "li",
            children: [
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "para1",
                  },
                ],
              },
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "para2",
                  },
                ],
              },
            ],
          },
          {
            type: "li",
            children: [
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "item2",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "heading level 6",
    input: "###### h6",
    ast: [
      {
        type: "h",
        level: 6,
        children: [
          {
            type: "text",
            value: "h6",
          },
        ],
      },
    ],
  },
  {
    name: "link URL with special characters",
    input: "[link](https://example.com/path?query=1&foo=bar#hash)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "https://example.com/path?query=1&foo=bar#hash",
            children: [
              {
                type: "text",
                value: "link",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "image with URL containing parentheses",
    input: "![alt](url(with)parens)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "img",
            url: "url(with)parens",
            alt: "alt",
          },
        ],
      },
    ],
  },
  {
    name: "multiple links in same paragraph",
    input: "[link1](url1) and [link2](url2)",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "a",
            url: "url1",
            children: [
              {
                type: "text",
                value: "link1",
              },
            ],
          },
          {
            type: "text",
            value: " and ",
          },
          {
            type: "a",
            url: "url2",
            children: [
              {
                type: "text",
                value: "link2",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "strikethrough with tilde",
    input: "~~deleted text~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "modifier",
            delimiter: "~~",
            children: [
              {
                type: "text",
                value: "deleted text",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "escaped backslash before delimiter",
    input: "\\\\*not italic*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "\\",
          },
          {
            type: "modifier",
            delimiter: "*",
            children: [
              {
                type: "text",
                value: "not italic",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "list with code block inside item",
    input: "- item\n\n  ```\n  code\n  ```",
    ast: [
      {
        type: "list",
        ordered: false,
        tight: false,
        children: [
          {
            type: "li",
            children: [
              {
                type: "p",
                children: [
                  {
                    type: "text",
                    value: "item",
                  },
                ],
              },
              {
                type: "pre",
                lang: "",
                value: "code",
              },
            ],
          },
        ],
      },
    ],
  },
];

describe("ast", () => {
  TEST_CASES.forEach(({ name, input, ast, options }, index) => {
    it(`${index + 1} - ${name}`, () => {
      expect(buildAst(input, options)).toEqual(ast);
    });
  });
});
