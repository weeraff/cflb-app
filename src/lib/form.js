// Shared by the standings table and the Champagne Nine wizard — both need
// a team's last-5 W/D/L, computed from the same `results` rows.
export function computeForm(team, results, competition) {
  return results
    .filter((r) => r.competition === competition && (r.home_team === team || r.away_team === team))
    .sort((a, b) => new Date(b.played_at) - new Date(a.played_at))
    .slice(0, 5)
    .reverse()
    .map((r) => {
      const isHome = r.home_team === team
      const gf = isHome ? r.home_score : r.away_score
      const ga = isHome ? r.away_score : r.home_score
      if (gf > ga) return 'W'
      if (gf < ga) return 'L'
      return 'D'
    })
}

export function findStandingPosition(team, standings, competition) {
  const row = standings.find((s) => s.competition === competition && s.team === team)
  return row?.position ?? null
}
