F.A.Q.
======

> The WebAuthn protocol is more than 200 pages long, it's complex and gets constantly tweaked.
> Moreover, the reality of browsers and authenticators have their own quirks and deviate from the official RFC. As such, all information on the web should be taken with a grain of salt.
> 
> Also, there is some confusion regarding where passkeys are stored because the protocol evolved quite a bit in the past few years.
> In the beginning, "public key credentials" were hardware-bound. Then, major vendors pushed their agenda with "passkeys" synced with the user account in the cloud. Then, even password managers joined in with synced accounts shared with the whole family for example.
> 
> How the protocol works, and its security implications, became fuzzier and more nuanced.


## What *is* a passkey?

Depending on who you ask, the answer may vary. According to the W3C specifications, it's a **discoverable** public key credential. 

However, if you ask me, that's a pretty dumb definition. Calling **any** public key credential a passkey would have been more straightforward.

> *In this documentation, the term passkey will be (ab)used as synonym of a public key credential, discoverable or not!*


## What is an authenticator?

The authenticator is the hardware or software that issues public key credentials and signs the authentication payloads.

Hardware authenticators are typically security keys or the device itself using a dedicated chip.
Software authenticators are password managers, either built-in in the platform or as dedicated app.



## Is the passkey hardware-bound or synced in the cloud?

It depends. It can be either and it's up to the *authenticator* to decide.

In the past, where security keys pioneered the field, hardware-bound keys were the norm. However, now that the big three (Apple, Google, Microsoft) built it in directly in their platform, software-bound keys, synced with the platform's user account in the cloud became the norm. These are sometimes also dubbed "multi-device" credentials.

During registration, the `credential.synced` flag informs you if it's a synced credential or a hardware-bound one.


## Can I decide if the created credential should be hardware-bound or synced?

Sadly, that is something only the authenticator can decide.
You cannot influence whether the passkey should be synced or not, nor can you filter the authenticators that can be used.

