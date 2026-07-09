/// <reference types="@cloudflare/workers-types" />
/// <reference path="../env.d.ts" />

import { env as cloudflareEnv } from "cloudflare:workers";
import type { MdsyncWorkerBindings } from "./bindings";

export const env = cloudflareEnv as MdsyncWorkerBindings;
