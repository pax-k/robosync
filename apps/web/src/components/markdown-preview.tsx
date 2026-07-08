import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
	markdown: string;
}

const EXTERNAL_LINK_PATTERN = /^https?:\/\//;

const markdownComponents = {
	a({ children, href, ...props }) {
		const isExternalLink = href ? EXTERNAL_LINK_PATTERN.test(href) : false;

		return (
			<a
				{...props}
				href={href}
				rel={isExternalLink ? "noopener noreferrer" : undefined}
				target={isExternalLink ? "_blank" : undefined}
			>
				{children}
			</a>
		);
	},
} satisfies Components;

function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
	return (
		<article className="markdown-preview">
			<ReactMarkdown
				components={markdownComponents}
				remarkPlugins={[remarkGfm]}
				skipHtml
			>
				{markdown}
			</ReactMarkdown>
		</article>
	);
}

export { MarkdownPreview };
