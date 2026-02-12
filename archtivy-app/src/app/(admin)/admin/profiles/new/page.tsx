import { AdminPage } from "@/components/admin/AdminPage";
import { createProfileAndGo } from "@/app/(admin)/admin/_actions/profiles";

export default function AdminNewProfilePage() {
  async function action(formData: FormData) {
    "use server";
    const type = (formData.get("type") as string) ?? "designer";
    const name = (formData.get("name") as string) ?? "";
    const username = (formData.get("username") as string) ?? "";
    const location_city = (formData.get("location_city") as string) ?? "";
    const location_country = (formData.get("location_country") as string) ?? "";
    const website = (formData.get("website") as string) ?? "";
    const bio = (formData.get("bio") as string) ?? "";

    if (!["designer", "studio", "brand", "photographer"].includes(type)) {
      throw new Error("Invalid profile type");
    }

    const res = await createProfileAndGo({
      type: type as "designer" | "studio" | "brand" | "photographer",
      name,
      username,
      location_city,
      location_country,
      website,
      bio,
    });
    if (!res.ok) throw new Error(res.error);
  }

  return (
    <AdminPage title="Create Profile">
      <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-4">
        <form action={action} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-900">Type</label>
            <select
              name="type"
              defaultValue="designer"
              className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            >
              <option value="designer">Designer</option>
              <option value="studio">Studio</option>
              <option value="brand">Brand</option>
              <option value="photographer">Photographer</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-900">Name</label>
            <input
              name="name"
              placeholder="e.g. Studio MK27"
              className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-900">Username (public URL slug)</label>
            <input
              name="username"
              placeholder="e.g. studio-mk27"
              className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Leave empty to keep as Draft (not publicly discoverable by username).
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-zinc-900">City</label>
              <input
                name="location_city"
                className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-900">Country</label>
              <input
                name="location_country"
                className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-900">Website (optional)</label>
            <input
              name="website"
              placeholder="https://"
              className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-900">Bio (optional)</label>
            <textarea
              name="bio"
              rows={4}
              placeholder="Short bio..."
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:opacity-90"
          >
            Create
          </button>
        </form>
      </div>
    </AdminPage>
  );
}

