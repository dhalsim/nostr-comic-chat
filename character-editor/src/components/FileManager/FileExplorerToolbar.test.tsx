import * as nostrServiceModule from "../../services/nostrService";

import { onEditPath, updateFolder, updatePath } from "./FileExplorerToolbar";

// Mock nostrService
const mockUpdateDrive = jest.fn();
jest
  .spyOn(nostrServiceModule.nostrService, "updateDrive")
  .mockImplementation(mockUpdateDrive);

describe("FileExplorerToolbar", () => {
  beforeEach(() => {
    mockUpdateDrive.mockClear();
  });

  describe("updateFolder", () => {
    it("should update the folder path", () => {
      const updatedFolders = updateFolder({
        folders: ["test", "test/test2", "test/test2/test3"],
        selectedNode: {
          name: "test",
          type: "directory",
          path: "test",
          children: [
            {
              name: "test2",
              type: "directory",
              path: "test/test2",
              children: [
                {
                  name: "test3",
                  type: "directory",
                  path: "test/test2/test3",
                  children: [],
                },
              ],
            },
          ],
        },
        newPath: "changed",
      });

      expect(updatedFolders).toEqual([
        "changed",
        "changed/test2",
        "changed/test2/test3",
      ]);
    });
  });

  describe("updatePath", () => {
    it("should update the path", () => {
      const updatedPaths = updatePath({
        blossomXs: [
          {
            path: "folder1/test.svg",
            sha256: "test",
            size: 100,
            mime: "image/svg+xml",
          },
          {
            path: "folder1/folder2/test2.svg",
            sha256: "test2",
            size: 100,
            mime: "image/svg+xml",
          },
        ],
        selectedNode: {
          name: "folder1",
          type: "directory",
          path: "folder1",
          children: [
            {
              name: "test",
              type: "svg",
              path: "folder1/test.svg",
              sha256: "test",
              mime: "image/svg+xml",
            },
            {
              name: "folder2",
              type: "directory",
              path: "folder1/folder2",
              children: [
                {
                  name: "test2",
                  type: "svg",
                  path: "folder1/folder2/test2.svg",
                  sha256: "test2",
                  mime: "image/svg+xml",
                },
              ],
            },
          ],
        },
        newPath: "changed",
      });

      expect(updatedPaths).toEqual([
        {
          path: "changed/test.svg",
          sha256: "test",
          size: 100,
          mime: "image/svg+xml",
        },
        {
          path: "changed/folder2/test2.svg",
          sha256: "test2",
          size: 100,
          mime: "image/svg+xml",
        },
      ]);
    });
  });

  describe("onEditPath", () => {
    it("should update the path of a file while taking care of the folders", async () => {
      const mockSetDrives = jest.fn();
      const mockSetSelectedDrive = jest.fn();
      const selectedDrive = {
        id: "test",
        d: "test",
        description: "test",
        emotions: [],
        name: "test",
        folders: ["/deneme", "/deneme/deneme2", "/deneme/deneme2/deneme3"],
        x: [
          {
            sha256:
              "d03e4dafd9a7148e99f5a7d99b731f75ce6447d4e3a36422ea58fbb99649b89c",
            path: "/characters/char1/emotion-a.svg",
            size: 422,
            mime: "image/svg+xml",
          },
        ],
        servers: [],
      };

      await onEditPath({
        newPath: "/deneme/emotion-a.svg",
        selectedNode: {
          name: "test",
          type: "svg",
          path: "/characters/char1/emotion-a.svg",
          sha256:
            "d03e4dafd9a7148e99f5a7d99b731f75ce6447d4e3a36422ea58fbb99649b89c",
          mime: "image/svg+xml",
        },
        selectedDrive,
        selectedServers: [],
        userWriteRelays: [],
        setDrives: mockSetDrives,
        setSelectedDrive: mockSetSelectedDrive,
      });

      // Verify updateDrive was called with the correct arguments
      expect(mockUpdateDrive).toHaveBeenCalledWith({
        updatedDrive: {
          ...selectedDrive,
          x: [
            {
              path: "/deneme/emotion-a.svg",
              sha256:
                "d03e4dafd9a7148e99f5a7d99b731f75ce6447d4e3a36422ea58fbb99649b89c",
              size: 422,
              mime: "image/svg+xml",
            },
          ],
          folders: [
            "/characters/char1",
            "/deneme/deneme2",
            "/deneme/deneme2/deneme3",
          ],
        },
        selectedDrive,
        selectedServers: [],
        userWriteRelays: [],
        setDrives: mockSetDrives,
        setSelectedDrive: mockSetSelectedDrive,
      });
    });
  });
});
