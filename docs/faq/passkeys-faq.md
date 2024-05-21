Passkeys F.A.Q.
===============

> Information on the web might is not always 100% accurate. The WebAuthn protocol is more than 200 pages on paper, it's complex and gets constantly tweaked. Morevover, the reality of browsers and authenticators have their own quirks and deviate from the W3C version. So take all information with a grain of salt.
> 
> In particular, there is some confusion regarding where passkeys are stored. This is because the protocol evolved quite a bit in the past few years. In the beginning, "public key credentials" were hardware-bound. However, major vendors pushed their agenda and nowadays "passkeys" are frequently synced in the cloud.


## What *is* a passkey?

Depending on who you ask, the answer may vary. According to the W3C specifications, it's a **discoverable** public key credential. 

However, if you ask me, that's a pretty dumb definition. Calling **any** public key credential a passkey would have been more straightforward.

> *In this documentation, the term passkey will be (ab)used as synonym of a public key credential, discoverable or not!*


## What is an authenticator?

The authenticator is the hardware or software that issues public key credentials and signs the authentication payload.

Hardware authenticators are typically security keys or the device itself using a dedicated chip.
Software authenticators are password managers, either built-in in the platform or as dedicated app.



## Is the passkey hardware-bound or synced in the cloud?

It depends. It can be either and it's up to the *authenticator* to decide.

In the past, where security keys pioneered the field, hardware-bound keys were the norm. However, now that the big three (apple, google, microsoft) built it in directly in their platform, software-bound keys, synced with the platform's user account in the cloud became the norm. These are sometimes also dubbed "multi-device" credentials.

During registration, the `credential.synced` flag informs you if it's a synced credential or a hardware-bound one.

> Sadly, you cannot influence whether the passkey will be synced or not, see  (and voice your opinion!).
> Note that some platforms behave differently depending on whether the credential should be discoverable or not.


## Are passkeys a form of 2FA?

Not by default. Passkeys are a single step 2FA only if:

- The credential is hardware-bound, not `synced`. Then the first factor being "something you possess".
- The flag `userVerification` is `required`. This requires the second factor, in form of something you are, like biometrics, or something you know, like a PIN code.

> Note that this library uses `userVerification` as `required` by default, while the native WebAuthn protocol uses `preferred` by default. However, this restricts the security keys being usable to only those providing a form of user verification like fingerprint or PIN code.


## Are hardware-bound credentials more secure than synced ones?

Yes. They are. When the credential is bound to the device, the security guarantees are straightforward. You have to possess the device. End of story.

When using synced "multi-device" passkeys, the security guarantees are basically delegated to the software authenticator, whether it's built-in in the platform or a password manager. The passkeys are stored in your account and synced in the cloud. So basically, these passkeys are as safe as the main account itself. If the account is hacked, whether it's by a stolen password, temporary access to your device or a lax recovery procedure, all the passkeys come along with it. While it offers convinience, the security guarantees are fully delegated to the authenticator.

The privacy concerns are similar. It is a matter of thrust with the authenticator.


## How to deal with recovery when using hardware-bound credentials?

A device can be lost, broken or stolen. You have to deal with it. The most straightforward way is to offer the user a way to register multiple passkeys, so that losing one device does not imply locking oneself out.

Another alternative is to provide a recovery procedure per SMS or some other thrusted means.
Relying on solely a password as recovery is discouraged, since the recovery per password then becomes the "weakest link" of the authentication system.


## Discoverable vs non-discoverable?

There are two ways to trigger authentication. By providing a list of allowed credential ids for the user or not.

If no list is provided, the default, an OS native popup will appear to let the user pick a passkey. One of the *discoverable* credential registered for the website. However, if the credential is *not discoverable*, it will not be listed.

Another way is to first prompt the user for its username, then the list of allowed credential IDs for this user from the server. Then, calling the authentication with `allowedCredentials: [...]`. This usually avoids a native popup and goes straight to user verification. 

> There is also another indirect consequence for "security keys" (USB sticks like a Yubikey). Discoverable credentials need the ability to be listed, and as such require some storage on the security key, also named a "slot", which are typically fairly limited. On the other hand, non-discoverable credential do not need such storage, so unlimited non-discoverable keys can be used.
There is an interesting article about it [here](https://fy.blackhats.net.au/blog/2023-02-02-how-hype-will-turn-your-security-key-into-junk/).



## Can I know if a passkey is already registered?

No, the underlying WebAuthn protocol does not support it.

> A request to add an `exists()` method to guide user experience has been brought up by me, but was ignored so far. See [issue](https://github.com/w3c/webauthn/issues/1749) (and voice your opinion!).

As an alternative to the problem of not being able to detect the existence of passkeys, major vendors pushed for an alternative called "conditional UI" which in turn pushes discoverable synced credentials.


## What is conditional UI and mediation?


## Using username autofill


## What is attestation?


## Usernameless authentication?


## What about the security aspects?

The security aspects are very different depending on:

- Synced or not
- User verification or not
- Discoverable or not

TODO