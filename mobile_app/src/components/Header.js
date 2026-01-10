import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar, Image, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS, RADIUS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, History } from 'lucide-react-native';

const LogoImage = require('../../assets/images/renault_logo_new.png');

export default function Header() {
    const navigation = useNavigation();
    const route = useRoute();
    const { token, user, logout } = useAuth();
    const [showProfile, setShowProfile] = useState(false);

    const isLanding = route.name === 'Landing';

    const handleLoginNavigate = () => {
        navigation.navigate('Login');
    };

    const handleLogout = () => {
        setShowProfile(false);
        logout();
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

                    {/* Right Action */}
                    {!token ? (
                        // Show Login button if not logged in and not on Landing (or always on Landing if preferred)
                        // logic retained: show login button if not authenticated
                        <TouchableOpacity style={styles.loginBtn} onPress={handleLoginNavigate}>
                            <Text style={styles.loginText}>Login</Text>
                        </TouchableOpacity>
                    ) : (
                        // Show Profile Icon if logged in
                        <TouchableOpacity style={styles.profileIconBtn} onPress={() => setShowProfile(true)}>
                            <User size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                    )}

                </View>
            </SafeAreaView>

            {/* Profile Modal */}
            <Modal
                visible={showProfile}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowProfile(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowProfile(false)}
                >
                    <View style={styles.menuContainer}>
                        {/* Triangle/Arrow */}
                        <View style={styles.menuArrow} />

                        <View style={styles.menuHeader}>
                            <View style={styles.avatarMini}>
                                <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || "U"}</Text>
                            </View>
                            <View>
                                <Text style={styles.menuUsername}>{user?.username || "Guest"}</Text>
                                <Text style={styles.menuRole}>Logistics Engineer</Text>
                            </View>
                        </View>

                        <View style={styles.dividerH} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => { setShowProfile(false); navigation.navigate('History'); }}
                        >
                            <History size={18} color={COLORS.text.main} />
                            <Text style={styles.menuItemText}>Packing History</Text>
                        </TouchableOpacity>

                        <View style={styles.dividerH} />

                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                            <LogOut size={18} color={COLORS.error} />
                            <Text style={[styles.menuItemText, { color: COLORS.error }]}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
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
        elevation: 4,
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
        width: 120,
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
    profileIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 55 : 95, // Position below header
        paddingRight: SPACING.lg,
    },
    menuContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        width: 220,
        ...SHADOWS.card,
        padding: SPACING.sm,
        elevation: 5,
    },
    menuArrow: {
        position: 'absolute',
        top: -6,
        right: 14,
        width: 12,
        height: 12,
        backgroundColor: COLORS.surface,
        transform: [{ rotate: '45deg' }],
        borderTopWidth: 1, // Optional: if menu has border
        borderLeftWidth: 1,
        borderColor: 'transparent', // or match menu border
        shadowOpacity: 0.1,
    },
    menuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        gap: SPACING.sm,
    },
    avatarMini: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: COLORS.accent,
        fontWeight: 'bold',
        fontSize: 14,
    },
    menuUsername: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text.main,
    },
    menuRole: {
        fontSize: 10,
        color: COLORS.text.muted,
    },
    dividerH: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        gap: SPACING.md,
        borderRadius: RADIUS.sm,
    },
    menuItemText: {
        fontSize: 14,
        color: COLORS.text.main,
        fontWeight: '500',
    }
});


