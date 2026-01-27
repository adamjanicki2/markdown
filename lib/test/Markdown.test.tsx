import React from "react";
import { render, screen } from "@testing-library/react";
import Markdown from "../src/Markdown";

function renderMarkdown(markdown: string, props?: React.ComponentProps<"div">) {
  return render(<Markdown {...props}>{markdown}</Markdown>);
}

describe("Markdown", () => {
  it("renders paragraphs and inline formatting", () => {
    renderMarkdown("Hello **bold** _em_ ~~del~~ `code`");

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("em").tagName).toBe("EM");
    expect(screen.getByText("del").tagName).toBe("DEL");
    expect(screen.getByText("code").tagName).toBe("CODE");
  });

  it("renders links and images", () => {
    renderMarkdown('See [docs](https://example.com) ![alt](img.png)');

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
    renderMarkdown("# Title\n\n---\n\n> quote");

    const heading = screen.getByRole("heading", { level: 1, name: "Title" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByText("quote").closest("blockquote")).toBeInTheDocument();
  });

  it("renders code fences inside pre/code", () => {
    const { container } = renderMarkdown("```\nconst x = 1;\n```");
    const pre = container.querySelector("pre");
    const code = container.querySelector("pre > code");

    expect(pre).toBeInTheDocument();
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent("const x = 1;");
  });

  it("renders unordered and ordered lists with start attribute", () => {
    const { container } = renderMarkdown("- a\n- b\n\n3. c\n4. d");

    const lists = container.querySelectorAll("ul, ol");
    expect(lists.length).toBe(2);
    expect(lists[0].tagName).toBe("UL");
    expect(lists[1]).toHaveAttribute("start", "3");

    const items = container.querySelectorAll("li");
    expect(items.length).toBe(4);
  });

  it("renders tables with alignment", () => {
    const { container } = renderMarkdown("| a | b | c |\n| :- | -: | :-: |\n| x | y | z |");

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
});
