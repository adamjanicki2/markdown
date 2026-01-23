import { constructAst } from "../src/ast";

describe("ast", () => {
  it("parses a heading", () => {
    expect(
      constructAst(
        "# Title **Bold** [Docs](https://example.com)\n\nHello _there_ `x`!"
      )
    ).toEqual([
      {
        type: "heading",
        level: 1,
        children: [
          { type: "text", value: "Title " },
          { type: "strong", children: [{ type: "text", value: "Bold" }] },
          { type: "text", value: " " },
          {
            type: "a",
            url: "https://example.com",
            children: [{ type: "text", value: "Docs" }],
          },
        ],
      },
      {
        type: "p",
        children: [
          { type: "text", value: "Hello " },
          { type: "em", children: [{ type: "text", value: "there" }] },
          { type: "text", value: " " },
          { type: "code", value: "x" },
          { type: "text", value: "!" },
        ],
      },
    ]);
  });

  it("parses an unordered list", () => {
    expect(constructAst("- a `x`\n- b [link](https://x.test)")).toEqual([
      {
        type: "ul",
        items: [
          {
            type: "li",
            children: [
              {
                type: "p",
                children: [
                  { type: "text", value: "a " },
                  { type: "code", value: "x" },
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
                  { type: "text", value: "b " },
                  {
                    type: "a",
                    url: "https://x.test",
                    children: [{ type: "text", value: "link" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("parses an ordered list", () => {
    expect(constructAst("1. a ![icon](x.png)\n2. b `y`")).toEqual([
      {
        type: "ol",
        items: [
          {
            type: "li",
            children: [
              {
                type: "p",
                children: [
                  { type: "text", value: "a " },
                  { type: "img", url: "x.png", alt: "icon" },
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
                  { type: "text", value: "b " },
                  { type: "code", value: "y" },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("parses a pre with language", () => {
    expect(constructAst("```ts\nconst x = 1;\nconst y = 2;\n```")).toEqual([
      { type: "pre", lang: "ts", value: "const x = 1;\nconst y = 2;" },
    ]);
  });

  it("parses a blockquote", () => {
    expect(constructAst("> # Note\n> - a\n> - b")).toEqual([
      {
        type: "blockquote",
        children: [
          {
            type: "heading",
            level: 1,
            children: [{ type: "text", value: "Note" }],
          },
          {
            type: "ul",
            items: [
              {
                type: "li",
                children: [
                  { type: "p", children: [{ type: "text", value: "a" }] },
                ],
              },
              {
                type: "li",
                children: [
                  { type: "p", children: [{ type: "text", value: "b" }] },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("parses single newline into a space", () => {
    expect(constructAst("hello\n`world`")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", value: "hello " },
          { type: "code", value: "world" },
        ],
      },
    ]);
  });

  it("parses linebreak into br node", () => {
    expect(constructAst("hello  \n[world](x)")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", value: "hello" },
          { type: "br" },
          {
            type: "a",
            url: "x",
            children: [{ type: "text", value: "world" }],
          },
        ],
      },
    ]);
  });

  it("parses inline code inside paragraphs", () => {
    expect(constructAst("Use `x` and `y` in __bold__.")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", value: "Use " },
          { type: "code", value: "x" },
          { type: "text", value: " and " },
          { type: "code", value: "y" },
          { type: "text", value: " in " },
          { type: "strong", children: [{ type: "text", value: "bold" }] },
          { type: "text", value: "." },
        ],
      },
    ]);
  });

  it("parses links and images", () => {
    expect(
      constructAst("See [docs `v1`](https://example.com) ![caption](img.png)")
    ).toEqual([
      {
        type: "p",
        children: [
          { type: "text", value: "See " },
          {
            type: "a",
            url: "https://example.com",
            children: [
              { type: "text", value: "docs " },
              { type: "code", value: "v1" },
            ],
          },
          { type: "text", value: " " },
          {
            type: "img",
            url: "img.png",
            alt: "caption",
          },
        ],
      },
    ]);
  });

  it("parses emphasis, strong, and strikethrough", () => {
    expect(
      constructAst(
        "This is _em_ and **strong** and ~~del~~, and a combo: ~~***combo***~~"
      )
    ).toEqual([
      {
        type: "p",
        children: [
          { type: "text", value: "This is " },
          { type: "em", children: [{ type: "text", value: "em" }] },
          { type: "text", value: " and " },
          { type: "strong", children: [{ type: "text", value: "strong" }] },
          { type: "text", value: " and " },
          { type: "del", children: [{ type: "text", value: "del" }] },
          { type: "text", value: ", and a combo: " },
          {
            type: "del",
            children: [
              {
                type: "strong",
                children: [
                  { type: "em", children: [{ type: "text", value: "combo" }] },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("parses complex delimiter nesting", () => {
    expect(constructAst("**a *b*** *a **b***")).toEqual([
      {
        type: "p",
        children: [
          {
            type: "strong",
            children: [
              { type: "text", value: "a " },
              { type: "em", children: [{ type: "text", value: "b" }] },
            ],
          },
          { type: "text", value: " " },
          {
            type: "em",
            children: [
              { type: "text", value: "a " },
              { type: "strong", children: [{ type: "text", value: "b" }] },
            ],
          },
        ],
      },
    ]);
  });

  it("parses deeply nested emphasis with strikethrough and mixed markers", () => {
    expect(constructAst("~~**_a_** ok~~")).toEqual([
      {
        type: "p",
        children: [
          {
            type: "del",
            children: [
              {
                type: "strong",
                children: [{ type: "em", children: [{ type: "text", value: "a" }] }],
              },
              { type: "text", value: " ok" },
            ],
          },
        ],
      },
    ]);
  });

  it("parses nested delimiters with multiple levels and spacing", () => {
    expect(constructAst("**a _b ~~c~~ d_ e!**")).toEqual([
      {
        type: "p",
        children: [
          {
            type: "strong",
            children: [
              { type: "text", value: "a " },
              {
                type: "em",
                children: [
                  { type: "text", value: "b " },
                  { type: "del", children: [{ type: "text", value: "c" }] },
                  { type: "text", value: " d" },
                ],
              },
              { type: "text", value: " e!" },
            ],
          },
        ],
      },
    ]);
  });

  it("parses mixed strong/em with nested strikethrough inside emphasis", () => {
    expect(constructAst("*a? **b ~~c~~ d** e*")).toEqual([
      {
        type: "p",
        children: [
          {
            type: "em",
            children: [
              { type: "text", value: "a? " },
              {
                type: "strong",
                children: [
                  { type: "text", value: "b " },
                  { type: "del", children: [{ type: "text", value: "c" }] },
                  { type: "text", value: " d" },
                ],
              },
              { type: "text", value: " e" },
            ],
          },
        ],
      },
    ]);
  });

  it("parses alternating underscore and asterisk nesting", () => {
    expect(constructAst("__a *b _c_ d* e!?__")).toEqual([
      {
        type: "p",
        children: [
          {
            type: "strong",
            children: [
              { type: "text", value: "a " },
              {
                type: "em",
                children: [
                  { type: "text", value: "b " },
                  { type: "em", children: [{ type: "text", value: "c" }] },
                  { type: "text", value: " d" },
                ],
              },
              { type: "text", value: " e!?" },
            ],
          },
        ],
      },
    ]);
  });

  it("parses multiple nested runs with strikethrough wrapping complex emphasis", () => {
    expect(constructAst("~~__a *b **c** d* e__...~~")).toEqual([
      {
        type: "p",
        children: [
          {
            type: "del",
            children: [
              {
                type: "strong",
                children: [
                  { type: "text", value: "a " },
                  {
                    type: "em",
                    children: [
                      { type: "text", value: "b " },
                      { type: "strong", children: [{ type: "text", value: "c" }] },
                      { type: "text", value: " d" },
                    ],
                  },
                  { type: "text", value: " e" },
                ],
              },
              { type: "text", value: "..." },
            ],
          },
        ],
      },
    ]);
  });
});
