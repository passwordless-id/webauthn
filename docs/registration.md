Registration
============

Overview
--------

```mermaid
sequenceDiagram
  actor User as User/Authenticator
  participant Browser
  participant Server
  
  Browser->>Server: I want to register!
  Server->>Browser: Please send me a public key, <br>here is a challenge (nonce)
  Browser->>User: `webauthn.register(...)`
  User->>User: Local authentication <br> using device PIN, biometrics...
  User->>Browser: New key pair created
  Browser->>Server: Send JSON payload
  Server->>Server: Verify payload and challenge
  Server->>Server: Store credential with public key for later
  Server->>Browser: Account created
```


1️⃣ Requesting a challenge from the server
-----------------------------------------

The challenge is basically a [nonce](https://en.wikipedia.org/wiki/nonce) to avoid replay attacks.
It must be a truly random and non-deterministic byte buffer encoded as *byte64url*.

```js
import { server } from '@passwordless-id/webauthn'

const challenge = server.randomChallenge()
```

Remember the challenge on the server side during a certain amount of time and "consume" it once used.

> There are two ways to deal with remembering the challenge. Either store it in a global cache containing all challenges, or by creating a (cookie based) session directly and storing it as part of the session data.


2️⃣ Trigger the registration in browser
--------------------------------------

Example call:

```js
import { client } from '@passwordless-id/webauthn' 

const registration = await client.register({
  user: "Arnaud Dagnelies",
  challenge: "A server-side randomly generated string",
  /* possibly other options */
})
```

Besides the required `user` and `challenge`, it has following options.

| option | default | description |
|--------|---------|-------------|
| `hints` | `[]` | Which device to use as authenticator, by order of preference. Possible values: `client-device`, `security-key`, `hybrid` (delegate to smartphone).
| `userVerification` | `preferred` | Whether the user verification (using local authentication like fingerprint, PIN, etc.) is `required`, `preferred` or `discouraged`.
| `discoverable` | `preferred` | If the credential is "discoverable", it can be selected using `authenticate` without providing credential IDs. In that case, a native pop-up will appear for user selection. This may have an impact on the "passkeys" user experience and syncing behavior of the key. Possible values are `required`, `preferred` and `discouraged`.
| `timeout` | - |  How long the native authentication popup stays open before aborting the authentication process.
| `attestation` | `true` | Whether or not to provide "attestation" in the result. The attestation can be used to prove the authenticator device model's authenticity. Note that not all authenticators provide this (looking at you apple), it might be anonymized, and its verification is complex.
| `domain` | `window.location.hostname` | This can be set to a parent domain, to have the passkey valid for all subdomains.




3️⃣ Send the payload to the server
---------------------------------

> By default, the native WebAuthn protocol does not result in a serializable object. The protocol in its third iteration provided a `toJSON()` function but its support is [not widespread](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/toJSON#browser_compatibility). This library results in the same format, with the addition of a `user` property for more comfort.


The result `registration` object looks like this:

```json
{
  "user": {
    "id": "7f26f9ab-4fbc-4103-807f-ed145acb7ecc",
    "name": "Arnaud",
    "displayName": "Arnaud"
  },
  "credential": {
    "id": "3924HhJdJMy_svnUowT8eoXrOOO6NLP8SK85q2RPxdU",
    "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEgyYqQmUAmDn9J7dR5xl-HlyAA0R2XV5sgQRnSGXbLt_xCrEdD1IVvvkyTmRD16y9p3C2O4PTZ0OF_ZYD2JgTVA==",
    "algorithm": "ES256",
    "transports": ["internal", "hybrid"]
  },
  "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAAiYcFjK3EuBtuEw3lDcvpYAIN_duB4SXSTMv7L51KME_HqF6zjjujSz_EivOatkT8XVpQECAyYgASFYIIMmKkJlAJg5_Se3UecZfh5cgANEdl1ebIEEZ0hl2y7fIlgg8QqxHQ9SFb75Mk5kQ9esvadwtjuD02dDhf2WA9iYE1Q=",
  "clientData": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiYTdjNjFlZjktZGMyMy00ODA2LWI0ODYtMjQyODkzOGE1NDdlIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ=="
}
```

Then simply send this object as JSON to the server.

> The JSON payload may seem strange and complex. That's because it is mirroring the native WebAuthn API's result. That way, it is also compatible with most other WebAuthn server libraries also "consuming" this format. In other words, while you can use this library for server-side verification, other libraries should work fine too.


4️⃣ Verifying the registration on the server
-------------------------------------------

To verify it server side, call the `verifyRegistration(...)` function. While registration is basically "thrust on first use", some basic checks are necessary. The most important one is to check if it matches the expected `challenge` used when initiating the registration procedure, and if the `origin` is the expected one. 

```js
import { server } from '@passwordless-id/webauthn' 

const expected = {
    challenge: "Whatever was randomly generated by the server",
    origin: "http://localhost:8080",
}
const registrationParsed = await server.verifyRegistration(registration, expected)
```

While this is the minial verification, further verifications are possilbe.

| Verification options | Description |
|-------|-------------|
| `userVerified` | To ensure that the user has been verified by the authenticator.
| `counter` | This should be an incrementing value on each authentication, but it was made optional according to https://github.com/passwordless-id/webauthn/issues/38 since some authenticators (like Apple) do not increment it! 
| `domain` | In the case you used a specific domain (relying party id) during registration/authentication, you need this too during verification.
| `verbose` | Prints more details to the console if enabled

Either this operation fails and throws an Error, or the verification is successful and returns the parsed registration.
Example result:

```json
{
  "user": {
    "id": "7f26f9ab-4fbc-4103-807f-ed145acb7ecc",
    "name": "Arnaud",
    "displayName": "Arnaud"
  },
  "credential": {
    "id": "3924HhJdJMy_svnUowT8eoXrOOO6NLP8SK85q2RPxdU",
    "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEgyYqQmUAmDn9J7dR5xl-HlyAA0R2XV5sgQRnSGXbLt_xCrEdD1IVvvkyTmRD16y9p3C2O4PTZ0OF_ZYD2JgTVA==",
    "algorithm": "ES256",
    "transports": ["internal", "hybrid"]
  },
  "authenticator": {
    ...
    "name": "Windows Hello",
    "icon_dark": "https://webauthn.passwordless.id/authenticators/08987058-cadc-4b81-b6e1-30de50dcbe96-dark.png",
    "icon_light": "https://webauthn.passwordless.id/authenticators/08987058-cadc-4b81-b6e1-30de50dcbe96-light.png"
  },
  synced: true,
  ...
}
```

Using that call, the JSON payload is verified and parsed. 

> **NOTE:** Currently, the *attestation* that proves the exact model type of the authenticator is *not verified*. [Do I need attestation?](https://medium.com/webauthnworks/webauthn-fido2-demystifying-attestation-and-mds-efc3b3cb3651). While accepting any authenticator is the generic use case, relying parties that want to only allow specific authenticators would need another library to perform the *attestation* verification. Note that authenticators using synced passkeys, like Apple or Google, do not provide *attestation* at all.


5️⃣ Store the credential / key
-----------------------------

The credential containing the public key is the most important part. It should be stored in a database for later since it will be used to verify the authentication signature.

```json
"credential": {
  "id": "3924HhJdJMy_svnUowT8eoXrOOO6NLP8SK85q2RPxdU",
  "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEgyYqQmUAmDn9J7dR5xl-HlyAA0R2XV5sgQRnSGXbLt_xCrEdD1IVvvkyTmRD16y9p3C2O4PTZ0OF_ZYD2JgTVA==",
  "algorithm": "ES256",
  "transports": ["internal", "hybrid"]
},
```

*Please note that unlike traditional systems, you might allow a user to have multiple credential keys.
For example, if you allow the user to use multiple device-bound keys and/or registering keys for multiple platforms.*





Remarks
-------

### Register one or multiple passkeys per account?
Note that unlike traditional authentication, it is often useful for a single user account to register multiple credentials passkeys.
While it is not strictly required, it is often more convenient for users with devices using different platforms or hardware-bound authenticators like security keys.

### What's the use of `user.id`?

Replacing a credential or updating the user name.

Regarding the `user`, you can either provide a name as string, or an object like `{id: '...', name: '...', displayName: '...'}`. By default, `name` and `displayName` will be the same. The `id` should not disclose personal information as it can be exposed. Providing the ID can be used to override a credential with a new one, including an updated `name`/`username`.
