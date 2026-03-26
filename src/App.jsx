import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { SocketProvider } from './context/SocketContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ChatPage from './pages/ChatPage';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return user ? children : <Navigate to="/login" />;
};

function App() {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    return (
        <AuthProvider>
            <ChatProvider>
                <SocketProvider>
                    <Router>
                        <Toaster position="top-right" />
                        <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
                            <Routes>
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/signup" element={<SignupPage />} />
                                <Route
                                    path="/chat"
                                    element={
                                        <ProtectedRoute>
                                            <ChatPage darkMode={darkMode} setDarkMode={setDarkMode} />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route path="/" element={<Navigate to="/chat" />} />
                            </Routes>
                        </div>
                    </Router>
                </SocketProvider>
            </ChatProvider>
        </AuthProvider>
    );
}

export default App;
