import React, { Suspense, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Image, Dimensions } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { Box, Car, Backpack, Zap } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';


const { width, height } = Dimensions.get('window');




const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function LandingScreen({ navigation }) {


    const renderFeature = (Icon, title, desc, index) => (
        <Animated.View
            entering={FadeInUp.delay(600 + (index * 100)).springify()}
            style={styles.featureCard}
        >
            <View style={styles.featureIconCircle}>
                <Icon color="#000" size={24} />
            </View>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDesc}>{desc}</Text>
        </Animated.View>
    );

    const renderStep = (num, title, desc, index) => (
        <Animated.View
            entering={FadeInUp.delay(1000 + (index * 100)).springify()}
            style={styles.stepContainer}
        >
            <Text style={styles.stepNumberWatermark}>{num}</Text>
            <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumberText}>{num}</Text>
            </View>
            <Text style={styles.stepTitle}>{title}</Text>
            <Text style={styles.stepDesc}>{desc}</Text>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>

                {/* Hero Section */}
                <View style={styles.heroContainer}>
                    <View style={styles.heroTextContent}>
                        <Animated.Text entering={FadeInDown.delay(100).springify()} style={styles.heroTitle}>
                            Master Your{'\n'}
                            <Text style={styles.gradientText}>Trunk Space</Text>
                        </Animated.Text>
                        <Animated.Text entering={FadeInDown.delay(200).springify()} style={styles.heroSubtitle}>
                            Stop guessing. Start optimizing. Our AI analyzes your bags and car model to generate the perfect packing strategy in seconds.
                        </Animated.Text>

                        <AnimatedTouchableOpacity
                            entering={ZoomIn.delay(300).springify()}
                            style={styles.heroButton}
                            onPress={() => navigation.navigate('Register')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.heroButtonText}>Start Packing Now</Text>
                        </AnimatedTouchableOpacity>
                    </View>

                    {/* Hero Image Section */}
                    <View style={styles.heroImageContainer}>
                        <Animated.Image
                            entering={ZoomIn.delay(400).springify()}
                            source={require('../../assets/images/ai_trunk_hero_v3.png')}
                            style={styles.heroImage}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* Why Choose Us Section */}
                <View style={styles.sectionContainer}>
                    <Animated.Text entering={FadeInUp.delay(500)} style={styles.sectionHeader}>Why Choose Us?</Animated.Text>
                    <View style={styles.grid}>
                        <View style={styles.row}>
                            {renderFeature(Car, "Smart Integration", "Presise trunk models tailored to your specific vehicle.", 0)}
                            {renderFeature(Box, "3D Visualization", "Real-time interactive 3D view of packing.", 1)}
                        </View>
                        <View style={styles.row}>
                            {renderFeature(Backpack, "Any Luggage", "Mix and match rigid cases and soft bags.", 2)}
                            {renderFeature(Zap, "Instant Optimize", "Get the perfect packing plan in seconds.", 3)}
                        </View>
                    </View>
                </View>

                {/* How It Works Section */}
                <View style={[styles.sectionContainer, styles.bgLight]}>
                    <Animated.Text entering={FadeInUp.delay(900)} style={styles.sectionHeader}>How it Works</Animated.Text>
                    <View style={styles.stepsRow}>
                        {renderStep("01", "Select Vehicle", "Choose your car model", 0)}
                        {renderStep("02", "Add Luggage", "Input your luggage list", 1)}
                    </View>
                    <View style={[styles.stepsRow, { marginTop: 20 }]}>
                        {renderStep("03", "Optimize", "Let the app optimize the packing arrangement", 2)}
                        {renderStep("04", "View Result", "View the 3D packing results", 3)}
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.primary },
    heroContainer: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.xl,
        paddingBottom: SPACING.xl,
        minHeight: height * 0.7, // Taller hero
    },
    heroTextContent: {
        marginBottom: SPACING.xl,
        zIndex: 10,
    },
    heroTitle: {
        fontSize: 42,
        fontWeight: '900',
        color: COLORS.surface,
        lineHeight: 48,
        marginBottom: SPACING.md,
    },
    gradientText: {
        color: '#9CA3AF', // Fallback
        // In RN, gradient text requires MaskedView, keeping it simple for now or using color
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#9CA3AF',
        lineHeight: 24,
        marginBottom: SPACING.xl,
        maxWidth: '95%',
    },
    heroButton: {
        backgroundColor: COLORS.accent,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: RADIUS.md,
        alignSelf: 'flex-start',
        ...SHADOWS.button,
    },
    heroButtonText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    heroImageContainer: {
        width: '100%',
        height: 320, // Increased height for better visibility
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.sm, // Reduced margin
    },
    heroImage: {
        width: '100%',
        height: '100%',
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },


    // Sections
    sectionContainer: {
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        backgroundColor: COLORS.surface,
    },
    sectionHeader: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.primary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        marginTop: SPACING.lg,
    },
    bgLight: {
        backgroundColor: '#F3F4F6',
        marginHorizontal: -SPACING.lg,
        paddingHorizontal: SPACING.lg + SPACING.lg,
        paddingVertical: SPACING.xxl,
    },
    grid: {
        gap: SPACING.lg,
    },
    row: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    featureCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        ...SHADOWS.card,
        alignItems: 'center',
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#eee'
    },
    featureIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text.main,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    featureDesc: {
        fontSize: 13,
        color: COLORS.text.muted,
        textAlign: 'center',
        lineHeight: 18,
    },

    // How It Works
    stepsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.md,
    },
    stepContainer: {
        flex: 1,
        alignItems: 'center',
    },
    stepNumberWatermark: {
        position: 'absolute',
        top: -20,
        fontSize: 60,
        fontWeight: '900',
        color: 'rgba(0,0,0,0.05)',
    },
    stepNumberCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        zIndex: 1,
    },
    stepNumberText: {
        color: COLORS.accent,
        fontWeight: 'bold',
        fontSize: 16,
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    stepDesc: {
        fontSize: 12,
        color: COLORS.text.muted,
        textAlign: 'center',
        lineHeight: 18,
    }
});
