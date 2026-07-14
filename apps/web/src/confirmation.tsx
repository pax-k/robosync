import { Button } from "@mdsync/ui/components/button";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";

interface ConfirmationOptions {
	confirmLabel: string;
	description: string;
	destructive?: boolean;
	title: string;
}

type Confirm = (options: ConfirmationOptions) => Promise<boolean>;

const ConfirmationContext = createContext<Confirm | null>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
	const [options, setOptions] = useState<ConfirmationOptions | null>(null);
	const resolver = useRef<((confirmed: boolean) => void) | null>(null);

	const confirm = useCallback<Confirm>((nextOptions) => {
		resolver.current?.(false);
		setOptions(nextOptions);
		return new Promise<boolean>((resolve) => {
			resolver.current = resolve;
		});
	}, []);
	const settle = useCallback((confirmed: boolean) => {
		resolver.current?.(confirmed);
		resolver.current = null;
		setOptions(null);
	}, []);
	const cancel = useCallback(() => settle(false), [settle]);
	const accept = useCallback(() => settle(true), [settle]);
	const contextValue = useMemo(() => confirm, [confirm]);

	return (
		<ConfirmationContext.Provider value={contextValue}>
			{children}
			{options ? (
				<div className="dialog-backdrop" role="presentation">
					<section
						aria-describedby="confirmation-description"
						aria-labelledby="confirmation-title"
						aria-modal="true"
						className="dialog-card confirmation-dialog"
						role="alertdialog"
					>
						<p className="eyebrow">Please confirm</p>
						<h2 id="confirmation-title">{options.title}</h2>
						<p id="confirmation-description">{options.description}</p>
						<div className="dialog-actions">
							<Button onClick={cancel} type="button" variant="ghost">
								Cancel
							</Button>
							<Button
								onClick={accept}
								type="button"
								variant={options.destructive ? "destructive" : "default"}
							>
								{options.confirmLabel}
							</Button>
						</div>
					</section>
				</div>
			) : null}
		</ConfirmationContext.Provider>
	);
}

export function useConfirmation() {
	const confirm = useContext(ConfirmationContext);
	if (!confirm) {
		throw new Error(
			"useConfirmation must be used inside ConfirmationProvider."
		);
	}
	return confirm;
}
