import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, TextInput, StyleSheet, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Package, Box, ArrowRight, Download } from 'lucide-react-native';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei/native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

// Simple Animated Counter Component
const AnimatedCounter = ({ value, suffix = '', style }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const end = parseInt(value, 10) || 0;
        if (start === end) return;
        const duration = 1000;
        const incrementTime = 50;
        const step = Math.ceil(end / (duration / incrementTime));

        const timer = setInterval(() => {
            start += step;
            if (start > end) start = end;
            setCount(start);
            if (start === end) clearInterval(timer);
        }, incrementTime);
        return () => clearInterval(timer);
    }, [value]);
    return <Text style={style}>{count}{suffix}</Text>;
};

const PieChart = ({ percentage, color, trackColor = '#E5E7EB' }) => {
    const radius = 35;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const initialOffset = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Svg height="90" width="90" viewBox="0 0 90 90">
                <G rotation="-90" origin="45, 45">
                    <Circle cx="45" cy="45" r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="transparent" />
                    <Circle
                        cx="45"
                        cy="45"
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </G>
                <SvgText
                    x="45"
                    y="50" // Adjusted for vertical centering
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="bold"
                    fill="#374151"
                    rotation="0" // Reset text rotation
                >
                    {percentage}%
                </SvgText>
            </Svg>
        </View>
    );
};

// Capture Handler Component
function CaptureHandler({ onCapture }) {
    const { gl } = useThree();
    useEffect(() => {
        onCapture.current = async () => {
            const context = gl.getContext();
            if (!context) {
                console.error("CaptureHandler: No GL Context available");
                return null;
            }
            try {
                // Wait for a frame to ensure content is rendered
                await new Promise(resolve => requestAnimationFrame(resolve));

                const snapshot = await GLView.takeSnapshotAsync(context, {
                    format: 'png',
                    result: 'file',
                    width: 600, // Limit resolution to avoid memory crash
                    height: 400
                });
                return snapshot;
            } catch (e) {
                console.error("Snapshot error:", e);
                throw e;
            }
        };
    }, [gl]);
    return null;
}
import { STLLoader } from 'three-stdlib';


import * as THREE from 'three';
import { Buffer } from 'buffer';
import client from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import CarLoading from '../components/CarLoading';

// Polyfill for Buffer
global.Buffer = Buffer;

function MeshViewer({ stlBase64, color, opacity = 1.0, wireframe = false, transparent = false }) {
    const geometry = useMemo(() => {
        if (!stlBase64) return null;
        try {
            const loader = new STLLoader();
            const buffer = Buffer.from(stlBase64, 'base64');
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            const geom = loader.parse(arrayBuffer);
            if (geom && geom.attributes && geom.attributes.position) {
                geom.computeVertexNormals();
                geom.computeBoundingBox();
                geom.computeBoundingSphere();
                return geom;
            }
            return null;
        } catch (e) {
            console.error("Failed to parse STL", e);
            return null;
        }
    }, [stlBase64]);

    if (!geometry) return null;

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial
                color={color}
                opacity={opacity}
                transparent={transparent}
                wireframe={wireframe}
                side={THREE.DoubleSide}
                metalness={0.2}
                roughness={0.5}
            />
        </mesh>
    );
}

