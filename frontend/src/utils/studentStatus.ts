export const isActiveStudent = (student: { status: string }) => student.status === 'ACTIVE';

export const isActiveEnrollment = (enrollment: {
  status: string;
  endDate: string | null;
  student: { status: string };
}) => isActiveStudent(enrollment.student) && enrollment.status === 'ACTIVE' && !enrollment.endDate;

export const getActiveStudentEnrollments = <T extends {
  studentId: string;
  startDate: string;
  status: string;
  endDate: string | null;
  student: { status: string };
}>(enrollments: T[]): T[] => {
  const byStudent = new Map<string, T>();
  for (const enrollment of enrollments.filter(isActiveEnrollment)) {
    const previous = byStudent.get(enrollment.studentId);
    if (!previous || new Date(enrollment.startDate) > new Date(previous.startDate)) {
      byStudent.set(enrollment.studentId, enrollment);
    }
  }
  return [...byStudent.values()];
};
