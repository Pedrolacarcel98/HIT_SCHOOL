import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface ChildStudent {
  id: string;
  email: string;
  role: string;
  monthlyFee?: number | null;
  courseDurationMonths?: number | null;
  profile?: {
    firstName?: string;
    lastName?: string;
    dni?: string;
    phone?: string;
  } | null;
  enrollments?: Array<{ courseId: string; course: { id: string; title: string } }>;
}

export interface ParentUser {
  id: string;
  email: string;
  role: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    dni?: string;
    phone?: string;
  } | null;
  children?: ChildStudent[];
}

interface ParentContextType {
  parentUser: ParentUser | null;
  childrenList: ChildStudent[];
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  selectedStudent: ChildStudent | null;
  refreshParentData: () => Promise<void>;
  parentName: string;
}

const ParentContext = createContext<ParentContextType>({
  parentUser: null,
  childrenList: [],
  selectedStudentId: '',
  setSelectedStudentId: () => {},
  selectedStudent: null,
  refreshParentData: async () => {},
  parentName: ''
});

export const ParentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [parentUser, setParentUser] = useState<ParentUser | null>(null);
  const [childrenList, setChildrenList] = useState<ChildStudent[]>([]);
  const [selectedStudentId, setSelectedStudentIdState] = useState<string>(() => {
    return localStorage.getItem('selectedStudentId') || '';
  });

  const setSelectedStudentId = (id: string) => {
    setSelectedStudentIdState(id);
    if (id) {
      localStorage.setItem('selectedStudentId', id);
    } else {
      localStorage.removeItem('selectedStudentId');
    }
  };

  const refreshParentData = useCallback(async () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    if (!token || role !== 'PARENT') return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setParentUser(data);
        const kids = data.children || [];
        setChildrenList(kids);

        // Si no hay id seleccionado o no existe en la lista, elegir el primer hijo
        if (kids.length > 0) {
          const storedId = localStorage.getItem('selectedStudentId');
          const exists = kids.some((k: ChildStudent) => k.id === storedId);
          if (!storedId || !exists) {
            setSelectedStudentIdState(kids[0].id);
            localStorage.setItem('selectedStudentId', kids[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error al cargar datos del tutor:', err);
    }
  }, []);

  useEffect(() => {
    refreshParentData();
  }, []);

  const parentName = React.useMemo(() => {
    if (!parentUser) return 'Tutor / Padre';
    const first = parentUser.profile?.firstName?.trim();
    const last = parentUser.profile?.lastName?.trim();
    if (first || last) {
      return `${first || ''} ${last || ''}`.trim();
    }
    return parentUser.email;
  }, [parentUser]);

  const selectedStudent = React.useMemo(() => {
    return childrenList.find(c => c.id === selectedStudentId) || (childrenList.length > 0 ? childrenList[0] : null);
  }, [childrenList, selectedStudentId]);

  return (
    <ParentContext.Provider
      value={{
        parentUser,
        childrenList,
        selectedStudentId,
        setSelectedStudentId,
        selectedStudent,
        refreshParentData,
        parentName
      }}
    >
      {children}
    </ParentContext.Provider>
  );
};

export const useParent = () => useContext(ParentContext);
