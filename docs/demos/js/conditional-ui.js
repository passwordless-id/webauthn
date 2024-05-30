import { client, parsers } from './webauthn.min.js'

const app = new Vue({
  el: '#app',
  data: {
    username: null,
    registrationData: null,
    authenticationData: null
  },
  methods: {

    clear() {
      this.authenticationData = null
      this.registrationData = null;
    },

    async register() {
      this.clear();
      this.$buefy.dialog.prompt({
        message: "What's your name?",
        onConfirm: async(username) => {
          console.log(username);
          if(!username)
            return;

          let res = await client.register({
            user: {
              id:`id-for-${username}`, // to override credential with same username
              name:username
            },
            challenge: window.crypto.randomUUID()
          })
          console.debug(res)

          const parsed = parsers.parseRegistration(res)
          console.log(parsed)

          this.registrationData = parsed

          this.$buefy.toast.open({
            message: 'Registered!',
            type: 'is-success'
          })
        }
      })
    },

    async authenticateManually() {
      this.clear();
      let res = await client.authenticate({
        challenge: window.crypto.randomUUID()
      })
      console.debug(res)

      const parsed = parsers.parseAuthentication(res)
      console.log(parsed)

      this.authenticationData = parsed

      this.$buefy.toast.open({
        message: 'Authenticated!',
        type: 'is-success'
      })
    },

    async logout() {
      this.clear();
      this.$buefy.toast.open({
        message: 'Signed out!',
        type: 'is-success'
      });
    }
  }
})