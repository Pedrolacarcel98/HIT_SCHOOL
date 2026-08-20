import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import TeacherLayout from './components/TeacherLayout';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentsManagement from './pages/StudentsManagement';
import MaterialsManagement from './pages/MaterialsManagement';
import CourseView from './pages/CourseView';
import StudentDashboard from './pages/StudentDashboard';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Rutas de Profesor con Barra Lateral Global */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="materials" element={<MaterialsManagement />} />
          <Route path="students" element={<StudentsManagement />} />
          <Route path="course/:id" element={<CourseView />} />
        </Route>

        <Route path="/student" element={<StudentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
