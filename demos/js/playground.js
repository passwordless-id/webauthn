import * as webauthn from '../../dist/webauthn.min.js'

 const app = new Vue({
    el: '#app',
    data: {
        registration: {
            username: "Arnaud",
            challenge: btoa(window.crypto.randomUUID()),
            options: {
                authenticatorType: 'auto',
                userVerification: 'required',
                timeout: 60000,
                attestation: false,
            },
            result: null
        },
        authentication: {
            credentialId: null,
            challenge: btoa(window.crypto.randomUUID()),
            options: {
                authenticatorType: 'auto',
                userVerification: 'required',
                timeout: 60000,
            },
            result: null
        },
        verification: {
            publicKey: null, //"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzXUir6UgELFeM9il6id2vgZ1sWbZTk4C5JLIiMpg7lywwTRdp0i+lPP9rEdzcmwKwRLh5QT8DlPFQuKrUc8eXb9r+RPq/CvVOxVCqdK6A9fg0PDnvA3k7c5Ax5V5n/HcSw/uXVAzwstxQsbV5pOk0JDtys7rKiPjdO+XH5TbANNJE7PsS5j90zHLKNQaSybgF8V0v4Oz4I9u7IjVQKEz2V56E4Qfj/D7g0PCu63M5mNz5bGsmUzg5XwSRIaG3J3kDTuyTTGjPYhTnYFyWYXuMu1ZQ7JCe5FUv9m4oj3jH33VQEW3sorea7UOBjnSsLWp8MyE08M4tlY2xgyFL59obQIDAQAB",
            algorithm: "RS256",
            clientData: null, //"eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiWmpreE5URTBZVGN0TkRKa015MDBOMlU0TFdFME1HTXRZVFEyTkdRNVlqTmpNVGN3Iiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo2MzM0MiIsImNyb3NzT3JpZ2luIjpmYWxzZSwib3RoZXJfa2V5c19jYW5fYmVfYWRkZWRfaGVyZSI6ImRvIG5vdCBjb21wYXJlIGNsaWVudERhdGFKU09OIGFnYWluc3QgYSB0ZW1wbGF0ZS4gU2VlIGh0dHBzOi8vZ29vLmdsL3lhYlBleCJ9",
            authenticatorData: null, //"SZYN5YgOjGh0NBcPZHZgW4/krrmihjLHmVzzuoMdl2MFAAAAAQ==",
            signature: null, //"E/XchoqDlSOanozr0o03DN++EEz5qVymtgiaLbepoysxgdxAz/uH/34wt7/YrUs7ESaH/3ni3/0mk71WRc9SP9GMRNYqKSeZkwAM+ZHMc7e3OEpOETWIBCO+aOKmKPflB/nVzXocNUHnhW/aw5UAOhU43qjjy1X9+5+t+60C6RyGaDXTz6Mk6rmgX3z21M8pOFw8VAAtUojX6ab+Lh48SaMN1Z2BK8Exh//pFjveMVngx4yuYRm6Tu7irRvGZVe7Wnii6GNUz56kT2Q4Fc8hR28c3+qufKWuaHLJUnsw6GILQNxemDzirlKBhXFjz7Ht7tyGaqUwFZr9q+93j/95Ag==",
            isValid: null
        }
    },
    methods: {
        newChallenge() {
            return btoa(window.crypto.randomUUID())
        },
        async register() {
            try {
                let res = await webauthn.register(this.registration.username, this.registration.challenge, this.registration.options)
                this.$buefy.toast.open({
                    message: 'Registered!',
                    type: 'is-success'
                })
                console.log(res)
                this.registration.result = res
                this.authentication.credentialId = res.credential.id
            }
            catch(e) {
                console.warn(e)
                this.$buefy.toast.open({
                    message: e,
                    type: 'is-danger'
                })
                this.registration.result = {}
            }
        },
        async login() {
            try {
                let res = await webauthn.login([this.authentication.credentialId], this.authentication.challenge, this.authentication.options)
                console.log(res)
                this.authentication.result = res
            }
            catch(e) {
                console.warn(e)
                this.$buefy.toast.open({
                    message: e,
                    type: 'is-danger'
                })
                this.authentication.result = {}
            }
        },
        async verifySignature() {
            try {
                this.verification.isValid = await webauthn.verify(this.verification)
            }
            catch(e) {
                console.warn(e)
                this.$buefy.toast.open({
                    message: e,
                    type: 'is-danger'
                })
                this.verification.isValid = false
            }
        },
        parseAuthData(authData) {
            return webauthn.parseAuthenticatorBase64(authData)
        },
        parseClientData(clientData) {
            return webauthn.parseClientBase64(clientData)
        }
    }
 })