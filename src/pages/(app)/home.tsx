/** /home forwards to the student's lab notebook, the app's signed-in start page. */
import { Navigate } from 'react-router-dom'

export default function HomePage() {
  return <Navigate to="/notebook" replace />
}
