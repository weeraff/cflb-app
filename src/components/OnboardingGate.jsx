// src/components/OnboardingGate.jsx
import { useAuth } from '../context/AuthContext'
import useMyProfile from '../hooks/useMyProfile'
import OnboardingFlow from './OnboardingFlow'

// Fires the first time a signed-in user has no profiles row yet, no matter
// which tab they land on after Google sign-in — replaces the old inline
// "pick a display name" card that only ever showed up on Predictions.
export default function OnboardingGate({ children }) {
  const auth = useAuth()
  const { profile, setProfile, checked } = useMyProfile(auth?.user?.id)

  const needsOnboarding = Boolean(auth?.user) && checked && !profile

  if (needsOnboarding) {
    return <OnboardingFlow userId={auth.user.id} onComplete={(row) => setProfile(row)} />
  }

  return children
}
