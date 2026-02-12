-- Backfill image_ai.listing_id for product rows where it is NULL.
-- Run once after fixing the pipeline so new rows get listing_id; this updates existing rows.
-- product_images.id = image_ai.image_id and source = 'product' -> listing_id = product_images.product_id.

update public.image_ai ia
set listing_id = pi.product_id,
    listing_type = 'product'
from public.product_images pi
where ia.image_id = pi.id
  and ia.source = 'product'
  and ia.listing_id is null;
