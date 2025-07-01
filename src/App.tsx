import { AuthProvider } from './contexts/AuthContext'
import Home from './components/Home'

function App() {
  return (
    <AuthProvider>
      <Home />
    </AuthProvider>
  )
}

export default App
