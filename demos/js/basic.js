import { client, parsers } from '../../dist/webauthn.min.js'

const app = new Vue({
  el: '#app',
  data: {
    username: null,
    isRegistered: false,
    isAuthenticated: false,
    isRoaming: false,
    registrationData: null,
    authenticationData: null
  },
  methods: {
    async checkIsRegistered() {
      console.log(this.username + ' => ' + !!window.localStorage.getItem(this.username))
      this.isRegistered = !!window.localStorage.getItem(this.username)
    },
    async register() {
      let res = await client.register(this.username, window.crypto.randomUUID(), { authType: this.isRoaming ? 'roaming' : 'auto' })
      console.debug(res)

      const parsed = parsers.parseRegistration(res)
      console.log(parsed)

      window.localStorage.setItem(this.username, parsed.credential.id)
      this.isAuthenticated = true
      this.registrationData = parsed

      this.$buefy.toast.open({
        message: 'Registered!',
        type: 'is-success'
      })

      await this.checkIsRegistered()
    },
    async login() {
      let credentialId = window.localStorage.getItem(this.username)
      let res = await client.authenticate(credentialId ? [credentialId] : [], window.crypto.randomUUID(), { authType: this.isRoaming ? 'roaming' : 'auto' })
      console.debug(res)

      const parsed = parsers.parseAuthentication(res)
      console.log(parsed)

      this.isAuthenticated = true
      this.authenticationData = parsed

      this.$buefy.toast.open({
        message: 'Signed in!',
        type: 'is-success'
      })
    },
    async logout() {
      this.isAuthenticated = false;
      this.$buefy.toast.open({
        message: 'Signed out!',
        type: 'is-success'
      })
      this.authenticationData = null
      this.registrationData = null
    }
  }
})