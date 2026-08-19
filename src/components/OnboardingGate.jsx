// src/components/OnboardingGate.jsx
import { useAuth } from '../context/AuthContext'
import useMyProfile from '../hooks/useMyProfile'
import OnboardingFlow from './OnboardingFlow'

// Fires for a signed-in user with no role set yet, no matter which tab they
// land on after Google sign-in — replaces the old inline "pick a display
// name" card that only ever showed up on Predictions. Checks role, not row
// existence: a profiles row can already exist (from before this onboarding
// flow shipped, when signing in only asked for a display name) with role
// still null, and that user still needs the wizard.
export default function OnboardingGate({ children }) {
  const auth = useAuth()
  const { profile, setProfile, checked } = useMyProfile(auth?.user?.id)

  const needsOnboarding = Boolean(auth?.user) && checked && !profile?.role

  if (needsOnboarding) {
    return <OnboardingFlow userId={auth.user.id} onComplete={(row) => setProfile(row)} />
  }

  return children
}
