-- RPC: get product_id from image_ai.listing_id (no dependency on product_images).
-- Run in Supabase SQL Editor. Use after image_ai is populated from listing_images for both projects and products.

create or replace function public.match_product_images_by_embedding(
  query_embedding text,
  match_count int default 50
)
returns table (image_id uuid, product_id uuid, attrs jsonb, distance float)
language sql stable
as $$
  select ia.image_id,
         ia.listing_id as product_id,
         ia.attrs,
         (ia.embedding <=> query_embedding::vector(1536)) as distance
  from public.image_ai ia
  where ia.source = 'product'
    and ia.embedding is not null
    and ia.listing_id is not null
  order by ia.embedding <=> query_embedding::vector(1536)
  limit greatest(1, least(match_count, 500));
$$;
