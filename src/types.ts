export type SellerProfile = {
  id: string
  user_id: string
  store_name: string
  slug: string
  seller_name: string | null
  description: string | null
  seller_category: string | null
  profile_image_url: string | null
  cover_image_url: string | null
  location: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  followers_count: number
  is_verified: boolean
  is_suspended: boolean
}
