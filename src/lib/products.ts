export type ProductListItem = {
  id: string
  name: string
  price: number
  discount_price: number | null
  status: string
  product_images: { image_url: string; sort_order: number }[] | null
  seller_profiles: { store_name: string } | null
}

export const PRODUCT_SELECT =
  'id, name, price, discount_price, status, product_images(image_url, sort_order), seller_profiles(store_name)'

export function mainImage(item: Pick<ProductListItem, 'product_images'>): string | null {
  const images = [...(item.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  return images[0]?.image_url ?? null
}

// Only keep digits so the number works in wa.me and tel: links.
export function cleanPhone(value: string | null | undefined): string {
  return (value ?? '').replace(/[^0-9]/g, '')
}
