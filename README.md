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
  import * as webauthn from 'https://unpkg.com/@passwordless-id/webauthn@latest/dist/webauthn.min.js'
</script>
```



Utilities
---------

```js
webauthn.isAvailable()
```

Returns `true` or `false` depending on whether the Webauthn protocol is available on this platform/browser.

```js
await webauthn.isLocalAuthenticator()
```

This promise returns `true` or `false` depending on whether the device itself can act as authenticator. Otherwise, an "extern" authenticator like a smartphone or usb security key can be used. This information is mainly used for information messages and user guidance.



Registration
------------

Example call:

```js
webauthn.register("Arnaud", "random-server-challenge", {
  "authenticatorType": "auto",
  "userVerification": "required",
  "timeout": 60000,
  "attestation": false,
  "debug": false
})
```

Example response:

```json
{
  "username": "Arnaud",
  "credential": {
    "id": "tIbwHucpNqA5KXeb_7_fXHAZYm5yPiYK1KrTgbie3ZQ",
    "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApVXqTTd7edPEN5E71jta6iE8LlOWDySooLC3qRg31SAJc_FYceD7q_PNVh9UPuedr2OX5DP1GzCP262vp8rJuCqLtR7xPle7iu_rdmQHxPketGtx2O8XkAqwNRO74sNU0J2VJ0Cq3cCPpk53FUZczyhP-gJaOogZh_w05BJtnpM8FtLBFcdWlimveRtZ1QQZhX-bd92mmwA9bFWkbauEdklrg3TdJFmBPyj_6ybqs3ocHqxH4hAsdVFvjp77x0O4oqcupkcKUPfXO3GyNEoMlrVo30oj34r_6ny4F_PeZESyDWCG3i4MR3OrKi8zfCqxjBRtMOdcWKDq2FDEDG4PVQIDAQAB",
    "algorithm": "RS256"
  },
  "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAAiYcFjK3EuBtuEw3lDcvpYAILSG8B7nKTagOSl3m_-_31xwGWJucj4mCtSq04G4nt2UpAEDAzkBACBZAQClVepNN3t508Q3kTvWO1rqITwuU5YPJKigsLepGDfVIAlz8Vhx4Pur881WH1Q-552vY5fkM_UbMI_bra-nysm4Kou1HvE-V7uK7-t2ZAfE-R60a3HY7xeQCrA1E7viw1TQnZUnQKrdwI-mTncVRlzPKE_6Alo6iBmH_DTkEm2ekzwW0sEVx1aWKa95G1nVBBmFf5t33aabAD1sVaRtq4R2SWuDdN0kWYE_KP_rJuqzehwerEfiECx1UW-OnvvHQ7iipy6mRwpQ99c7cbI0SgyWtWjfSiPfiv_qfLgX895kRLINYIbeLgxHc6sqLzN8KrGMFG0w51xYoOrYUMQMbg9VIUMBAAE=",
  "clientData": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiTXpJd1pEQXpNelF0TkRoak55MDBOMk5oTFRnek5qa3RPVE01TkRjMFl6ZzFaamRpIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ==",
  "attestationData": null
}
```

Parameters:

- `username`: The desired username.
- `challenge`: A server-side randomly generated string.
- `options`: See [below](#options).



Authentication
--------------

Example call:

```js
webauthn.login(["credentialIdBase64encoded"], "random-server-challenge", {
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
- If the device can act as authenticator itself, it is preffered instead of asking which authenticator type to use.
- The `userVerification` is required by default.

