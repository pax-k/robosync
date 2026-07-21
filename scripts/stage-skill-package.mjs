#!/usr/bin/env node
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	".."
);
const PACKAGE_DIRECTORIES = new Map([
	["ha2ha", "ha2ha-skills"],
	["mdsync", "mdsync-skills"],
]);

const [skillName, operation = "stage"] = process.argv.slice(2);
const packageDirectory = PACKAGE_DIRECTORIES.get(skillName);

if (!packageDirectory) {
	throw new Error(`Unsupported skill package: ${skillName ?? "<missing>"}.`);
}
if (operation !== "stage" && operation !== "clean") {
	throw new Error(`Unsupported skill package operation: ${operation}.`);
}

const sourceDirectory = path.join(ROOT_DIR, "skills", skillName);
const packageSkillsDirectory = path.join(
	ROOT_DIR,
	"packages",
	packageDirectory,
	"skills"
);
const destinationDirectory = path.join(packageSkillsDirectory, skillName);

await rm(destinationDirectory, { force: true, recursive: true });

if (operation === "stage") {
	await mkdir(packageSkillsDirectory, { recursive: true });
	await cp(sourceDirectory, destinationDirectory, { recursive: true });
}
