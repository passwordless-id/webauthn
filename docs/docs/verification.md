Verification
============

Registration
------------

### The received JSON

The received `registration` JSON payload looks like this.

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
    "algorithm": "ES256"
  },
  "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAAiYcFjK3EuBtuEw3lDcvpYAIN_duB4SXSTMv7L51KME_HqF6zjjujSz_EivOatkT8XVpQECAyYgASFYIIMmKkJlAJg5_Se3UecZfh5cgANEdl1ebIEEZ0hl2y7fIlgg8QqxHQ9SFb75Mk5kQ9esvadwtjuD02dDhf2WA9iYE1Q=",
  "clientData": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiYTdjNjFlZjktZGMyMy00ODA2LWI0ODYtMjQyODkzOGE1NDdlIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ=="
}
```

Both the `clientData` and `authenticatorData` are submitted as raw encoded values because a hash based on those must be verified during the procedure.

### Verify and parse the payload

To verify it server side, call the `verifyRegistration(...)` function. While registration is basically "thrust on first use", some basic checks are necessary. The most important one is to check if it matches the expected `challenge` used when initiating the registration procedure, and if the `origin` is the expected one. 

```js
import { server } from '@passwordless-id/webauthn' 

const expected = {
    challenge: "Whatever was randomly generated by the server",
    origin: "http://localhost:8080",
}
const registrationParsed = await server.verifyRegistration(registration, expected)
```

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
    "synced": true
  },
  "authenticator": {
    ...
    "name": "Windows Hello",
    "icon_dark": "https://webauthn.passwordless.id/authenticators/08987058-cadc-4b81-b6e1-30de50dcbe96-dark.png",
    "icon_light": "https://webauthn.passwordless.id/authenticators/08987058-cadc-4b81-b6e1-30de50dcbe96-light.png"
  },
  ...
}
```

Note that the credential now has a `synced` variable added. This information was extracted from authenticator bit flags and indicates if the corresponding *private key* is a "multi-device" key, typically synced in the cloud, or a "device-bound" key, typically stored on a dedicated hardware chip.

> **NOTE:** Currently, the *attestation* which proves the exact model type of the authenticator is *not verified*. [Do I need attestation?](https://medium.com/webauthnworks/webauthn-fido2-demystifying-attestation-and-mds-efc3b3cb3651)

### Store the credential / key

The credential containing the public key is the most important part. It should be stored in a database for later since it will be used to verify the authentication signature.

```json
"credential": {
  "id": "3924HhJdJMy_svnUowT8eoXrOOO6NLP8SK85q2RPxdU",
  "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEgyYqQmUAmDn9J7dR5xl-HlyAA0R2XV5sgQRnSGXbLt_xCrEdD1IVvvkyTmRD16y9p3C2O4PTZ0OF_ZYD2JgTVA==",
  "algorithm": "ES256",
  "synced": true
},
```

*Please note that unlike traditional systems, you might allow a user to have multiple credential keys.
For example, if you allow the user to use multiple device-bound keys and/or registering keys for multiple platforms.*
