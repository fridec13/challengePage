import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'
import Home from './components/Home'
import LoginForm from './components/LoginForm'
import SignupForm from './components/SignupForm'
import Dashboard from './components/Dashboard'
import CreateChallenge from './components/CreateChallenge'
import CreateChallengeMissions from './components/CreateChallengeMissions'

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
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
