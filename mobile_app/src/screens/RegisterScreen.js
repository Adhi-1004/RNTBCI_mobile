import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const { register, login, loading } = useAuth();

    const handleRegister = async () => {
        if (!username || !password) {
            Alert.alert("Error", "Please fill in required fields");
            return;
        }
        const result = await register(username, password, email, name);
        if (result.success) {
            // Auto Login
            const loginRes = await login(username, password);
            if (!loginRes.success) {
                Alert.alert("Success", "Account created! Please login.");
                navigation.goBack();
            }
            // If login success, AuthContext will update state and App.js will switch to Home
        } else {
            Alert.alert("Registration Failed", result.error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Create Account</Text>

                <TextInput style={styles.input} placeholder="Name (Optional)" value={name} onChangeText={setName} />
                <TextInput style={styles.input} placeholder="Email (Optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Username *" value={username} onChangeText={setUsername} autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Password *" value={password} onChangeText={setPassword} secureTextEntry />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>{loading ? "Creating..." : "Register"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.link}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center' },
    content: { padding: 20 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 30, textAlign: 'center' },
    input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    button: { backgroundColor: '#0066cc', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    link: { marginTop: 20, textAlign: 'center', color: '#0066cc' },
});
