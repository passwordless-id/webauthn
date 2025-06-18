@passwordless-id/webauthn
=========================

[![NPM Version](https://img.shields.io/npm/v/%40passwordless-id%2Fwebauthn)](https://www.npmjs.com/package/@passwordless-id/webauthn)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@passwordless-id/webauthn)](https://bundlephobia.com/package/@passwordless-id/webauthn)
[![NPM Downloads](https://img.shields.io/npm/dm/%40passwordless-id%2Fwebauthn)](https://www.npmjs.com/package/@passwordless-id/webauthn)
[![GitHub Repo stars](https://img.shields.io/github/stars/passwordless-id/webauthn)](https://github.com/passwordless-id/webauthn)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/passwordless-id?style=social&logo=githubsponsors)](https://github.com/sponsors/passwordless-id)


![banner](docs/img/banner-biometric-auth.svg)


> This library greatly simplifies the usage of **passkeys** by invoking the [WebAuthn protocol](https://w3c.github.io/webauthn/) more conveniently. It is [open source](https://github.com/passwordless-id/webauthn), opinionated, dependency-free and minimalistic.
>
> This library is provided by [Passwordless.ID](https://passwordless.id), a free public identity provider.


👀 Demos
---------

- [Basic Demo](https://webauthn.passwordless.id/demos/basic.html)
- [Passkeys autocomplete](https://webauthn.passwordless.id/demos/conditional-ui.html)
- [Testing Playground](https://webauthn.passwordless.id/demos/playground.html)
- [Authenticators list](https://webauthn.passwordless.id/demos/authenticators.html)
- [Docs](https://webauthn.passwordless.id)
  
These demos are plain HTML/JS, not minimized. Just open the sources in your browser if you are curious.



📦 Installation
----------------

### Modules (recommended)

```bash
npm install @passwordless-id/webauthn
```

The base package contains both client and server side modules. You can import the `client` submodule or the `server` depending on your needs.

```js
import {client} from '@passwordless-id/webauthn'
import {server} from '@passwordless-id/webauthn'
```

*Note: the brackets in the import are important!*

### Alternatives

For **browsers**, it can be imported using a CDN link in the page, or even inside the script itself.

```html
<script type="module">
  import { client } from 'https://cdn.jsdelivr.net/npm/@passwordless-id/webauthn';
</script>
```

Lastly, a **CommonJS** variant is also available for old Node stacks, to be imported using `require('@passwordless-id/webauthn')`. It's usage is discouraged though, in favor of the default ES modules.

Note that at least NodeJS **19+** is necessary. (The reason is that previous Node versions had no `WebCrypto` being globally available, making it impossible to have a "universal build")


🚀 Getting started
-------------------

There are multiple ways to use and invoke the WebAuthn protocol.
What follows is just an example of the most straightforward use case. 

### Registration

```
import {client} from '@passwordless-id/webauthn'
await client.register({
  challenge: 'a random base64url encoded buffer from the server',
  user: 'John Doe'
})
```

By default, this registers a passkey on any authenticator (local or roaming) with `preferred` user verification. For further options, see [&rarr; Registration docs](https://webauthn.passwordless.id/registration/)


### Authentication

```
import {client} from '@passwordless-id/webauthn'
await client.authenticate({
  challenge: 'a random base64url encoded buffer from the server'
})
```

By default, this triggers the native passkey selection dialog, for any authenticator (local or roaming) and with  `preferred` user verification. For further options, see [&rarr; Authentication docs](https://webauthn.passwordless.id/authentication/)


### Verification

```
import {server} from '@passwordless-id/webauthn'
await server.verifyRegistration(registration, expected)
await server.verifyAuthentication(authentication, expected)
```

[&rarr; Verification docs](https://webauthn.passwordless.id/verification/)

<!--

🛠️ A tool vs a solution
------------------------

This library is a tool to implement passkeys for your website. Whether it is the main mechanism or to improve an existing authentication system, it is flexible enough to do both. However, you may also need to...

- Register multiple authenticators per account
- Verify e-mail address upon registration
- Have account recovery mechanisms
- Detect suspicious activity
- Upload a user portrait
- Manage the user profile
- ...and so on

Basically, this library is just a tool to realize something bigger. If you just want to "register" and "authenticate" users without dealing with the intricacies, a "solution" like [Passwordless.ID](https://passwordless.id) would be more suited. It's free and (soon) open source too, so there is no need for you to re-invent the wheel.

-->

📃 Changelog
-------------

The version 2 introduced breaking changes, different default behavior and different intermediate format. Basically, it's a complete overhaul and to understand "why" this version 2 was made, I recommend reading this [blog post](https://blog.passwordless.id/passkeys-webauthn-library-v20-is-there#heading-why-a-version-2). In a very summarized way, it is to enhance support for security keys by default, reflect latest changes in the underlying specs and improve cross-compatibility with other server side libraries.

Some core changes are:

- Use platform authenticator by default => authenticator selection pops up by default
- `authenticatorType` was removed => use `hints` instead
- User verification default: `required` => `preferred`
- Timeout: 1 minute => no timeout
- Response format changed
- Transports as part of `allowCredentials`

The docs for the legacy version 1.x are found [here](https://webauthn.passwordless.id/version-1)
