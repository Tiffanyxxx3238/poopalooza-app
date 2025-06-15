import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Alert } from 'react-native';
import Colors from '@/constants/colors';
import { MapPin, Navigation, Compass, List } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
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

const getBathroomDisplayName = (bathroom: Bathroom): string => {
  const emoji = bathroom.source === 'gov' ? '🏛️' : '🚻';
  return `${emoji} ${bathroom.name}`;
};

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
  source: 'gov' | 'google'; // 區分來源
  hidden?: boolean; // 允許隱藏標記
}

// Mock data for nearby bathrooms
const mockBathrooms: Bathroom[] = [
  {
    id: '1',
    name: 'Starbucks',
    distance: 0.2,
    rating: 4.5,
    type: 'Café',
    address: '123 Main St',
    latitude: 37.78825,
    longitude: -122.4324,
    source: 'google',
  },
  {
    id: '2',
    name: "McDonald's",
    distance: 0.5,
    rating: 3.8,
    type: 'Fast Food',
    address: '456 Oak Ave',
    latitude: 37.78925,
    longitude: -122.4344,
    source: 'google',
  },
  {
    id: '3',
    name: 'Public Library',
    distance: 0.7,
    rating: 4.2,
    type: 'Public',
    address: '789 Elm St',
    latitude: 37.78725,
    longitude: -122.4314,
    source: 'google',
  },
  {
    id: '4',
    name: 'Shell Gas Station',
    distance: 1.1,
    rating: 3.5,
    type: 'Gas Station',
    address: '101 Pine Rd',
    latitude: 37.78625,
    longitude: -122.4334,
    source: 'google',
  },
  {
    id: '5',
    name: 'Target',
    distance: 1.4,
    rating: 4.7,
    type: 'Retail',
    address: '202 Maple Dr',
    latitude: 37.78525,
    longitude: -122.4354,
    source: 'google',
  },
  {
    id: '6',
    name: 'City Park Restroom',
    distance: 1.8,
    rating: 3.2,
    type: 'Public',
    address: '303 Park Ave',
    latitude: 37.78425,
    longitude: -122.4364,
    source: 'google',
  },
];

