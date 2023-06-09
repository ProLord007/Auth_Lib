import type { Mongoose } from "mongoose";
import {
	transformKeyDoc,
	transformSessionDoc,
	transformUserDoc
} from "./utils.js";
import type { Adapter, AdapterFunction } from "lucia-auth";
import type { UserDoc, SessionDoc, KeyDoc } from "./docs.js";

const createMongoValues = (object: Record<any, any>) => {
	return Object.fromEntries(
		Object.entries(object).map(([key, value]) => {
			if (key === "id") return ["_id", value];
			return [key, value];
		})
	);
};

const DEFAULT_PROJECTION = {
	$__: 0,
	__v: 0,
	_doc: 0
};

const adapter = (mongoose: Mongoose): AdapterFunction<Adapter> => {
	const User = mongoose.model<UserDoc>("auth_user");
	const Session = mongoose.model<SessionDoc>("auth_session");
	const Key = mongoose.model<KeyDoc>("auth_key");
	return (LuciaError) => {
		return {
			getUser: async (userId: string) => {
				const userDoc = await User.findById(userId, DEFAULT_PROJECTION).lean();
				if (!userDoc) return null;
				return transformUserDoc(userDoc);
			},
			getSessionAndUserBySessionId: async (sessionId) => {
				const session = await Session.findById(
					sessionId,
					DEFAULT_PROJECTION
				).lean();
				if (!session) return null;
				const user = await User.findById(
					session.user_id,
					DEFAULT_PROJECTION
				).lean();
				if (!user) return null;
				return {
					user: transformUserDoc(user),
					session: transformSessionDoc(session)
				};
			},
			getSession: async (sessionId) => {
				const session = await Session.findById(
					sessionId,
					DEFAULT_PROJECTION
				).lean();
				if (!session) return null;
				return transformSessionDoc(session);
			},
			getSessionsByUserId: async (userId) => {
				const sessions = await Session.find(
					{
						user_id: userId
					},
					DEFAULT_PROJECTION
				).lean();
				return sessions.map((val) => transformSessionDoc(val));
			},
			setUser: async (userId, userAttributes, key) => {
				if (key) {
					const refKeyDoc = await Key.findById(key.id, DEFAULT_PROJECTION);
					if (refKeyDoc) throw new LuciaError("AUTH_DUPLICATE_KEY_ID");
				}
				const userDoc = new User(
					createMongoValues({
						id: userId,
						...userAttributes
					})
				);
				await userDoc.save();
				try {
					if (key) {
						const keyDoc = new Key(createMongoValues(key));
						await keyDoc.save();
					}
					return transformUserDoc(userDoc.toObject());
				} catch (error) {
					await Key.findByIdAndDelete(userId);
					if (
						error instanceof Error &&
						error.message.includes("E11000") &&
						error.message.includes("id")
					) {
						throw new LuciaError("AUTH_DUPLICATE_KEY_ID");
					}
					throw error;
				}
			},
			deleteUser: async (userId: string) => {
				await User.findOneAndDelete({
					_id: userId
				});
			},
			setSession: async (session) => {
				const userDoc = await User.findById(
					session.user_id,
					DEFAULT_PROJECTION
				).lean();
				if (!userDoc) throw new LuciaError("AUTH_INVALID_USER_ID");
				try {
					const sessionDoc = new Session(createMongoValues(session));
					await Session.create(sessionDoc);
				} catch (error) {
					if (
						error instanceof Error &&
						error.message.includes("E11000") &&
						error.message.includes("id")
					)
						throw new LuciaError("AUTH_DUPLICATE_SESSION_ID");
					throw error;
				}
			},
			deleteSession: async (sessionId) => {
				await Session.findByIdAndDelete(sessionId);
			},
			deleteSessionsByUserId: async (userId) => {
				await Session.deleteMany({
					user_id: userId
				});
			},
			updateUserAttributes: async (userId, attributes) => {
				const userDoc = await User.findByIdAndUpdate(userId, attributes, {
					new: true,
					projection: DEFAULT_PROJECTION
				}).lean();
				if (!userDoc) throw new LuciaError("AUTH_INVALID_USER_ID");
				return transformUserDoc(userDoc);
			},
			getKey: async (keyId) => {
				const keyDoc = await Key.findById(keyId, DEFAULT_PROJECTION).lean();
				if (!keyDoc) return null;
				const transformedKeyData = transformKeyDoc(keyDoc);
				return transformedKeyData;
			},
			setKey: async (key) => {
				const userDoc = await User.findById(key.user_id, DEFAULT_PROJECTION);
				if (!userDoc) throw new LuciaError("AUTH_INVALID_USER_ID");
				try {
					const keyDoc = new Key(createMongoValues(key));
					await Key.create(keyDoc);
				} catch (error) {
					if (
						error instanceof Error &&
						error.message.includes("E11000") &&
						error.message.includes("id")
					)
						throw new LuciaError("AUTH_DUPLICATE_KEY_ID");
					throw error;
				}
			},
			getKeysByUserId: async (userId) => {
				const keyDocs = await Key.find(
					{
						user_id: userId
					},
					DEFAULT_PROJECTION
				).lean();
				return keyDocs.map((val) => transformKeyDoc(val));
			},
			updateKeyPassword: async (key, hashedPassword) => {
				const keyDoc = await Key.findByIdAndUpdate(
					key,
					{
						hashed_password: hashedPassword
					},
					{
						new: true,
						projection: DEFAULT_PROJECTION
					}
				).lean();
				if (!keyDoc) throw new LuciaError("AUTH_INVALID_KEY_ID");
				return transformKeyDoc(keyDoc);
			},
			deleteKeysByUserId: async (userId) => {
				await Key.deleteMany({
					user_id: userId
				});
			},
			deleteNonPrimaryKey: async (keyId) => {
				await Key.deleteOne({
					_id: keyId,
					primary_key: false
				});
			}
		};
	};
};

export default adapter;
