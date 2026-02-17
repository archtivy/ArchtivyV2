/** Shared types and constants for saved folders (boards). Used by server actions and UI. */

export type FolderRow = { id: string; name: string; sort_order: number };

export type FolderWithMeta = FolderRow & {
  item_count: number;
  cover_image_url: string | null;
  updated_at: string | null;
  is_public: boolean;
  share_slug: string | null;
};

/** Error message returned when folders/folder_items tables are missing (schema cache). */
export const FOLDERS_SETUP_ERROR =
  "Saved boards are not set up yet. Run the database migration in Supabase (docs/saved-folders-tables.sql), then reload the schema cache.";
