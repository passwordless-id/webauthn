Passwordless.ID / webauthn
==========================

A greatly simplified and opiniated wrapper to invoke the [webauthn protocol](https://w3c.github.io/webauthn/) more conviniently.

<img src="demos/img/banner-biometric-auth.svg" />

Check out the demos:

- [Basic Demo](https://webauthn.passwordless.id/demos/basic.html)
- [Minimal Example (CDN)](https://webauthn.passwordless.id/demos/example-cdn.html)
- [Minimal Example (repository)](https://webauthn.passwordless.id/demos/example-raw.html)
- [Testing Playground](https://webauthn.passwordless.id/demos/playground.html)

Installation / Usage
--------------------

NPM:

```bash
npm install @passwordless-id/webauthn
```

```js
import * as webauthn from '@passwordless-id/webauthn'
```

Browser:

```js
<script type="module">
  import * as webauthn from 'https://unpkg.com/@passwordless-id/webauthn'
</script>
```

The `webauthn` module is basically a "bundle" composed of the following modules:

- `client`: used for invoking webauthn in the browser
- `server`: used for verifying responses in the server
- `parsers`: used to parse part or all of the encoded data without verifications
- `utils`: various encoding, decoding, challenge generator and other utils

It was designed that way so that you can import only the module(s) you need. That way, the size of your final js bundle is reduced even further. Importing all is dependency free and < 10kb anyway.


Utilities
---------

```js
import { client } from '@passwordless-id/webauthn' 

client.isAvailable()
```

Returns `true` or `false` depending on whether the Webauthn protocol is available on this platform/browser.
Particularly linux and "exotic" web browsers might not have support yet.

---

```js
await client.isLocalAuthenticator()
```

This promise returns `true` or `false` depending on whether the device itself can act as authenticator. Otherwise, an "extern" authenticator like a smartphone or usb security key can be used. This information is mainly used for information messages and user guidance.



Registration
------------

### Overview

The registration process occurs in four steps:

1. The browser requests a challenge from the server
2. The browser triggers `client.register(...)` and sends the result to the server
3. The server parses and verifies the payload
4. The server stores the credential key of this device for the user account

Note that unlike traditionnal authentication, the credential key is attached to the device. Therefore, it might make sense for a single user account to have multiple credential keys.


### 1. Requesting challenge

The challenge is basically a [nonce](https://en.wikipedia.org/wiki/nonce) to avoid replay attacks.

```
const challenge = /* request it from server */
```

Remember it on the server side during a certain amount of time and "consume" it once used.

### 2. Trigger registration in browser

Example call:

```js
import { client } from '@passwordless-id/webauthn' 

const registration = client.register("Arnaud", "random-server-challenge", {
  "authenticatorType": "auto",
  "userVerification": "required",
  "timeout": 60000,
  "attestation": false,
  "debug": false
})
```

Parameters:

- `username`: The desired username.
- `challenge`: A server-side randomly generated string.
- `options`: See [below](#options).

The `registration` object looks like this:

```json
{
  "username": "Arnaud",
  "credential": {
    "id": "EfDlefdOHjBOkRLsjtTTsNXf64-4d0Zb9zO_Ivj4eLI",
    "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAER3xWhgyoePGH6iUDhr3ATVugwT6Vq9xg8HluGVHrqAJbUvWxtDlzQV0xe5l_dfzkaNkoPwzrxs_3wA8Jxr9RDA==",
    "algorithm": "ES256"
  },
  "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAAiYcFjK3EuBtuEw3lDcvpYAIBHw5Xn3Th4wTpES7I7U07DV3-uPuHdGW_czvyL4-HiypQECAyYgASFYIEd8VoYMqHjxh-olA4a9wE1boME-lavcYPB5bhlR66gCIlggW1L1sbQ5c0FdMXuZf3X85GjZKD8M68bP98APCca_UQw=",
  "clientData": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiNGU4YjFiYWMtMmJiOC00YjIzLWI5YzAtZWY1NTk5MjU5OWY0Iiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ=="
}
```

Then simply send this object as JSON to the server.

### 3. Verify it server side


```js
import { server } from '@passwordless-id/webauthn' 

const expected = {
  challenge: randomChallengeIssuedInitially
  origin: "http://localhost:8080",
}
const registrationParsed = await server.verifyRegistration(registration, expected)
```

Either this operation fails and throws an Error, or the verification is successful and returns the parsed registration.
Example result:

```json
{
  "username": "Arnaud",
  "credential": {
    "id": "EfDlefdOHjBOkRLsjtTTsNXf64-4d0Zb9zO_Ivj4eLI",
    "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAER3xWhgyoePGH6iUDhr3ATVugwT6Vq9xg8HluGVHrqAJbUvWxtDlzQV0xe5l_dfzkaNkoPwzrxs_3wA8Jxr9RDA==",
    "algorithm": "ES256"
  },
  "client": {
    "type": "webauthn.create",
    "challenge": "4e8b1bac-2bb8-4b23-b9c0-ef55992599f4",
    "origin": "http://localhost:8080",
    "crossOrigin": false
  },
  "authenticator": {
    "rpIdHash": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2M=",
    "flags": {
      "userPresent": true,
      "userVerified": true,
      "backupEligibility": false,
      "backupState": false,
      "attestedData": true,
      "extensionsIncluded": false
    },
    "counter": 0,
    "aaguid": "08987058-cadc-4b81-b6e1-30de50dcbe96",
    "name": "Windows Hello Hardware Authenticator"
  },
  "attestation": null
}
```

**NOTE:** Currently, the *attestation* which proves the exact model type of the authenticator is not verified. Do I need attestation?


Authentication
--------------

### Overview

There are two kinds of authentications possible:

- by providing a list of allowed credential IDs
- by letting the platform offer a default UI to select the user and its credential

Both have their pros & cons (TODO: article).

The authentication procedure is similar to the procedure and divided in four steps.

1. Request a challenge and possibly a list of allowed credential IDs
2. Authenticate by 

### Browser side

Example call:

```js
import { client } from 'webauthn'

client.authenticate(["credentialIdBase64encoded"], "random-server-challenge", {
  "authenticatorType": "auto",
  "userVerification": "required",
  "timeout": 60000
})
```

Example response:

```json
{
  "credentialId": "tIbwHucpNqA5KXeb_7_fXHAZYm5yPiYK1KrTgbie3ZQ",
  "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAQ==",
  "clientData": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiTnpGbVlUY3dORGN0TUdVeVpTMDBabVZqTFdFMU5HUXRNR1JpTkdVNU5HUmxObVUxIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ==",
  "signature": "aoOiX2zxBCvEzebefHZY8GNudCeERuyly4TiSE5eUDyw3iPOnPBFoj0WniN3nuKwhIw8gmPnGhPTArI0apYxoX2mJQaHtAhMS-AxkTKHR63ysArR0Cpd9XMeJicuOGuY5c_zo_hMq91qioI-Ksr0SUTAMS_lWH2Tebe29iKwcT10l0L7ccueKW3G7U5yYxZq3InAuPA5_aJXHeX2neAvng3CFba8we0eQsD5JKh2otAK6Kgy-nT2EHIsBDtXtACn3Q6GfjFWSaeWPa9vngXKuKbLsnpCQjYvlwHt4PrnkvC5WBzGhEoBCF1L9NcxZbRDw_ksWJFYvJcMNcq9DYhxVg=="
}
```

Parameters:

- `credentialIds`: The list of credential IDs that can be used for signing.
- `challenge`: A server-side randomly generated string, the base64url encoded version will be signed.
- `options`: See [below](#options).

### Server side

Parsing
-------

If you want to parse the encoded registration or authentication without verifying it, it is possible using the `parsers` module.

```js
import { parsers } from 'webauthn'


```

Options
-------

- `timeout`: Number of milliseconds the user has to respond to the biometric/PIN check. *(Default: 60000)*
- `userVerification`: Whether to prompt for biometric/PIN check or not. *(Default: "required")*
- `authenticatorType`: Which device to use as authenticator. Possible values:
    - `'auto'`: if the local device can be used as authenticator it will be preferred. Otherwise it will prompt for an external device. *(Default)*
    - `'local'`: use the local device (using TouchID, FaceID, Windows Hello or PIN)
    - `'extern'`: use an external device (security key or connected phone)
    - `'both'`: prompt the user to choose between local or external device. The UI and user interaction in this case is platform specific.
- `attestation`: (Only for registration) If enabled, the device attestation and clientData will be provided as base64 encoded binary data. Note that this is not available on some platforms. *(Default: false)*
- `debug`: If enabled, parses the "data" objects and provide it in a "debug" properties.



Parsing data
------------

**`clientData`**
```js
webauthn.parseAuthenticator('eyJ0eXBlIjoid2...')
```

```json
{
  "type": "webauthn.create",
  "challenge": "MzIwZDAzMzQtNDhjNy00N2NhLTgzNjktOTM5NDc0Yzg1Zjdi",
  "origin": "http://localhost:8080",
  "crossOrigin": false
}
```



**`authenticatorData`**

```js
webauthn.parseAuthenticator('SZYN5YgOjGh0NB...')
```

```json
{
  "rpIdHash": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2M=",
  "flags": {
    "userPresent": true,
    "userVerified": true,
    "backupEligibility": false,
    "backupState": false,
    "attestedData": true,
    "extensionsIncluded": false
  },
  "counter": 0,
  "aaguid": "08987058-cadc-4b81-b6e1-30de50dcbe96",
  "name": "Windows Hello Hardware Authenticator"
}
```

Please note that `aaguid` and `name` are only available during registration.



Notes
-----

Unlike the [webauthn protocol](), some defaults are different:

- The `timeout` is one minute by default.
- If the device can act as authenticator itself, it is preferred instead of asking which authenticator type to use.
- The `userVerification` is required by default.

