import type { User } from '$lib/stores/user-data';

declare global {
    namespace App {
        interface Locals {
            userSession: User;
            turnstileVerified?: boolean;
        }
        interface PageData {
            userSession: User;
            turnstileVerified?: boolean;
        }
    }
}

export { };
