import type { h } from "preact";
import { useState, useRef } from "preact/hooks";

import type { FileSource } from "./types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (source: FileSource) => void;
  path: string;
}

export const UploadModal = ({
  isOpen,
  onClose,
  onUpload,
  path,
}: UploadModalProps) => {
  const [url, setUrl] = useState("");
  const [hash, setHash] = useState("");
  const [name, setName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: h.JSX.TargetedDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: h.JSX.TargetedDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(false);

    const dt = e.dataTransfer;
    const file = dt?.files?.[0];

    if (file) {
      onUpload({ type: "file", file });
      onClose();
    }
  };

  const handleFileSelect = (e: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;

    if (target.files && target.files[0]) {
      onUpload({ type: "file", file: target.files[0] });
      onClose();
    }
  };

  const handleUrlSubmit = (e: h.JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedUrl = url.trim();

    if (trimmedUrl) {
      onUpload({ type: "url", url: trimmedUrl });
      onClose();
    }
  };

  const handleHashSubmit = (e: h.JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedHash = hash.trim();
    const trimmedName = name.trim();

    if (trimmedHash && trimmedName) {
      onUpload({ type: "hash", hash: trimmedHash, name: trimmedName });
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload SVG</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* URL Input Section */}
          <div>
            <h3 className="font-medium mb-2">Upload from URL</h3>
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
                placeholder="Enter SVG URL"
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Upload
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-1">
              Fetches and uploads the SVG file from the given URL
            </p>
          </div>

          {/* File Upload Section */}
          <div>
            <h3 className="font-medium mb-2">Upload from Device</h3>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
              `}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".svg"
                className="hidden"
              />
              <p className="text-gray-600">
                Click to select or drag and drop your SVG file here
              </p>
            </div>
          </div>

          {/* SHA256 Hash Section */}
          <div>
            <h3 className="font-medium mb-2">Use Existing File</h3>
            <form onSubmit={handleHashSubmit} className="space-y-2">
              <input
                type="text"
                value={hash}
                onChange={(e) => setHash((e.target as HTMLInputElement).value)}
                placeholder="Enter SHA256 hash"
                className="w-full border rounded px-3 py-2"
                pattern="[A-Fa-f0-9]{64}"
                title="Please enter a valid SHA256 hash (64 hexadecimal characters)"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName((e.target as HTMLInputElement).value)}
                placeholder="Enter file name"
                className="w-full border rounded px-3 py-2"
              />
              <button
                type="submit"
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Use
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-1">
              Use an existing file from the servers by its SHA256 hash
            </p>
          </div>

          <p className="text-sm text-gray-500 border-t pt-4">
            Upload location: {path}
          </p>
        </div>
      </div>
    </div>
  );
};
