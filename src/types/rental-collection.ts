export type CreateRentalCollection = {
  title: string
  handle?: string
  metadata?: Record<string, unknown>
}

export type UpdateRentalCollection = {
  title?: string
  handle?: string
  metadata?: Record<string, unknown>
}
