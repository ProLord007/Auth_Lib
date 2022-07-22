Lucia is a simple, JWT based authentication library for SvelteKit that connects your SvelteKit app with your database. It handles the bulk of the authentication process, like creating and validating tokens, but only just enough that you can build on top of it to fit your use case. That said, it isn't _just_ a JWT authentication library. It uses short-lived tokens, implements rotating refresh tokens, and automatically refreshes tokens for you. It's main aim is to simplify the development process while not being a pain in the ass to customize!

It's important to note that this __isn't__ an out-of-the-box authentication library. It does not validate the user's input, it does not provide UI elements, and it does not provide a OAuth authentication (though it's simple to implement). These are out of the scope of this library and is left up to you. What it does provide is a set of tools for handling authentication, like `createUser` which saves the user in the database and generate a set of tokens.

```js
auth.createUser("email", "user@example.com", { password: "123456" });
```

> This library requires a database to work. If you need a free option, check out [Supabase](https://supabase.com), which Lucia supports out of the box.
