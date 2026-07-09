import { z } from "zod";

export const workspaceReadAccessSchema = z.enum(["public", "token"]);

export const workspaceWriteAccessSchema = z.enum(["none", "public", "token"]);

export const workspaceActorSchema = z.string().trim().min(1).max(120);

export const workspaceJsonObjectSchema = z.record(z.string(), z.unknown());

export const workspaceTimestampSchema = z.string().trim().min(1);
