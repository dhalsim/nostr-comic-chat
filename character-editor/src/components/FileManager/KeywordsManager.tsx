import { useState, useEffect } from "preact/hooks";

import type { Emotion } from "../../services/types";

type SaveButtonState = "idle" | "saving" | "saved";

interface EmotionManagerProps {
  assetPath: string;
  assetSha256: string;
  emotions?: Emotion[];
  onEmotionsChange: (emotions: Emotion[]) => Promise<void>;
}

export const EmotionManager = ({
  assetPath,
  emotions = [],
  onEmotionsChange,
}: EmotionManagerProps) => {
  const [keywords, setKeywords] = useState("");
  const [saveState, setSaveState] = useState<SaveButtonState>("idle");

  const assetName = assetPath.split("/").pop()?.split(".")[0];

  if (!assetName) {
    return null;
  }

  // Initialize keywords when emotions change
  useEffect(() => {
    const emotion = emotions.find((e) => e.name === assetName);

    setKeywords(emotion?.keywords.join(", ") || "");
  }, [emotions, assetPath]);

  const handleSave = async () => {
    const keywordList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    setSaveState("saving");

    // If keywords are empty, remove the emotion
    if (keywordList.length === 0) {
      await onEmotionsChange(emotions.filter((e) => e.name !== assetName));
    } else {
      // Update or add the emotion
      const existingEmotionIndex = emotions.findIndex(
        (e) => e.name === assetName,
      );
      const updatedEmotions = [...emotions];

      if (existingEmotionIndex >= 0) {
        updatedEmotions[existingEmotionIndex] = {
          name: assetName,
          keywords: keywordList,
        };
      } else {
        updatedEmotions.push({
          name: assetName,
          keywords: keywordList,
        });
      }

      await onEmotionsChange(updatedEmotions);
    }

    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 3000);
  };

  const getButtonClass = () => {
    switch (saveState) {
      case "saving":
        return "bg-gray-500 cursor-wait";
      case "saved":
        return "bg-green-600 cursor-default";
      default:
        return "bg-green-500 hover:bg-green-600";
    }
  };

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Keywords</h3>
        <button
          onClick={handleSave}
          disabled={saveState !== "idle"}
          className={`px-3 py-1 text-sm text-white rounded transition-colors ${getButtonClass()}`}
        >
          {saveState === "saving"
            ? "Saving..."
            : saveState === "saved"
              ? "Saved"
              : "Save"}
        </button>
      </div>
      <input
        type="text"
        value={keywords}
        onChange={(e) => setKeywords((e.target as HTMLInputElement).value)}
        placeholder="Enter keywords (comma-separated)"
        className="w-full px-3 py-2 border rounded text-sm"
      />
    </div>
  );
};
