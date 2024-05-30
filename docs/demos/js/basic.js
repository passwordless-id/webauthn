import { client, parsers } from './webauthn.min.js'

const app = new Vue({
  el: '#app',
  data: {
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
            challenge: window.crypto.randomUUID(),
            debug: true
          })
          console.debug(res)

          this.registrationData = res.parsed

          this.$buefy.toast.open({
            message: 'Registered!',
            type: 'is-success'
          })
        }
      })
    },

    async authenticate() {
      this.clear();
      let res = await client.authenticate({
        challenge: window.crypto.randomUUID(),
        debug: true
      })

      console.debug(res)
      this.authenticationData = res.parsed

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