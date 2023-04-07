import { randomChallenge } from "./utils.js";


console.log('Node version: ', process.version);
console.log(Object.getOwnPropertyNames(crypto))
console.log(Object.keys(crypto))
console.log(crypto)



/*
test('Test challenges', async() => {
    expect((await randomChallenge()).length > 16)
    expect((await randomChallenge()) !== (await randomChallenge()))
});
*/
test('Test challenges', async() => {
    expect(randomChallenge().length > 16)
    expect(randomChallenge() !== randomChallenge())
});
