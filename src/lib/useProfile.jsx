// useProfile.jsx: resolves the logged-in user's real profile from Supabase and
// hydrates the window.GB cache the screens read from.
//
// Runs once after auth resolves: claim-or-create the profile, load chapters +
// members into window.GB, and inject the viewer's identity (window.GB.ME /
// RECRUITER) so the existing chrome and screens find "me" without rewiring.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import { claimOrCreateProfile, getProfileByUser, hydrateCache } from './db.js'

const ProfileContext = createContext(null)

// Point the prototype's ME map (and RECRUITER object) at the real viewer so
// chrome.jsx (window.GB.ME[role], P(meId)) keeps working unchanged.
function injectIdentity(p) {
  if (!p) return
  window.GB.PEOPLE = window.GB.PEOPLE || {}
  if (!window.GB.PEOPLE[p.id]) window.GB.PEOPLE[p.id] = p
  window.GB.ME = { alumni: p.id, undergrad: p.id, admin: p.id, recruiter: p.id }
  if (p.role === 'recruiter') {
    window.GB.RECRUITER = {
      name: p.name || '', title: p.title || '', company: p.company || '',
      plan: '', location: p.location || '', hiringFor: p.seekingTags || [],
    }
  }
}

export function ProfileProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  const resolve = useCallback(async (u) => {
    setProfileLoading(true)
    setError(null)
    try {
      const p = await claimOrCreateProfile(u)
      await hydrateCache(p && p.id, p && p.role)
      injectIdentity(p)
      setProfile(p)
      return p
    } catch (e) {
      console.error('[useProfile] failed to resolve profile:', e)
      setError(e)
      setProfile(null)
      return null
    } finally {
      setProfileLoading(false)
      setReady(true)
    }
  }, [])

  // Re-fetch the viewer's profile + re-hydrate after a write (onboarding, edit, bond).
  const refreshProfile = useCallback(async () => {
    if (!user) return null
    const p = await getProfileByUser(user.id)
    await hydrateCache(p && p.id, p && p.role)
    injectIdentity(p)
    setProfile(p)
    return p
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (!user) { setProfile(null); setReady(true); return }
    setReady(false)
    resolve(user)
  }, [authLoading, user, resolve])

  const value = { profile, setProfile, profileLoading, ready, error, refreshProfile }
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within a <ProfileProvider>')
  return ctx
}
