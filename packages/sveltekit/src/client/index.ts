import { get, type Readable, readable } from "svelte/store";
import { onDestroy } from "svelte";
import type { GlobalWindow, LuciaContext, PageData } from "../types.js";
import { ClientUser, getClientUser, getServerUser } from "./user.js";
import { getInitialClientLuciaContext } from "./page-data.js";

export const signOut = async (): Promise<void> => {
	await fetch("/api/auth/logout", {
		method: "POST"
	});
	const globalWindow = window as GlobalWindow;
	if (!globalWindow._setLuciaStore) return;
	globalWindow._setLuciaStore({
		user: null,
		sessionChecksum: null
	});
};

export const getUser = (): Readable<ClientUser> => {
	if (typeof window === "undefined") {
		return getServerUser();
	}
	return getClientUser();
};

const generateId = (): string => {
	const generateRandomNumber = (): number => {
		const randomNumber = Math.random();
		if (randomNumber !== 0) return randomNumber;
		return generateRandomNumber();
	};
	return generateRandomNumber().toString(36).slice(2, 7);
};

export const handleSession = (
	pageStore: Readable<{
		data: PageData;
	}>,
	onSessionUpdate: (user: ClientUser) => void = () => {}
) => {
	if (typeof window === "undefined") return;
	const broadcastChannel = new BroadcastChannel("__lucia__");
	const tabId = generateId();
	const initialPageStoreValue = get(pageStore);
	const initialLuciaContext = initialPageStoreValue.data._lucia;
	if (!initialLuciaContext) throw new Error("pageData._lucia is undefined");
	const globalWindow = window as GlobalWindow;
	globalWindow._luciaHooksRanLast = false;
	let pageStoreUnsubscribe = () => {},
		userStoreUnsubscribe = () => {};
	let initialLuciaStoreSubscription = true;
	onDestroy(() => {
		broadcastChannel.close();
		pageStoreUnsubscribe();
		userStoreUnsubscribe();
	});
	globalWindow._luciaStore = readable<LuciaContext>(initialLuciaContext, (set) => {
		globalWindow._setLuciaStore = set;
	});
	if (!globalWindow._luciaStore) throw new Error("_luciaStore is undefined");
	userStoreUnsubscribe = globalWindow._luciaStore.subscribe((newContext) => {
		if (initialLuciaStoreSubscription) return (initialLuciaStoreSubscription = false);
		broadcastChannel.postMessage({
			tabId: tabId,
			...newContext
		});
	});
	let previousPageStoreSessionChecksum: string | null = initialLuciaContext.sessionChecksum;
	pageStoreUnsubscribe = pageStore.subscribe((pageStoreValue) => {
		/*
		this will be called on potential session change 
		there is no guarantee that the session has changed
		*/
		const newLuciaContext = pageStoreValue.data?._lucia;
		if (!newLuciaContext) throw new Error("pageData._lucia is undefined");
		if (!globalWindow._setLuciaStore) throw new Error("_setLuciaStore() is undefined");
		if (!globalWindow._luciaStore) throw new Error("_luciaStore is undefined");
		if (previousPageStoreSessionChecksum === newLuciaContext.sessionChecksum) return;
		const currentLuciaContext = get(globalWindow._luciaStore);
		previousPageStoreSessionChecksum = newLuciaContext.sessionChecksum;
		if (newLuciaContext.sessionChecksum === currentLuciaContext.sessionChecksum) return;
		globalWindow._setLuciaStore(newLuciaContext);
	});
	broadcastChannel.addEventListener("message", ({ data }) => {
		const messageData = data as {
			tabId: string;
		} & LuciaContext;
		if (messageData.tabId === tabId) return; // message is coming from the same tab
		onSessionUpdate(messageData.user);
	});
};
