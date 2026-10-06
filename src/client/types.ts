export type Direction = 'paid' | 'received'
export type Tx = { id: string; direction: Direction; amount: number; date: string; note: string | null }
export type PersonDetail = { id: string; name: string; balance: number; transactions: Tx[] }
export type PersonSummary = { id: string; name: string; balance: number; lastActivity: string }
export type PeopleList = { totals: { owedToMe: number; iOwe: number }; people: PersonSummary[] }
