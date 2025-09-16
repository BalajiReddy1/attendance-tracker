
import AttendanceApp from "./AttendanceApp";
import AuthPage from "./AuthPage";
import { useEffect, useState } from "react";
import { auth } from "./firebase";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div style={{textAlign:'center',marginTop:'4rem',fontSize:'1.2rem'}}>Loading...</div>;
  if (!user) return <AuthPage onAuth={() => setUser(auth.currentUser)} />;
  return <AttendanceApp user={user} />;
}
