import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, StatusBar } from 'react-native';
import client from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { Car, ArrowRight, Upload, Ruler, Box } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

export default function HomeScreen({ navigation }) {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCars();
    }, []);

    const fetchCars = async () => {
        try {
            const response = await client.get('/cars');
            setCars(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCustomSelect = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (result.canceled) return;
            const file = result.assets[0];
            if (!file.name.toLowerCase().endsWith('.stl')) {
                Alert.alert("Invalid File", "Please select a .stl file");
                return;
            }
            const base64 = await readAsStringAsync(file.uri, {
                encoding: 'base64'
            });
            navigation.navigate("Dashboard", {
                car: "Custom",
                customTrunkFile: base64,
                customDimensions: "Custom"
            });
        } catch (err) {
            console.error("Picker Error", err);
            Alert.alert("Error", "Failed to pick file");
        }
    };

    const renderCar = ({ item, index }) => {
        const isCustom = item.name === 'Custom Vehicle';
        return (
            <Animated.View entering={FadeInUp.delay(index * 150).springify()}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => isCustom ? handleCustomSelect() : navigation.navigate("Dashboard", { car: item.name })}
                    style={styles.techCard}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.iconBox}>
                            {isCustom ? <Upload color={COLORS.accent} size={24} /> : <Car color={COLORS.accent} size={24} />}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.techTitle}>{item.name}</Text>
                            <Text style={styles.techSubtitle}>{isCustom ? "Upload your own STL model" : item.description}</Text>
                        </View>
                        <ArrowRight color={COLORS.text.light} size={20} />
                    </View>

                    {!isCustom && (
                        <View style={styles.specsGrid}>
                            <View style={styles.specItem}>
                                <Box size={14} color={COLORS.text.muted} style={{ marginRight: 6 }} />
                                <Text style={styles.specLabel}>VOL:</Text>
                                <Text style={styles.specValue}>{item.volume}</Text>
                            </View>
                            <View style={styles.separator} />
                            <View style={styles.specItem}>
                                <Ruler size={14} color={COLORS.text.muted} style={{ marginRight: 6 }} />
                                <Text style={styles.specLabel}>DIM:</Text>
                                <Text style={styles.specValue}>{item.dimensions}</Text>
                            </View>
                        </View>
                    )}

                    {/* Tech Decor elements */}
                    <View style={styles.cornerMarkerTL} />
                    <View style={styles.cornerMarkerTR} />
                    <View style={styles.cornerMarkerBL} />
                    <View style={styles.cornerMarkerBR} />
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const ListHeader = () => (
        <View style={styles.headerContainer}>
            <Animated.View entering={FadeInDown.duration(600)} style={styles.headerTextContainer}>
                <Text style={styles.pageOverline}>PROJECT CONFIGURATION</Text>
                <Text style={styles.pageTitle}>Select Vehicle Platform</Text>
            </Animated.View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={cars}
                    renderItem={renderCar}
                    keyExtractor={item => item.name}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={ListHeader}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xxl
    },
    listHeader: {
        marginTop: SPACING.xl,
        marginBottom: SPACING.lg,
    },
    pageOverline: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.text.muted,
        letterSpacing: 1.5,
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: -0.5,
    },
    headerContainer: {
        marginTop: SPACING.xl,
        marginBottom: SPACING.lg,
    },
    headerTextContainer: {
        flex: 1,
    },

    // Tech Card Styles
    techCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.md,
        marginBottom: SPACING.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...SHADOWS.card,
        position: 'relative',
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: SPACING.md,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.sm,
        backgroundColor: '#111827', // Dark box for icon
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.accent,
    },
    techTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 2,
    },
    techSubtitle: {
        fontSize: 13,
        color: COLORS.text.muted,
    },
    specsGrid: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        padding: SPACING.sm,
        borderRadius: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    specItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    specLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.text.muted,
        marginRight: 4,
    },
    specValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    separator: {
        width: 1,
        height: '100%',
        backgroundColor: '#E5E7EB',
        marginHorizontal: SPACING.sm,
    },

    // Decorative Markers
    cornerMarkerTL: { position: 'absolute', top: 0, left: 0, width: 8, height: 8, borderTopWidth: 2, borderLeftWidth: 2, borderColor: COLORS.accent },
    cornerMarkerTR: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, borderColor: COLORS.accent },
    cornerMarkerBL: { position: 'absolute', bottom: 0, left: 0, width: 8, height: 8, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: COLORS.accent },
    cornerMarkerBR: { position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderBottomWidth: 2, borderRightWidth: 2, borderColor: COLORS.accent },
});
