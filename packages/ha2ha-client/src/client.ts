import {
	addEvidence,
	claimTask,
	recordDecision,
	writeHandoff,
} from "./commands";
import { err } from "./shared";
import type {
	CreateHa2haClientOptions,
	Ha2haClient,
	Ha2haResult,
	Ha2haWriteResult,
	TransportWriteInput,
} from "./types";

export const createHa2haClient = ({
	actor,
	clock = () => new Date(),
	transport,
}: CreateHa2haClientOptions): Ha2haClient => {
	const writeFileWithActor = (
		input: Omit<TransportWriteInput, "actor">
	): Promise<Ha2haResult<Ha2haWriteResult>> =>
		transport.writeFile({ ...input, actor });

	return {
		addEvidence: (input) =>
			addEvidence({ actor, clock, input, transport, writeFileWithActor }),
		claimTask: (input) =>
			claimTask({ actor, input, transport, writeFileWithActor }),
		deleteFile: (input) => transport.deleteFile({ ...input, actor }),
		listWorkspace: () => transport.listWorkspace(),
		readFile: (filePath) => transport.readFile(filePath),
		recordDecision: (input) =>
			recordDecision({ clock, input, writeFileWithActor }),
		validateWorkspace: () =>
			transport.validateWorkspace?.() ??
			Promise.resolve(
				err(
					"unsupported_operation",
					"This transport cannot validate a workspace."
				)
			),
		writeFile: writeFileWithActor,
		writeHandoff: (input) => writeHandoff({ clock, input, writeFileWithActor }),
	};
};
