import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar, Image } from 'react-native'; // Added Image
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const LogoImage = require('../../assets/images/renault_logo_new.png'); // Correct placement

export default function Header() {
    const navigation = useNavigation();
    const route = useRoute();
    const { token, logout } = useAuth();

    // Don't show header on specific screens if needed (though user asked for "all pages")
    // Usually, we might hide it on Splash or similar, but here we keep it.

    const isLanding = route.name === 'Landing';

    const handleAction = () => {
        if (token) {
            logout();
        } else {
            navigation.navigate('Login');
        }
    };

    return (
        <View style={styles.headerContainer}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <View style={styles.brandContainer}>
                        <Image
                            source={LogoImage}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                        <View style={styles.divider} />
                        <Text style={styles.systemTitle}>Trunk Packing System</Text>
                    </View>

                    {/* Right Action Button */}
                    {!isLanding && !token ? null : ( // Hide login button on Login/Register screens ideally?
                        // User said "if i click the login, it has to go to the login page" implies this button is visible on Landing.
                        // If already logged in, show Logout.
                        <TouchableOpacity
                            style={token ? styles.logoutBtn : styles.loginBtn}
                            onPress={handleAction}
                        >
                            <Text style={token ? styles.logoutText : styles.loginText}>
                                {token ? "Logout" : "Login"}
                            </Text>
                        </TouchableOpacity>
                    )}

                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        ...SHADOWS.card,
        elevation: 4, // distinct shadow
        zIndex: 100,
    },
    safeArea: {
        backgroundColor: COLORS.surface,
    },
    content: {
        height: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoImage: {
        width: 120, // Adjust based on aspect ratio
        height: 40,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
        marginHorizontal: SPACING.md,
    },
    systemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.main,
    },
    loginBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderRadius: 4,
    },
    loginText: {
        color: COLORS.surface,
        fontWeight: '700',
        fontSize: 14,
    },
    logoutBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderRadius: 4,
    },
    logoutText: {
        color: COLORS.surface,
        fontWeight: '700',
        fontSize: 14,
    }
});
