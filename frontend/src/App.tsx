import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import TeacherLayout from './components/TeacherLayout';
import StudentLayout from './components/StudentLayout';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentGrades from './pages/StudentGrades';
import StudentsManagement from './pages/StudentsManagement';
import MaterialsManagement from './pages/MaterialsManagement';
import CourseView from './pages/CourseView';
import StudentCourseView from './pages/StudentCourseView';
import StudentDashboard from './pages/StudentDashboard';
import StudentPayments from './pages/StudentPayments';
import TeacherPayments from './pages/TeacherPayments';
import Chat from './pages/Chat';
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
          <Route path="payments" element={<TeacherPayments />} />
          <Route path="chat" element={<Chat role="TEACHER" />} />
          <Route path="course/:id" element={<CourseView />} />
        </Route>

        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentPayments />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="course/:id" element={<StudentCourseView />} />
          <Route path="chat" element={<Chat role="STUDENT" />} />
          <Route path="grades" element={<StudentGrades />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
