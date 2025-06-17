import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Alert, Modal, TextInput, ScrollView, Image, Share } from 'react-native';
import Colors from '@/constants/colors';
import { MapPin, Navigation, Compass, List, Heart, Camera, Calendar, Trophy, Route, MessageCircle, Star, Upload, Mic, MicOff, Share2, Eye, EyeOff, Filter, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import changhua from '@/assets/public_bathroom/Changhua.json';

import Chiayi from '@/assets/public_bathroom/Chiayi.json';
import Chiayi2 from '@/assets/public_bathroom/Chiayi2.json';
import Hsinchu from '@/assets/public_bathroom/Hsinchu.json';
import Hsinchu2 from '@/assets/public_bathroom/Hsinchu2.json';
import Hualien from '@/assets/public_bathroom/Hualien.json';
import Kaohsiung from '@/assets/public_bathroom/Kaohsiung.json';
import Keelung from '@/assets/public_bathroom/Keelung.json';
import Kinmen from '@/assets/public_bathroom/Kinmen.json';
import Lienchiang from '@/assets/public_bathroom/Lienchiang.json';
import Miaoli from '@/assets/public_bathroom/Miaoli.json';
import Nantou from '@/assets/public_bathroom/Nantou.json';
import new_taipei from '@/assets/public_bathroom/new_taipei.json';
import Penghu from '@/assets/public_bathroom/Penghu.json';
import Pingtung from '@/assets/public_bathroom/Pingtung.json';
import Taichung from '@/assets/public_bathroom/Taichung.json';
import Tainan from '@/assets/public_bathroom/Tainan.json';
import Taipei from '@/assets/public_bathroom/Taipei.json';
import Taitung from '@/assets/public_bathroom/Taitung.json';
import Taoyuan from '@/assets/public_bathroom/Taoyuan.json';
import Yilan from '@/assets/public_bathroom/Yilan.json';
import Yunlin from '@/assets/public_bathroom/Yunlin.json';

// Define bathroom type
interface Bathroom {
  id: string;
  name: string;
  distance: number;
  rating: number;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
  source: 'gov' | 'commercial' | 'international';
  hidden?: boolean;
  reviews?: Review[];
  funnyQuote?: string;
}

// Review interface
interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  timestamp: number;
  anonymous: boolean;
}

// Check-in record interface
interface CheckInRecord {
  id: string;
  timestamp: number;
  bathroom: Bathroom;
  mood: string;
  bristolType?: number;
  note: string;
  quickTag: string;
  rating: number;
  image?: string;
  audioUri?: string;
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  isPrivate: boolean;
  anonymous: boolean;
  customMessage?: string;
}

// Achievement system interface
interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

// Bristol Scale emoji mapping
const BRISTOL_EMOJIS = {
  1: '🥵', // Constipated
  2: '😓', // Slightly constipated
  3: '🧻', // Normal
  4: '😊', // Ideal
  5: '😅', // Soft
  6: '🥲', // Diarrhea
  7: '💧', // Watery
};

// Mood emoji options
const MOOD_EMOJIS = ['🧻', '💩', '🥲', '🥵', '😊', '😅', '🌟', '💫', '😤', '😏', '🚽', '💨'];

// Quick tags for scenes
const QUICK_TAGS = [
  '高鐵', '餐廳', '朋友家', '公園', '異國', '約會中', '機場', '辦公室', '商場', '加油站', '咖啡廳', '學校'
];

// Funny quotes for bathrooms
const FUNNY_QUOTES = [
  '人生哪有不落腳的便所',
  '此處風水極佳，適合冥想',
  '傳說中的五星級廁所',
  '來過必拉，拉過必爽',
  '這裡的Wi-Fi密碼是1234',
  '請保持安靜，有人在思考人生',
  '歡迎來到解脫聖地',
  '這裡是夢想起飛的地方'
];

// Check if location is in Taiwan
const isInTaiwan = (lat: number, lng: number): boolean => {
  return lat >= 21.5 && lat <= 25.5 && lng >= 119.5 && lng <= 122.5;
};

// Calculate distance between two points (meters)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Get bathroom icon - differentiate by source
const getBathroomIcon = (bathroom: Bathroom) => {
  switch (bathroom.source) {
    case 'gov':
      return '🏛️'; // 政府廁所
    case 'commercial':
      return '🚻'; // 商業廁所
    case 'international':
      return '🌍'; // 國際廁所
    default:
      return '🚽'; // 預設廁所
  }
};

// Get map marker color
const getMarkerColor = (bathroom: Bathroom) => {
  switch (bathroom.source) {
    case 'gov':
      return '#34C759'; // Green - 政府廁所
    case 'commercial':
      return '#007AFF'; // Blue - 商業廁所
    case 'international':
      return '#FF9500'; // Orange - 國際廁所
    default:
      return '#FF9500'; // Orange - 其他
  }
};

const getBathroomDisplayName = (bathroom: Bathroom): string => {
  const emoji = getBathroomIcon(bathroom);
  return `${emoji} ${bathroom.name}`;
};

// Mock data for commercial bathrooms (台北坐標)
const mockBathrooms: Bathroom[] = [
  {
    id: 'commercial-1',
    name: 'Starbucks',
    distance: 0.2,
    rating: 4.5,
    type: 'Café',
    address: '123 Main St',
    latitude: 25.0518,
    longitude: 121.5637,
    source: 'commercial',
    reviews: [],
    funnyQuote: FUNNY_QUOTES[0],
  },
  {
    id: 'commercial-2',
    name: "McDonald's",
    distance: 0.5,
    rating: 3.8,
    type: 'Fast Food',
    address: '456 Oak Ave',
    latitude: 25.0528,
    longitude: 121.5647,
    source: 'commercial',
    reviews: [],
    funnyQuote: FUNNY_QUOTES[1],
  },
  {
    id: 'commercial-3',
    name: 'Public Library',
    distance: 0.7,
    rating: 4.2,
    type: 'Library',
    address: '789 Elm St',
    latitude: 25.0508,
    longitude: 121.5627,
    source: 'commercial',
    reviews: [],
    funnyQuote: FUNNY_QUOTES[2],
  },
];

