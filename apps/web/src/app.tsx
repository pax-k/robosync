import { Toaster } from "@mdsync/ui/components/sonner";
import {
	BrowserRouter,
	Navigate,
	Route,
	Routes,
	useParams,
} from "react-router";
import { ConfirmationProvider } from "./confirmation";
import { CreateWorkspacePage } from "./create-workspace-page";
import {
	AgentHandoffPage,
	DocsIndexPage,
	GettingStartedPage,
	SecurityPage,
} from "./docs-pages";
import { LandingPage } from "./landing-page";
import { WorkspaceView } from "./workspace-view";

export function App() {
	return (
		<BrowserRouter>
			<ConfirmationProvider>
				<Routes>
					<Route element={<LandingPage />} path="/" />
					<Route element={<CreateWorkspacePage />} path="/new" />
					<Route element={<DocsIndexPage />} path="/docs" />
					<Route
						element={<GettingStartedPage />}
						path="/docs/getting-started"
					/>
					<Route element={<AgentHandoffPage />} path="/docs/agent-handoff" />
					<Route element={<SecurityPage />} path="/docs/security" />
					<Route element={<WorkspaceRoute />} path="/w/:workspaceId/*" />
					<Route element={<Navigate replace to="/" />} path="*" />
				</Routes>
				<Toaster closeButton position="bottom-right" />
			</ConfirmationProvider>
		</BrowserRouter>
	);
}

function WorkspaceRoute() {
	const { workspaceId } = useParams();
	return workspaceId ? (
		<WorkspaceView workspaceId={workspaceId} />
	) : (
		<Navigate replace to="/" />
	);
}
