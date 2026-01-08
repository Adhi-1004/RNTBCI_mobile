import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import Header from './src/components/Header';

import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';

import { useGLTF } from '@react-three/drei/native';

// Preload critical 3D assets
useGLTF.preload(require('./assets/renault_logo_3d.glb'));

const Stack = createStackNavigator();

function RootNavigator() {
    const { token } = useAuth();

    return (
        <Stack.Navigator
            screenOptions={{
                header: () => <Header />, // Global Custom Header
                headerMode: 'screen'
            }}
        >
            {!token ? (
                // Auth Stack
                <>
                    <Stack.Screen name="Landing" component={LandingScreen} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </>
            ) : (
                // App Stack
                <>
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
                </>
            )}
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <NavigationIndependentTree>
                <NavigationContainer>
                    <RootNavigator />
                    <StatusBar style="auto" />
                </NavigationContainer>
            </NavigationIndependentTree>
        </AuthProvider>
    );
}
