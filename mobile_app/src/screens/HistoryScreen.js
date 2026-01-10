import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { Box, Calendar, Car, BarChart3 } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function HistoryScreen() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuth(); // Assume user has username or we use a fallback

    const fetchHistory = async () => {
        if (!user || !user.username) return;
        try {
            const res = await client.get(`/history/${user.username}`);
            setHistory(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderItem = ({ item, index }) => (
        <Animated.View entering={FadeInUp.delay(index * 100).duration(500)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                        <Car size={20} color={COLORS.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.carName}>{item.car_model}</Text>
                        <Text style={styles.date}>{formatDate(item.timestamp)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#DEF7EC' }]}>
                        <Text style={[styles.statusText, { color: '#03543F' }]}>{item.status}</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Box size={16} color={COLORS.text.muted} style={{ marginRight: 6 }} />
                        <Text style={styles.statLabel}>Items: </Text>
                        <Text style={styles.statValue}>{item.stats?.total_items || 0}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <BarChart3 size={16} color={COLORS.text.muted} style={{ marginRight: 6 }} />
                        <Text style={styles.statLabel}>Usage: </Text>
                        <Text style={styles.statValue}>{item.stats?.volume_utilization?.toFixed(1) || 0}%</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            {!user || !user.username ? (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Please log in to view history</Text>
                </View>
            ) : loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={history}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Box size={48} color={COLORS.text.light} />
                            <Text style={styles.emptyText}>No packing history found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: SPACING.lg },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.card,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: SPACING.md,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.accent,
    },
    carName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text.main,
    },
    date: {
        fontSize: 12,
        color: COLORS.text.muted,
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        padding: SPACING.sm,
        borderRadius: 4,
        gap: SPACING.lg,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.text.muted,
    },
    statValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.text.main,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: SPACING.xxl,
        gap: SPACING.md,
    },
    emptyText: {
        color: COLORS.text.muted,
        fontSize: 16,
    }
});
