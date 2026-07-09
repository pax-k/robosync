import { cp, rm } from "node:fs/promises";

export const copyHa2haWorkspaceFixture = async ({
	from,
	to,
}: {
	from: string;
	to: string;
}) => {
	await rm(to, { force: true, recursive: true });
	await cp(from, to, { recursive: true });
};
