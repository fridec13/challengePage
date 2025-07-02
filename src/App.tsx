import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'
import Home from './components/Home'
import LoginForm from './components/LoginForm'
import SignupForm from './components/SignupForm'
import Dashboard from './components/Dashboard'
import CreateChallenge from './components/CreateChallenge'
import CreateChallengeMissions from './components/CreateChallengeMissions'
import CreateChallengeScoring from './components/CreateChallengeScoring'
import CreateChallengePrizes from './components/CreateChallengePrizes'
import JoinChallenge from './components/JoinChallenge'
import ChallengeMain from './components/ChallengeMain'
import ChallengeOverview from './components/ChallengeOverview'
import ChallengeParticipants from './components/ChallengeParticipants'
import ChallengeRules from './components/ChallengeRules'
import ChallengeResults from './components/ChallengeResults'
import ChallengeRanking from './components/ChallengeRanking'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/signup" element={<SignupForm />} />
          <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/create-challenge" element={<CreateChallenge />} />
            <Route path="/create-challenge/missions" element={<CreateChallengeMissions />} />
            <Route path="/create-challenge/scoring" element={<CreateChallengeScoring />} />
            <Route path="/create-challenge/prizes" element={<CreateChallengePrizes />} />
            <Route path="/join-challenge" element={<JoinChallenge />} />
                      <Route path="/challenge/:code" element={<ChallengeMain />} />
          <Route path="/challenge/:code/overview" element={<ChallengeOverview />} />
          <Route path="/challenge/:code/participants" element={<ChallengeParticipants />} />
                      <Route path="/challenge/:code/rules" element={<ChallengeRules />} />
            <Route path="/challenge/:code/ranking" element={<ChallengeRanking />} />
            <Route path="/challenge/:code/results" element={<ChallengeResults />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
