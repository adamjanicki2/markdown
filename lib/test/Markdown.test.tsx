import { render, screen } from "@testing-library/react";
import React from "react";

import Markdown from "../src/Markdown";

describe("Markdown", () => {
  it("renders paragraphs and inline formatting", () => {
    render(<Markdown>{"Hello **bold** _em_ ~~del~~ `code`"}</Markdown>);

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("em").tagName).toBe("EM");
    expect(screen.getByText("del").tagName).toBe("DEL");
    expect(screen.getByText("code").tagName).toBe("CODE");
  });

  it("renders links and images", () => {
    render(
      <Markdown>{"See [docs](https://example.com) ![alt](img.png)"}</Markdown>
    );

    const link = screen.getByRole("link", { name: "docs" });
    expect(link).toHaveAttribute("href", "https://example.com");

    const img = screen.getByRole("img", { name: "alt" });
    expect(img).toHaveAttribute("src", "img.png");
  });

  it("renders hard line breaks but preserves soft newlines", () => {
    const { container, rerender } = render(<Markdown>{"a  \nb"}</Markdown>);

    const br = container.querySelector("br");
    expect(br).toBeInTheDocument();
    expect(container.textContent).toBe("ab");

    rerender(<Markdown>{"x\ny"}</Markdown>);
    const paragraph = container.querySelector("p");
    expect(paragraph?.textContent).toContain("x\ny");
  });

  it("renders headings, horizontal rules, and blockquotes", () => {
    render(<Markdown>{"# Title\n\n---\n\n> quote"}</Markdown>);

    const heading = screen.getByRole("heading", { level: 1, name: "Title" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByText("quote").closest("blockquote")).toBeInTheDocument();
  });

  it("renders code fences inside pre/code", () => {
    const { container } = render(
      <Markdown>{"```\nconst x = 1;\n```"}</Markdown>
    );
    const pre = container.querySelector("pre");
    const code = container.querySelector("pre > code");

    expect(pre).toBeInTheDocument();
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent("const x = 1;");
  });

  it("renders unordered and ordered lists with start attribute", () => {
    const { container } = render(
      <Markdown>{"- a\n- b\n\n3. c\n4. d"}</Markdown>
    );

    const lists = container.querySelectorAll("ul, ol");
    expect(lists.length).toBe(2);
    expect(lists[0].tagName).toBe("UL");
    expect(lists[1]).toHaveAttribute("start", "3");

    const items = container.querySelectorAll("li");
    expect(items.length).toBe(4);
  });

  it("renders tables with alignment", () => {
    const { container } = render(
      <Markdown>{"| a | b | c |\n| :- | -: | :-: |\n| x | y | z |"}</Markdown>
    );

    const headers = container.querySelectorAll("th");
    expect(headers.length).toBe(3);
    expect(headers[0]).toHaveAttribute("align", "left");
    expect(headers[1]).toHaveAttribute("align", "right");
    expect(headers[2]).toHaveAttribute("align", "center");

    const cells = container.querySelectorAll("td");
    expect(cells.length).toBe(3);
    expect(cells[2]).toHaveAttribute("align", "center");
  });

  it("passes props to the root div and forwards refs", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Markdown ref={ref} className="root" data-id="x">
        Hello
      </Markdown>
    );

    const root = screen.getByText("Hello").closest("div");
    expect(root).toHaveClass("root");
    expect(root).toHaveAttribute("data-id", "x");
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("updates when markdown changes", () => {
    const { rerender } = render(<Markdown>One</Markdown>);
    expect(screen.getByText("One")).toBeInTheDocument();

    rerender(<Markdown>Two</Markdown>);
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("drops images completely", () => {
    const { container } = render(
      <Markdown unwrapTags={["img"]}>
        {"Here's an image: ![alt](url.png)\n\nAnd some text."}
      </Markdown>
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("Here's an image:")).toBeInTheDocument();
    expect(screen.getByText("And some text.")).toBeInTheDocument();
  });

  it("unwraps links but preserves text", () => {
    const { container } = render(
      <Markdown unwrapTags={["a"]}>
        {"Visit [example.com](https://example.com) for more info."}
      </Markdown>
    );

    expect(container.querySelector("a")).not.toBeInTheDocument();
    expect(container.textContent).toContain("Visit");
    expect(container.textContent).toContain("example.com");
    expect(container.textContent).toContain("for more info");
  });

  it("unwraps multiple tag types while preserving their content", () => {
    const { container } = render(
      <Markdown unwrapTags={["strong", "a"]}>
        {"**bold** _italic_ [link](url) ![img](img.png)"}
      </Markdown>
    );

    expect(container.querySelector("strong")).not.toBeInTheDocument();
    expect(container.querySelector("a")).not.toBeInTheDocument();
    expect(container.textContent).toContain("bold");
    expect(container.textContent).toContain("link");
    expect(container.querySelector("em")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("unwraps parent but preserves nested children", () => {
    const { container } = render(
      <Markdown unwrapTags={["a"]}>{"Visit [**bold link**](url)"}</Markdown>
    );

    expect(container.querySelector("a")).not.toBeInTheDocument();
    expect(screen.getByText("bold link")).toBeInTheDocument();
    expect(container.querySelector("strong")).toBeInTheDocument();
  });

  it("unwraps specific heading levels", () => {
    render(
      <Markdown unwrapTags={["h1", "h3"]}>
        {"# H1\n\n## H2\n\n### H3\n\nContent"}
      </Markdown>
    );

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "H2" })
    ).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("unwraps ordered lists but preserves list items", () => {
    const { container } = render(
      <Markdown unwrapTags={["ol"]}>{"1. Item 1\n2. Item 2"}</Markdown>
    );

    expect(container.querySelector("ol")).not.toBeInTheDocument();
    expect(container.querySelector("li")).toBeInTheDocument();
    expect(container.textContent).toContain("Item 1");
    expect(container.textContent).toContain("Item 2");
  });

  it("unwraps unordered lists but preserves list items", () => {
    const { container } = render(
      <Markdown unwrapTags={["ul"]}>{"- Item 1\n- Item 2"}</Markdown>
    );

    expect(container.querySelector("ul")).not.toBeInTheDocument();
    expect(container.querySelector("li")).toBeInTheDocument();
    expect(container.textContent).toContain("Item 1");
    expect(container.textContent).toContain("Item 2");
  });

  it("unwraps list items but keeps list container", () => {
    const { container } = render(
      <Markdown unwrapTags={["li"]}>{"- Item 1\n- Item 2"}</Markdown>
    );

    expect(container.querySelector("ul")).toBeInTheDocument();
    expect(container.querySelector("li")).not.toBeInTheDocument();
    expect(container.textContent).toContain("Item 1");
    expect(container.textContent).toContain("Item 2");
  });

  it("unwraps table but preserves table structure", () => {
    const { container } = render(
      <Markdown unwrapTags={["table"]}>
        {"| a | b |\n| - | - |\n| x | y |"}
      </Markdown>
    );

    expect(container.querySelector("table")).not.toBeInTheDocument();
    expect(container.querySelector("th")).toBeInTheDocument();
    expect(container.querySelector("td")).toBeInTheDocument();
  });

  it("unwraps table rows but preserves cells", () => {
    const { container } = render(
      <Markdown unwrapTags={["tr"]}>
        {"| a | b |\n| - | - |\n| x | y |"}
      </Markdown>
    );

    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("tr")).not.toBeInTheDocument();
    expect(container.querySelector("th")).toBeInTheDocument();
    expect(container.querySelector("td")).toBeInTheDocument();
  });

  it("unwraps table header cells but preserves content", () => {
    const { container } = render(
      <Markdown unwrapTags={["th"]}>
        {"| a | b |\n| - | - |\n| x | y |"}
      </Markdown>
    );

    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("th")).not.toBeInTheDocument();
    expect(container.textContent).toContain("a");
    expect(container.textContent).toContain("b");
    expect(container.querySelector("td")).toBeInTheDocument();
  });

  it("unwraps table data cells but preserves content", () => {
    const { container } = render(
      <Markdown unwrapTags={["td"]}>
        {"| a | b |\n| - | - |\n| x | y |"}
      </Markdown>
    );

    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("th")).toBeInTheDocument();
    expect(container.querySelector("td")).not.toBeInTheDocument();
    expect(container.textContent).toContain("x");
    expect(container.textContent).toContain("y");
  });

  it("renders all content when unwrapTags is undefined", () => {
    const { container } = render(
      <Markdown>{"**bold** _italic_ [link](url)"}</Markdown>
    );

    expect(container.querySelector("strong")).toBeInTheDocument();
    expect(container.querySelector("em")).toBeInTheDocument();
    expect(container.querySelector("a")).toBeInTheDocument();
  });

  it("renders all content when unwrapTags is empty array", () => {
    const { container } = render(
      <Markdown unwrapTags={[]}>{"**bold** _italic_ [link](url)"}</Markdown>
    );

    expect(container.querySelector("strong")).toBeInTheDocument();
    expect(container.querySelector("em")).toBeInTheDocument();
    expect(container.querySelector("a")).toBeInTheDocument();
  });

  it("renders empty markdown without crashing", () => {
    const { container } = render(<Markdown>{""}</Markdown>);
    expect(container.textContent).toBe("");
  });

  it("renders multiple paragraphs separated by blank lines", () => {
    const { container } = render(<Markdown>{"One\n\nTwo\n\nThree"}</Markdown>);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(3);
    expect(paragraphs[0]).toHaveTextContent("One");
    expect(paragraphs[2]).toHaveTextContent("Three");
  });

  it("omits start attribute for ordered list starting at 1", () => {
    const { container } = render(<Markdown>{"1. A\n2. B"}</Markdown>);
    const ol = container.querySelector("ol");
    expect(ol).toBeInTheDocument();
    expect(ol).not.toHaveAttribute("start");
  });

  it("unwraps inline code", () => {
    const { container } = render(
      <Markdown unwrapTags={["code"]}>{"Hello `code` world"}</Markdown>
    );

    expect(container.querySelector("code")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("Hello code world");
  });

  it("unwraps fenced code blocks", () => {
    const { container } = render(
      <Markdown unwrapTags={["pre"]}>
        {"```js\nconst x = 1;\n```\n\nAfter"}
      </Markdown>
    );

    expect(container.querySelector("pre")).not.toBeInTheDocument();
    expect(container.querySelector("code")).not.toBeInTheDocument();
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("unwraps blockquote but preserves content", () => {
    const { container } = render(
      <Markdown unwrapTags={["blockquote"]}>{"> quote\n\nAfter"}</Markdown>
    );

    expect(container.querySelector("blockquote")).not.toBeInTheDocument();
    expect(container.textContent).toContain("quote");
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("drops horizontal rules", () => {
    const { container } = render(
      <Markdown unwrapTags={["hr"]}>{"# Title\n\n---\n\nAfter"}</Markdown>
    );

    expect(container.querySelector("hr")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Title" })
    ).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("drops hard line breaks completely", () => {
    const { container } = render(
      <Markdown unwrapTags={["br"]}>{"a  \nb"}</Markdown>
    );
    expect(container.querySelector("br")).not.toBeInTheDocument();
    expect(container.textContent).toBe("ab");
  });

  it("unwraps paragraph but preserves content", () => {
    const { container } = render(
      <Markdown unwrapTags={["p"]}>{"Hello\n\nWorld"}</Markdown>
    );
    expect(container.querySelector("p")).not.toBeInTheDocument();
    expect(container.textContent).toContain("Hello");
    expect(container.textContent).toContain("World");
  });

  it("unwraps em but preserves text", () => {
    const { container } = render(
      <Markdown unwrapTags={["em"]}>{"Hello _em_ world"}</Markdown>
    );
    expect(container.querySelector("em")).not.toBeInTheDocument();
    expect(container.textContent).toContain("em");
    expect(container).toHaveTextContent("Hello em world");
  });

  it("unwraps strong but preserves text", () => {
    const { container } = render(
      <Markdown unwrapTags={["strong"]}>{"Hello **bold** world"}</Markdown>
    );
    expect(container.querySelector("strong")).not.toBeInTheDocument();
    expect(container.textContent).toContain("bold");
    expect(container).toHaveTextContent("Hello bold world");
  });

  it("unwraps del but preserves text", () => {
    const { container } = render(
      <Markdown unwrapTags={["del"]}>{"Hello ~~gone~~ world"}</Markdown>
    );
    expect(container.querySelector("del")).not.toBeInTheDocument();
    expect(container.textContent).toContain("gone");
    expect(container).toHaveTextContent("Hello gone world");
  });

  it("unwraps h4 headings but preserves content", () => {
    const { container } = render(
      <Markdown unwrapTags={["h4"]}>{"### H3\n\n#### H4\n\n##### H5"}</Markdown>
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "H3" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 4 })).not.toBeInTheDocument();
    expect(container.textContent).toContain("H4");
    expect(
      screen.getByRole("heading", { level: 5, name: "H5" })
    ).toBeInTheDocument();
  });

  it("unwraps ordered list items", () => {
    const { container } = render(
      <Markdown unwrapTags={["li"]}>{"1. Item 1\n2. Item 2"}</Markdown>
    );
    expect(container.querySelector("ol")).toBeInTheDocument();
    expect(container.querySelector("li")).not.toBeInTheDocument();
    expect(container.textContent).toContain("Item 1");
    expect(container.textContent).toContain("Item 2");
  });

  it("unwraps thead but preserves header", () => {
    const { container } = render(
      <Markdown unwrapTags={["thead"]}>
        {"| a | b |\n| - | - |\n| x | y |"}
      </Markdown>
    );

    expect(container.querySelector("thead")).not.toBeInTheDocument();
    expect(container.querySelector("th")).toBeInTheDocument();
    expect(container.querySelector("tbody")).toBeInTheDocument();
    expect(container.querySelector("td")).toBeInTheDocument();
  });

  it("unwraps tbody but preserves body rows", () => {
    const { container } = render(
      <Markdown unwrapTags={["tbody"]}>
        {"| a | b |\n| - | - |\n| x | y |"}
      </Markdown>
    );

    expect(container.querySelector("tbody")).not.toBeInTheDocument();
    expect(container.querySelector("td")).toBeInTheDocument();
    expect(container.querySelector("thead")).toBeInTheDocument();
    expect(container.querySelector("th")).toBeInTheDocument();
  });

  it("uses a custom paragraph renderer", () => {
    render(
      <Markdown
        renderers={{
          p: ({ children }) => <p data-testid="custom-p">{children}</p>,
        }}
      >
        {"Hello"}
      </Markdown>
    );

    expect(screen.getByTestId("custom-p")).toHaveTextContent("Hello");
  });

  it("uses a custom code renderer", () => {
    render(
      <Markdown
        renderers={{
          code: ({ children }) => (
            <code data-testid="custom-code">{children}</code>
          ),
        }}
      >
        {"Inline `code`"}
      </Markdown>
    );

    expect(screen.getByTestId("custom-code")).toHaveTextContent("code");
  });

  it("uses a custom pre renderer", () => {
    render(
      <Markdown
        renderers={{
          pre: ({ children, lang }) => (
            <pre data-testid="custom-pre" data-lang={lang}>
              {children}
            </pre>
          ),
        }}
      >
        {"```js\nconst x = 1;\n```"}
      </Markdown>
    );

    const pre = screen.getByTestId("custom-pre");
    expect(pre).toHaveAttribute("data-lang", "js");
    expect(pre).toHaveTextContent("const x = 1;");
  });

  it("uses a custom link renderer", () => {
    render(
      <Markdown
        renderers={{
          a: ({ children, href }) => (
            <a data-testid="custom-link" href={href}>
              {children}
            </a>
          ),
        }}
      >
        {"[Docs](https://example.com)"}
      </Markdown>
    );

    expect(screen.getByTestId("custom-link")).toHaveAttribute(
      "href",
      "https://example.com"
    );
  });

  it("uses a custom image renderer", () => {
    render(
      <Markdown
        renderers={{
          img: ({ alt, src }) => (
            <img data-testid="custom-img" src={src} alt={alt} />
          ),
        }}
      >
        {"![Alt](image.png)"}
      </Markdown>
    );

    expect(screen.getByTestId("custom-img")).toHaveAttribute(
      "src",
      "image.png"
    );
  });

  it("uses a custom heading renderer", () => {
    render(
      <Markdown
        renderers={{
          h2: ({ children }) => <h2 data-testid="custom-h2">{children}</h2>,
        }}
      >
        {"## Title"}
      </Markdown>
    );

    expect(screen.getByTestId("custom-h2")).toHaveTextContent("Title");
  });

  it("uses custom list renderers", () => {
    render(
      <Markdown
        renderers={{
          ul: ({ children }) => <ul data-testid="custom-ul">{children}</ul>,
          ol: ({ children, start }) => (
            <ol data-testid="custom-ol" start={start}>
              {children}
            </ol>
          ),
          li: ({ children }) => <li data-testid="custom-li">{children}</li>,
        }}
      >
        {"- A\n- B\n\n2. C\n3. D"}
      </Markdown>
    );

    expect(screen.getByTestId("custom-ul")).toBeInTheDocument();
    expect(screen.getByTestId("custom-ol")).toHaveAttribute("start", "2");
    expect(screen.getAllByTestId("custom-li").length).toBe(4);
  });

  it("uses custom table renderers", () => {
    render(
      <Markdown
        renderers={{
          table: ({ children }) => (
            <table data-testid="custom-table">{children}</table>
          ),
          thead: ({ children }) => (
            <thead data-testid="custom-thead">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody data-testid="custom-tbody">{children}</tbody>
          ),
          tr: ({ children }) => <tr data-testid="custom-tr">{children}</tr>,
          th: ({ children }) => <th data-testid="custom-th">{children}</th>,
          td: ({ children }) => <td data-testid="custom-td">{children}</td>,
        }}
      >
        {"| a | b |\n| - | - |\n| x | y |"}
      </Markdown>
    );

    expect(screen.getByTestId("custom-table")).toBeInTheDocument();
    expect(screen.getByTestId("custom-thead")).toBeInTheDocument();
    expect(screen.getByTestId("custom-tbody")).toBeInTheDocument();
    expect(screen.getAllByTestId("custom-tr").length).toBe(2);
    expect(screen.getAllByTestId("custom-th").length).toBe(2);
    expect(screen.getAllByTestId("custom-td").length).toBe(2);
  });

  it("uses a custom blockquote renderer", () => {
    render(
      <Markdown
        renderers={{
          blockquote: ({ children }) => (
            <blockquote data-testid="custom-quote">{children}</blockquote>
          ),
        }}
      >
        {"> Quote"}
      </Markdown>
    );

    expect(screen.getByTestId("custom-quote")).toHaveTextContent("Quote");
  });

  it("uses a custom hr renderer", () => {
    const { container } = render(
      <Markdown renderers={{ hr: () => <hr data-testid="custom-hr" /> }}>
        {"---"}
      </Markdown>
    );

    expect(
      container.querySelector('[data-testid="custom-hr"]')
    ).toBeInTheDocument();
  });

  it("uses a custom br renderer", () => {
    const { container } = render(
      <Markdown renderers={{ br: () => <br data-testid="custom-br" /> }}>
        {"a  \nb"}
      </Markdown>
    );

    expect(
      container.querySelector('[data-testid="custom-br"]')
    ).toBeInTheDocument();
  });
});
