"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminAvatarSectionProps {
  profileId: string;
  avatarUrl: string | null;
  displayName: string | null;
  onAvatarChange?: (url: string | null) => void;
}

function getInitials(displayName: string | null): string {
  if (!displayName?.trim()) return "?";
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0]! + parts[parts.length - 1]![0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export function AdminAvatarSection({
  profileId,
  avatarUrl,
  displayName,
  onAvatarChange,
}: AdminAvatarSectionProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState(avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    const input = inputRef.current;
    if (!input?.files?.length) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.set("file", input.files[0]!);
    try {
      const res = await fetch(`/api/admin/profiles/${profileId}/avatar`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      const newUrl = data.avatar_url ?? data.url ?? null;
      onAvatarChange?.(newUrl);
      router.refresh();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/profiles/${profileId}/avatar`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Remove failed");
        return;
      }
      onAvatarChange?.(null);
      setUrlInput("");
      router.refresh();
    } catch {
      setError("Remove failed");
    } finally {
      setRemoving(false);
    }
  };

  const inputClass =
    "mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20";
  const buttonClass =
    "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 disabled:opacity-50";

  const previewUrl =
    showUrlInput && /^https?:\/\//.test(urlInput.trim())
      ? urlInput.trim()
      : avatarUrl ?? null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-900">Avatar</label>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-lg font-semibold text-zinc-600"
          style={{ borderRadius: 4 }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{getInitials(displayName)}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={buttonClass}
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing || !avatarUrl}
            className={buttonClass}
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-zinc-500 hover:text-zinc-700"
        >
          {showUrlInput ? "Hide Avatar URL" : "Avatar URL"}
        </button>
        {showUrlInput ? (
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            name="avatar_url"
            className={inputClass}
          />
        ) : (
          <input type="hidden" name="avatar_url" value={avatarUrl ?? ""} />
        )}
      </div>
    </div>
  );
}