export default function MapScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bathrooms, setBathrooms] = useState<Bathroom[]>(mockBathrooms);
  const [activeTab, setActiveTab] = useState(Platform.OS === 'web' ? 'nearby' : 'map');
  const [selectedBathroom, setSelectedBathroom] = useState<Bathroom | null>(null);
  const [poopLogs, setPoopLogs] = useState<any[]>([]); // 打卡紀錄
  const filteredBathrooms = bathrooms.filter((bathroom) => !bathroom.hidden);
  const [visitedBathroomIds, setVisitedBathroomIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      try {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);

        // 加入政府 JSON 廁所資料
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
          .map((item, index) => ({
            id: `gov-${index}`,
            name: item.name || item.type || item.type2 || 'Unnamed',
            address: item.address || '未知地址',
            latitude: parseFloat(item.latitude),
            longitude: parseFloat(item.longitude),
            rating: 4.0,
            distance: 0.5, // TODO: 可動態計算距離
            type: item.type || item.type2 || 'Public',
            source: 'gov',
          }));

        const googleBathrooms: Bathroom[] = mockBathrooms.map((item) => ({
          ...item,
          source: 'google',
        }));

        setBathrooms([...googleBathrooms, ...govBathrooms]);
      } catch (error) {
        setErrorMsg('Could not get your location');
      }
    })();
  }, []);

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

  // Conditionally import MapView only on native platforms
  const MapComponent = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webMapPlaceholder}>
          <MapPin size={48} color={Colors.primary.lightText} />
          <Text style={styles.webMapTitle}>Map View</Text>
          <Text style={styles.webMapText}>
            The interactive map is available on the mobile app. Please use the list view to see nearby
            bathrooms.
          </Text>
          <TouchableOpacity style={styles.webMapButton} onPress={() => setActiveTab('nearby')}>
            <Text style={styles.webMapButtonText}>View List</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!location) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      );
    }

    // Dynamically import react-native-maps to避免 web 端錯誤
    const MapModule = require('react-native-maps');
    const MapView = MapModule.default;
    const { Marker, Callout, PROVIDER_GOOGLE } = MapModule;

    const mapRef = useRef<any>(null);

    const centerMapOnUser = () => {
      if (location && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000,
        );
      }
    };

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

    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {activeTab === 'map' &&
            filteredBathrooms.map((bathroom) => (
              <Marker
                key={bathroom.id}
                coordinate={{ latitude: bathroom.latitude, longitude: bathroom.longitude }}
                title={getBathroomDisplayName(bathroom)}
                onPress={() => handleMarkerPress(bathroom)}
              />
            ))}

          {activeTab === 'visited' &&
            poopLogs.map((record: any) => (
              <Marker
                key={record.id}
                coordinate={{ latitude: record.location.lat, longitude: record.location.lng }}
                title={`${record.emoji} ${record.location.name}`}
                description={record.note}
              />
            ))}

          {bathrooms.map((bathroom) => (
            <Marker
              key={bathroom.id}
              coordinate={{ latitude: bathroom.latitude, longitude: bathroom.longitude }}
              title={getBathroomDisplayName(bathroom)}
              description={bathroom.type}
              onPress={() => handleMarkerPress(bathroom)}
            >
              <View
                style={[styles.markerContainer, selectedBathroom?.id === bathroom.id && styles.selectedMarker]}
              >
                <MapPin size={24} color={Colors.primary.accent} />
              </View>
              <Callout tooltip>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{bathroom.name}</Text>
                  <Text style={styles.calloutSubtitle}>{bathroom.type}</Text>
                  <View style={styles.calloutRating}>{renderStars(bathroom.rating)}</View>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton} onPress={centerMapOnUser}>
            <Compass size={24} color={Colors.primary.accent} />
          </TouchableOpacity>
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

              <View style={styles.bathroomDetails}>
                <View style={styles.ratingContainer}>
                  {renderStars(selectedBathroom.rating)}
                  <Text style={styles.ratingText}>{selectedBathroom.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.distanceText}>{selectedBathroom.distance} mi</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.navigateButton} onPress={() => handleNavigate(selectedBathroom)}>
              <Navigation size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderNearbyList = () => (
    <View style={styles.listContainer}>
      <Text style={styles.sectionTitle}>Bathrooms Near You</Text>
      {bathrooms.map((bathroom) => (
        <TouchableOpacity
          key={bathroom.id}
          style={styles.bathroomCard}
          onPress={() => {
            if (Platform.OS !== 'web') {
              setActiveTab('map');
              setSelectedBathroom(bathroom);
            }
          }}
        >
          <View style={styles.bathroomInfo}>
            <View style={styles.bathroomHeader}>
              <Text style={styles.bathroomName}>{bathroom.source === 'gov' ? '🏛️' : '🚻'} {bathroom.name}</Text>
              <View style={styles.typeTag}>
                <Text style={styles.typeText}>{bathroom.type}</Text>
              </View>
            </View>
            <Text style={styles.bathroomAddress}>{bathroom.address}</Text>
            <View style={styles.bathroomDetails}>
              <View style={styles.ratingContainer}>
                {renderStars(bathroom.rating)}
                <Text style={styles.ratingText}>{bathroom.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.distanceText}>{bathroom.distance} mi</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.navigateButton} onPress={() => handleNavigate(bathroom)}>
            <Navigation size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bathroom Finder</Text>
        <View style={styles.tabContainer}>
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'map' && styles.activeTab]}
              onPress={() => setActiveTab('map')}
            >
              <MapPin size={16} color={activeTab === 'map' ? '#FFFFFF' : Colors.primary.lightText} />
              <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>Map</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.tab, activeTab === 'nearby' && styles.activeTab]}
            onPress={() => setActiveTab('nearby')}
          >
            <List size={16} color={activeTab === 'nearby' ? '#FFFFFF' : Colors.primary.lightText} />
            <Text style={[styles.tabText, activeTab === 'nearby' && styles.activeTabText]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'visited' && styles.activeTab]}
            onPress={() => setActiveTab('visited')}
          >
            <MapPin size={16} color={activeTab === 'visited' ? '#FFFFFF' : Colors.primary.lightText} />
            <Text style={[styles.tabText, activeTab === 'visited' && styles.activeTabText]}>Visited</Text>
          </TouchableOpacity>
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Text style={styles.errorSubtext}>Please enable location services to find bathrooms near you.</Text>
        </View>
      ) : activeTab === 'map' || activeTab === 'visited' ? (
        <MapComponent />
      ) : activeTab === 'nearby' ? (
        renderNearbyList()
      ) : (
        <View style={styles.emptyContainer}>
          <MapPin size={48} color={Colors.primary.lightText} />
          <Text style={styles.emptyTitle}>No Visited Bathrooms</Text>
          <Text style={styles.emptyText}>Bathrooms you use will appear here so you can easily find them again.</Text>
        </View>
      )}
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
    fontSize: 14,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.primary.lightText,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
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
  markerContainer: {
    padding: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary.card,
  },
  selectedMarker: {
    borderColor: Colors.primary.accent,
    backgroundColor: Colors.primary.card,
  },
  calloutContainer: {
    width: 150,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 12,
  },
  bathroomCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
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
    marginBottom: 8,
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
  distanceText: {
    fontSize: 14,
    color: Colors.primary.lightText,
  },
  navigateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
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
  },
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