import { Button } from "@mdsync/ui/components/button";
import { FileText } from "lucide-react";
import { useCallback } from "react";
import type { WorkspaceFile } from "../workspace-types";

export function FileListItem({
	isSelected,
	item,
	onSelect,
}: {
	isSelected: boolean;
	item: WorkspaceFile;
	onSelect: (path: string) => void;
}) {
	const selectFile = useCallback(() => {
		onSelect(item.path);
	}, [item.path, onSelect]);

	return (
		<Button
			className={isSelected ? "selected" : ""}
			onClick={selectFile}
			type="button"
			variant="ghost"
		>
			<FileText aria-hidden="true" size={16} />
			<span>{item.path}</span>
			<small>v{item.version}</small>
		</Button>
	);
}
