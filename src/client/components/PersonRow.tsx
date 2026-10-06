import { Link } from 'react-router'
import copy from '../copy'
import { balanceView, formatToman } from '../format/money'

export function PersonRow({ id, name, balance }: { id: string; name: string; balance: number }) {
  const { kind, amount } = balanceView(balance)
  const label = kind === 'owed' ? `${formatToman(amount)} ${copy.common.toman} ${copy.home.owedSuffix}`
    : kind === 'owe' ? `${formatToman(amount)} ${copy.common.toman} ${copy.home.oweSuffix}`
    : copy.home.settled
  return (
    <Link to={`/people/${id}`} className="list-row">
      <bdi className="row-name">{name}</bdi>
      <span className={`is-${kind}`}>{label}</span>
    </Link>
  )
}
