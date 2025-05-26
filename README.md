# Nostr Comic Chat

This is a clone of Microsoft Comic Chat or MS Chat (https://www.youtube.com/watch?v=H_5tEZze8Vw), working on [Nostr](https://fiatjaf.com/nostr.html)

This repository consist of a tool called **Character Editor** to create and upload assets like:
- Characters
- Fonts
- Emotions
- Backgrounds

Using [Blossom Servers](https://github.com/hzrd149/blossom) you defined. 

With **The Nostr Client** 
- you can select your character 
- connect to a supporting relay and chat rooms.
- chat with your selected character and background, using emotions

## Character Files

We need to gather character files together and [blossom drives](https://github.com/hzrd149/blossom-drive/blob/master/docs/drive.md) are a good way to achieve that.

A character consists of these SVG files:

- ProfilePic
- Emotion A
- Emotion B

and so on

The **default emotion** as well.

Emotions have specific keywords (or emojies) that are related to it. Chat clients can automatically show the emotion based on the chat text.

```json
{
  "id": "4e95a65fd81cfa59bbd8a0f8a751c8bcb2d3c2effe0e5edb7c946044c6ee8193",
  "pubkey": "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5",
  "created_at": 1709031020,
  "kind": 30563,
  "tags": [
    ["d", "my-comic-characters"],
    ["name", "My Nostr Comic Chat Characters"],
    [
      "x",
      "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553",
      "/characters/char1/emotion-a",
      "184292",
      "image/svg+xml"
    ],
    [
      "x",
      "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553",
      "/characters/char1/emotion-b",
      "184292",
      "image/svg+xml"
    ],
    [
      "x",
      "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553",
      "/characters/char1/profile",
      "184292",
      "image/svg+xml"
    ],
    [
      "x",
      "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553",
      "/characters/char2/emotion-a",
      "184292",
      "image/svg+xml"
    ],
    [
      "x",
      "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553",
      "/characters/char2/emotion-b",
      "184292",
      "image/svg+xml"
    ],
    [
      "x",
      "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553",
      "/characters/char2/profile",
      "184292",
      "image/svg+xml"
    ],
    [
      "x",
      "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553",
      "/backgrounds/bg1",
      "184292",
      "image/svg+xml"
    ],
    [
      "emotion-a", ":)", "😃", "ahah"
    ],
    [
      "emotion-b", ":(", "🥲", "sorry"
    ],
    [
      "x",
      "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553",
      "fonts/font-roboto",
      "222",
      "application/font-woff2"
    ],
    [
      "x",
      "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553",
      "fonts/font-roboto-bold",
      "222",
      "application/font-woff2"
    ],
    [
      "x",
      "",
      "fonts/font-roboto-italic",
      "222",
      "application/font-woff2"
    ],
  ],
  "content": "",
  "sig": "6a3b99c86ee1b5d0568cbd2d529ed7a53fe0c470964faf0ace0668192c141200297f4c81b2fd3f242e2c6d680e39be193ef6f0a25070a70249dab6ce9e7ea99b"
}
```

A sample message would look like:

```json
{
  "id": "4e95a65fd81cfa59bbd8a0f8a751c8bcb2d3c2effe0e5edb7c946044c6ee8193",
  "pubkey": "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5",
  "created_at": 1709031020,
  "kind": 7353,
  "tags": [
    ["drive", "my-comic-characters"],
    ["character", "/characters/char1"],
    ["emotion", "emotian-a.svg"],
    ["font", "/fonts/font-a/bold.woff2"],
    ["color", "c1", "#76b5c5"],
  ],
  "content": "Hello dhalsim, <bold>welcome</bold> to <c1>chat</c1>",
  "sig": "6a3b99c86ee1b5d0568cbd2d529ed7a53fe0c470964faf0ace0668192c141200297f4c81b2fd3f242e2c6d680e39be193ef6f0a25070a70249dab6ce9e7ea99b"
}
```