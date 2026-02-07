// Types for ToGo event management

// A menu item that can be ordered
export type MenuItem = {
  id: string
  name: string
  price: number  // Price per unit in cents (e.g., 850 = 8.50€)
  description?: string
  category?: string
  available: boolean
}

// A single order line within a family order
export type OrderItem = {
  menuItemId: string
  quantity: number
}

// A family's complete order for a ToGo event
export type ToGoOrder = {
  id: string
  familyName: string
  time: string  // Pickup time, e.g., "12:30"
  items: OrderItem[]
  note?: string
  paid?: boolean
  pickedUp?: boolean
  createdAt?: string
}

// ToGo event configuration
export type ToGoEventConfig = {
  menuItems: MenuItem[]
  orders: ToGoOrder[]
}

// Extended EventItem type for ToGo support
export type ToGoEventItem = {
  id: string
  name: string
  eventDate?: string
  from?: string
  to?: string
  isToGo: true
  toGoConfig: ToGoEventConfig
  createdAt?: string
  lastModified?: string
}

// Helper to calculate order total
export function calculateOrderTotal(order: ToGoOrder, menuItems: MenuItem[]): number {
  return order.items.reduce((sum, item) => {
    const menuItem = menuItems.find(m => m.id === item.menuItemId)
    return sum + (menuItem ? menuItem.price * item.quantity : 0)
  }, 0)
}

// Helper to format price in EUR
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

// Generate unique ID
export function generateToGoId(prefix: string = 'tg'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
