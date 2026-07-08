import {
	BlockTypeSelect,
	BoldItalicUnderlineToggles,
	CreateLink,
	codeBlockPlugin,
	codeMirrorPlugin,
	DiffSourceToggleWrapper,
	diffSourcePlugin,
	frontmatterPlugin,
	headingsPlugin,
	InsertCodeBlock,
	InsertFrontmatter,
	InsertTable,
	InsertThematicBreak,
	ListsToggle,
	linkDialogPlugin,
	linkPlugin,
	listsPlugin,
	MDXEditor,
	markdownShortcutPlugin,
	quotePlugin,
	Separator,
	tablePlugin,
	thematicBreakPlugin,
	toolbarPlugin,
	UndoRedo,
} from "@mdxeditor/editor";
import { useCallback, useMemo } from "react";

const CODE_BLOCK_LANGUAGES = {
	bash: "Bash",
	css: "CSS",
	html: "HTML",
	javascript: "JavaScript",
	json: "JSON",
	markdown: "Markdown",
	tsx: "TSX",
	typescript: "TypeScript",
} as const;

interface MarkdownEditorError {
	error: string;
	source: string;
}

interface MarkdownEditorProps {
	baselineMarkdown: string;
	markdown: string;
	onEditorError: (payload: MarkdownEditorError) => void;
	onMarkdownChange: (markdown: string) => void;
	revisionKey: string;
}

function MarkdownEditor({
	baselineMarkdown,
	markdown,
	onEditorError,
	onMarkdownChange,
	revisionKey,
}: MarkdownEditorProps) {
	const handleChange = useCallback(
		(nextMarkdown: string, initialMarkdownNormalize: boolean) => {
			if (!initialMarkdownNormalize) {
				onMarkdownChange(nextMarkdown);
			}
		},
		[onMarkdownChange]
	);
	const plugins = useMemo(
		() => [
			headingsPlugin(),
			listsPlugin(),
			quotePlugin(),
			thematicBreakPlugin(),
			linkPlugin(),
			linkDialogPlugin(),
			tablePlugin(),
			codeBlockPlugin({ defaultCodeBlockLanguage: "markdown" }),
			codeMirrorPlugin({
				autoLoadLanguageSupport: false,
				codeBlockLanguages: CODE_BLOCK_LANGUAGES,
			}),
			frontmatterPlugin(),
			diffSourcePlugin({
				diffMarkdown: baselineMarkdown,
				readOnlyDiff: true,
				viewMode: "rich-text",
			}),
			toolbarPlugin({
				toolbarContents: () => (
					<DiffSourceToggleWrapper>
						<UndoRedo />
						<Separator />
						<BlockTypeSelect />
						<BoldItalicUnderlineToggles />
						<ListsToggle />
						<CreateLink />
						<Separator />
						<InsertTable />
						<InsertCodeBlock />
						<InsertFrontmatter />
						<InsertThematicBreak />
					</DiffSourceToggleWrapper>
				),
			}),
			markdownShortcutPlugin(),
		],
		[baselineMarkdown]
	);

	return (
		<MDXEditor
			className="markdown-editor"
			contentEditableClassName="markdown-editor-content"
			key={revisionKey}
			markdown={markdown}
			onChange={handleChange}
			onError={onEditorError}
			plugins={plugins}
			spellCheck={false}
		/>
	);
}

export type { MarkdownEditorError };
export { MarkdownEditor };
