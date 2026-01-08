import React, { createContext, useState, useContext } from 'react';
import client from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    const login = async (username, password) => {
        setLoading(true);
        try {
            const res = await client.post('/auth/login', { username, password });
            if (res.data.success) {
                // In a real app, you'd fetch user details here or use the token
                setUser({ username });
                // We use a mock token since backend doesn't return one yet
                return { success: true };
            }
        } catch (e) {
            console.error(e);
            return { success: false, error: e.response?.data?.detail || 'Login failed' };
        } finally {
            setLoading(false);
        }
    };

    const register = async (username, password, email, name) => {
        setLoading(true);
        try {
            const res = await client.post('/auth/register', { username, password, email, name });
            if (res.data.success) {
                return { success: true };
            }
        } catch (e) {
            console.error(e);
            return { success: false, error: e.response?.data?.detail || 'Registration failed' };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
    };

    const getMockToken = () => user ? "mock-jwt-token" : null;

    return (
        <AuthContext.Provider value={{ user, token: getMockToken(), login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
