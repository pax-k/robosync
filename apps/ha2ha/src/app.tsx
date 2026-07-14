import {
	AdoptionSection,
	ConformanceSection,
	FaqSection,
	Hero,
	MdsyncSection,
	ProtocolSection,
	SiteFooter,
	SiteHeader,
	WhySection,
	WorkspaceSection,
} from "./site-components";

export function App() {
	return (
		<div className="site-shell">
			<SiteHeader />
			<main>
				<Hero />
				<WhySection />
				<ProtocolSection />
				<WorkspaceSection />
				<AdoptionSection />
				<ConformanceSection />
				<MdsyncSection />
				<FaqSection />
			</main>
			<SiteFooter />
		</div>
	);
}
