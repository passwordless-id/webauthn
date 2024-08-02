Ways
====

Even with such a simplified library, the foundation is filled with subtelties.
This leads to different ways one can use to trigger authentication.


Per discoverable
----------------

Triggers an intermediate native dialog to let the user select a passkey.
This is an overall simple and effective way.

### How?

- Use `discoverable: 'required'` during registration.

### Advantages

- Easy
- No need for a "username" input field

### Drawbacks

- Does not work with every security key
- Fills up the security key "slots"



Per allow list
--------------

User enters username and requests allowed credential IDs from server.

### How?

- Use `allowCredentials:["id-1", "id-2", ...]` during authentication

### Advantages

- No intermediate account selection dialog
- Works with everything, including non-discoverable credentials

### Drawbacks

- User needs to remember username(s)
- Possibly confusing user experience because it is impossible to know if credential(s) exist on the device.




Per autocomplete (a.k.a. conditional mediation)
-------------------------------------------

### How?

- Use `discoverable: 'required'` during registration.
- Call authentication with `autocomplete: true` when input is mounted in DOM.

### Advantages

- In theory, no need for distinct "Register" and "Login" buttons because the authentication is triggered upon selecting a user in the input field autocomplete

### Drawbacks

- It doesn't work in every browser (Firefox, Opera & many more smaller browsers)
- Therefore a normal login button is actually still recommended
- It is more complex to use
- Not cross platfrom/device/browser friendly
- Does not work with every security key
- Fills up the security key "slots"



Hybrid
------

Depending on the situation and the favored UX, one or the other approach might be more appropriate.

Moreover, nothing hinders you to use a mix of approaches.
Actually, several combinations do make sense.

- allow list + discovery: one for "remember me" and the other for "sign in with an alternate account".
- conditional UI + allow list: useful to support all browsers & security keys. 
- discovery + allow list: good as fallback to support all security keys.

Ideal:

- Sign in as...
  - Stored user/crendential 1 <-- locally stored credential Id
  - Stored user/crendential 2 <-- locally stored credential Id
- Use another account
  - Use conditional UI + fetch from server as fallback
  - Or use discovery