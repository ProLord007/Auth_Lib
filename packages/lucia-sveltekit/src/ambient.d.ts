declare namespace Lucia {
    export type UserAttributesSchema = {};
    export class Auth extends (await import("./auth/index.js")).Auth {}
}

/// <reference types="@sveltejs/kit" />
declare namespace App {
    export interface Locals {
        getSession: () => import("./types.js").Session | null;
    }
}
