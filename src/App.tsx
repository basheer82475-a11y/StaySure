import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import IntroSplash from '@/components/IntroSplash'

import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import PostLogin from '@/pages/PostLogin'

import FindPG from '@/pages/student/FindPG'
import PgDetails from '@/pages/student/PgDetails'
import StudentDashboard from '@/pages/student/StudentDashboard'

import PartnerDashboard from '@/pages/partner/PartnerDashboard'
import PartnerPGs from '@/pages/partner/PartnerPGs'
import AddEditPG from '@/pages/partner/AddEditPG'
import ManageRooms from '@/pages/partner/ManageRooms'
import PartnerRequests from '@/pages/partner/PartnerRequests'

import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminPGs from '@/pages/admin/AdminPGs'
import AdminRequests from '@/pages/admin/AdminRequests'

export default function App() {
  return (
    <>
      <IntroSplash />
      <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/post-login" element={<PostLogin />} />
      <Route path="/find-pg" element={<FindPG />} />
      <Route path="/pg/:id" element={<PgDetails />} />

      {/* Student */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allow={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/requests"
        element={
          <ProtectedRoute allow={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Partner */}
      <Route
        path="/partner/dashboard"
        element={
          <ProtectedRoute allow={['partner']}>
            <PartnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/pgs"
        element={
          <ProtectedRoute allow={['partner']}>
            <PartnerPGs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/pgs/new"
        element={
          <ProtectedRoute allow={['partner']}>
            <AddEditPG />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/pgs/:id/edit"
        element={
          <ProtectedRoute allow={['partner']}>
            <AddEditPG />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/pgs/:id/rooms"
        element={
          <ProtectedRoute allow={['partner']}>
            <ManageRooms />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/requests"
        element={
          <ProtectedRoute allow={['partner']}>
            <PartnerRequests />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allow={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allow={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pgs"
        element={
          <ProtectedRoute allow={['admin']}>
            <AdminPGs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <ProtectedRoute allow={['admin']}>
            <AdminRequests />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Landing />} />
      </Routes>
    </>
  )
}
