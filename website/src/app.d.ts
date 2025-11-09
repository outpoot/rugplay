import type { User } from '$lib/stores/user-data';

declare global {
	namespace App {
		interface Locals {
			userSession: User;
		}
		interface PageData {
			userSession: User;
		}
	}
}

export {};
