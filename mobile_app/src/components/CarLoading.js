import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing
} from 'react-native-reanimated';
import { CarFront, Car } from 'lucide-react-native';
import { COLORS, SPACING } from '../constants/theme';

const { width } = Dimensions.get('window');

const CarLoading = () => {
    const translateX = useSharedValue(-50);

    useEffect(() => {
        translateX.value = withRepeat(
            withTiming(width + 50, {
                duration: 2000,
                easing: Easing.linear,
            }),
            -1, // Infinite repeat
            false // Do not reverse
        );
    }, []);

    const carStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Animated.View style={[styles.carContainer, carStyle]}>
                    <Car size={48} color={COLORS.primary} weight="fill" />
                </Animated.View>

                {/* Road Line */}
                <View style={styles.road} />

                <Text style={styles.text}>Optimizing Trunk Space...</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    content: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    carContainer: {
        position: 'absolute',
        left: 0,
        bottom: 40, // Adjust based on road position
    },
    road: {
        width: '100%',
        height: 2,
        backgroundColor: '#E5E7EB',
        marginTop: 20,
        marginBottom: SPACING.lg,
    },
    text: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginTop: SPACING.md,
    }
});

export default CarLoading;
