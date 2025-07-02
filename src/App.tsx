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
            <Route path="/challenge/:id" element={<ChallengeMain />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
