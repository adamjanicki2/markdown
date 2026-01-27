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
});