> Concerns have been raised many times in the RFC, see [issue #1714](https://github.com/w3c/webauthn/issues/1714), [issue #1739](https://github.com/w3c/webauthn/issues/1739) and [issue #1688](https://github.com/w3c/webauthn/issues/1688) among others (and voice your opinion!).


## Are passkeys a form of 2FA?

Not by default. Passkeys are a single step 2FA only if:

- The credential is hardware-bound, not `synced`. Then this first factor is "something you possess".
- The flag `userVerification` is `required`. Then this second factor is "something you are" (biometrics) or "something you know" (PIN code).

> Note that this library uses `userVerification` as `required` by default, while the native WebAuthn protocol uses `preferred` by default. However, this restricts the security keys being usable to only those providing a form of user verification like fingerprint or PIN code.


## Are hardware-bound credentials more secure than synced ones?

*Yes*. When the credential is hardware-bound, the security guarantees are straightforward. You must possess the device. Extremely simple and effective.

When using synced "multi-device" passkeys, the "cloud" has the key, your devices have the key, and the key is in-transit over the wire. While vendors go to great length to secure every aspect, it is still exposed to more risk. All security guarantees are hereby delegated to the software authenticator, whether it's built-in in the platform or a password manager. At best, these passkeys are as safe as the main account itself. If the account is hacked, whether it's by a stolen password, temporary access to your device or a lax recovery procedure, all the passkeys would come along with the hacked account. While it offers convenience, the security guarantees are not as strong as with hardware bound authenticators.

The privacy concerns are similar. It is a matter of thrust with the vendor.


## How to deal with recovery when using hardware-bound credentials?

A device can be lost, broken, or stolen. You must deal with it. The most straightforward way is to offer the user a way to register multiple passkeys, so that losing one device does not imply locking oneself out.

Another alternative is to provide a recovery procedure per SMS or some other thrusted means.
Relying on solely a password as recovery is discouraged, since the recovery per password then becomes the "weakest link" of the authentication system.


## Discoverable vs non-discoverable?

There are two ways to trigger authentication. By providing a list of allowed credential ids for the user or not.

If no list is provided, the default, an OS native popup will appear to let the user pick a passkey. One of the *discoverable* credential registered for the website. However, if the credential is *not discoverable*, it will not be listed.

Another way is to first prompt the user for its username, then the list of allowed credential IDs for this user from the server. Then, calling the authentication with `allowCredentials: [...]`. This usually avoids a native popup and goes straight to user verification. 

> There is also another indirect consequence for "security keys" (USB sticks like a Yubikey). Discoverable credentials need the ability to be listed, and as such require some storage on the security key, also named a "slot", which are typically fairly limited. On the other hand, non-discoverable credential do not need such storage, so unlimited non-discoverable keys can be used.
There is an interesting article about it [here](https://fy.blackhats.net.au/blog/2023-02-02-how-hype-will-turn-your-security-key-into-junk/).



## Can I know if a passkey is already registered?

No, the underlying WebAuthn protocol does not support it.

> A request to add an `exists()` method to guide user experience has been brought up by me, but was ignored so far. See [issue #1749](https://github.com/w3c/webauthn/issues/1749) (and voice your opinion!).

As an alternative to the problem of not being able to detect the existence of passkeys, major vendors pushed for an alternative called "conditional UI" which in turn pushes discoverable synced credentials.


## What is conditional UI and mediation?

This mechanism leverages the browser's input field autocomplete feature to provide public key credentials in the list.
Instead of invoking the WebAuthn authentication on a button click directly, it will be called when loading the page with "conditional mediation". That way, the credential selection and user verification will be triggered when the user selects an entry in the input field autocomplete.

> Note that the input field *must* have `autocomplete="username webauthn"` to work. Using with lib, you will have to call `authenticate(...)` with `mediation: true` as option.


## What is attestation?

The attestation is a proof of the authenticator model.

> Note that several platforms and password managers do not provide this information.
> Moreover, some browsers allow replacing it with a generic attestation to increase privacy.
 

## Do I need attestation?

Unless you have stringent security requirements where you want only specific hardware devices to be allowed, you won't need it.
Furthermore, the UX is deteriorated because the user first creates the credential client-side, which is then rejected server-side.

> There was a feature request sent to the RFC to allow/exlude authenticators in the registration call, but it never landed in the specs.


## Usernameless authentication?

While it is in theory possible, it faces a very practical issue: how do you identify the credential ID to be used?
Browsers do not allow having a unique identifier for the device, it would be a privacy issue. Also, things like local storage or cookies could be cleared at any moment. But *if* you have a way to identify the user, in a way or another, then you can also deduct the credential ID and trigger the authentication flow directly.


## What about the security aspects?

The security aspects are vastly different depending on:

1. Synced or hardware-bound
2. User verification or not
3. Discoverable or not

A hardware-bound key is a "factor", since you have to possess the device.
The other factor would be "user verification", since it is something that you know (device PIN or password) or are (biometrics like fingerprint).

Many implementations favor *synced credentials without user verification* though, for the sake of *convinience*, combined with discoverable credentials. This is even the default in the WebAuthn protocol and what many guides recommend.

In that case, the security guarantee becomes: *"the user has access to the software authenticator account"*. It's a delegated guarantee. It is obvious that having the software authenticator compromised (platform account or password manager), would leak all passkeys since they are synced.


## What about privacy aspects?

Well, if the passkeys are synced, it's like handing over the keys to your buddy, the software authenticator, in good faith. That's all. If the software authenticator has bad intents, gets hacked or the NSA/police knocks on their door, your keys may be given over.

> Note that if a password manager has an "account recovery" or "sharing" feature, it also means it is able to decrypt your (hopefully encrypted) keys / passwords. On the opposite, password managers without recovery feature usually encrypt your data with your main password. This is the more secure/private option, since that way, even they cannot decrypt your data.


## Can I use passkeys in an IFrame?

**TODO**

## How to delete a passkey?

> There were some requests to the RFC to provide that an API to delete passkeys, but as far as I know, it was rejected.

In other words, it depends on the platform / password manager. Some do not even support it.