import {parsers} from './index'

test('Test parseRegistration', async () => {
    const res = parsers.parseRegistration({
        "username": "Arnaud",
        "credential": {
          "id": "HjRWndz-8-q8cBr218sKuwf4C3-MzmQwpwVlKe0U0KU",
          "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyqT6vAetd02gAi3LWyeUsEGXNXGIuDqsjL1dntM8Tw96zt03DlhvIrQUG4D87TQU8pg7y4vtKaPAmOGxTYnmflZKjM9bqKokbnzrWp0wUYMDD74K3rENj9mRYf7LrKyqHZIf8ePqHxsrk9b35L9vp78E4phtXIguGmo-PEnATwDvYdKgj_YY7TJVavWuX563LMiGD7bUE5Ptw_9-VPZt9j5J2v00fZsKIDvrvFkFlXBzBAoFUxTATCoGvmpyzIOknH2qXZol0r63bIF3wFLtWuCT_rxNFwEVW5f3Sl5nv25s1Q1sn6r5DdQGPlTUsgRcMUQZUWzRQFT1ZF9HCep-RwIDAQAB",
          "algorithm": "RS256"
        },
        "authenticatorData": "T7IIVvJKaufa_CeBCQrIR3rm4r0HJmAjbMYUxvt8LqBFAAAAAAiYcFjK3EuBtuEw3lDcvpYAIB40Vp3c_vPqvHAa9tfLCrsH-At_jM5kMKcFZSntFNClpAEDAzkBACBZAQDKpPq8B613TaACLctbJ5SwQZc1cYi4OqyMvV2e0zxPD3rO3TcOWG8itBQbgPztNBTymDvLi-0po8CY4bFNieZ-VkqMz1uoqiRufOtanTBRgwMPvgresQ2P2ZFh_susrKodkh_x4-ofGyuT1vfkv2-nvwTimG1ciC4aaj48ScBPAO9h0qCP9hjtMlVq9a5fnrcsyIYPttQTk-3D_35U9m32Pkna_TR9mwogO-u8WQWVcHMECgVTFMBMKga-anLMg6ScfapdmiXSvrdsgXfAUu1a4JP-vE0XARVbl_dKXme_bmzVDWyfqvkN1AY-VNSyBFwxRBlRbNFAVPVkX0cJ6n5HIUMBAAE=",
        "clientData": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiWVdNd01qQXlNVFV0TnpsbU5pMDBZamcwTFRnMlpUQXROek5pTlRBME1HUmhZekF3Iiwib3JpZ2luIjoiaHR0cHM6Ly93ZWJhdXRobi5wYXNzd29yZGxlc3MuaWQiLCJjcm9zc09yaWdpbiI6ZmFsc2V9"
      })
    expect(res).toBeDefined()
});


test('Test parseAuthentication', async () => {
    const res = parsers.parseAuthentication({
        "credentialId": "HjRWndz-8-q8cBr218sKuwf4C3-MzmQwpwVlKe0U0KU",
        "authenticatorData": "T7IIVvJKaufa_CeBCQrIR3rm4r0HJmAjbMYUxvt8LqAFAAAAAg==",
        "clientData": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiTWpnMFpUZ3hZekl0TjJZNFl5MDBOekk1TFdGaU0ySXRObUZrWWpGbVpUSTVNVFV6Iiwib3JpZ2luIjoiaHR0cHM6Ly93ZWJhdXRobi5wYXNzd29yZGxlc3MuaWQiLCJjcm9zc09yaWdpbiI6ZmFsc2V9",
        "signature": "w32szpw-VsXh7jQHzXyNh_sI8G94mi4Yrbw1JdqHrjSEhswpwYC4Q_1qI9ujol_ZppnjFWQRSG-zrY9NrwC5gYVSoTJFrXTN0JGubE54XulMSAAmJcAzi4GPiJPOlKH730QkSEv23VVmx2-7AEwlYooF9p6QPGDgVUTE9t7CBrlEBr6euv8obURk7PCD2zSfqzOB_aOitaSmTIjmPDLxRFKbvjTNt3dUFueEKK1Oi54CmS5LhcKvj_yBkancATcK1hBDqTTLO4cqjT-pyBimvDTMdQTH6JTwlPcIrF4U9SJhfkAvoJ0x5YC0Q-PGgqxY7AN2mhkjp9AgQY7GwP-POQ=="
      })
    expect(res).toBeDefined()
});