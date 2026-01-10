import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { ChevronRight, Moon, Globe, Bell, Trash2, Info } from 'lucide-react-native';

export default function SettingsScreen() {
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [units, setUnits] = useState('Metric');

    const toggleUnits = () => {
        setUnits(prev => prev === 'Metric' ? 'Imperial' : 'Metric');
    };

    const clearCache = () => {
        Alert.alert(
            "Clear Cache",
            "Are you sure you want to clear temporary files?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Clear", onPress: () => Alert.alert("Success", "Cache cleared") }
            ]
        );
    };

    const SettingItem = ({ icon: Icon, title, value, type, onPress, danger }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={onPress}
            activeOpacity={type === 'switch' ? 1 : 0.7}
            disabled={type === 'switch'}
        >
            <View style={[styles.iconBox, danger && styles.dangerIconBox]}>
                <Icon size={20} color={danger ? COLORS.error : COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, danger && styles.dangerText]}>{title}</Text>
            </View>

            {type === 'switch' && (
                <Switch
                    value={value}
                    onValueChange={onPress}
                    trackColor={{ false: '#E5E7EB', true: COLORS.primary }}
                    thumbColor={'#FFFFFF'}
                />
            )}

            {type === 'value' && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.valueText}>{value}</Text>
                    <ChevronRight size={16} color={COLORS.text.muted} />
                </View>
            )}

            {type === 'link' && <ChevronRight size={16} color={COLORS.text.muted} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionHeader}>Preferences</Text>
                <View style={styles.section}>
                    <SettingItem
                        icon={Moon}
                        title="Dark Mode"
                        type="switch"
                        value={darkMode}
                        onPress={() => setDarkMode(!darkMode)}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon={Bell}
                        title="Notifications"
                        type="switch"
                        value={notifications}
                        onPress={() => setNotifications(!notifications)}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon={Globe}
                        title="Units"
                        type="value"
                        value={units}
                        onPress={toggleUnits}
                    />
                </View>

                <Text style={styles.sectionHeader}>Data & Storage</Text>
                <View style={styles.section}>
                    <SettingItem
                        icon={Trash2}
                        title="Clear Cache"
                        type="link"
                        onPress={clearCache}
                        danger
                    />
                </View>

                <Text style={styles.sectionHeader}>About</Text>
                <View style={styles.section}>
                    <SettingItem
                        icon={Info}
                        title="Version"
                        type="value"
                        value="1.0.0"
                        onPress={() => { }}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon={Info}
                        title="Terms of Service"
                        type="link"
                        onPress={() => { }}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text.muted,
        marginBottom: SPACING.sm,
        marginTop: SPACING.md,
        textTransform: 'uppercase',
    },
    section: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        ...SHADOWS.card,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: SPACING.md,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dangerIconBox: {
        backgroundColor: '#FEF2F2',
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.text.main,
    },
    dangerText: {
        color: COLORS.error,
    },
    valueText: {
        fontSize: 14,
        color: COLORS.text.muted,
        marginRight: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
    },
});
