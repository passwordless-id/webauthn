Passwordless.ID / webauthn
==========================

A greatly simplified and opiniated wrapper to invoke the [webauthn protocol](https://w3c.github.io/webauthn/) more conviniently. 

Check out the demo at https://passwordless.id/playground.html

Installation/usage
------------------

NPM:

    npm install @passwordless-id/webauthn

Browser:

    <script src="https://unpkg.com/@passwordless-id/webauthn@0.0.1/dist/passwordless-id.min.js"></script>


Registration
------------

Example:

```js
passwordless.register("Arnaud", "random-server-challenge", {
  "authenticatorType": "auto",
  "userVerification": "required",
  "timeout": 60000,
  "attestation": false
})
```

Parameters:

- `username`: The desired username.
- `challenge`: A server-side randomly generated string.
- `options`: See below.

Authentication
--------------

Example:

```js
passwordless.login(["credentialIdBase64encoded"], "random-server-challenge", {
  "authenticatorType": "auto",
  "userVerification": "required",
  "timeout": 60000
})
```

Parameters:

- `credentialIds`: The list of credential IDs that can be used for signing.
- `challenge`: A server-side randomly generated string, the base64 encoded version will be signed.
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

Unlike the webauthn protocol, there are some significant differences.

First, some defaults are also different. Most notably:

- The `timeout` is one minute by default.
- If the device can act as authenticator itself, it is preffered instead of asking which authenticator type to use.
- The `userVerification` is required by default.


Then, the response is also different, as plain JSON with values encoded in **Base64**. It does not use *Base64url* that the webauthn protocol favors. This was chosen for two reasons:

- These values should never appear in URLs anyway for both privacy and security reasons, so let's not encourage/suggest it.
- Many server framework have middleware to decode base64 values out-of-the box as byte arrays while base64url frequently requires some form of pre-processing.

Please also note that swapping the encoding from *base64* to *base64url* is the matter of replacing two characters in the string.
