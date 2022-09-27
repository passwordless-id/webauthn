Passwordless.ID / webauthn
==========================

A greatly simplified and opiniated wrapper to invoke the [webauthn protocol](https://w3c.github.io/webauthn/) more conviniently. 

Check out the demo at https://passwordless.id/playground.html

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
  import * as webauthn from 'https://unpkg.com/@passwordless-id/webauthn@latest/dist/passwordless.min.js'
</script>
```



Registration
------------

Example call:

```js
webauthn.register("Arnaud", "random-server-challenge", {
  "authenticatorType": "auto",
  "userVerification": "required",
  "timeout": 60000,
  "attestation": false
})
```

Example response:

```json
{
  "username": "Arnaud",
  "challenge": "random-server-challenge",
  "credential": {
    "id": "RufE-HKYK2...",
    "publicKey": "MIIBIjANBg...",
    "algorithm": "RS256"
  },
  "authenticator": {
    "isLocal": true,
    "aaguid": "08987058-cadc-4b81-b6e1-30de50dcbe96",
    "name": "Windows Hello Hardware Authenticator",
    "attestation": "o2NmbXRjdH...",
    "clientData": "eyJ0eXBlIj..."
  }
}
```

Parameters:

- `username`: The desired username.
- `challenge`: A server-side randomly generated string.
- `options`: See below.



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
  "credentialId": "c8VC7q_TY0NvKIhcS_rafPLEvdw8GwePABH81QRNt4Y",
  "userHash": "awopRTWFXAQrBPRAbEPFg3WUd4forBvMho7Ie4sxabE=",
  "clientJson": {
    "type": "webauthn.get",
    "challenge": "ZTEyNGE0ZTAtNjg4NS00YzhlLWFhODktNTZkMjJhZDUxNGYz",
    "origin": "http://localhost:8080",
    "crossOrigin": false
  },
  "clientData": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiWlRFeU5HRTBaVEF0TmpnNE5TMDBZemhsTFdGaE9Ea3ROVFprTWpKaFpEVXhOR1l6Iiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ==",
  "signature": "J8PbSE9ZgC2JME9r2SYGY7WMDUKVDFby8WPXxSpXYfLpmfjimGed8oEqvUtD4UhvshjKV9FOlS0Dc8N8ILvIDL77gmUPeY6oZbTqrw9+2NgeXONM9hNDnxIjOUxekC8a3LY1HFq7aWy4v9I/gu1vD5NGSouvlzxJXPHcC30Bxu70EMcTwtz3EnRmQ3UGuZXjYO2xd2l2BsUgyI87c/wpquaCThrOPEf1PlzS4Larv5lE/Lfh4gQ2O/1TvmBcjtT/oSFkkb6hAgJp51/QbrUbnzdAtTtbGnSTOukM/HZ6yFY5i4oy3l+cJbwAGxEqFUU7yAdPrmTJdLeLmzimve58RA==",
  "authenticatorJson": {
    "rpIdHash": "SZYN5YgOjGh0NBcPZHZgW4/krrmihjLHmVzzuoMdl2M=",
    "flags": {
      "userPresent": true,
      "userVerified": true,
      "backupEligibility": false,
      "backupState": false,
      "attestedData": false,
      "extensionsIncluded": false
    },
    "counter": 1
  },
  "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4/krrmihjLHmVzzuoMdl2MFAAAAAQ=="
}
```

Parameters:

- `credentialIds`: The list of credential IDs that can be used for signing.
- `challenge`: A server-side randomly generated string, the base64url encoded version will be signed.
- `options`: See below

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

Notes
-----

Unlike the [webauthn protocol](), there are some significant differences.

First, some defaults are different:

- The `timeout` is one minute by default.
- If the device can act as authenticator itself, it is preffered instead of asking which authenticator type to use.
- The `userVerification` is required by default.


Then, the response is also different, as plain JSON with values encoded in **Base64**. It does not use *Base64url* that the webauthn protocol favors. This was chosen for two reasons:

- These values should never appear in URLs anyway for both privacy and security reasons, so let's not encourage/suggest it.
- Many server framework have middleware to decode base64 values out-of-the box as byte arrays while base64url frequently requires some form of pre-processing.

Please also note that swapping the encoding from *base64* to *base64url* is the matter of replacing two characters in the string.
