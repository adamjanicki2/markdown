import { constructAst } from "../src/ast";

describe("ast", () => {
  it("parses a heading", () => {
    expect(
      constructAst("# Title [Docs](https://example.com)\n\nHello `x`!")
    ).toEqual([
      {
        type: "heading",
        level: 1,
        children: [
          { type: "text", value: "Title " },
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
    expect(constructAst("Use `x` and `y`.")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", value: "Use " },
          { type: "code", value: "x" },
          { type: "text", value: " and " },
          { type: "code", value: "y" },
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
});
