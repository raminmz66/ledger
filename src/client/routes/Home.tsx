import { Link } from 'react-router'
import copy from '../copy'

export default function Home() {
  return (
    <main className="page">
      <Link to="/settings" className="icon-link" aria-label={copy.settings.title}>⚙</Link>
      <h1 className="wordmark">{copy.appName}</h1>
      <p className="tagline">{copy.tagline}</p>
      <p>{copy.comingSoon}</p>
    </main>
  )
}
