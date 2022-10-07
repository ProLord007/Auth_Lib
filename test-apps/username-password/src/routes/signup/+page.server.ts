import { auth } from '$lib/server/lucia';
import { invalid, redirect, type Actions } from '@sveltejs/kit';
import { setCookie } from 'lucia-sveltekit';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const username = form.get('username');
		const password = form.get('password');
		if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
			return invalid(400, {
				message: 'Invalid input'
			});
		}
		try {
			const user = await auth.createUser('username', username, {
				password,
				userData: {
					username
				}
			});
			const { tokens } = await auth.createSession(user.userId);
			setCookie(cookies, ...tokens.cookies);
		} catch (e) {
			const error = e as Error;
			if (
				error.message === 'AUTH_DUPLICATE_IDENTIFIER_TOKEN' ||
				error.message === 'AUTH_DUPLICATE_USER_DATA'
			) {
				return invalid(400, {
					message: 'Username unavailable'
				});
			}
			console.error(error);
			return invalid(500, {
				message: 'Unknown error occurred'
			});
		}
		throw redirect(302, '/login');
	}
};
