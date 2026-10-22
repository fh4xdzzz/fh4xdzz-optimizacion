export type StoreProduct = {
  id: number
  name: string
  slug: string
  description: string
  category: string
  price: number
  image_url: string | null
  product_type: 'digital' | 'physical'
  inventory_count: number | null
  is_active: boolean
  is_featured: boolean
  sort_order: number
  created_at?: string
  purchase_flow?: 'dulcan_license'
  purchase_available?: boolean
}

export type StoreCartItem = StoreProduct & { quantity: number }

export type StoreOrder = {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  items: Array<{ id: number; name: string; price: number; quantity: number }>
  total: number
  status: string
  stripe_session_id: string | null
  created_at: string
  paid_at: string | null
}
