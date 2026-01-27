import React from "react";
import { buildAst, type AstNode } from "./ast";

type Props = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
  /** The Markdown source string to convert into a react component */
  children: string;
};

const Markdown = React.forwardRef<HTMLDivElement, Props>(
  ({ children, ...props }, ref) => {
    const ast = React.useMemo(() => buildAst(children), [children]);

    return (
      <div {...props} ref={ref}>
        <Tree>{ast}</Tree>
      </div>
    );
  }
);

type TreeProps = {
  children: AstNode[];
};

function Tree({ children }: TreeProps) {
  return children.map((node) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "code":
        return <code>{node.value}</code>;
      case "em":
        return (
          <em>
            <Tree>{node.children}</Tree>
          </em>
        );
      case "strong":
        return (
          <strong>
            <Tree>{node.children}</Tree>
          </strong>
        );
      case "del":
        return (
          <del>
            <Tree>{node.children}</Tree>
          </del>
        );
      case "a":
        return <a href={node.url}>{<Tree>{node.children}</Tree>}</a>;
      case "img":
        return <img src={node.url} alt={node.alt} />;
      case "linebreak":
        return node.hard ? <br /> : "\n";
      case "p":
        return (
          <p>
            <Tree>{node.children}</Tree>
          </p>
        );
      case "h":
        return React.createElement(
          `h${node.level}`,
          {},
          <Tree>{node.children}</Tree>
        );
      case "hr":
        return <hr />;
      case "pre":
        return (
          <pre>
            <code>{node.raw}</code>
          </pre>
        );
      case "blockquote":
        return (
          <blockquote>
            <Tree>{node.children}</Tree>
          </blockquote>
        );
      case "list": {
        const tag = node.ordered ? "ol" : "ul";
        const start =
          node.ordered && node.start !== undefined && node.start !== 1
            ? node.start
            : undefined;
        const items = node.items.map((item) => (
          <li>
            <Tree>{item.children}</Tree>
          </li>
        ));
        return React.createElement(tag, { start }, items);
      }
      case "table": {
        return (
          <table>
            <thead>
              <tr>
                {node.head.row.cells.map((cell) => (
                  <th align={cell.align}>
                    <Tree>{cell.children}</Tree>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {node.body.rows.map((row) => {
                const cells = row.cells.map((cell) => (
                  <td align={cell.align}>
                    <Tree>{cell.children}</Tree>
                  </td>
                ));
                return <tr>{cells}</tr>;
              })}
            </tbody>
          </table>
        );
      }
    }
  });
}

export default Markdown;
