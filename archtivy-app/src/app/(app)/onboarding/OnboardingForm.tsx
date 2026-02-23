"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { completeOnboardingAction, suggestUsernameAction } from "@/app/actions/onboarding";
import type { OnboardingResult } from "@/app/actions/onboarding";
import { AuthSplitLayout, authInputClass, authLabelClass } from "@/components/auth/AuthSplitLayout";
import {
  ProfileLocationPicker,
  type ProfileLocationValue,
} from "@/components/location/ProfileLocationPicker";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import type { ProfileRole } from "@/lib/auth/config";
import {
  DESIGNER_TITLES,
  BRAND_TYPES,
  READER_TYPES,
} from "@/lib/auth/config";

const TOTAL_STEPS = 3;

export function OnboardingForm({
  designerTitles,
  brandTypes,
  readerTypes,
  defaultDisplayName,
  defaultUsername,
}: {
  designerTitles: readonly string[];
  brandTypes: readonly string[];
  readerTypes: readonly string[];
  defaultDisplayName?: string | null;
  defaultUsername?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(defaultDisplayName ?? "");
  const [username, setUsername] = useState(defaultUsername ?? "");
  const [role, setRole] = useState<ProfileRole | "">("");
  const [designerDiscipline, setDesignerDiscipline] = useState("");
  const [brandType, setBrandType] = useState("");
  const [readerType, setReaderType] = useState("");
  const [locationValue, setLocationValue] = useState<ProfileLocationValue | null>(null);
  const [locationVisibility, setLocationVisibility] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const suggestUsername = async () => {
    if (!displayName.trim()) return;
    setSuggesting(true);
    setError("");
    try {
      const suggested = await suggestUsernameAction(displayName.trim());
      setUsername(suggested);
    } catch {
      setError("Could not suggest username.");
    } finally {
      setSuggesting(false);
    }
  };

  const validateStep1 = (): boolean => {
    const name = displayName.trim();
    const user = username.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!name) {
      setError("Display name is required.");
      return false;
    }
    if (!user) {
      setError("Username is required.");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(user)) {
      setError("Username can only contain lowercase letters, numbers, and hyphens.");
      return false;
    }
    setError("");
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!role || !["designer", "brand", "reader"].includes(role)) {
      setError("Please choose a role.");
      return false;
    }
    setError("");
    return true;
  };

  const validateStep3 = (): boolean => {
    if (role === "designer" && !designerDiscipline) {
      setError("Please select a discipline / title.");
      return false;
    }
    if (role === "brand" && !brandType) {
      setError("Please select a brand type.");
      return false;
    }
    if (role === "reader" && !readerType) {
      setError("Please select a reader type.");
      return false;
    }
    setError("");
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      setError("");
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      setError("");
    }
  };

  const handleBack = () => {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) {
      handleNext();
      return;
    }
    if (!validateStep3()) return;
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.set("display_name", displayName.trim());
    formData.set("username", username.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 50));
    formData.set("role", role);
    formData.set("designer_discipline", role === "designer" ? designerDiscipline : "");
    formData.set("brand_type", role === "brand" ? brandType : "");
    formData.set("reader_type", role === "reader" ? readerType : "");
    if (locationValue) {
      formData.set("location_place_name", locationValue.place_name);
      formData.set("location_city", locationValue.city ?? "");
      formData.set("location_country", locationValue.country ?? "");
      formData.set("location_lat", String(locationValue.lat));
      formData.set("location_lng", String(locationValue.lng));
      formData.set("location_mapbox_id", locationValue.mapbox_id);
      formData.set("location_visibility", locationVisibility ? "public" : "private");
    }
    const result = await completeOnboardingAction(null as unknown as OnboardingResult, formData);
    setLoading(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    if (result && "ok" in result && result.ok) {
      router.replace("/");
    }
  };

  const canProceedStep1 = displayName.trim() && username.trim();
  const canProceedStep2 = !!role;
  const canProceedStep3 =
    (role === "designer" && !!designerDiscipline) ||
    (role === "brand" && !!brandType) ||
    (role === "reader" && !!readerType);

  const leftCopy = {
    heading: "Complete your profile",
    body: "Tell us how you’ll use Archtivy so we can tailor your experience. You can update this later.",
  };

  return (
    <AuthSplitLayout
      title="Complete your profile"
      subtitle={`Step ${step} of ${TOTAL_STEPS}`}
      leftCopy={leftCopy}
    >
      {/* Step indicator */}
      <div className="mb-8 flex gap-1">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i + 1 <= step
                ? "bg-archtivy-primary"
                : "bg-zinc-200 dark:bg-zinc-700"
            }`}
            aria-hidden
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {step === 1 && (
          <>
            <div>
              <label htmlFor="display_name" className={authLabelClass}>
                Display name <span className="text-archtivy-primary">*</span>
              </label>
              <input
                id="display_name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={authInputClass}
                placeholder="How you want to be shown"
                required
              />
            </div>
            <div>
              <label htmlFor="username" className={authLabelClass}>
                Username <span className="text-archtivy-primary">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={authInputClass}
                  placeholder="your-username"
                  pattern="[a-z0-9-]+"
                  title="Lowercase letters, numbers, hyphens only"
                  required
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={suggestUsername}
                  disabled={suggesting || !displayName.trim()}
                >
                  {suggesting ? "…" : "Suggest"}
                </Button>
              </div>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                Profile URL: /u/{username || "username"}
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <div>
            <label htmlFor="role" className={authLabelClass}>
              Role <span className="text-archtivy-primary">*</span>
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => {
                const v = (e.target.value || "") as ProfileRole | "";
                setRole(v);
              setDesignerDiscipline("");
              setBrandType("");
              setReaderType("");
              }}
              className={authInputClass}
              required
            >
              <option value="">Choose a role</option>
              <option value="designer">Designer</option>
              <option value="brand">Brand</option>
              <option value="reader">Reader</option>
            </select>
          </div>
        )}

        {step === 3 && (
          <>
            {role === "designer" && (
              <div>
                <label htmlFor="designer_discipline" className={authLabelClass}>
                  Discipline / Title <span className="text-archtivy-primary">*</span>
                </label>
                <select
                  id="designer_discipline"
                  value={designerDiscipline}
                  onChange={(e) => setDesignerDiscipline(e.target.value)}
                  className={authInputClass}
                  required
                >
                  <option value="">Choose a discipline</option>
                  {designerTitles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {role === "brand" && (
              <div>
                <label htmlFor="brand_type" className={authLabelClass}>
                  Brand type <span className="text-archtivy-primary">*</span>
                </label>
                <select
                  id="brand_type"
                  value={brandType}
                  onChange={(e) => setBrandType(e.target.value)}
                  className={authInputClass}
                  required
                >
                  <option value="">Choose a brand type</option>
                  {brandTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {role === "reader" && (
              <div>
                <label htmlFor="reader_type" className={authLabelClass}>
                  Reader type <span className="text-archtivy-primary">*</span>
                </label>
                <select
                  id="reader_type"
                  value={readerType}
                  onChange={(e) => setReaderType(e.target.value)}
                  className={authInputClass}
                  required
                >
                  <option value="">Choose a reader type</option>
                  {readerTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <ProfileLocationPicker
                value={locationValue}
                onChange={setLocationValue}
                required
                label="Location"
                placeholder="Search for a city or place…"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="location_visibility"
                type="checkbox"
                checked={locationVisibility}
                onChange={(e) => setLocationVisibility(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-archtivy-primary focus:ring-archtivy-primary"
              />
              <label htmlFor="location_visibility" className="text-sm text-zinc-700 dark:text-zinc-300">
                Show my location on the map
              </label>
            </div>
          </>
        )}

        {error && (
          <ErrorMessage message={error} className="w-full" />
        )}

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button type="button" variant="secondary" onClick={handleBack}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
            >
              Continue
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !canProceedStep3}
            >
              {loading ? "Saving…" : "Complete"}
            </Button>
          )}
        </div>
      </form>
    </AuthSplitLayout>
  );
}
