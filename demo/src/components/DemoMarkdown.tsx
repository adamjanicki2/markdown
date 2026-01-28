import Markdown from "@adamjanicki/markdown";
import { Link } from "@adamjanicki/ui";

export default function DemoMarkdown({ markdown }: { markdown: string }) {
  return (
    <Markdown
      renderers={{
        a: ({ href, ...props }) => <Link {...props} to={href} id="LINK" />,
      }}
    >
      {markdown}
    </Markdown>
  );
}
