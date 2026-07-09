import { Button } from "@mdsync/ui/components/button";
import { Input } from "@mdsync/ui/components/input";
import { Label } from "@mdsync/ui/components/label";
import { type ChangeEvent, useCallback, useMemo } from "react";
import type {
	ActivityFilters,
	ActivityGroup,
	ActivityTimeFilter,
	WorkspaceEvent,
} from "../workspace-product";
import type { WorkspaceFile } from "../workspace-types";
import { DEFAULT_ACTIVITY_FILTERS, formatDateTime } from "../workspace-utils";

export function ActivityPanel({
	eventTypes,
	files,
	filters,
	groups,
	onFiltersChange,
	onSelectPath,
}: {
	eventTypes: string[];
	files: WorkspaceFile[];
	filters: ActivityFilters;
	groups: ActivityGroup[];
	onFiltersChange: (filters: ActivityFilters) => void;
	onSelectPath: (path: string) => void;
}) {
	const selectablePaths = useMemo(
		() => new Set(files.map((file) => file.path)),
		[files]
	);
	const updateFilter = useCallback(
		<Key extends keyof ActivityFilters>(
			key: Key,
			value: ActivityFilters[Key]
		) => {
			onFiltersChange({ ...filters, [key]: value });
		},
		[filters, onFiltersChange]
	);
	const handlePathChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			updateFilter("path", event.target.value);
		},
		[updateFilter]
	);
	const handleActorChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			updateFilter("actor", event.target.value);
		},
		[updateFilter]
	);
	const handleTypeChange = useCallback(
		(event: ChangeEvent<HTMLSelectElement>) => {
			updateFilter("type", event.target.value);
		},
		[updateFilter]
	);
	const handleTimeChange = useCallback(
		(event: ChangeEvent<HTMLSelectElement>) => {
			updateFilter("time", event.target.value as ActivityTimeFilter);
		},
		[updateFilter]
	);
	const clearFilters = useCallback(() => {
		onFiltersChange({ ...DEFAULT_ACTIVITY_FILTERS });
	}, [onFiltersChange]);

	return (
		<section aria-labelledby="activity-heading" className="product-panel">
			<div className="panel-heading">
				<div>
					<p className="eyebrow">Protocol events</p>
					<h3 id="activity-heading">Workspace activity</h3>
				</div>
				<Button onClick={clearFilters} type="button" variant="outline">
					Clear filters
				</Button>
			</div>
			<div className="filter-grid">
				<Label className="field-label">
					<span>Path</span>
					<Input
						className="create-input"
						onChange={handlePathChange}
						placeholder="README.md"
						value={filters.path}
					/>
				</Label>
				<Label className="field-label">
					<span>Actor</span>
					<Input
						className="create-input"
						onChange={handleActorChange}
						placeholder="agent or human"
						value={filters.actor}
					/>
				</Label>
				<Label className="field-label">
					<span>Event</span>
					<select
						className="select-input"
						onChange={handleTypeChange}
						value={filters.type}
					>
						<option value="">All event types</option>
						{eventTypes.map((eventType) => (
							<option key={eventType} value={eventType}>
								{eventType}
							</option>
						))}
					</select>
				</Label>
				<Label className="field-label">
					<span>Time</span>
					<select
						className="select-input"
						onChange={handleTimeChange}
						value={filters.time}
					>
						<option value="all">All time</option>
						<option value="hour">Last hour</option>
						<option value="day">Last day</option>
						<option value="week">Last week</option>
					</select>
				</Label>
			</div>
			<div className="activity-feed">
				{groups.length === 0 ? (
					<p className="empty-copy">No activity matches these filters.</p>
				) : (
					groups.map((group) => (
						<section className="activity-group" key={group.dateKey}>
							<h4>{group.dateKey}</h4>
							<ol>
								{group.events.map((event) => (
									<ActivityEventItem
										event={event}
										isSelectablePath={Boolean(
											event.path && selectablePaths.has(event.path)
										)}
										key={event.id}
										onSelectPath={onSelectPath}
									/>
								))}
							</ol>
						</section>
					))
				)}
			</div>
		</section>
	);
}

function ActivityEventItem({
	event,
	isSelectablePath,
	onSelectPath,
}: {
	event: WorkspaceEvent;
	isSelectablePath: boolean;
	onSelectPath: (path: string) => void;
}) {
	const selectPath = useCallback(() => {
		if (event.path) {
			onSelectPath(event.path);
		}
	}, [event.path, onSelectPath]);

	return (
		<li className="activity-event">
			<div aria-hidden="true" className="event-marker" />
			<div className="event-body">
				<div className="event-title-row">
					<strong>{event.type}</strong>
					<time dateTime={event.createdAt}>
						{formatDateTime(event.createdAt)}
					</time>
				</div>
				<div className="event-meta-row">
					<span>{event.actor ?? "unknown actor"}</span>
					<span>
						{event.version === null ? "no version" : `v${event.version}`}
					</span>
					{event.path && isSelectablePath ? (
						<Button
							className="inline-path-button"
							onClick={selectPath}
							type="button"
							variant="ghost"
						>
							{event.path}
						</Button>
					) : (
						<span>{event.path ?? "workspace"}</span>
					)}
				</div>
			</div>
		</li>
	);
}
