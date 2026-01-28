import { type AstNode, buildAst } from "../src/ast";

type TestCase = {
  readonly name: string;
  readonly input: string;
  readonly ast: AstNode[];
};

export const TEST_CASES: readonly TestCase[] = [
  {
    name: "1 paragraph",
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
    name: "2 paragraph does not hardbreak on single newline",
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
    name: "3 paragraph supports inline formatting",
    input: "Hello **bold** _em_ `x`",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "Hello ",
          },
          {
            type: "strong",
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
            type: "em",
            children: [
              {
                type: "text",
                value: "em",
              },
            ],
          },
          {
            type: "text",
            value: " ",
          },
          {
            type: "code",
            value: "x",
          },
        ],
      },
    ],
  },
  {
    name: "4 paragraph hardbreak renders as <br />",
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
    name: "5 nested emphasis/strong",
    input: "**a _b_ c**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "strong",
            children: [
              {
                type: "text",
                value: "a ",
              },
              {
                type: "em",
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
    name: "6 triple nesting combo: del > strong > em",
    input: "~~***combo***~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "del",
            children: [
              {
                type: "em",
                children: [
                  {
                    type: "strong",
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
    name: "7 deeply nested mix",
    input: "*a **b ~~c~~ d** e*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "em",
            children: [
              {
                type: "text",
                value: "a ",
              },
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "b ",
                  },
                  {
                    type: "del",
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
    name: "8 unmatched delimiters left as text",
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
    name: "9 underscores inside words do not emphasize",
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
    name: "10 backslash escapes prevent emphasis",
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
    name: "11 code spans block delimiter parsing",
    input: "**a `*b*` c**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "strong",
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
    name: "12 link with inline label",
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
    name: "13 image renders with escaped attrs",
    input: "<div>x</div>",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "text",
            value: "<div>x</div>",
          },
        ],
      },
    ],
  },
  {
    name: "14 html is left alone",
    input: "<div>x</div>",
    ast: [{ type: "p", children: [{ type: "text", value: "<div>x</div>" }] }],
  },
  {
    name: "15 mixed: link + em + code + del",
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
            type: "em",
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
            type: "del",
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
    name: "16 multiple single lines",
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
    name: "17 hardbreak inside emphasis",
    input: "*a  \nb*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "em",
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
    name: "18 single newline inside emphasis",
    input: "*a\nb*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "em",
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
    name: "19 heading",
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
    name: "20 heading supports inline formatting",
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
            type: "strong",
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
    name: "21 heading strips trailing hashes",
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
    name: "22 thematic break",
    input: "---",
    ast: [
      {
        type: "hr",
      },
    ],
  },
  {
    name: "23 thematic break with spaces",
    input: "- - -",
    ast: [
      {
        type: "hr",
      },
    ],
  },
  {
    name: "24 fenced code block with language",
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
    name: "25 fenced code block escapes HTML",
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
    name: "26 fenced code without language",
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
    name: "27 code fence end can be longer than start",
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
    name: "28 code fence can start after up to 3 spaces",
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
    name: "29 blockquote (simple)",
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
    name: "30 blockquote supports lazy continuation lines",
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
    name: "31 nested blockquotes (>>)",
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
    name: "32 nested blockquotes with spaced markers",
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
    name: "33 blockquote marker allowed after indentation",
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
    name: "34 blockquote contains heading + paragraph",
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
    name: "35 blockquote contains thematic break",
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
    name: "36 blockquote contains nested quote + list",
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
    name: "37 unordered list (simple)",
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
    name: "38 ordered list (simple)",
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
    name: "39 ordered list with start != 1",
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
    name: "40 list item lazy continuation",
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
    name: "41 list item continuation stops before heading",
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
    name: "42 blank line makes list loose (still same HTML)",
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
    name: "43 nested unordered list",
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
    name: "44 nested ordered inside unordered",
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
    name: "45 nested list under list item using content indentation",
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
    name: "46 ordered list with multi-digit marker supports nesting",
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
    name: "47 list item contains multiple paragraphs",
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
    name: "48 list item contains heading + paragraph continuation stops correctly",
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
    name: "49 list item can contain a blockquote that contains a list",
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
    name: "50 blockquote can contain a list",
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
    name: "51 nested list inside blockquote with lazy continuation",
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
    name: "52 list contains nested blockquote then paragraph (lazy continuation stays in quote)",
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
    name: "53 ordered list siblings must align by indent (indented ordered marker nests)",
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
    name: "54 list item inline formatting",
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
                type: "strong",
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
                type: "em",
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
    name: "55 nested list item inline formatting",
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
                        type: "strong",
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
                        type: "em",
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
    name: "56 fenced code inside list item",
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
    name: "57 fenced code inside blockquote",
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
    name: "58 fenced code inside blockquote inside list item",
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
    name: "59 list in blockquote in list in blockquote (deep structure)",
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
    name: "60 paragraph after complex structures",
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
    name: "61 basic table",
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
    name: "62 table supports inline in cells",
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
                        type: "strong",
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
    name: "63 table supports multiple body rows + inline",
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
                        type: "em",
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
                        type: "del",
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
    name: "64 table without outer pipes",
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
    name: "65 heading with leading spaces",
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
    name: "66 weird nested list syntax",
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
    name: "67 fence allows internal backticks",
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
    name: "68 double backtick code span",
    input: "``code``",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "code",
            value: "code",
          },
        ],
      },
    ],
  },
  {
    name: "69 code span preserves leading and trailing spaces",
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
    name: "70 trailing backslash is literal",
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
    name: "71 empty link url should still create link",
    input: "[x]()",
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
                value: "x",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "72 empty image url should still create image",
    input: "![x]()",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "img",
            url: "",
            alt: "x",
          },
        ],
      },
    ],
  },
  {
    name: "73 link url trims whitespace",
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
    name: "74 deep inline nesting with del/strong/em",
    input: "*a **b ~~c _d_~~ e** f*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "em",
            children: [
              {
                type: "text",
                value: "a ",
              },
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "b ",
                  },
                  {
                    type: "del",
                    children: [
                      {
                        type: "text",
                        value: "c ",
                      },
                      {
                        type: "em",
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
    name: "75 emphasis wraps a link",
    input: "*see [x](y)*",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "em",
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
    name: "76 code span blocks link parsing",
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
    name: "77 table inside blockquote",
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
    name: "78 table inside list item",
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
    name: "79 horizontal rule before list item",
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
    name: "80 blockquote with list, blank line, then paragraph",
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
    name: "81 ordered list with blockquote and nested list",
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
    name: "82 loose list item with fenced code block",
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
    name: "83 blockquote with fenced code and language",
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
    name: "84 heading with tab after marker",
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
    name: "85 code fence info only uses first token",
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
    name: "86 unordered list with plus markers",
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
    name: "87 unordered list makes separate list with mixed markers",
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
    name: "88 ordered list with paren markers",
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
    name: "89 ordered list allows long numeric marker",
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
    name: "90 list item continuation with extra indentation",
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
    name: "91 nested list with deeper indentation",
    input: "- a\n    - b",
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
            ],
          },
        ],
      },
    ],
  },
  {
    name: "92 blockquote ends before heading",
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
    name: "93 table delimiter rejects colons",
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
    name: "94 table with spaced cells and no outer pipes",
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
    name: "95 hardbreak inside link label",
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
    name: "96 emphasis across line break inside link label",
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
                type: "em",
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
    name: "97 image alt does not parse inline",
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
    name: "98 unterminated code fence consumes rest of document",
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
    name: "99 deep nesting: blockquote > list > blockquote > list > code",
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
    name: "100 very deep inline nesting with code",
    input: "~~**_`x`_**~~",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "del",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "em",
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
    name: "101 code fence with url literal",
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
    name: "102 trailing backslash without newline is literal",
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
    name: "103 backslash before newline in code fence stays literal",
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
    name: "104 list item contains table then paragraph continuation",
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
    name: "105 list > blockquote > list item contains table",
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
    name: "106 blockquote contains list whose item contains table and code fence",
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
    name: "107 heading requires space after # (should be paragraph)",
    input: "#Title",
    ast: [{ type: "p", children: [{ type: "text", value: "#Title" }] }],
  },
  {
    name: "108 heading with more than 6 hashes clamps/treated as heading 6-ish",
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
    name: "109 thematic break not enough markers (should be paragraph)",
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
    name: "110 thematic break with tabs between markers",
    input: "-\t-\t-",
    ast: [
      {
        type: "hr",
      },
    ],
  },
  {
    name: "111 thematic break with leading indentation 3 spaces still hr",
    input: "   ---",
    ast: [
      {
        type: "hr",
      },
    ],
  },
  {
    name: "112 code span with internal backtick via double fence",
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
    name: "113 table does not render when wrong divider count is used",
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
    name: "114 code span empty",
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
    name: "115 backslash escapes punctuation literal",
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
    name: "116 backslash before space is literal",
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
    name: "117 emphasis with intraword underscores should not emphasize",
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
    name: "118 emphasis with intraword asterisks should not emphasize",
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
            type: "strong",
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
    name: "119 mixed delimiter runs ambiguous",
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
            type: "strong",
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
    name: "120 nested empty emphasis nodes should not be emitted",
    input: "**__**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "strong",
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
    name: "121 emphasis around punctuation",
    input: "*!@#* **(x)**",
    ast: [
      {
        type: "p",
        children: [
          {
            type: "em",
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
            type: "strong",
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
    name: "122 link destination with parentheses balanced",
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
    name: "123 link destination with spaces must be trimmed",
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
    name: "124 link label supports emphasis and code",
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
                type: "em",
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
    name: "125 link label with nested brackets",
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
    name: "126 link label with escaped closing bracket",
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
    name: "127 link destination with balanced parentheses",
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
    name: "128 image alt with brackets and escapes",
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
    name: "129 image with punctuation in alt",
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
    name: "130 literal angle brackets remain text",
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
    name: "131 ampersand is not entity",
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
    name: "132 blockquote lazy continuation with blank line ends quote",
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
    name: "133 blockquote with mixed starters",
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
    name: "134 deep blockquote stack then paragraph",
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
    name: "135 ordered list marker 0 is allowed? (edge)",
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
    name: "136 ordered list marker with huge indent nests",
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
    name: "137 list item with blank line but no sibling should not loosen outer",
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
    name: "138 list item with heading child",
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
    name: "139 list item with fenced code then paragraph continuation",
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
    name: "140 tight list with inline-only item should render fragment",
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
                type: "strong",
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
    name: "141 loose list with multiple paragraphs and inline",
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
                    type: "em",
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
    name: "142 nested list mixed markers should keep same list",
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
    name: "143 nested list after long ordered marker",
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
    name: "144 table with pipes inside code spans",
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
    name: "145 table with escaped pipe in cell",
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
    name: "146 table should not parse if separator row invalid",
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
    name: "147 table with leading/trailing spaces in cells",
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
    name: "148 fenced code in blockquote with lazy line",
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
    name: "149 fence closer must be >= opener length",
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
    name: "150 complex mixed inline and block structure",
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
                type: "em",
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
                    type: "strong",
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
];

describe("ast", () => {
  TEST_CASES.forEach(({ name, input, ast }) => {
    it(name, () => {
      expect(buildAst(input)).toEqual(ast);
    });
  });
});
