import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './data/store'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import NewRoast from './pages/NewRoast'
import LiveRoast from './pages/LiveRoast'
import Roasts from './pages/Roasts'
import RoastDetail from './pages/RoastDetail'
import RoastEdit from './pages/RoastEdit'
import TastingForm from './pages/TastingForm'
import Beans from './pages/Beans'
import BeanDetail from './pages/BeanDetail'
import BeanEdit from './pages/BeanEdit'
import Guide from './pages/Guide'
import Settings from './pages/Settings'
import Library from './pages/Library'
import PublicRoast from './pages/PublicRoast'
import PublicShell from './components/PublicShell'

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </StoreProvider>
  )
}

function Gate() {
  const { authReady, session } = useStore()
  if (!authReady) return <Splash />
  if (!session) {
    // Signed out: the guide and the public library are open to anyone.
    return (
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/guide" element={<Guide />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/:id" element={<PublicRoast />} />
        </Route>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route path="/roast/live" element={<LiveRoast />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/roast/new" element={<NewRoast />} />
        <Route path="/roasts" element={<Roasts />} />
        <Route path="/roasts/:id" element={<RoastDetail />} />
        <Route path="/roasts/:id/edit" element={<RoastEdit />} />
        <Route path="/roasts/:id/taste" element={<TastingForm />} />
        <Route path="/roasts/:id/taste/:tastingId" element={<TastingForm />} />
        <Route path="/beans" element={<Beans />} />
        <Route path="/beans/new" element={<BeanEdit />} />
        <Route path="/beans/:id" element={<BeanDetail />} />
        <Route path="/beans/:id/edit" element={<BeanEdit />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/library" element={<Library />} />
        <Route path="/library/:id" element={<PublicRoast />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <img src="/icons/icon-192.png" alt="" className="h-20 w-20 animate-pulse rounded-3xl" />
    </div>
  )
}
