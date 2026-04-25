export type TimelineEventBlock = {
	id: string;
	title: string;
	startIso: string;
	endIso: string;
	isAllDay: boolean;
	location: string | null;
	link: string | null;
};

export type DayTimeline = {
	dayIso: string;
	events: TimelineEventBlock[];
};
