import {parsers} from './index.js'

test('Test parseRegistration', async () => {
    const res = parsers.parseRegistration({
      "username": "Arnaud",
      "credential": {
        "id": "3924HhJdJMy_svnUowT8eoXrOOO6NLP8SK85q2RPxdU",
        "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEgyYqQmUAmDn9J7dR5xl-HlyAA0R2XV5sgQRnSGXbLt_xCrEdD1IVvvkyTmRD16y9p3C2O4PTZ0OF_ZYD2JgTVA==",
        "algorithm": "ES256"
      },
      "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAAiYcFjK3EuBtuEw3lDcvpYAIN_duB4SXSTMv7L51KME_HqF6zjjujSz_EivOatkT8XVpQECAyYgASFYIIMmKkJlAJg5_Se3UecZfh5cgANEdl1ebIEEZ0hl2y7fIlgg8QqxHQ9SFb75Mk5kQ9esvadwtjuD02dDhf2WA9iYE1Q=",
      "clientData": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiYTdjNjFlZjktZGMyMy00ODA2LWI0ODYtMjQyODkzOGE1NDdlIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ=="
    })
    expect(res).toEqual({
      "username": "Arnaud",
      "credential": {
        "id": "3924HhJdJMy_svnUowT8eoXrOOO6NLP8SK85q2RPxdU",
        "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEgyYqQmUAmDn9J7dR5xl-HlyAA0R2XV5sgQRnSGXbLt_xCrEdD1IVvvkyTmRD16y9p3C2O4PTZ0OF_ZYD2JgTVA==",
        "algorithm": "ES256"
      },
      "client": {
        "type": "webauthn.create",
        "challenge": "a7c61ef9-dc23-4806-b486-2428938a547e",
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
        "icon_dark": "https://webauthn.passwordless.id/authenticators/08987058-cadc-4b81-b6e1-30de50dcbe96-dark.png",
        "icon_light": "https://webauthn.passwordless.id/authenticators/08987058-cadc-4b81-b6e1-30de50dcbe96-light.png",
        "name": "Windows Hello",
        "synced": false,
      },
      "attestation": null
    })
});


test('Test parseAuthentication', async () => {
    const res = parsers.parseAuthentication({
      "credentialId": "3924HhJdJMy_svnUowT8eoXrOOO6NLP8SK85q2RPxdU",
      "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAQ==",
      "clientData": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiNTY1MzViMTMtNWQ5My00MTk0LWEyODItZjIzNGMxYzI0NTAwIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlLCJvdGhlcl9rZXlzX2Nhbl9iZV9hZGRlZF9oZXJlIjoiZG8gbm90IGNvbXBhcmUgY2xpZW50RGF0YUpTT04gYWdhaW5zdCBhIHRlbXBsYXRlLiBTZWUgaHR0cHM6Ly9nb28uZ2wveWFiUGV4In0=",
      "signature": "MEUCIAqtFVRrn7q9HvJCAsOhE3oKJ-Hb4ISfjABu4lH70MKSAiEA666slmop_oCbmNZdc-QemTv2Rq4g_D7UvIhWT_vVp8M="
    })
    expect(res).toEqual({
      "credentialId": "3924HhJdJMy_svnUowT8eoXrOOO6NLP8SK85q2RPxdU",
      "client": {
        "type": "webauthn.get",
        "challenge": "56535b13-5d93-4194-a282-f234c1c24500",
        "origin": "http://localhost:8080",
        "crossOrigin": false,
        "other_keys_can_be_added_here": "do not compare clientDataJSON against a template. See https://goo.gl/yabPex"
      },
      "authenticator": {
        "rpIdHash": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2M=",
        "flags": {
          "userPresent": true,
          "userVerified": true,
          "backupEligibility": false,
          "backupState": false,
          "attestedData": false,
          "extensionsIncluded": false
        },
        "counter": 1,
        "synced": false
      },
      "signature": "MEUCIAqtFVRrn7q9HvJCAsOhE3oKJ-Hb4ISfjABu4lH70MKSAiEA666slmop_oCbmNZdc-QemTv2Rq4g_D7UvIhWT_vVp8M="
    })
});


test('Test parseAuthenticator', async () => {
  const res = parsers.parseAuthenticator("SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAAiYcFjK3EuBtuEw3lDcvpYAIN_duB4SXSTMv7L51KME_HqF6zjjujSz_EivOatkT8XVpQECAyYgASFYIIMmKkJlAJg5_Se3UecZfh5cgANEdl1ebIEEZ0hl2y7fIlgg8QqxHQ9SFb75Mk5kQ9esvadwtjuD02dDhf2WA9iYE1Q=")
  expect(res).toEqual({
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
    "icon_dark": "https://webauthn.passwordless.id/authenticators/08987058-cadc-4b81-b6e1-30de50dcbe96-dark.png",
    "icon_light": "https://webauthn.passwordless.id/authenticators/08987058-cadc-4b81-b6e1-30de50dcbe96-light.png",
    "name": "Windows Hello",
    "synced": false,
  })
})



test('Test parseClient', async () => {
  const res = parsers.parseClient("eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiYTdjNjFlZjktZGMyMy00ODA2LWI0ODYtMjQyODkzOGE1NDdlIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ==")
  expect(res).toEqual({
    "type": "webauthn.create",
    "challenge": "a7c61ef9-dc23-4806-b486-2428938a547e",
    "origin": "http://localhost:8080",
    "crossOrigin": false
  })
})

