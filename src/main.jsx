import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// ── Data + utilities (must register window.GB before anything renders) ──
import './data/index.js'
import './utils/usmap.js'

// Shared motion system (tokens + reduced-motion hook), before any UI uses it.
import './lib/motion.js'

// Responsive breakpoints + useIsMobile()/useIsTablet(), before any chrome that
// branches on viewport (M1 nav). Registers window.useIsMobile, etc.
import './lib/breakpoints.js'

// Plan/tier gating helper (V2.3). Registers window.PLAN before screens gate.
import './lib/plan.js'

// Shared UI primitives + chrome, then the runtime store.
import './components/Logo.jsx' // brand mark, single source of truth (window.Logo)
import './components/index.js'
import './components/Autocomplete.jsx'
import './components/SavedSearches.jsx'
import './store/store.jsx'

// Screens (load order matters: producers before consumers).
import './screens/Auth.jsx'
import './screens/Onboarding.jsx'
import './components/PostComposer.jsx'
import './screens/MemberHome.jsx'
import './screens/Vouches.jsx'
import './screens/Profile.jsx'
import './screens/ProfileEditor.jsx'
import './screens/FamilyTree.jsx'
import './screens/IntroFlow.jsx'
import './screens/ChapterTimeline.jsx'
import './screens/ChapterPage.jsx'
import './screens/Mentorship.jsx' // must load after ChapterPage (consumes its Seg export)
import './screens/Network.jsx'
import './screens/ChaptersDirectory.jsx'
import './screens/SearchResults.jsx'
import './screens/AlumniMap.jsx'
import './screens/Jobs.jsx'
import './screens/MessagesAlerts.jsx'
import './components/ChapterAdminTools.jsx'
import './components/RecruiterJobForm.jsx'
import './screens/AdminConsole.jsx'
import './screens/IntroRequests.jsx'
import './screens/RecruiterConsole.jsx'
import './screens/Pricing.jsx'

import { AuthProvider } from './lib/useAuth.jsx'
import { ProfileProvider } from './lib/useProfile.jsx'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </AuthProvider>
  </React.StrictMode>
)