// International bathroom data (sample locations around the world)
const internationalBathrooms: Bathroom[] = [
  {
    id: 'int-1',
    name: 'Times Square Public Restroom',
    distance: 0,
    rating: 3.5,
    type: 'Public',
    address: 'Times Square, NYC',
    latitude: 40.7580,
    longitude: -73.9855,
    source: 'international',
    reviews: [],
    funnyQuote: FUNNY_QUOTES[3],
  },
  {
    id: 'int-2',
    name: 'Big Ben Toilet',
    distance: 0,
    rating: 4.0,
    type: 'Tourist',
    address: 'Westminster, London',
    latitude: 51.4994,
    longitude: -0.1245,
    source: 'international',
    reviews: [],
    funnyQuote: FUNNY_QUOTES[4],
  },
];

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [allBathrooms, setAllBathrooms] = useState<Bathroom[]>([]); // 所有廁所數據
  const [nearbyBathrooms, setNearbyBathrooms] = useState<Bathroom[]>([]); // 500公尺內廁所
  const [activeTab, setActiveTab] = useState(Platform.OS === 'web' ? 'nearby' : 'map');
  const [selectedBathroom, setSelectedBathroom] = useState<Bathroom | null>(null);
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  
  // Check-in modal state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInMood, setCheckInMood] = useState('🧻');
  const [checkInNote, setCheckInNote] = useState('');
  const [checkInRating, setCheckInRating] = useState(5);
  const [checkInBristolType, setCheckInBristolType] = useState<number | undefined>();
  const [checkInQuickTag, setCheckInQuickTag] = useState('');
  const [checkInImage, setCheckInImage] = useState<string | null>(null);
  const [checkInAudio, setCheckInAudio] = useState<string | null>(null);
  const [isPrivateCheckIn, setIsPrivateCheckIn] = useState(false);
  const [isAnonymousCheckIn, setIsAnonymousCheckIn] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  
  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isAnonymousReview, setIsAnonymousReview] = useState(false);
  
  // Visited records filter
  const [showTodayRecords, setShowTodayRecords] = useState(true);
  const [showPreviousRecords, setShowPreviousRecords] = useState(false);
  
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [visitedBathroomIds, setVisitedBathroomIds] = useState<string[]>([]);

  // Initialize achievement system
  const initializeAchievements = (): Achievement[] => [
    {
      id: 'explorer',
      title: 'City Poop Explorer 🧳💩',
      description: 'Check in at 5 different locations',
      emoji: '🧳',
      unlocked: false,
      progress: 0,
      target: 5,
    },
    {
      id: 'loyal',
      title: 'Loyal Toileteer 🛐🚽',
      description: 'Check in 10 times at the same location',
      emoji: '🛐',
      unlocked: false,
      progress: 0,
      target: 10,
    },
    {
      id: 'healthy',
      title: 'Healthy Poop King 👑💩',
      description: 'Record poop for 7 consecutive days',
      emoji: '👑',
      unlocked: false,
      progress: 0,
      target: 7,
    },
    {
      id: 'photographer',
      title: 'Toilet Photographer 📸🚽',
      description: 'Take photos in 3 different check-ins',
      emoji: '📸',
      unlocked: false,
      progress: 0,
      target: 3,
    },
    {
      id: 'reviewer',
      title: 'Toilet Critic 🌟💩',
      description: 'Write 5 bathroom reviews',
      emoji: '🌟',
      unlocked: false,
      progress: 0,
      target: 5,
    },
  ];

  // Load check-in records
  const loadCheckInRecords = async () => {
    try {
      const records = await AsyncStorage.getItem('checkInRecords');
      if (records) {
        const parsedRecords = JSON.parse(records);
        setCheckInRecords(parsedRecords);
        setVisitedBathroomIds(parsedRecords.map((r: CheckInRecord) => r.bathroom.id));
      }
    } catch (error) {
      console.error('載入打卡記錄失敗:', error);
    }
  };

  // Load achievements
  const loadAchievements = async () => {
    try {
      const savedAchievements = await AsyncStorage.getItem('achievements');
      if (savedAchievements) {
        setAchievements(JSON.parse(savedAchievements));
      } else {
        const initialAchievements = initializeAchievements();
        setAchievements(initialAchievements);
        await AsyncStorage.setItem('achievements', JSON.stringify(initialAchievements));
      }
    } catch (error) {
      console.error('載入成就失敗:', error);
      setAchievements(initializeAchievements());
    }
  };

  // Update achievement progress
  const updateAchievements = async (newRecord: CheckInRecord) => {
    const updatedAchievements = [...achievements];
    
    // City Explorer: different location count
    const uniqueLocations = new Set([...checkInRecords, newRecord].map(r => r.bathroom.id));
    const explorerAchievement = updatedAchievements.find(a => a.id === 'explorer');
    if (explorerAchievement) {
      explorerAchievement.progress = uniqueLocations.size;
      if (uniqueLocations.size >= explorerAchievement.target && !explorerAchievement.unlocked) {
        explorerAchievement.unlocked = true;
        Alert.alert('🎉 Achievement Unlocked!', `${explorerAchievement.title}\n${explorerAchievement.description}`);
      }
    }
    
    // Loyal Toileteer: same location count
    const locationCounts = [...checkInRecords, newRecord].reduce((acc, record) => {
      acc[record.bathroom.id] = (acc[record.bathroom.id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxSameLocation = Math.max(...Object.values(locationCounts));
    const loyalAchievement = updatedAchievements.find(a => a.id === 'loyal');
    if (loyalAchievement) {
      loyalAchievement.progress = maxSameLocation;
      if (maxSameLocation >= loyalAchievement.target && !loyalAchievement.unlocked) {
        loyalAchievement.unlocked = true;
        Alert.alert('🎉 Achievement Unlocked!', `${loyalAchievement.title}\n${loyalAchievement.description}`);
      }
    }

    // Photographer achievement
    const photoRecords = [...checkInRecords, newRecord].filter(r => r.image);
    const photographerAchievement = updatedAchievements.find(a => a.id === 'photographer');
    if (photographerAchievement) {
      photographerAchievement.progress = photoRecords.length;
      if (photoRecords.length >= photographerAchievement.target && !photographerAchievement.unlocked) {
        photographerAchievement.unlocked = true;
        Alert.alert('🎉 Achievement Unlocked!', `${photographerAchievement.title}\n${photographerAchievement.description}`);
      }
    }
    
    setAchievements(updatedAchievements);
    await AsyncStorage.setItem('achievements', JSON.stringify(updatedAchievements));
  };

  // Image picker
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setCheckInImage(result.assets[0].uri);
    }
  };

  // Camera picker
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setCheckInImage(result.assets[0].uri);
    }
  };

  // Audio recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need microphone permissions to record audio!');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setCheckInAudio(uri);
    setRecording(null);
  };

  // Validate check-in form
  const validateCheckInForm = (): boolean => {
    if (!checkInMood) {
      Alert.alert('請選擇心情', '請選擇一個心情或大便狀態');
      return false;
    }
    if (!checkInQuickTag) {
      Alert.alert('請選擇場景標籤', '請選擇一個場景標籤');
      return false;
    }
    return true;
  };

  // Perform check-in
  const performCheckIn = async () => {
    if (!selectedBathroom) return;
    
    if (!validateCheckInForm()) {
      return;
    }
    
    const newRecord: CheckInRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      bathroom: selectedBathroom,
      mood: checkInMood,
      bristolType: checkInBristolType,
      note: checkInNote,
      quickTag: checkInQuickTag,
      rating: checkInRating,
      image: checkInImage,
      audioUri: checkInAudio,
      location: {
        lat: selectedBathroom.latitude,
        lng: selectedBathroom.longitude,
        name: selectedBathroom.name,
      },
      isPrivate: isPrivateCheckIn,
      anonymous: isAnonymousCheckIn,
      customMessage: customMessage,
    };
    
    const updatedRecords = [...checkInRecords, newRecord];
    setCheckInRecords(updatedRecords);
    setVisitedBathroomIds([...visitedBathroomIds, selectedBathroom.id]);
    
    // Save to local storage
    await AsyncStorage.setItem('checkInRecords', JSON.stringify(updatedRecords));
    
    // Update achievements
    await updateAchievements(newRecord);
    
    // Reset form
    resetCheckInForm();
    
    // Show fun animation/sound effect (placeholder)
    Alert.alert('🎉 打卡成功！', `已在 ${selectedBathroom.name} 打卡\n🚽 沖水聲效果！`, [
      {
        text: '太棒了！',
        onPress: () => console.log('Check-in animation played')
      }
    ]);
  };

  // Reset check-in form
  const resetCheckInForm = () => {
    setShowCheckInModal(false);
    setCheckInNote('');
    setCheckInMood('🧻');
    setCheckInRating(5);
    setCheckInBristolType(undefined);
    setCheckInQuickTag('');
    setCheckInImage(null);
    setCheckInAudio(null);
    setIsPrivateCheckIn(false);
    setIsAnonymousCheckIn(false);
    setCustomMessage('');
  };

  // Submit review
  const submitReview = async () => {
    if (!selectedBathroom || !reviewText.trim()) {
      Alert.alert('請填寫評論', '請輸入評論內容');
      return;
    }

    const newReview: Review = {
      id: Date.now().toString(),
      userId: 'user123', // Replace with actual user ID
      userName: isAnonymousReview ? '匿名用戶' : '使用者', // Replace with actual username
      rating: reviewRating,
      comment: reviewText,
      timestamp: Date.now(),
      anonymous: isAnonymousReview,
    };

    // Update bathroom reviews
    const updatedBathrooms = allBathrooms.map(bathroom => {
      if (bathroom.id === selectedBathroom.id) {
        const updatedReviews = [...(bathroom.reviews || []), newReview];
        const avgRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0) / updatedReviews.length;
        return {
          ...bathroom,
          reviews: updatedReviews,
          rating: avgRating,
        };
      }
      return bathroom;
    });

    setAllBathrooms(updatedBathrooms);
    
    // Update achievement for reviewer
    const reviewerAchievement = achievements.find(a => a.id === 'reviewer');
    if (reviewerAchievement) {
      const totalReviews = updatedBathrooms.reduce((sum, bathroom) => 
        sum + (bathroom.reviews?.filter(r => r.userId === 'user123').length || 0), 0
      );
      
      const updatedAchievements = achievements.map(a => {
        if (a.id === 'reviewer') {
          const updated = { ...a, progress: totalReviews };
          if (totalReviews >= a.target && !a.unlocked) {
            updated.unlocked = true;
            Alert.alert('🎉 Achievement Unlocked!', `${a.title}\n${a.description}`);
          }
          return updated;
        }
        return a;
      });
      
      setAchievements(updatedAchievements);
      await AsyncStorage.setItem('achievements', JSON.stringify(updatedAchievements));
    }

    // Reset review form
    setShowReviewModal(false);
    setReviewText('');
    setReviewRating(5);
    setIsAnonymousReview(false);
    
    Alert.alert('✅ 評論已提交', '感謝您的評論！');
  };

  // Share poop journey
  const sharePooJourney = async () => {
    try {
      const todayRecords = getTodayRecords();
      const message = `今天我的屎線冒險：拜訪了 ${todayRecords.length} 個廁所！\n${todayRecords.map(r => `${r.mood} ${r.bathroom.name}`).join('\n')}\n\n來自 PooPalooza 💩`;
      
      await Share.share({
        message: message,
        title: '我的屎線冒險',
      });
    } catch (error) {
      console.error('分享失敗:', error);
    }
  };

  // Get today's records
  const getTodayRecords = (): CheckInRecord[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkInRecords.filter(record => {
      const recordDate = new Date(record.timestamp);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
  };

  // Get previous records (not today)
  const getPreviousRecords = (): CheckInRecord[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkInRecords.filter(record => {
      const recordDate = new Date(record.timestamp);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() < today.getTime();
    });
  };

  // Filter bathrooms within 500m
  const filterNearbyBathrooms = (userLocation: Location.LocationObject, bathrooms: Bathroom[]) => {
    return bathrooms
      .map(bathroom => {
        const distance = calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          bathroom.latitude,
          bathroom.longitude
        );
        return { ...bathroom, distance: distance / 1000 }; // 轉換為公里
      })
      .filter(bathroom => bathroom.distance <= 0.5) // 500公尺內
      .sort((a, b) => a.distance - b.distance); // 按距離排序
  };

  // Filter nearby bathrooms when location is obtained
  useEffect(() => {
    if (location && allBathrooms.length > 0) {
      console.log('🎯 開始篩選500公尺內廁所...');
      const nearby = filterNearbyBathrooms(location, allBathrooms);
      console.log(`📍 找到 ${nearby.length} 個500公尺內的廁所`);
      
      // 分類統計
      const govCount = nearby.filter(b => b.source === 'gov').length;
      const commercialCount = nearby.filter(b => b.source === 'commercial').length;
      const internationalCount = nearby.filter(b => b.source === 'international').length;
      console.log(`🏛️ 政府廁所: ${govCount} 個`);
      console.log(`🚻 商業廁所: ${commercialCount} 個`);
      console.log(`🌍 國際廁所: ${internationalCount} 個`);
      
      setNearbyBathrooms(nearby);
    }
  }, [location, allBathrooms]);

  // Auto move map to user location when location is obtained
  useEffect(() => {
    if (location && (activeTab === 'map' || activeTab === 'visited')) {
      console.log('🎯 位置獲取完成，自動移動到用戶位置');
      setTimeout(() => {
        centerMapOnUser();
      }, 1000);
    }
  }, [location, activeTab]);

  // Initialize app data
  useEffect(() => {
    console.log('🚀 初始化應用資料');
    loadCheckInRecords();
    loadAchievements();
    
    // 先載入 mock 資料和國際資料
    setAllBathrooms([...mockBathrooms, ...internationalBathrooms]);
  }, []);

  // Get location and government data - run in background, non-blocking
  useEffect(() => {
    const getLocationAndData = async () => {
      if (Platform.OS === 'web') {
        console.log('🌐 Web 平台，跳過位置獲取');
        return;
      }

      try {
        console.log('📍 開始請求位置權限...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('📍 權限狀態:', status);
        
        if (status !== 'granted') {
          console.log('❌ 位置權限被拒絕');
          setErrorMsg('Permission to access location was denied');
          return;
        }

        console.log('📍 獲取當前位置...');
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 8000,
          maximumAge: 30000,
        });
        
        console.log('📍 位置獲取成功：', currentLocation.coords);
        setLocation(currentLocation);

        // 處理政府資料
        console.log('🏛️ 開始處理政府廁所資料...');
        const govDataRaw = [
          ...changhua,
          ...Chiayi,
          ...Chiayi2,
          ...Hsinchu,
          ...Hsinchu2,
          ...Hualien,
          ...Kaohsiung,
          ...Keelung,
          ...Kinmen,
          ...Lienchiang,
          ...Miaoli,
          ...Nantou,
          ...new_taipei,
          ...Penghu,
          ...Pingtung,
          ...Taichung,
          ...Tainan,
          ...Taipei,
          ...Taitung,
          ...Taoyuan,
          ...Yilan,
          ...Yunlin,
        ];

        const govBathrooms: Bathroom[] = govDataRaw
          .filter((item) => item.latitude && item.longitude)
          .map((item, index) => {
            const lat = parseFloat(item.latitude);
            const lng = parseFloat(item.longitude);
            
            // 判斷是否為台灣境內，並檢查是否為政府機關
            let source: 'gov' | 'commercial' | 'international' = 'international';
            if (isInTaiwan(lat, lng)) {
              // 檢查名稱是否包含政府機關關鍵字
              const govKeywords = ['公所', '市政府', '縣政府', '區公所', '鄉公所', '鎮公所', '里民活動中心', '公園', '學校', '圖書館', '醫院', '衛生所'];
              const isGovFacility = govKeywords.some(keyword => 
                (item.name || '').includes(keyword) || 
                (item.address || '').includes(keyword) ||
                (item.type || '').includes(keyword) ||
                (item.type2 || '').includes(keyword)
              );
              source = isGovFacility ? 'gov' : 'commercial';
            }

            return {
              id: `data-${index}`,
              name: item.name || item.type || item.type2 || 'Public Toilet',
              address: item.address || 'Unknown Address',
              latitude: lat,
              longitude: lng,
              rating: 4.0,
              distance: 0.5,
              type: item.type || item.type2 || 'Public',
              source: source,
              reviews: [],
              funnyQuote: FUNNY_QUOTES[Math.floor(Math.random() * FUNNY_QUOTES.length)],
            };
          });

        console.log(`🏛️ 處理完成：${govBathrooms.filter(b => b.source === 'gov').length} 個政府廁所，${govBathrooms.filter(b => b.source === 'commercial').length} 個商業廁所，${govBathrooms.filter(b => b.source === 'international').length} 個國際廁所`);
        const allBathroomsData = [...mockBathrooms, ...internationalBathrooms, ...govBathrooms];
        setAllBathrooms(allBathroomsData);
        console.log(`📊 總計載入：${allBathroomsData.length} 個廁所`);
        
      } catch (error) {
        console.error('❌ 位置獲取失敗：', error);
        if (error.code === 'LOCATION_REQUEST_TIMEOUT') {
          setErrorMsg('Location request timed out. Please try again.');
        } else if (error.code === 'LOCATION_UNAVAILABLE') {
          setErrorMsg('Location services are not available.');
        } else {
          setErrorMsg('Could not get your location. Please check your GPS settings.');
        }
      }
    };

    getLocationAndData();
  }, []);

  // Center map on user location
  const centerMapOnUser = () => {
    console.log('🎯 嘗試移動到用戶位置...');
    
    if (location && mapRef.current) {
      console.log('✅ 移動到用戶位置:', location.coords.latitude, location.coords.longitude);
      try {
        mapRef.current.animateToRegion(
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000
        );
      } catch (error) {
        console.error('❌ 移動地圖失敗:', error);
      }
    } else {
      console.log('❌ 無法移動到用戶位置 - location 或 mapRef 不存在');
    }
  };

  // Retry location request
  const retryLocationRequest = async () => {
    console.log('🔄 手動重試位置獲取...');
    setIsLocationLoading(true);
    setErrorMsg(null);
    
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
        maximumAge: 5000,
      });
      
      console.log('✅ 重試成功，位置:', currentLocation.coords);
      setLocation(currentLocation);
    } catch (error) {
      console.error('❌ 重試失敗:', error);
      setErrorMsg('Still unable to get location. Please check GPS settings.');
    } finally {
      setIsLocationLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <View style={styles.starsContainer}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <Text key={`full-${i}`} style={styles.starIcon}>
            ★
          </Text>
        ))}
        {halfStar && <Text style={styles.starIcon}>★</Text>}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Text key={`empty-${i}`} style={[styles.starIcon, styles.emptyStar]}>
            ★
          </Text>
        ))}
      </View>
    );
  };

  const handleNavigate = (bathroom: Bathroom) => {
    Alert.alert('Navigate to Bathroom', `Would you like to get directions to ${bathroom.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: () => Alert.alert('Navigation', `Navigating to ${bathroom.name}`),
      },
    ]);
  };

  // Handle check-in button
  const handleCheckIn = (bathroom: Bathroom) => {
    setSelectedBathroom(bathroom);
    setShowCheckInModal(true);
  };

  // Handle review button
  const handleReview = (bathroom: Bathroom) => {
    setSelectedBathroom(bathroom);
    setShowReviewModal(true);
  };

  // Handle tab press
  const handleTabPress = (tab: string) => {
    console.log(`🔄 切換到 ${tab} 標籤`);
    setActiveTab(tab);
    
    if ((tab === 'map' || tab === 'visited') && location) {
      console.log('🗺️ 切換到地圖頁面，準備移動到用戶位置');
      setTimeout(() => {
        centerMapOnUser();
      }, 500);
    }
  };

  // Check-in modal component
  const CheckInModal = () => (
    <Modal
      visible={showCheckInModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCheckInModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>
              在 {selectedBathroom?.name} 打卡 🚽
            </Text>
            
            {/* Mood selection */}
            <Text style={styles.sectionTitle}>心情 / 大便狀態 *</Text>
            <View style={styles.emojiContainer}>
              {MOOD_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiButton,
                    checkInMood === emoji && styles.selectedEmoji
                  ]}
                  onPress={() => setCheckInMood(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick tags */}
            <Text style={styles.sectionTitle}>場景標籤 *</Text>
            <View style={styles.tagsContainer}>
              {QUICK_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagButton,
                    checkInQuickTag === tag && styles.selectedTag
                  ]}
                  onPress={() => setCheckInQuickTag(tag)}
                >
                  <Text style={[
                    styles.tagText,
                    checkInQuickTag === tag && styles.selectedTagText
                  ]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom message */}
            <Text style={styles.sectionTitle}>一句話描述</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="例：😤解脫感MAX、💩人生第一個機場大便..."
              value={customMessage}
              onChangeText={setCustomMessage}
            />
            
            {/* Bristol Scale selection */}
            <Text style={styles.sectionTitle}>大便類型 (Bristol Scale)</Text>
            <View style={styles.bristolContainer}>
              {Object.entries(BRISTOL_EMOJIS).map(([type, emoji]) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.bristolButton,
                    checkInBristolType === parseInt(type) && styles.selectedBristol
                  ]}
                  onPress={() => setCheckInBristolType(parseInt(type))}
                >
                  <Text style={styles.bristolEmoji}>{emoji}</Text>
                  <Text style={styles.bristolType}>Type {type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Rating */}
            <Text style={styles.sectionTitle}>舒適度評分</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setCheckInRating(star)}
                >
                  <Text style={[
                    styles.ratingStarLarge,
                    star <= checkInRating ? styles.activeStar : styles.inactiveStar
                  ]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Notes */}
            <Text style={styles.sectionTitle}>詳細筆記</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="分享你的廁所體驗..."
              value={checkInNote}
              onChangeText={setCheckInNote}
              multiline
              numberOfLines={3}
            />

            {/* Media uploads */}
            <Text style={styles.sectionTitle}>添加照片</Text>
            <View style={styles.mediaContainer}>
              <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
                <Camera size={24} color={Colors.primary.accent} />
                <Text style={styles.mediaButtonText}>拍照</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
                <Upload size={24} color={Colors.primary.accent} />
                <Text style={styles.mediaButtonText}>選擇照片</Text>
              </TouchableOpacity>
            </View>
            
            {checkInImage && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: checkInImage }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setCheckInImage(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Audio recording */}
            <Text style={styles.sectionTitle}>錄音留言</Text>
            <View style={styles.audioContainer}>
              <TouchableOpacity 
                style={[styles.recordButton, isRecording && styles.recordingActive]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <MicOff size={24} color="#FFFFFF" />
                ) : (
                  <Mic size={24} color="#FFFFFF" />
                )}
                <Text style={styles.recordButtonText}>
                  {isRecording ? '停止錄音' : '開始錄音'}
                </Text>
              </TouchableOpacity>
            </View>

            {checkInAudio && (
              <View style={styles.audioPreview}>
                <Text style={styles.audioPreviewText}>🎵 錄音已儲存</Text>
                <TouchableOpacity 
                  style={styles.removeAudioButton}
                  onPress={() => setCheckInAudio(null)}
                >
                  <Text style={styles.removeAudioText}>刪除</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Privacy settings */}
            <Text style={styles.sectionTitle}>隱私設定</Text>
            <View style={styles.privacyContainer}>
              <TouchableOpacity 
                style={styles.privacyOption}
                onPress={() => setIsPrivateCheckIn(!isPrivateCheckIn)}
              >
                {isPrivateCheckIn ? (
                  <EyeOff size={20} color={Colors.primary.accent} />
                ) : (
                  <Eye size={20} color={Colors.primary.lightText} />
                )}
                <Text style={styles.privacyText}>私人打卡（不分享給朋友）</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.privacyOption}
                onPress={() => setIsAnonymousCheckIn(!isAnonymousCheckIn)}
              >
                <Text style={[styles.privacyText, isAnonymousCheckIn && styles.activePrivacyText]}>
                  {isAnonymousCheckIn ? '✅' : '☐'} 匿名分享
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCheckInModal(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkInButton}
                onPress={performCheckIn}
              >
                <Text style={styles.checkInButtonText}>打卡 🎯</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Review modal component
  const ReviewModal = () => (
    <Modal
      visible={showReviewModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowReviewModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>
              評論 {selectedBathroom?.name} 🌟
            </Text>
            
            {/* Rating */}
            <Text style={styles.sectionTitle}>評分</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                >
                  <Text style={[
                    styles.ratingStarLarge,
                    star <= reviewRating ? styles.activeStar : styles.inactiveStar
                  ]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Review text */}
            <Text style={styles.sectionTitle}>評論內容</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="分享你對這個廁所的評價..."
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
            />

            {/* Anonymous option */}
            <TouchableOpacity 
              style={styles.privacyOption}
              onPress={() => setIsAnonymousReview(!isAnonymousReview)}
            >
              <Text style={[styles.privacyText, isAnonymousReview && styles.activePrivacyText]}>
                {isAnonymousReview ? '✅' : '☐'} 匿名評論
              </Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkInButton}
                onPress={submitReview}
              >
                <Text style={styles.checkInButtonText}>提交評論</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Map component - using filtered nearby bathrooms
  const MapComponent = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webMapPlaceholder}>
          <MapPin size={48} color={Colors.primary.lightText} />
          <Text style={styles.webMapTitle}>地圖視圖</Text>
          <Text style={styles.webMapText}>
            互動地圖在手機應用程式中可用。請使用列表視圖查看附近的廁所。
          </Text>
          <TouchableOpacity style={styles.webMapButton} onPress={() => setActiveTab('nearby')}>
            <Text style={styles.webMapButtonText}>查看列表</Text>
          </TouchableOpacity>
        </View>
      );
    }

    try {
      const MapModule = require('react-native-maps');
      const MapView = MapModule.default;
      const { Marker, Callout, Polyline, PROVIDER_GOOGLE } = MapModule;

      const defaultRegion = {
        latitude: 25.0330,
        longitude: 121.5654,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      const currentRegion = location ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      } : defaultRegion;

      const handleMarkerPress = (bathroom: Bathroom) => {
        setSelectedBathroom(bathroom);
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: bathroom.latitude,
              longitude: bathroom.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            500,
          );
        }
      };

      // Determine displayed data based on activeTab
      const displayBathrooms = activeTab === 'visited' 
        ? checkInRecords.map(r => r.bathroom)
        : activeTab === 'journey'
        ? checkInRecords.map(r => r.bathroom)
        : nearbyBathrooms;

      // Create journey route coordinates for polyline
      const journeyCoordinates = activeTab === 'journey' && checkInRecords.length > 1
        ? checkInRecords
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(record => ({
              latitude: record.location.lat,
              longitude: record.location.lng,
            }))
        : [];

      return (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={currentRegion}
            showsUserLocation={!!location}
            showsMyLocationButton={false}
          >
            {displayBathrooms.map((bathroom) => (
                <Marker
                  key={bathroom.id}
                  coordinate={{ latitude: bathroom.latitude, longitude: bathroom.longitude }}
                  title={getBathroomDisplayName(bathroom)}
                  onPress={() => handleMarkerPress(bathroom)}
                >
                  <View
                    style={[
                      styles.markerContainer, 
                      { borderColor: getMarkerColor(bathroom) },
                      selectedBathroom?.id === bathroom.id && styles.selectedMarker
                    ]}
                  >
                    <Text style={[styles.markerEmoji, { color: getMarkerColor(bathroom) }]}>
                      {getBathroomIcon(bathroom)}
                    </Text>
                  </View>
                  <Callout tooltip>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle}>{bathroom.name}</Text>
                      <Text style={styles.calloutSubtitle}>{bathroom.type}</Text>
                      <View style={styles.calloutRating}>{renderStars(bathroom.rating)}</View>
                      <Text style={styles.calloutSource}>
                        來源: {bathroom.source === 'gov' ? '政府' : bathroom.source === 'commercial' ? '商業' : '國際'}
                      </Text>
                      {bathroom.funnyQuote && (
                        <Text style={styles.calloutQuote}>💭 {bathroom.funnyQuote}</Text>
                      )}
                      {(activeTab === 'visited' || activeTab === 'journey') && (
                        <Text style={styles.calloutVisited}>✅ 已拜訪</Text>
                      )}
                    </View>
                  </Callout>
                </Marker>
              ))}

            {/* Show journey route */}
            {activeTab === 'journey' && journeyCoordinates.length > 1 && (
              <Polyline
                coordinates={journeyCoordinates}
                strokeColor="#FF6B6B"
                strokeWidth={3}
                lineDashPattern={[5, 5]}
              />
            )}

            {/* Show special markers for check-in records */}
            {(activeTab === 'visited' || activeTab === 'journey') && checkInRecords.map((record) => (
              <Marker
                key={`record-${record.id}`}
                coordinate={{ latitude: record.location.lat, longitude: record.location.lng }}
                title={`${record.mood} ${record.location.name}`}
                description={record.customMessage || record.note}
              >
                <View style={styles.checkInMarker}>
                  <Text style={styles.checkInEmoji}>{record.mood}</Text>
                </View>
              </Marker>
            ))}
          </MapView>

          <View style={styles.mapControls}>
            <TouchableOpacity 
              style={[styles.mapControlButton, !location && styles.disabledButton]} 
              onPress={centerMapOnUser}
              disabled={!location}
            >
              <Compass size={24} color={location ? Colors.primary.accent : Colors.primary.lightText} />
            </TouchableOpacity>
            
            {/* Show bathroom statistics */}
            <View style={styles.locationStatus}>
              <Text style={styles.locationStatusText}>
                {activeTab === 'visited' 
                  ? `📍 ${checkInRecords.length} 次打卡`
                  : activeTab === 'journey'
                  ? `🗺️ ${checkInRecords.length} 站旅程`
                  : `📍 ${nearbyBathrooms.length} 附近廁所`
                }
              </Text>
              {activeTab !== 'visited' && activeTab !== 'journey' && nearbyBathrooms.length > 0 && (
                <Text style={styles.locationStatusSubtext}>
                  🏛️ {nearbyBathrooms.filter(b => b.source === 'gov').length} 政府 | 
                  🚻 {nearbyBathrooms.filter(b => b.source === 'commercial').length} 商業 |
                  🌍 {nearbyBathrooms.filter(b => b.source === 'international').length} 國際
                </Text>
              )}
            </View>
          </View>

          {selectedBathroom && (
            <View style={styles.bathroomDetailCard}>
              <View style={styles.bathroomInfo}>
                <View style={styles.bathroomHeader}>
                  <Text style={styles.bathroomName}>{getBathroomDisplayName(selectedBathroom)}</Text>
                  <View style={styles.typeTag}>
                    <Text style={styles.typeText}>{selectedBathroom.type}</Text>
                  </View>
                </View>

                <Text style={styles.bathroomAddress}>{selectedBathroom.address}</Text>
                
                {selectedBathroom.funnyQuote && (
                  <Text style={styles.funnyQuote}>💭 {selectedBathroom.funnyQuote}</Text>
                )}

                <View style={styles.bathroomDetails}>
                  <View style={styles.ratingContainer}>
                    {renderStars(selectedBathroom.rating)}
                    <Text style={styles.ratingText}>{selectedBathroom.rating.toFixed(1)}</Text>
                    {selectedBathroom.reviews && selectedBathroom.reviews.length > 0 && (
                      <Text style={styles.reviewCount}>({selectedBathroom.reviews.length} 評論)</Text>
                    )}
                  </View>
                  <Text style={styles.distanceText}>
                    {selectedBathroom.distance < 1 
                      ? `${Math.round(selectedBathroom.distance * 1000)}m`
                      : `${selectedBathroom.distance.toFixed(1)}km`
                    }
                  </Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.checkInActionButton} 
                  onPress={() => handleCheckIn(selectedBathroom)}
                >
                  <Heart size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.reviewButton} 
                  onPress={() => handleReview(selectedBathroom)}
                >
                  <MessageCircle size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.navigateButton} 
                  onPress={() => handleNavigate(selectedBathroom)}
                >
                  <Navigation size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      );
    } catch (error) {
      console.error('地圖載入失敗:', error);
      return (
        <View style={styles.mapFallback}>
          <MapPin size={64} color={Colors.primary.accent} />
          <Text style={styles.mapFallbackTitle}>地圖暫時無法使用</Text>
          <Text style={styles.mapFallbackText}>
            地圖功能正在載入中。請稍後再試或使用列表模式查看附近廁所。
          </Text>
          <TouchableOpacity 
            style={styles.fallbackButton}
            onPress={() => setActiveTab('nearby')}
          >
            <Text style={styles.fallbackButtonText}>切換到列表模式</Text>
          </TouchableOpacity>
          
          {location && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationInfoText}>
                您的位置: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
              </Text>
            </View>
          )}
        </View>
      );
    }
  };

  // Show nearby bathroom list (within 500m)
  const renderNearbyList = () => (
    <View style={styles.listContainer}>
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>500公尺內的廁所</Text>
        {nearbyBathrooms.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              總計 {nearbyBathrooms.length} 個 | 
              🏛️ {nearbyBathrooms.filter(b => b.source === 'gov').length} 政府 | 
              🚻 {nearbyBathrooms.filter(b => b.source === 'commercial').length} 商業 |
              🌍 {nearbyBathrooms.filter(b => b.source === 'international').length} 國際
            </Text>
          </View>
        )}
      </View>
      
      {nearbyBathrooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {location ? '500公尺內沒有找到廁所' : '正在載入附近廁所...'}
          </Text>
          {!location && (
            <Text style={styles.emptySubtext}>
              請確保已啟用GPS定位服務
            </Text>
          )}
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollableList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {nearbyBathrooms.map((bathroom) => (
            <TouchableOpacity
              key={bathroom.id}
              style={[
                styles.bathroomCard,
                visitedBathroomIds.includes(bathroom.id) && styles.visitedCard
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  setActiveTab('map');
                  setSelectedBathroom(bathroom);
                }
              }}
            >
              <View style={styles.bathroomInfo}>
                <View style={styles.bathroomHeader}>
                  <Text style={styles.bathroomName}>
                    {getBathroomIcon(bathroom)} {bathroom.name}
                    {visitedBathroomIds.includes(bathroom.id) && ' ✅'}
                  </Text>
                  <View style={[
                    styles.typeTag,
                    { backgroundColor: getMarkerColor(bathroom) }
                  ]}>
                    <Text style={styles.typeText}>{bathroom.type}</Text>
                  </View>
                </View>
                <Text style={styles.bathroomAddress}>{bathroom.address}</Text>
                
                {bathroom.funnyQuote && (
                  <Text style={styles.funnyQuote}>💭 {bathroom.funnyQuote}</Text>
                )}
                
                <View style={styles.bathroomDetails}>
                  <View style={styles.ratingContainer}>
                    {renderStars(bathroom.rating)}
                    <Text style={styles.ratingText}>{bathroom.rating.toFixed(1)}</Text>
                    {bathroom.reviews && bathroom.reviews.length > 0 && (
                      <Text style={styles.reviewCount}>({bathroom.reviews.length})</Text>
                    )}
                  </View>
                  <Text style={styles.distanceText}>
                    {bathroom.distance < 1 
                      ? `${Math.round(bathroom.distance * 1000)}m`
                      : `${bathroom.distance.toFixed(1)}km`
                    }
                  </Text>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.checkInActionButton} 
                  onPress={() => handleCheckIn(bathroom)}
                >
                  <Heart size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.reviewButton} 
                  onPress={() => handleReview(bathroom)}
                >
                  <MessageCircle size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.navigateButton} 
                  onPress={() => handleNavigate(bathroom)}
                >
                  <Navigation size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // Show check-in records and achievements
  const renderVisitedContent = () => {
    const todayRecords = getTodayRecords();
    const previousRecords = getPreviousRecords();

    if (checkInRecords.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MapPin size={48} color={Colors.primary.lightText} />
          <Text style={styles.emptyTitle}>沒有打卡記錄</Text>
          <Text style={styles.emptyText}>
            開始使用廁所並打卡來建立你的「大便旅程地圖」！
          </Text>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={() => setActiveTab('nearby')}
          >
            <Text style={styles.startButtonText}>開始尋找廁所</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.visitedContainer}>
        {/* Map view */}
        <View style={styles.visitedMapContainer}>
          <MapComponent />
        </View>

        {/* Quick check-in button for current location */}
        {location && (
          <TouchableOpacity 
            style={styles.quickCheckInButton}
            onPress={() => {
              // Create a temporary bathroom for current location
              const currentLocationBathroom: Bathroom = {
                id: 'current-location',
                name: '當前位置',
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                address: '我的當前位置',
                rating: 0,
                distance: 0,
                type: '自由打卡',
                source: 'commercial',
                reviews: [],
                funnyQuote: '在這裡留下你的足跡吧！',
              };
              handleCheckIn(currentLocationBathroom);
            }}
          >
            <MapPin size={20} color="#FFFFFF" />
            <Text style={styles.quickCheckInText}>在此打卡 💩</Text>
          </TouchableOpacity>
        )}

        {/* Records section */}
        <ScrollView 
          style={styles.recordsScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Achievement section */}
          <View style={styles.achievementsSection}>
            <Text style={styles.sectionTitle}>🏆 成就系統</Text>
            <View style={styles.achievementsList}>
              {achievements.map((achievement) => (
                <View key={achievement.id} style={[
                  styles.achievementCard,
                  achievement.unlocked && styles.unlockedAchievement
                ]}>
                  <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementDescription}>{achievement.description}</Text>
                    <View style={styles.achievementProgress}>
                      <Text style={styles.progressText}>
                        {achievement.progress}/{achievement.target}
                      </Text>
                      <View style={styles.progressBar}>
                        <View style={[
                          styles.progressFill,
                          { width: `${Math.min(100, (achievement.progress / achievement.target) * 100)}%` }
                        ]} />
                      </View>
                    </View>
                  </View>
                  {achievement.unlocked && (
                    <Text style={styles.unlockedBadge}>✅</Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Today's records */}
          <View style={styles.recordsSection}>
            <TouchableOpacity 
              style={styles.recordsHeader}
              onPress={() => setShowTodayRecords(!showTodayRecords)}
            >
              <Text style={styles.sectionTitle}>📍 今日打卡 ({todayRecords.length})</Text>
              {showTodayRecords ? (
                <ChevronUp size={24} color={Colors.primary.text} />
              ) : (
                <ChevronDown size={24} color={Colors.primary.text} />
              )}
            </TouchableOpacity>
            
            {showTodayRecords && (
              <View style={styles.recordsList}>
                {todayRecords.length === 0 ? (
                  <Text style={styles.noRecordsText}>今天還沒有打卡記錄</Text>
                ) : (
                  todayRecords.sort((a, b) => b.timestamp - a.timestamp).map((record) => (
                    <View key={record.id} style={styles.recordCard}>
                      <View style={styles.recordHeader}>
                        <Text style={styles.recordMood}>{record.mood}</Text>
                        <View style={styles.recordInfo}>
                          <Text style={styles.recordName}>{record.bathroom.name}</Text>
                          <Text style={styles.recordTime}>
                            {new Date(record.timestamp).toLocaleTimeString('zh-TW', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Text>
                          {record.quickTag && (
                            <Text style={styles.recordTag}>🏷️ {record.quickTag}</Text>
                          )}
                        </View>
                      </View>
                      
                      {record.customMessage && (
                        <View style={styles.recordDetail}>
                          <Text style={styles.recordCustomMessage}>💬 {record.customMessage}</Text>
                        </View>
                      )}
                      
                      {record.bristolType && (
                        <View style={styles.recordDetail}>
                          <Text style={styles.recordDetailText}>
                            大便類型: {BRISTOL_EMOJIS[record.bristolType]} Type {record.bristolType}
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.recordDetail}>
                        <Text style={styles.recordDetailText}>
                          舒適度: {renderStars(record.rating)}
                        </Text>
                      </View>
                      
                      {record.image && (
                        <View style={styles.recordImageContainer}>
                          <Image source={{ uri: record.image }} style={styles.recordImage} />
                        </View>
                      )}
                      
                      {record.audioUri && (
                        <View style={styles.recordAudio}>
                          <Text style={styles.recordAudioText}>🎵 語音留言</Text>
                        </View>
                      )}
                      
                      {record.note && (
                        <View style={styles.recordNote}>
                          <Text style={styles.recordNoteText}>📝 {record.note}</Text>
                        </View>
                      )}

                      <View style={styles.recordFooter}>
                        <Text style={styles.recordPrivacy}>
                          {record.isPrivate ? '🔒 私人' : '🌍 公開'} | 
                          {record.anonymous ? ' 匿名' : ' 具名'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>

          {/* Previous records */}
          {previousRecords.length > 0 && (
            <View style={styles.recordsSection}>
              <TouchableOpacity 
                style={styles.recordsHeader}
                onPress={() => setShowPreviousRecords(!showPreviousRecords)}
              >
                <Text style={styles.sectionTitle}>📅 之前記錄 ({previousRecords.length})</Text>
                {showPreviousRecords ? (
                  <ChevronUp size={24} color={Colors.primary.text} />
                ) : (
                  <ChevronDown size={24} color={Colors.primary.text} />
                )}
              </TouchableOpacity>
              
              {showPreviousRecords && (
                <View style={styles.recordsList}>
                  {previousRecords.sort((a, b) => b.timestamp - a.timestamp).map((record) => (
                    <View key={record.id} style={styles.recordCard}>
                      <View style={styles.recordHeader}>
                        <Text style={styles.recordMood}>{record.mood}</Text>
                        <View style={styles.recordInfo}>
                          <Text style={styles.recordName}>{record.bathroom.name}</Text>
                          <Text style={styles.recordDate}>
                            {new Date(record.timestamp).toLocaleDateString('zh-TW')} {' '}
                            {new Date(record.timestamp).toLocaleTimeString('zh-TW', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Text>
                          {record.quickTag && (
                            <Text style={styles.recordTag}>🏷️ {record.quickTag}</Text>
                          )}
                        </View>
                      </View>
                      
                      {record.customMessage && (
                        <View style={styles.recordDetail}>
                          <Text style={styles.recordCustomMessage}>💬 {record.customMessage}</Text>
                        </View>
                      )}
                      
                      {record.note && (
                        <View style={styles.recordNote}>
                          <Text style={styles.recordNoteText}>📝 {record.note}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Share journey button */}
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={sharePooJourney}
          >
            <Share2 size={20} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>分享今日屎線</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // Journey view - visualize the poop journey
  const renderJourneyContent = () => {
    if (checkInRecords.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Route size={48} color={Colors.primary.lightText} />
          <Text style={styles.emptyTitle}>還沒有屎線記錄</Text>
          <Text style={styles.emptyText}>
            開始打卡來建立你的專屬「屎線」冒險路線！
          </Text>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={() => setActiveTab('nearby')}
          >
            <Text style={styles.startButtonText}>開始冒險</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const journeyStats = {
      totalCheckIns: checkInRecords.length,
      uniqueLocations: new Set(checkInRecords.map(r => r.bathroom.id)).size,
      totalDistance: 0, // Calculate based on route
      favoriteLocation: '', // Most visited location
    };

    return (
      <View style={styles.journeyContainer}>
        {/* Journey map */}
        <View style={styles.journeyMapContainer}>
          <MapComponent />
        </View>

        <ScrollView 
          style={styles.journeyScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Journey stats */}
          <View style={styles.journeyStatsSection}>
            <Text style={styles.sectionTitle}>🗺️ 我的屎線統計</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{journeyStats.totalCheckIns}</Text>
                <Text style={styles.statLabel}>總打卡次數</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{journeyStats.uniqueLocations}</Text>
                <Text style={styles.statLabel}>獨特地點</Text>
              </View>
            </View>
          </View>

          {/* Journey timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>⏱️ 冒險時間軸</Text>
            <View style={styles.timeline}>
              {checkInRecords
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((record, index) => (
                  <View key={record.id} style={styles.timelineItem}>
                    <View style={styles.timelineMarker}>
                      <Text style={styles.timelineEmoji}>{record.mood}</Text>
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>{record.bathroom.name}</Text>
                      <Text style={styles.timelineDate}>
                        {new Date(record.timestamp).toLocaleDateString('zh-TW')} {' '}
                        {new Date(record.timestamp).toLocaleTimeString('zh-TW', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      {record.customMessage && (
                        <Text style={styles.timelineMessage}>💬 {record.customMessage}</Text>
                      )}
                      {record.quickTag && (
                        <Text style={styles.timelineTag}>🏷️ {record.quickTag}</Text>
                      )}
                    </View>
                    {index < checkInRecords.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                ))}
            </View>
          </View>

          {/* Journey sharing */}
          <View style={styles.journeyShareSection}>
            <Text style={styles.sectionTitle}>📱 分享我的屎線</Text>
            <TouchableOpacity 
              style={styles.shareJourneyButton}
              onPress={sharePooJourney}
            >
              <Share2 size={20} color="#FFFFFF" />
              <Text style={styles.shareJourneyText}>分享完整旅程</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderContent = () => {
    if (errorMsg) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Text style={styles.errorSubtext}>
            請啟用定位服務以尋找附近廁所。
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={retryLocationRequest}
          >
            <Text style={styles.retryButtonText}>重試定位</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (activeTab) {
      case 'map':
        return <MapComponent />;
      case 'nearby':
        return renderNearbyList();
      case 'visited':
        return renderVisitedContent();
      case 'journey':
        return renderJourneyContent();
      default:
        return renderNearbyList();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PooPalooza 💩</Text>
        
        <View style={styles.tabContainer}>
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'map' && styles.activeTab]}
              onPress={() => handleTabPress('map')}
              activeOpacity={0.7}
            >
              <MapPin size={16} color={activeTab === 'map' ? '#FFFFFF' : Colors.primary.lightText} />
              <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>地圖</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'nearby' && styles.activeTab]}
            onPress={() => handleTabPress('nearby')}
            activeOpacity={0.7}
          >
            <List size={16} color={activeTab === 'nearby' ? '#FFFFFF' : Colors.primary.lightText} />
            <Text style={[styles.tabText, activeTab === 'nearby' && styles.activeTabText]}>
              附近 ({nearbyBathrooms.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'visited' && styles.activeTab]}
            onPress={() => handleTabPress('visited')}
            activeOpacity={0.7}
          >
            <Trophy size={16} color={activeTab === 'visited' ? '#FFFFFF' : Colors.primary.lightText} />
            <Text style={[styles.tabText, activeTab === 'visited' && styles.activeTabText]}>
              打卡 ({checkInRecords.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'journey' && styles.activeTab]}
            onPress={() => handleTabPress('journey')}
            activeOpacity={0.7}
          >
            <Route size={16} color={activeTab === 'journey' ? '#FFFFFF' : Colors.primary.lightText} />
            <Text style={[styles.tabText, activeTab === 'journey' && styles.activeTabText]}>屎線</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderContent()}
      <CheckInModal />
      <ReviewModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.card,
    borderRadius: 20,
    padding: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 4,
  },
  activeTab: {
    backgroundColor: Colors.primary.accent,
  },
  tabText: {
    fontSize: 12,
    color: Colors.primary.lightText,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.primary.lightText,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.primary.background,
  },
  mapFallbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginTop: 16,
    marginBottom: 8,
  },
  mapFallbackText: {
    fontSize: 16,
    color: Colors.primary.lightText,
    textAlign: 'center',
    marginBottom: 24,
  },
  fallbackButton: {
    backgroundColor: Colors.primary.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginBottom: 16,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  locationInfo: {
    backgroundColor: Colors.primary.card,
    padding: 12,
    borderRadius: 8,
  },
  locationInfoText: {
    fontSize: 14,
    color: Colors.primary.text,
    textAlign: 'center',
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  mapControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  locationStatus: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  locationStatusText: {
    fontSize: 12,
    color: Colors.primary.text,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  locationStatusSubtext: {
    fontSize: 10,
    color: Colors.primary.lightText,
    textAlign: 'center',
    marginTop: 2,
  },
  markerContainer: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.primary.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerEmoji: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  selectedMarker: {
    borderColor: Colors.primary.accent,
    backgroundColor: Colors.primary.card,
  },
  checkInMarker: {
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  checkInEmoji: {
    fontSize: 18,
  },
  calloutContainer: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: Colors.primary.lightText,
    marginBottom: 4,
  },
  calloutRating: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calloutSource: {
    fontSize: 11,
    color: Colors.primary.lightText,
    marginBottom: 2,
    fontStyle: 'italic',
  },
  calloutQuote: {
    fontSize: 11,
    color: Colors.primary.accent,
    marginBottom: 2,
    fontStyle: 'italic',
  },
  calloutVisited: {
    fontSize: 11,
    color: '#34C759',
    marginTop: 2,
    fontWeight: 'bold',
  },
  bathroomDetailCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  statsContainer: {
    backgroundColor: Colors.primary.card,
    padding: 8,
    borderRadius: 8,
  },
  statsText: {
    fontSize: 14,
    color: Colors.primary.lightText,
    textAlign: 'center',
  },
  scrollableList: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  bathroomCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  visitedCard: {
    borderWidth: 2,
    borderColor: '#34C759',
  },
  bathroomInfo: {
    flex: 1,
  },
  bathroomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bathroomName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginRight: 8,
    flex: 1,
  },
  typeTag: {
    backgroundColor: Colors.primary.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  bathroomAddress: {
    fontSize: 14,
    color: Colors.primary.lightText,
    marginBottom: 4,
  },
  funnyQuote: {
    fontSize: 12,
    color: Colors.primary.accent,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  bathroomDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    fontSize: 16,
    color: '#FFC107',
    marginRight: 2,
  },
  emptyStar: {
    color: Colors.primary.border,
  },
  ratingText: {
    fontSize: 14,
    color: Colors.primary.lightText,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: Colors.primary.lightText,
    marginLeft: 4,
  },
  distanceText: {
    fontSize: 14,
    color: Colors.primary.lightText,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  checkInActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.primary.lightText,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.primary.lightText,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: Colors.primary.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Check-in modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.primary.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  emojiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary.card,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  selectedEmoji: {
    backgroundColor: Colors.primary.accent,
  },
  emojiText: {
    fontSize: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tagButton: {
    backgroundColor: Colors.primary.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    margin: 4,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  selectedTag: {
    backgroundColor: Colors.primary.accent,
    borderColor: Colors.primary.accent,
  },
  tagText: {
    fontSize: 14,
    color: Colors.primary.text,
  },
  selectedTagText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  messageInput: {
    backgroundColor: Colors.primary.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    color: Colors.primary.text,
  },
  bristolContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  bristolButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary.card,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  selectedBristol: {
    backgroundColor: Colors.primary.accent,
  },
  bristolEmoji: {
    fontSize: 20,
  },
  bristolType: {
    fontSize: 10,
    color: Colors.primary.text,
    textAlign: 'center',
  },
  ratingStarLarge: {
    fontSize: 32,
    marginHorizontal: 4,
  },
  activeStar: {
    color: '#FFC107',
  },
  inactiveStar: {
    color: Colors.primary.border,
  },
  noteInput: {
    backgroundColor: Colors.primary.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    color: Colors.primary.text,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  mediaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  mediaButtonText: {
    fontSize: 14,
    color: Colors.primary.text,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  audioContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  recordingActive: {
    backgroundColor: '#FF3333',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  audioPreviewText: {
    fontSize: 14,
    color: Colors.primary.text,
  },
  removeAudioButton: {
    backgroundColor: Colors.primary.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  removeAudioText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  privacyContainer: {
    marginBottom: 20,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  privacyText: {
    fontSize: 14,
    color: Colors.primary.text,
  },
  activePrivacyText: {
    color: Colors.primary.accent,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.primary.border,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.primary.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkInButton: {
    flex: 1,
    backgroundColor: Colors.primary.accent,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Visited content styles
  visitedContainer: {
    flex: 1,
  },
  visitedMapContainer: {
    height: 300,
    position: 'relative',
  },
  quickCheckInButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  quickCheckInText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  recordsScrollView: {
    flex: 1,
    padding: 16,
  },
  achievementsSection: {
    marginBottom: 24,
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  unlockedAchievement: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#FFF9E6',
  },
  achievementEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: Colors.primary.lightText,
    marginBottom: 8,
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    color: Colors.primary.lightText,
    fontWeight: 'bold',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.primary.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary.accent,
  },
  unlockedBadge: {
    fontSize: 24,
  },
  recordsSection: {
    marginBottom: 16,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recordsList: {
    gap: 12,
  },
  noRecordsText: {
    fontSize: 14,
    color: Colors.primary.lightText,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
  recordCard: {
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    padding: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordMood: {
    fontSize: 32,
    marginRight: 16,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  recordTime: {
    fontSize: 12,
    color: Colors.primary.lightText,
  },
  recordDate: {
    fontSize: 12,
    color: Colors.primary.lightText,
  },
  recordTag: {
    fontSize: 12,
    color: Colors.primary.accent,
    marginTop: 2,
  },
  recordDetail: {
    marginBottom: 4,
  },
  recordCustomMessage: {
    fontSize: 14,
    color: Colors.primary.accent,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recordDetailText: {
    fontSize: 14,
    color: Colors.primary.text,
  },
  recordImageContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  recordImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  recordAudio: {
    backgroundColor: Colors.primary.background,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  recordAudioText: {
    fontSize: 14,
    color: Colors.primary.accent,
    fontWeight: 'bold',
  },
  recordNote: {
    backgroundColor: Colors.primary.background,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  recordNoteText: {
    fontSize: 14,
    color: Colors.primary.lightText,
    fontStyle: 'italic',
  },
  recordFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.primary.border,
  },
  recordPrivacy: {
    fontSize: 12,
    color: Colors.primary.lightText,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Journey content styles
  journeyContainer: {
    flex: 1,
  },
  journeyMapContainer: {
    height: 300,
  },
  journeyScrollView: {
    flex: 1,
    padding: 16,
  },
  journeyStatsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.accent,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary.lightText,
    textAlign: 'center',
    marginTop: 4,
  },
  timelineSection: {
    marginBottom: 24,
  },
  timeline: {
    paddingLeft: 20,
  },
  timelineItem: {
    position: 'relative',
    paddingBottom: 20,
  },
  timelineMarker: {
    position: 'absolute',
    left: -30,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary.accent,
  },
  timelineEmoji: {
    fontSize: 20,
  },
  timelineContent: {
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    padding: 12,
    marginLeft: 20,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: Colors.primary.lightText,
    marginBottom: 4,
  },
  timelineMessage: {
    fontSize: 14,
    color: Colors.primary.accent,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  timelineTag: {
    fontSize: 12,
    color: Colors.primary.lightText,
  },
  timelineLine: {
    position: 'absolute',
    left: -11,
    top: 40,
    width: 2,
    height: 20,
    backgroundColor: Colors.primary.border,
  },
  journeyShareSection: {
    marginBottom: 24,
  },
  shareJourneyButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareJourneyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Web map placeholder styles
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webMapTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginTop: 16,
    marginBottom: 8,
  },
  webMapText: {
    fontSize: 16,
    color: Colors.primary.lightText,
    textAlign: 'center',
    marginBottom: 24,
  },
  webMapButton: {
    backgroundColor: Colors.primary.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  webMapButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});