import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar, ImageBackground, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { ArrowRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading } = useAuth();

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        const result = await login(username, password);
        if (!result.success) {
            Alert.alert("Login Failed", result.error);
        }
    };

    return (
        <ImageBackground
            source={require('../../assets/images/digital_trunk_hero.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Dark Overlay for readability */}
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.glassCard}>
                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>Welcome Back</Text>
                            <Text style={styles.subtitle}>Sign in to your account</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your username"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>{loading ? "Signing In..." : "Login"}</Text>
                            {!loading && <ArrowRight color="#000" size={20} />}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.linkContainer}>
                            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: width,
        height: height,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)', // Darkens the background image
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: SPACING.lg
    },
    glassCard: {
        backgroundColor: 'rgba(20, 20, 20, 0.85)', // Semi-transparent dark card
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        ...SHADOWS.card,
    },
    headerContainer: {
        marginBottom: SPACING.xl,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: SPACING.xs,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center'
    },
    inputGroup: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E5E7EB', // Light gray text
        marginBottom: SPACING.xs,
        marginLeft: 4,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.08)', // Translucent input
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        fontSize: 16,
        color: '#FFFFFF',
    },
    button: {
        backgroundColor: COLORS.accent, // Renault Yellow
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.lg,
        gap: SPACING.sm,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: {
        color: '#000000', // Black text on yellow button
        fontSize: 16,
        fontWeight: '700',
    },
    linkContainer: {
        marginTop: SPACING.xl,
        alignItems: 'center',
    },
    linkText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    linkBold: {
        color: COLORS.accent,
        fontWeight: '700',
    }
});
