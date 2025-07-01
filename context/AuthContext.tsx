// context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../constants/firebaseConfig';

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Add a small delay to ensure auth is ready
    const setupAuth = async () => {
      try {
        // Wait a bit for auth to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            setUser(firebaseUser);
            if (firebaseUser) {
              const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
              if (userDoc.exists()) {
                setRole(userDoc.data().role);
              }
            } else {
              setRole(null);
            }
          } catch (error) {
            console.log('Auth state change error:', error);
          } finally {
            setLoading(false);
          }
        });

        return unsubscribe;
      } catch (error) {
        console.log('Auth setup error:', error);
        setLoading(false);
      }
    };

    let unsubscribe: (() => void) | undefined;
    
    setupAuth().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};