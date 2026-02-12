export interface MatchItem {
  id: string;
  title: string;
  slug: string;
  primary_image: string | null;
  score: number;
  tier: "verified" | "possible";
  author?: string;
}
