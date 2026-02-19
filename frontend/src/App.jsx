import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import StrategyEditor from './pages/StrategyEditor'
import StrategyView from './pages/StrategyView'
import TestPlanEditor from './pages/TestPlanEditor'
import SharedWithMe from './pages/SharedWithMe'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="strategy/new" element={<StrategyEditor />} />
          <Route path="strategy/:id" element={<StrategyView />} />
          <Route path="strategy/:id/edit" element={<StrategyEditor />} />
          <Route path="test-plan/new" element={<TestPlanEditor />} />
          <Route path="test-plan/:id" element={<TestPlanEditor />} />
          <Route path="shared" element={<SharedWithMe />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

