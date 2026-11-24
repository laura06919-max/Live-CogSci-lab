/** /home just forwards to the host dashboard — the app's real start page. */
import { Navigate } from 'react-router-dom'

export default function HomePage() {
  return <Navigate to="/host" replace />
}
