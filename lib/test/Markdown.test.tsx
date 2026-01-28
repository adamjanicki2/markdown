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

  it("drops images when img is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["img"]}>
        {"Here's an image: ![alt](url.png)\n\nAnd some text."}
      </Markdown>
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("Here's an image:")).toBeInTheDocument();
    expect(screen.getByText("And some text.")).toBeInTheDocument();
  });

  it("drops links and their content when a is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["a"]}>
        {"Visit [example.com](https://example.com) for more info."}
      </Markdown>
    );

    expect(container.querySelector("a")).not.toBeInTheDocument();
    expect(screen.getByText(/Visit.*for more info/)).toBeInTheDocument();
    expect(screen.queryByText("example.com")).not.toBeInTheDocument();
  });

  it("drops multiple tag types", () => {
    const { container } = render(
      <Markdown dropTags={["strong", "a"]}>
        {"**bold** _italic_ [link](url) ![img](img.png)"}
      </Markdown>
    );

    expect(container.querySelector("strong")).not.toBeInTheDocument();
    expect(container.querySelector("a")).not.toBeInTheDocument();
    expect(container.querySelector("em")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("drops entire subtree when parent tag is dropped", () => {
    const { container } = render(
      <Markdown dropTags={["a"]}>{"Visit [**bold link**](url)"}</Markdown>
    );

    expect(container.querySelector("a")).not.toBeInTheDocument();
    expect(screen.queryByText("bold link")).not.toBeInTheDocument();
  });

  it("drops specific heading levels", () => {
    render(
      <Markdown dropTags={["h1", "h3"]}>
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

  it("drops ordered lists when ol is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["ol"]}>{"1. Item 1\n2. Item 2"}</Markdown>
    );

    expect(container.querySelector("ol")).not.toBeInTheDocument();
    expect(container.querySelector("li")).not.toBeInTheDocument();
  });

  it("drops unordered lists when ul is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["ul"]}>{"- Item 1\n- Item 2"}</Markdown>
    );

    expect(container.querySelector("ul")).not.toBeInTheDocument();
    expect(container.querySelector("li")).not.toBeInTheDocument();
  });

  it("drops list items but keeps list container when li is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["li"]}>{"- Item 1\n- Item 2"}</Markdown>
    );

    expect(container.querySelector("ul")).toBeInTheDocument();
    expect(container.querySelector("li")).not.toBeInTheDocument();
  });

  it("drops table when table is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["table"]}>
        {"| a | b |\n| - | - |\n| x | y |"}
      </Markdown>
    );

    expect(container.querySelector("table")).not.toBeInTheDocument();
    expect(container.querySelector("th")).not.toBeInTheDocument();
    expect(container.querySelector("td")).not.toBeInTheDocument();
  });

  it("drops table rows when tr is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["tr"]}>{"| a | b |\n| - | - |\n| x | y |"}</Markdown>
    );

    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("tr")).not.toBeInTheDocument();
    expect(container.querySelector("th")).not.toBeInTheDocument();
    expect(container.querySelector("td")).not.toBeInTheDocument();
  });

  it("drops table header cells when th is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["th"]}>{"| a | b |\n| - | - |\n| x | y |"}</Markdown>
    );

    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("th")).not.toBeInTheDocument();
    expect(container.querySelector("td")).toBeInTheDocument();
  });

  it("drops table data cells when td is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["td"]}>{"| a | b |\n| - | - |\n| x | y |"}</Markdown>
    );

    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("th")).toBeInTheDocument();
    expect(container.querySelector("td")).not.toBeInTheDocument();
  });

  it("renders all content when dropTags is undefined", () => {
    const { container } = render(
      <Markdown>{"**bold** _italic_ [link](url)"}</Markdown>
    );

    expect(container.querySelector("strong")).toBeInTheDocument();
    expect(container.querySelector("em")).toBeInTheDocument();
    expect(container.querySelector("a")).toBeInTheDocument();
  });

  it("renders all content when dropTags is empty array", () => {
    const { container } = render(
      <Markdown dropTags={[]}>{"**bold** _italic_ [link](url)"}</Markdown>
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

  it("drops inline code when code is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["code"]}>{"Hello `code` world"}</Markdown>
    );

    expect(container.querySelector("code")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("Hello world");
  });

  it("drops fenced code blocks when pre is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["pre"]}>{"```js\nconst x = 1;\n```\n\nAfter"}</Markdown>
    );

    expect(container.querySelector("pre")).not.toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("drops blockquote subtree when blockquote is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["blockquote"]}>{"> quote\n\nAfter"}</Markdown>
    );

    expect(container.querySelector("blockquote")).not.toBeInTheDocument();
    expect(screen.queryByText("quote")).not.toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("drops horizontal rules when hr is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["hr"]}>{"# Title\n\n---\n\nAfter"}</Markdown>
    );

    expect(container.querySelector("hr")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Title" })
    ).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("drops hard line breaks when br is in dropTags", () => {
    const { container } = render(<Markdown dropTags={["br"]}>{"a  \nb"}</Markdown>);
    expect(container.querySelector("br")).not.toBeInTheDocument();
    expect(container.textContent).toBe("ab");
  });

  it("drops paragraph subtree when p is in dropTags", () => {
    const { container } = render(<Markdown dropTags={["p"]}>{"Hello\n\nWorld"}</Markdown>);
    expect(container.querySelector("p")).not.toBeInTheDocument();
    expect(container.textContent).toBe("");
  });

  it("drops em subtree when em is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["em"]}>{"Hello _em_ world"}</Markdown>
    );
    expect(screen.queryByText("em")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("Hello world");
  });

  it("drops strong subtree when strong is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["strong"]}>{"Hello **bold** world"}</Markdown>
    );
    expect(screen.queryByText("bold")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("Hello world");
  });

  it("drops del subtree when del is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["del"]}>{"Hello ~~gone~~ world"}</Markdown>
    );
    expect(screen.queryByText("gone")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("Hello world");
  });

  it("drops h4 headings when h4 is in dropTags", () => {
    render(
      <Markdown dropTags={["h4"]}>{"### H3\n\n#### H4\n\n##### H5"}</Markdown>
    );
    expect(screen.getByRole("heading", { level: 3, name: "H3" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 4, name: "H4" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 5, name: "H5" })).toBeInTheDocument();
  });

  it("drops ordered list items when li is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["li"]}>{"1. Item 1\n2. Item 2"}</Markdown>
    );
    expect(container.querySelector("ol")).toBeInTheDocument();
    expect(container.querySelector("li")).not.toBeInTheDocument();
  });

  it("drops thead when thead is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["thead"]}>{"| a | b |\n| - | - |\n| x | y |"}</Markdown>
    );

    expect(container.querySelector("thead")).not.toBeInTheDocument();
    expect(container.querySelector("th")).not.toBeInTheDocument();
    expect(container.querySelector("tbody")).toBeInTheDocument();
    expect(container.querySelector("td")).toBeInTheDocument();
  });

  it("drops tbody when tbody is in dropTags", () => {
    const { container } = render(
      <Markdown dropTags={["tbody"]}>{"| a | b |\n| - | - |\n| x | y |"}</Markdown>
    );

    expect(container.querySelector("tbody")).not.toBeInTheDocument();
    expect(container.querySelector("td")).not.toBeInTheDocument();
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
          code: ({ children }) => <code data-testid="custom-code">{children}</code>,
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

    expect(screen.getByTestId("custom-img")).toHaveAttribute("src", "image.png");
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
          table: ({ children }) => <table data-testid="custom-table">{children}</table>,
          thead: ({ children }) => <thead data-testid="custom-thead">{children}</thead>,
          tbody: ({ children }) => <tbody data-testid="custom-tbody">{children}</tbody>,
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

    expect(container.querySelector("[data-testid=\"custom-hr\"]")).toBeInTheDocument();
  });

  it("uses a custom br renderer", () => {
    const { container } = render(
      <Markdown renderers={{ br: () => <br data-testid="custom-br" /> }}>
        {"a  \nb"}
      </Markdown>
    );

    expect(container.querySelector("[data-testid=\"custom-br\"]")).toBeInTheDocument();
  });
});