export default function DashboardScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { token, user } = useAuth(); // Get user object
    const { car, customTrunkFile, customDimensions } = route.params || {};

    // Config State
    const [availableBags, setAvailableBags] = useState({});
    const [selectedBags, setSelectedBags] = useState([]);
    const [loadingConfig, setLoadingConfig] = useState(true);

    // Form State
    const [selectedType, setSelectedType] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [customDims, setCustomDims] = useState({ l: '50', b: '30', h: '15' });

    // UI Helpers
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);

    // Results State
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationResult, setOptimizationResult] = useState(null);
    const [showResults, setShowResults] = useState(false);

    // PDF State
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfUri, setPdfUri] = useState(null);

    useEffect(() => {
        fetchBags();
    }, []);

    const fetchBags = async () => {
        try {
            const res = await client.get('/bags');
            setAvailableBags(res.data);
            if (Object.keys(res.data).length > 0) {
                const firstType = Object.keys(res.data)[0];
                setSelectedType(firstType);
                const sizes = Object.keys(res.data[firstType]);
                if (sizes.length > 0) setSelectedSize(sizes[0]);
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to load bag data");
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleTypeSelect = (type) => {
        setSelectedType(type);
        if (type === "Custom Dimensions") {
            setSelectedSize(null);
        } else {
            const sizes = Object.keys(availableBags[type] || {});
            if (sizes.length > 0) setSelectedSize(sizes[0]);
            else setSelectedSize(null);
        }
        setIsTypeDropdownOpen(false);
    };

    const handleAdd = () => {
        if (!selectedType) return;

        if (selectedType === "Custom Dimensions") {
            const l = parseFloat(customDims.l);
            const b = parseFloat(customDims.b);
            const h = parseFloat(customDims.h);
            if (isNaN(l) || isNaN(b) || isNaN(h) || l <= 0 || b <= 0 || h <= 0) {
                Alert.alert("Invalid Dimensions", "Please enter valid positive numbers.");
                return;
            }
        } else if (!selectedSize) {
            return;
        }

        const newBags = [];
        for (let i = 0; i < quantity; i++) {
            if (selectedType === "Custom Dimensions") {
                newBags.push({
                    type: "Custom",
                    dimensions: [parseFloat(customDims.l), parseFloat(customDims.b), parseFloat(customDims.h)],
                    size: "Custom",
                    id: Date.now().toString() + Math.random().toString()
                });
            } else {
                newBags.push({
                    type: selectedType,
                    size: selectedSize,
                    id: Date.now().toString() + Math.random().toString()
                });
            }
        }
        setSelectedBags([...selectedBags, ...newBags]);
        setQuantity(1);
    };

    const removeBag = (id) => {
        setSelectedBags(selectedBags.filter(b => b.id !== id));
    };

    const clearQueue = () => {
        setSelectedBags([]);
    };

    const captureRef = React.useRef(null);

    const handleOptimize = async () => {
        if (selectedBags.length === 0) {
            Alert.alert("Warning", "Please add at least one bag");
            return;
        }
        setIsOptimizing(true);
        try {
            const payload = {
                car_model: car,
                bags: selectedBags,
                custom_trunk_file: customTrunkFile,
                username: user?.username
            };
            const res = await client.post('/optimize', payload);
            if (res.data.success) {
                setOptimizationResult(res.data);
                setShowResults(true);
            } else {
                Alert.alert("Error", "Optimization failed");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to optimize: " + (e.response?.data?.detail || e.message));
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleDownload = async () => {
        if (!captureRef.current) return;
        try {
            // 1. Capture 3D Snapshot
            let uri = await captureRef.current();
            if (typeof uri === 'object' && uri !== null && uri.uri) { uri = uri.uri; }
            const base64Img = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

            // Load Logo Asset
            const logoAsset = Asset.fromModule(require('../../assets/images/renault_logo_new.png'));
            await logoAsset.downloadAsync();
            const logoBase64 = await FileSystem.readAsStringAsync(logoAsset.localUri, { encoding: 'base64' });

            // 2. Prepare Data
            const totalBags = selectedBags.length;
            const placedCount = optimizationResult.placed_bags.length;
            const successRate = totalBags > 0 ? Math.round((placedCount / totalBags) * 100) : 0;
            const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Aggregate Input Bags
            const summary = {};
            selectedBags.forEach(bag => {
                const key = bag.type === 'Custom'
                    ? `Custom (${bag.dimensions[0]}x${bag.dimensions[1]}x${bag.dimensions[2]})`
                    : `${bag.type} - ${bag.size}`;
                summary[key] = (summary[key] || 0) + 1;
            });

            // 3. Construct Professional HTML
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1F2937; margin: 0; padding: 40px; background: #fff; }
                        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #F59E0B; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo-text { font-size: 24px; font-weight: 800; color: #000; letter-spacing: -0.5px; }
                        .logo-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #6B7280; font-weight: 600; margin-top: 2px; }
                        .report-meta { text-align: right; }
                        .meta-title { font-size: 28px; font-weight: bold; color: #111827; }
                        .meta-subtitle { font-size: 14px; color: #6B7280; margin-top: 5px; }
                        
                        .grid-layout { display: flex; gap: 30px; margin-bottom: 40px; }
                        .col-left { flex: 1.2; }
                        .col-right { flex: 0.8; text-align: right; }
                        
                        .metric-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; margin-bottom: 20px; }
                        .metric { text-align: center; flex: 1; border-right: 1px solid #E5E7EB; }
                        .metric:last-child { border-right: none; }
                        .metric-val { font-size: 28px; font-weight: 800; color: #111827; }
                        .metric-label { font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: 700; margin-top: 4px; }
                        
                        .car-image { width: 100%; border-radius: 12px; border: 1px solid #E5E7EB; }
                        
                        .section-title { font-size: 16px; font-weight: 700; color: #111827; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px; margin-bottom: 15px; margin-top: 30px; text-transform: uppercase; letter-spacing: 0.5px; }
                        
                        table { width: 100%; border-collapse: collapse; font-size: 13px; }
                        th { text-align: left; padding: 12px; background: #F3F4F6; color: #374151; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
                        td { padding: 12px; border-bottom: 1px solid #E5E7EB; color: #4B5563; }
                        tr:last-child td { border-bottom: none; }
                        
                        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
                        .success { background: #ECFDF5; color: #059669; }
                        .error { background: #FEF2F2; color: #DC2626; }
                        
                        .footer { margin-top: 50px; text-align: center; color: #9CA3AF; font-size: 12px; border-top: 1px solid #E5E7EB; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <img src="data:image/png;base64,${logoBase64}" style="height: 40px; margin-bottom: 5px;" />
                            <div class="logo-sub">Advanced Digital Solutions</div>
                        </div>
                        <div class="report-meta">
                            <div class="meta-title">Packing Report</div>
                            <div class="meta-subtitle">${date} • ${time}</div>
                        </div>
                    </div>

                    <div class="grid-layout">
                        <div class="col-left">
                            <div class="section-title" style="margin-top: 0;">Performance Summary</div>
                            <div class="metric-box">
                                <div class="metric">
                                    <div class="metric-val">${totalBags}</div>
                                    <div class="metric-label">Total Items</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-val" style="color: #059669">${placedCount}</div>
                                    <div class="metric-label">Packed</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-val" style="color: #2563eb">${successRate}%</div>
                                    <div class="metric-label">Efficiency</div>
                                </div>
                            </div>
                            
                            <div class="section-title">Item Requirements</div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Item Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(summary).map(([name, count]) => `
                                        <tr>
                                            <td style="display: flex; justify-content: space-between;">
                                                <span>${name}</span>
                                                <span style="font-weight: bold;">x${count}</span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="col-right">
                             <img class="car-image" src="data:image/png;base64,${base64Img}" />
                             <div style="margin-top: 10px; font-size: 12px; color: #6B7280; text-align: center;">Target Vehicle: <span style="font-weight: bold; color: #111827;">${car}</span></div>
                        </div>
                    </div>
                    
                    <div class="section-title">Packing Manifest</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 100px;">Status</th>
                                <th>Item Type</th>
                                <th>Size / Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${optimizationResult.placed_bags.map(bag => `
                                <tr>
                                    <td><span class="status-badge success">Packed</span></td>
                                    <td>${bag.type}</td>
                                    <td>${bag.size || 'Custom'}</td>
                                </tr>
                            `).join('')}
                             ${optimizationResult.unplaced_bags.map(bag => `
                                <tr>
                                    <td><span class="status-badge error">Unplaced</span></td>
                                    <td>${bag.Bag || 'Unknown'}</td>
                                    <td>${bag.Reason || 'Insufficient space'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="footer">
                        Generated by RNTBCI Packing Assistant • User: ${user?.username || 'Guest'} • CONFIDENTIAL
                    </div>
                </body>
                </html>
            `;

            // 4. Generate PDF
            const { uri: tempUri } = await Print.printToFileAsync({ html: htmlContent });

            // 5. Rename File
            const safeUsername = user?.username ? user.username.replace(/[^a-zA-Z0-9]/g, '_') : 'User';
            const newFilename = `Result_${safeUsername}.pdf`;
            const newUri = FileSystem.documentDirectory + newFilename;

            await FileSystem.moveAsync({
                from: tempUri,
                to: newUri
            });

            setPdfUri(newUri);
            setShowPdfModal(true);

        } catch (e) {
            console.error("PDF Generation failed", e);
            Alert.alert("Error", "Failed to generate report.");
        }
    };

    const getBagColor = (type) => {
        const colors = [
            '#FCA5A5', '#FDBA74', '#FDE047', '#86EFAC',
            '#93C5FD', '#C4B5FD', '#F9A8D4', '#5EEAD4'
        ];
        let hash = 0;
        for (let i = 0; i < type.length; i++) {
            hash = type.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const renderDropdown = (label, current, options, isOpen, setIsOpen, onSelect) => (
        <View style={[styles.inputGroup, { zIndex: isOpen ? 1000 : 1 }]}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsOpen(!isOpen)}
                activeOpacity={0.8}
            >
                <Text style={styles.dropdownText}>{current || "Select..."}</Text>
            </TouchableOpacity>

            {isOpen && (
                <View style={styles.dropdownList}>
                    <ScrollView nestedScrollEnabled={true}>
                        {options.map(opt => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.dropdownItem, current === opt && styles.dropdownItemActive]}
                                onPress={() => onSelect(opt)}
                            >
                                <Text style={[styles.dropdownItemText, current === opt && styles.dropdownItemTextActive]}>
                                    {opt}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );

    if (isOptimizing) {
        return <CarLoading />;
    }

    // --- RESULTS VIEW ---
    if (showResults && optimizationResult) {
        const totalBags = selectedBags.length;
        const placedCount = optimizationResult.placed_bags.length;
        const successRate = totalBags > 0 ? Math.round((placedCount / totalBags) * 100) : 0;

        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaView style={styles.container}>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
                        <View style={styles.header}>
                            <Text style={styles.pageTitle}>Performance Dashboard</Text>

                            {/* Section 1: Performance Breakdown */}
                            <View style={styles.dashboardSection}>
                                <Text style={styles.sectionTitle}>PERFORMANCE BREAKDOWN</Text>
                                <View style={styles.metricsRow}>
                                    <View style={styles.metricItem}>
                                        <Text style={styles.metricLabel}>TOTAL</Text>
                                        <Text style={[styles.metricValue, { color: '#374151' }]}>{totalBags}</Text>
                                    </View>
                                    <View style={styles.metricItem}>
                                        <Text style={styles.metricLabel}>ACCURACY</Text>
                                        <AnimatedCounter value={successRate} suffix="%" style={[styles.metricValue, { color: '#10B981' }]} />
                                    </View>
                                    <View style={styles.metricItem}>
                                        <Text style={styles.metricLabel}>TIME</Text>
                                        <Text style={[styles.metricValue, { color: '#3B82F6' }]}>
                                            {optimizationResult.processing_time ? optimizationResult.processing_time.toFixed(2) : '0.00'}s
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Section 2: Visual Charts */}
                            <View style={styles.dashboardSection}>
                                <Text style={styles.sectionTitle}>VISUAL CHARTS</Text>
                                <View style={styles.chartContainer}>
                                    <View style={styles.pieContainer}>
                                        <PieChart percentage={successRate} color="#10B981" trackColor="#EF4444" />
                                        <Text style={styles.pieLabel}>Placed vs Unplaced</Text>
                                    </View>
                                    <View style={styles.legendContainer}>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                                            <Text style={styles.legendText}>Placed Items</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                                            <Text style={styles.legendText}>Unplaced Items</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Section 3: Packing Insights */}
                            <View style={styles.dashboardSection}>
                                <Text style={styles.sectionTitle}>PACKING INSIGHTS</Text>

                                {/* Placed Items */}
                                <View style={{ marginBottom: 15 }}>
                                    <Text style={[styles.metricLabel, { color: '#10B981', marginBottom: 6 }]}>PLACED ITEMS ({placedCount})</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                        {Object.entries(optimizationResult.placed_bags.reduce((acc, bag) => {
                                            const type = bag.type || 'Custom';
                                            acc[type] = (acc[type] || 0) + 1;
                                            return acc;
                                        }, {})).map(([type, count], idx) => (
                                            <View key={'p' + idx} style={[styles.categoryBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                                                <Text style={[styles.categoryText, { color: '#065F46' }]}>{count}x {type}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {/* Unplaced Items */}
                                {optimizationResult.unplaced_bags.length > 0 ? (
                                    <View>
                                        <Text style={[styles.metricLabel, { color: '#EF4444', marginBottom: 6 }]}>UNPLACED ITEMS ({totalBags - placedCount})</Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                            {Object.entries(optimizationResult.unplaced_bags.reduce((acc, bag) => {
                                                const type = bag.Bag || 'Custom'; // Unplaced bag object structure might be different (usually 'Bag' prop based on previous view)
                                                acc[type] = (acc[type] || 0) + 1;
                                                return acc;
                                            }, {})).map(([type, count], idx) => (
                                                <View key={'u' + idx} style={[styles.categoryBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                                                    <Text style={[styles.categoryText, { color: '#991B1B' }]}>{count}x {type}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 }}>
                                        <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                                        <Text style={styles.analysisText}>All items placed successfully!</Text>
                                    </View>
                                )}
                            </View>

                        </View>

                        <View style={styles.contentArea}>
                            <View style={styles.chartHeader}>
                                <Text style={styles.chartTitle}>3D VISUALIZATION</Text>
                                <Text style={styles.analysisText}>Interactive View • Pinch to Zoom</Text>
                            </View>
                            <View style={styles.canvasContainer}>
                                <Canvas shadows gl={{ preserveDrawingBuffer: true }} camera={{ position: [2, 2, 2], fov: 50, near: 0.01, far: 1000 }}>
                                    <React.Suspense fallback={null}>
                                        <CaptureHandler onCapture={captureRef} />
                                        <ambientLight intensity={0.8} />
                                        <pointLight position={[10, 10, 10]} intensity={1} />
                                        <spotLight position={[-10, -10, -10]} angle={0.15} penumbra={1} />
                                        <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
                                        <group position={[0, -0.5, 0]}>

                                            {optimizationResult.trunk_mesh && (
                                                <MeshViewer
                                                    stlBase64={optimizationResult.trunk_mesh}
                                                    color="#9CA3AF"
                                                    opacity={0.15}
                                                    transparent={true}
                                                />
                                            )}
                                            {optimizationResult.placed_bags.map((bag, index) => {
                                                const colors = [
                                                    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                                                    '#FFEEAD', '#FFD93D', '#FF9F1C', '#2AB7CA',
                                                    '#E27D60', '#85DCBA', '#E8A87C', '#C38D9E'
                                                ];
                                                const color = colors[index % colors.length];
                                                return (
                                                    <MeshViewer
                                                        key={index}
                                                        stlBase64={bag.mesh_stl}
                                                        color={color}
                                                        opacity={1}
                                                    />
                                                );
                                            })}
                                        </group>
                                        <Environment preset="city" />
                                    </React.Suspense>
                                </Canvas>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity style={[styles.backBtn, { flex: 1 }]} onPress={() => setShowResults(false)}>
                                <Text style={styles.backBtnText}>Adjust Configuration</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.backBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]} onPress={handleDownload}>
                                <Download size={20} color="white" />
                                <Text style={[styles.backBtnText, { color: 'white', marginLeft: 8 }]}>Download</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* PDF Preview Modal */}
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={showPdfModal}
                        onRequestClose={() => setShowPdfModal(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Report Ready</Text>
                                    <TouchableOpacity onPress={() => setShowPdfModal(false)}>
                                        <Text style={styles.closeButton}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.filePreview}>
                                    <View style={styles.pdfIcon}>
                                        <Text style={{ fontSize: 32 }}>📄</Text>
                                    </View>
                                    <Text style={styles.filename}>Result_{user?.username || 'User'}.pdf</Text>
                                    <Text style={styles.fileMeta}>Professional Report Generated</Text>
                                </View>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, styles.previewBtn]}
                                        onPress={async () => {
                                            if (pdfUri) {
                                                await Sharing.shareAsync(pdfUri, { UTI: '.pdf', mimeType: 'application/pdf' });
                                            }
                                        }}
                                    >
                                        <Text style={styles.previewBtnText}>Preview & Share</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, styles.closeBtn]}
                                        onPress={() => setShowPdfModal(false)}
                                    >
                                        <Text style={styles.closeBtnText}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                </SafeAreaView>
            </GestureHandlerRootView>
        );
    }

    // --- CONFIG VIEW ---
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.pageHeader}>Configuration</Text>

                {/* Vehicle Card */}
                <View style={styles.vehicleCard}>
                    <View>
                        <Text style={styles.vehicleLabel}>VEHICLE</Text>
                        <Text style={styles.vehicleName}>{car}</Text>
                    </View>
                    {/* Removed Volume/Specs Section */}
                </View>

                {/* Add Luggage */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionHeader}>ADD LUGGAGE</Text>
                    {loadingConfig ? <ActivityIndicator color={COLORS.primary} /> : (
                        <>
                            {renderDropdown(
                                "Bag Type",
                                selectedType,
                                ["Custom Dimensions", ...Object.keys(availableBags)],
                                isTypeDropdownOpen,
                                setIsTypeDropdownOpen,
                                handleTypeSelect
                            )}

                            {selectedType === "Custom Dimensions" ? (
                                <View style={styles.dimensionsContainer}>
                                    <View style={styles.dimInputGroup}>
                                        <Text style={styles.dimLabel}>L (cm)</Text>
                                        <TextInput
                                            style={styles.dimInput}
                                            placeholder="50"
                                            keyboardType="numeric"
                                            value={customDims.l}
                                            onChangeText={t => setCustomDims({ ...customDims, l: t })}
                                        />
                                    </View>
                                    <View style={styles.dimInputGroup}>
                                        <Text style={styles.dimLabel}>B (cm)</Text>
                                        <TextInput
                                            style={styles.dimInput}
                                            placeholder="30"
                                            keyboardType="numeric"
                                            value={customDims.b}
                                            onChangeText={t => setCustomDims({ ...customDims, b: t })}
                                        />
                                    </View>
                                    <View style={styles.dimInputGroup}>
                                        <Text style={styles.dimLabel}>H (cm)</Text>
                                        <TextInput
                                            style={styles.dimInput}
                                            placeholder="15"
                                            keyboardType="numeric"
                                            value={customDims.h}
                                            onChangeText={t => setCustomDims({ ...customDims, h: t })}
                                        />
                                    </View>
                                </View>
                            ) : (
                                selectedType && renderDropdown(
                                    "Size",
                                    selectedSize,
                                    Object.keys(availableBags[selectedType] || {}),
                                    isSizeDropdownOpen,
                                    setIsSizeDropdownOpen,
                                    (sz) => { setSelectedSize(sz); setIsSizeDropdownOpen(false); }
                                )
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Quantity</Text>
                                <View style={styles.qtyContainer}>
                                    <TextInput
                                        style={styles.qtyInput}
                                        value={String(quantity)}
                                        keyboardType="numeric"
                                        onChangeText={(t) => setQuantity(Math.max(1, parseInt(t) || 1))}
                                    />
                                    <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                                        <Plus size={18} color="white" />
                                        <Text style={styles.addButtonText}>Add</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}
                </View>

                {/* Queue */}
                <View style={styles.queueSection}>
                    <View style={styles.queueHeaderRow}>
                        <Text style={styles.sectionHeader}>ITEMS QUEUE ({selectedBags.length})</Text>
                        {selectedBags.length > 0 && (
                            <TouchableOpacity onPress={clearQueue}>
                                <Text style={styles.clearText}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {selectedBags.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No items added.</Text>
                            <Text style={styles.emptyStateSub}>Start adding luggage above.</Text>
                        </View>
                    ) : (
                        <View style={styles.queueList}>
                            {selectedBags.map((bag) => (
                                <View key={bag.id} style={styles.queueItem}>
                                    <View style={[styles.queueItemIcon, { backgroundColor: getBagColor(bag.type) }]}>
                                        <Package size={16} color="#FFFFFF" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.queueItemTitle}>{bag.type === 'Custom' ? 'Custom Bag' : bag.type}</Text>
                                        <Text style={styles.queueItemSub}>{bag.size === 'Custom' ? `${bag.dimensions[0]}x${bag.dimensions[1]}x${bag.dimensions[2]}` : bag.size}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeBag(bag.id)} style={styles.deleteBtn}>
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.optimizeBtn} onPress={handleOptimize}>
                    <Text style={styles.optimizeBtnText}>Optimize Packing</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { padding: SPACING.lg, paddingBottom: 100 },
    pageHeader: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: SPACING.lg },
    vehicleCard: { backgroundColor: '#111827', borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xl },
    vehicleLabel: { color: '#6B7280', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
    vehicleName: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: SPACING.lg },
    vehicleSpecs: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#374151', paddingTop: SPACING.md },
    specLabel: { color: '#9CA3AF', fontSize: 11 },
    specValue: { color: COLORS.accent, fontSize: 14, fontWeight: 'bold' },
    formSection: { marginBottom: SPACING.xl },
    sectionHeader: { fontSize: 11, fontWeight: 'bold', color: '#9CA3AF', marginBottom: SPACING.md },
    inputGroup: { marginBottom: SPACING.lg, zIndex: 1 },
    label: { fontSize: 13, fontWeight: '600', color: COLORS.text.main, marginBottom: SPACING.xs },
    dropdownButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.md },
    dropdownText: { color: COLORS.text.main, fontSize: 14 },
    dropdownList: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, maxHeight: 350, zIndex: 9999, ...SHADOWS.card },
    dropdownItem: { padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    dropdownItemActive: { backgroundColor: '#EFF6FF' },
    dropdownItemText: { fontSize: 14, color: COLORS.text.main },
    dropdownItemTextActive: { color: COLORS.primary, fontWeight: '600' },
    dimInputGroup: { flex: 1 },
    dimensionsContainer: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
    dimLabel: { fontSize: 12, color: COLORS.text.main, marginBottom: 4, fontWeight: '600' },
    dimInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.md, fontSize: 14, color: COLORS.text.main },
    qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    qtyInput: { width: 100, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.md, fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: COLORS.text.main },
    addButton: { flex: 1, backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: RADIUS.sm, gap: 8 },
    addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    queueHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    clearText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
    emptyState: { borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: RADIUS.md, padding: SPACING.xl, alignItems: 'center' },
    emptyStateText: { color: COLORS.text.muted, fontSize: 14 },
    emptyStateSub: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
    queueList: { gap: SPACING.sm },
    queueItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#F3F4F6' },
    queueItemIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    queueItemTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text.main },
    queueItemSub: { fontSize: 12, color: COLORS.text.muted },
    deleteBtn: { padding: 4 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
    optimizeBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: RADIUS.md, alignItems: 'center', ...SHADOWS.button },
    optimizeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    // Results Styles
    header: { padding: SPACING.lg, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, marginBottom: SPACING.md },
    statsRow: { flexDirection: 'row', gap: SPACING.md, justifyContent: 'space-between' },
    statCard: { flex: 1, backgroundColor: 'white', padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#E5E7EB', ...SHADOWS.card },
    statLabel: { fontSize: 10, color: '#6B7280', fontWeight: 'bold', marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
    tabContainer: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
    tabText: { color: '#6B7280', fontWeight: '600' },
    activeTabText: { color: COLORS.primary },
    contentArea: { flex: 1, paddingBottom: 80 },
    canvasContainer: { height: 400, backgroundColor: '#F3F4F6', marginHorizontal: SPACING.md, borderRadius: RADIUS.md, overflow: 'hidden' },
    manifestContainer: { flex: 1, padding: SPACING.lg },
    listSectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#9CA3AF' },
    manifestItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: SPACING.md, borderRadius: RADIUS.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: '#F3F4F6' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.md },
    manifestTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text.main },
    backBtn: { padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
    backBtnText: { color: COLORS.text.main, fontWeight: '600' },

    // New Dashboard Styles
    dashboardSection: { marginBottom: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#9CA3AF', marginBottom: SPACING.md, letterSpacing: 0.5 },
    metricsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: SPACING.md, borderRadius: RADIUS.md },
    metricItem: { alignItems: 'center', flex: 1 },
    metricLabel: { fontSize: 10, color: '#6B7280', fontWeight: 'bold', marginBottom: 4 },
    metricValue: { fontSize: 22, fontWeight: '900' },
    chartContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    pieContainer: { alignItems: 'center' },
    pieLabel: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '600' },
    legendContainer: { justifyContent: 'center', gap: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: '#374151', fontWeight: '500' },
    analysisText: { fontSize: 12, color: '#4B5563', marginBottom: 2, lineHeight: 18 },
    retryBtn: { backgroundColor: '#F3F4F6', paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 5 },
    retryBtnText: { color: COLORS.text.main, fontWeight: 'bold', fontSize: 12 },
    categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    categoryText: { fontSize: 11, color: '#4B5563', fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', width: '85%', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    closeButton: { fontSize: 20, color: '#9CA3AF', padding: 5 },
    filePreview: { alignItems: 'center', marginBottom: 25, padding: 20, backgroundColor: '#F9FAFB', borderRadius: 15, borderWidth: 1, borderColor: '#E5E7EB' },
    pdfIcon: { width: 60, height: 60, backgroundColor: '#FEF2F2', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    filename: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
    fileMeta: { fontSize: 12, color: '#6B7280' },
    modalActions: { gap: 10 },
    actionBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    previewBtn: { backgroundColor: COLORS.primary },
    previewBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    closeBtn: { backgroundColor: '#F3F4F6' },
    closeBtnText: { color: '#4B5563', fontWeight: '600' }
});
