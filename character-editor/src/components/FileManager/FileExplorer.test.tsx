import { buildTree } from "./FileExplorer";

describe("FileExplorer", () => {
  describe("buildTree", () => {
    it("should build a tree from a drive", () => {
      const tree = buildTree({
        id: "34fc6e18ea7a18dd7096d74cc6f079b8be23d17ea9188c641873443d1fa2a197",
        name: "my-comic-characters",
        description: "My Nostr Comic Chat Characters",
        servers: [],
        d: "my-comic-characters",
        folders: ["characters/char2"],
        x: [
          {
            sha256:
              "d03e4dafd9a7148e99f5a7d99b731f75ce6447d4e3a36422ea58fbb99649b89c",
            path: "/characters/char1/emotion-a.svg",
            size: 422,
            mime: "image/svg+xml",
          },
          {
            sha256:
              "884a2c6fbcc9620e762edf52de5b102c7878377e9576cb20d60c32cc9d27117c",
            path: "/characters/char1/emotion-b.svg",
            size: 455,
            mime: "image/svg+xml",
          },
          {
            sha256:
              "81c371cfd9d3917a279eb195feed559f0cbcb17207bcbf4a2a707447bd86733e",
            path: "/characters/char1/profile.svg",
            size: 309,
            mime: "image/svg+xml",
          },
        ],
        emotions: [
          {
            name: "emotion-a",
            keywords: [":)", "lol", "😃", "ahah", "ahaha", "ahahah"],
          },
        ],
      });

      expect(tree).toEqual([
        {
          name: "my-comic-characters",
          path: "/",
          type: "directory",
          children: [
            {
              name: "characters",
              path: "/characters",
              type: "directory",
              children: [
                {
                  name: "char1",
                  path: "/characters/char1",
                  type: "directory",
                  children: [
                    {
                      name: "emotion-a.svg",
                      path: "/characters/char1/emotion-a.svg",
                      type: "svg",
                      mime: "image/svg+xml",
                      sha256:
                        "d03e4dafd9a7148e99f5a7d99b731f75ce6447d4e3a36422ea58fbb99649b89c",
                    },
                    {
                      name: "emotion-b.svg",
                      path: "/characters/char1/emotion-b.svg",
                      type: "svg",
                      mime: "image/svg+xml",
                      sha256:
                        "884a2c6fbcc9620e762edf52de5b102c7878377e9576cb20d60c32cc9d27117c",
                    },
                    {
                      name: "profile.svg",
                      path: "/characters/char1/profile.svg",
                      type: "svg",
                      mime: "image/svg+xml",
                      sha256:
                        "81c371cfd9d3917a279eb195feed559f0cbcb17207bcbf4a2a707447bd86733e",
                    },
                  ],
                },
                {
                  name: "char2",
                  path: "/characters/char2",
                  type: "directory",
                  children: [],
                },
              ],
            },
          ],
        },
      ]);
    });
  });
});
