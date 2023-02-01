import { PrismaClient } from "@prisma/client";
import prisma from "../src/index.js";
import { convertSession } from "../src/utils.js";
import { KeySchema, LuciaError } from "lucia-auth";
import type { LuciaQueryHandler } from "@lucia-auth/adapter-test";

const client = new PrismaClient();
export const adapter = prisma(client)(LuciaError);

export const db: LuciaQueryHandler = {
	user: {
		get: async () => {
			return await client.user.findMany();
		},
		insert: async (user) => {
			await client.user.create({
				data: user
			});
		},
		clear: async () => {
			await client.user.deleteMany();
		}
	},
	session: {
		get: async () => {
			const sessions = await client.session.findMany();
			return sessions.map((session) => convertSession(session));
		},
		insert: async (session) => {
			await client.session.create({
				data: session
			});
		},
		clear: async () => {
			await client.session.deleteMany();
		}
	},
	key: {
		get: async () => {
			return (await client.key.findMany()) as unknown as KeySchema[];
		},
		insert: async (key) => {
			await client.key.create({
				data: key
			});
		},
		clear: async () => {
			await client.key.deleteMany();
		}
	}
};
