import copy from '../copy'

export default function Home() {
  return (
    <main className="page">
      <h1 className="wordmark">{copy.appName}</h1>
      <p className="tagline">{copy.tagline}</p>
      <p>{copy.comingSoon}</p>
    </main>
  )
}
