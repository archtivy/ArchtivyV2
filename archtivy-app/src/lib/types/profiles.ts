import type { ProfileRole } from "@/lib/auth/config";
import type { DesignerTitle } from "@/lib/auth/config";

export type CreatedBy = "archtivy" | "user";
export type ClaimStatus = "unclaimed" | "pending" | "claimed";

export interface Profile {
  id: string;
  clerk_user_id: string;
  role: ProfileRole;
  /** Admin privilege flag (role remains designer/brand per DB constraint). */
  is_admin?: boolean;
  display_name: string | null;
  username: string | null;
  location_place_name: string | null;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_mapbox_id: string | null;
  location_visibility?: "public" | "private";
  bio: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  avatar_url: string | null;
  designer_discipline: string | null;
  brand_type: string | null;
  reader_type: string | null;
  show_designer_discipline?: boolean;
  show_brand_type?: boolean;
  created_by?: CreatedBy;
  owner_user_id?: string | null;
  claim_status?: ClaimStatus;
  created_at: string;
  updated_at: string;
  /** When set, user is soft-disabled (admin only). */
  disabled_at?: string | null;
  /** When true, profile is hidden from public listings and /u/[username]. */
  is_hidden?: boolean;
  /** When true, this is the user's default profile (one per owner). */
  is_primary?: boolean;
}

export type ClaimRequestStatus = "pending" | "approved" | "rejected";

export interface ProfileClaimRequest {
  id: string;
  profile_id: string;
  requester_user_id: string;
  requester_name: string | null;
  requester_email: string | null;
  requester_website: string | null;
  proof_note: string | null;
  requested_username: string | null;
  message: string | null;
  status: ClaimRequestStatus;
  admin_note: string | null;
  decision_note: string | null;
  reviewed_by_admin_id: string | null;
  reviewed_by_clerk_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type ProfileUpdateInput = Partial<
  Pick<
    Profile,
    | "display_name"
    | "username"
    | "location_place_name"
    | "location_city"
    | "location_country"
    | "location_lat"
    | "location_lng"
    | "location_mapbox_id"
    | "location_visibility"
    | "bio"
    | "website"
    | "instagram"
    | "linkedin"
    | "avatar_url"
    | "designer_discipline"
    | "brand_type"
    | "reader_type"
    | "show_designer_discipline"
    | "show_brand_type"
  >
>;

export type ProfileCreateInput = Pick<Profile, "clerk_user_id" | "role"> &
  Partial<
    Pick<
      Profile,
      | "display_name"
      | "username"
      | "location_city"
      | "location_country"
      | "bio"
      | "website"
      | "instagram"
      | "linkedin"
      | "avatar_url"
      | "designer_discipline"
      | "brand_type"
      | "reader_type"
    >
  >;
