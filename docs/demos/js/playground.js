import webauthn from './webauthn.min.js'

const app = new Vue({
    el: '#app',
    components: {
        'b-collapse-card': {
            props: {
                title: String,
                open: Boolean,
            },
            template: `
            <b-collapse class="card my-4" :open="open">
                <template #trigger="props">
                    <div class="card-header">
                        <a class="card-header-icon">
                            <b-icon :icon="props.open ? 'menu-down' : 'menu-right'"></b-icon>
                        </a>
                        <p class="card-header-title">{{title}}</p>
                    </div>
                </template>
                <slot></slot>   
                </b-collapse>
                `
        }
    },
    data: {
        origin: document.location.origin,
        registration: {
            options: {
                user: "Arnaud",
                challenge: webauthn.server.randomChallenge(),
                hints: [],
                userVerification: 'preferred',
                discoverable: 'preferred',
                timeout: 60000,
                attestation: true
            },
            json: null,
            result: null
        },
        authentication: {
            credentialId: null,
            options: {
                challenge: webauthn.server.randomChallenge(),
                hints: [],
                authenticatorType: 'auto',
                userVerification: 'required',
                timeout: 60000,
                allowCredentials: []
            },
            json: null,
            result: null
        },
        verification: {
            publicKey: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWyyMt1l16_1rzDP63Ayw9EFpn1VbSt4NSJ7BOsDzqed5Z3aTfQSvzPBPHb4uYQuuckOKRbdoH9S0fEnSvNxpRg==", // null, 
            //"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzXUir6UgELFeM9il6id2vgZ1sWbZTk4C5JLIiMpg7lywwTRdp0i+lPP9rEdzcmwKwRLh5QT8DlPFQuKrUc8eXb9r+RPq/CvVOxVCqdK6A9fg0PDnvA3k7c5Ax5V5n/HcSw/uXVAzwstxQsbV5pOk0JDtys7rKiPjdO+XH5TbANNJE7PsS5j90zHLKNQaSybgF8V0v4Oz4I9u7IjVQKEz2V56E4Qfj/D7g0PCu63M5mNz5bGsmUzg5XwSRIaG3J3kDTuyTTGjPYhTnYFyWYXuMu1ZQ7JCe5FUv9m4oj3jH33VQEW3sorea7UOBjnSsLWp8MyE08M4tlY2xgyFL59obQIDAQAB",
            algorithm: "ES256",
            authenticatorData: "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAQ==", // null, 
            //"SZYN5YgOjGh0NBcPZHZgW4/krrmihjLHmVzzuoMdl2MFAAAAAQ==",
            clientData: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiMjRkMjI0ZDMtMWQwZi00MzAxLTg3NTktMzk4ODcwNTg1ZTU1Iiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ==", // null, 
            //"eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiWmpreE5URTBZVGN0TkRKa015MDBOMlU0TFdFME1HTXRZVFEyTkdRNVlqTmpNVGN3Iiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo2MzM0MiIsImNyb3NzT3JpZ2luIjpmYWxzZSwib3RoZXJfa2V5c19jYW5fYmVfYWRkZWRfaGVyZSI6ImRvIG5vdCBjb21wYXJlIGNsaWVudERhdGFKU09OIGFnYWluc3QgYSB0ZW1wbGF0ZS4gU2VlIGh0dHBzOi8vZ29vLmdsL3lhYlBleCJ9",
            signature: "MEYCIQDgSy1brw1UVCT4kzaZIiiihNuC7KvV2vm3gO5f1CSscQIhAM6-MihKO2jnF_BHeEJMYZ7jN-kz9TuWqYwJJzm4fOcl", //null, 
            //"E/XchoqDlSOanozr0o03DN++EEz5qVymtgiaLbepoysxgdxAz/uH/34wt7/YrUs7ESaH/3ni3/0mk71WRc9SP9GMRNYqKSeZkwAM+ZHMc7e3OEpOETWIBCO+aOKmKPflB/nVzXocNUHnhW/aw5UAOhU43qjjy1X9+5+t+60C6RyGaDXTz6Mk6rmgX3z21M8pOFw8VAAtUojX6ab+Lh48SaMN1Z2BK8Exh//pFjveMVngx4yuYRm6Tu7irRvGZVe7Wnii6GNUz56kT2Q4Fc8hR28c3+qufKWuaHLJUnsw6GILQNxemDzirlKBhXFjz7Ht7tyGaqUwFZr9q+93j/95Ag==",
            isValid: null
        }
    },
    computed: {
        parsedAuthData() {
            const authData = this.verification.authenticatorData
            if(!authData)
                return null
            try {
                return webauthn.parsers.parseAuthenticator(authData)
            }
            catch(e) {
                console.warn(e)
                return "ERROR: failed to parse authenticator data. See console logs for more details."
            }
        },
        parsedClientData() {
            const clientData = this.verification.clientData
            if(!clientData)
                return null
            try {
                return webauthn.parsers.parseClient(clientData)
            }
            catch(e) {
                console.warn(e)
                return "ERROR: failed to parse client data. See console logs for more details."
            }
        }
    },
    methods: {
        newChallenge() {
            return webauthn.server.randomChallenge()
        },
        async register() {
            try {
                const json = await webauthn.client.register(this.registration.options)
                console.log(json)
                this.$buefy.toast.open({
                    message: 'Registered!',
                    type: 'is-success'
                })
                this.registration.json = json

                const result = await webauthn.server.verifyRegistration(json, {
                    challenge: this.registration.options.challenge,
                    origin: this.origin,
                })
                console.log(result)
                this.registration.result = result
            }
            catch (e) {
                console.warn(e)
                this.$buefy.toast.open({
                    message: e,
                    type: 'is-danger'
                })
                this.registration.result = {}
            }
        },
        async login() {
            this.authentication.result = null
            this.authentication.json = null
            try {
                const json = await webauthn.client.authenticate(this.authentication.options)
                console.log(json)
                this.$buefy.toast.open({
                    message: 'Authenticated!',
                    type: 'is-success'
                })
                this.authentication.json = json

                const credential = this.registration?.result?.credential
                if (credential) {
                    const result = await webauthn.server.verifyAuthentication(json, credential, {
                        challenge: this.authentication.options.challenge,
                        origin: this.origin,
                        userVerified: this.authentication.userVerification === 'required',
                        counter: -1 // Fixes #27 since counter is 0 on first auth with ios/macos
                    })
                    console.log(result)
                    this.authentication.result = result
                }
            }
            catch (e) {
                console.warn(e)
                this.$buefy.toast.open({
                    message: e,
                    type: 'is-danger'
                })
            }
        },
        async verifyPublicKey() {
            const algorithm = this.verification.algorithm
            const publicKey = this.verification.publicKey
            if(!algorithm)
                return window.alert('No algorithm defined!')
            if(!publicKey)
                return window.alert('Public key not defined!')
            try {
                const parsedKey = await webauthn.server.parseCryptoKey(algorithm, publicKey)
                console.log(parsedKey)
                return window.alert('Public key is VALID')
            } catch (error) {
                console.warn(error)
                return window.alert('INVALID public key: see details in console logs')   
            }
        },
        async verifySignature() {
            try {
                this.verification.isValid = await webauthn.server.verifySignature(this.verification)
            }
            catch (e) {
                console.warn(e)
                this.$buefy.toast.open({
                    message: e,
                    type: 'is-danger'
                })
                this.verification.isValid = false
            }
        }
    }
})