import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    const login = async (username) => {
        try {
            // Store the username in localStorage
            localStorage.setItem('username', username);
            setUser({ username });
            return true;
        } catch (error) {
            console.error('Login error:', error);
            throw 'Failed to join chat';
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('username');
    };

    // Check if user was previously logged in
    useEffect(() => {
        const savedUsername = localStorage.getItem('username');
        if (savedUsername) {
            setUser({ username: savedUsername });
        }
    }, []);

    const value = {
        user,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
