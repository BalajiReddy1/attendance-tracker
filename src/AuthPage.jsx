
export default function AuthPage({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onAuth();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <style>{`
        .auth-bg { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 100%); }
        .auth-card { background: #fff; border-radius: 1.5rem; box-shadow: 0 4px 32px #0001; padding: 2rem 1.5rem; max-width: 350px; width: 100%; margin: 1rem; }
        .auth-title { font-size: 2rem; font-weight: 800; color: #3730a3; margin-bottom: 1.5rem; text-align: center; }
        .auth-input-row { margin-bottom: 1rem; }
        .auth-input { width: 100%; padding: 0.7rem 1rem; border-radius: 0.7rem; border: 1px solid #c7d2fe; font-size: 1rem; box-sizing: border-box; }
        .auth-error { color: #ef4444; margin-bottom: 1rem; text-align: center; }
        .auth-btn { width: 100%; background: linear-gradient(90deg, #6366f1, #60a5fa); color: #fff; border: none; border-radius: 0.7rem; padding: 0.7rem 1.5rem; font-weight: 600; font-size: 1rem; cursor: pointer; box-shadow: 0 2px 8px #0001; margin-bottom: 1rem; transition: background 0.2s; }
        .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-btn:hover:not(:disabled) { background: linear-gradient(90deg, #4f46e5, #2563eb); }
        .auth-switch { text-align: center; }
        .auth-switch span { color: #3730a3; font-size: 0.95rem; }
        .auth-switch button { background: none; border: none; color: #6366f1; font-weight: 600; margin-left: 8px; cursor: pointer; font-size: 0.95rem; }
        @media (max-width: 500px) {
          .auth-card { max-width: 98vw; padding: 1.2rem 0.7rem; }
          .auth-title { font-size: 1.5rem; }
          .auth-input { font-size: 0.95rem; padding: 0.6rem 0.7rem; }
        }
      `}</style>
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2 className="auth-title">{isLogin ? "Login" : "Sign Up"}</h2>
        <div className="auth-input-row">
          <input
            className="auth-input"
            type="email"
            placeholder="College Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="auth-input-row">
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" disabled={loading} className="auth-btn">
          {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
        </button>
        <div className="auth-switch">
          <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
          <button type="button" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
}
