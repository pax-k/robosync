import { protectedProcedure, publicProcedure, router } from "../index";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	me: protectedProcedure.query(({ ctx }) => ({
		user: ctx.session.user,
	})),
});
export type AppRouter = typeof appRouter;
