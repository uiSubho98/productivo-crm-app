import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../utils/colors';
import { locationAPI } from '../services/api';

const LOCATIONIQ_KEY = 'pk.d834e6dedfba17aa6c9e976b6843fee8';

// ─── PickerModal ──────────────────────────────────────────────────────────────
function PickerModal({ visible, title, items, selected, onSelect, onClose, loading, C }) {
  const [search, setSearch] = useState('');

  // Reset search when modal opens
  useEffect(() => { if (visible) setSearch(''); }, [visible]);

  const filtered = search.length > 0
    ? items.filter((i) => i.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: C.card,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '75%',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingVertical: 16,
            borderBottomWidth: 1, borderBottomColor: C.border,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search box */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            marginHorizontal: 16, marginVertical: 12,
            backgroundColor: C.inputBg, borderRadius: 12,
            borderWidth: 1.5, borderColor: C.inputBorder,
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === 'ios' ? 11 : 8,
          }}>
            <Ionicons name="search-outline" size={16} color={C.textTertiary} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: C.text, padding: 0 }}
              placeholder={`Search ${title.toLowerCase()}…`}
              placeholderTextColor={C.placeholder}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={C.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={{ marginTop: 12, fontSize: 13, color: C.textSecondary }}>Loading…</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 20, paddingVertical: 14,
                    borderBottomWidth: 1, borderBottomColor: C.border,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: item === selected ? C.primary + '12' : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 15,
                    color: item === selected ? C.primary : C.text,
                    fontWeight: item === selected ? '600' : '400',
                    flex: 1,
                  }}>
                    {item}
                  </Text>
                  {item === selected && (
                    <Ionicons name="checkmark" size={18} color={C.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: C.textTertiary }}>No results found</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── AddressSearch ────────────────────────────────────────────────────────────
/**
 * Props:
 *   value         – { street, city, state, zipCode, lat, lng }
 *   onChange      – (fields) => void
 *   isDummy       – boolean
 *   onDummyChange – (bool) => void
 *   isDark        – boolean
 */
export default function AddressSearch({ value = {}, onChange, isDummy = false, onDummyChange, isDark }) {
  const C = getColors(isDark);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [stateModal, setStateModal] = useState(false);
  const [cityModal, setCityModal] = useState(false);
  const stateMapRef = useRef({});

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  // Load states on mount
  useEffect(() => {
    setLoadingStates(true);
    locationAPI.getStates()
      .then((res) => {
        const data = res.data?.data || [];
        stateMapRef.current = Object.fromEntries(data.map((s) => [s.name, s.iso2]));
        setStates(data.map((s) => s.name));
      })
      .catch(() => {})
      .finally(() => setLoadingStates(false));
  }, []);

  // Load cities when state changes
  const loadCities = useCallback(async (stateName) => {
    const iso2 = stateMapRef.current[stateName];
    if (!iso2) { setCities([]); return; }
    setLoadingCities(true);
    try {
      const res = await locationAPI.getCities(iso2);
      setCities(res.data?.data || []);
    } catch {
      setCities([]);
    }
    setLoadingCities(false);
  }, []);

  useEffect(() => {
    if (value.state) loadCities(value.state);
    else setCities([]);
  }, [value.state]);

  const fetchSuggestions = useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const url = `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&limit=6&dedupe=1&tag=place:house,place:hamlet,highway,place:village,place:town,place:city`;
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);
  }, []);

  const handleSuggestionSelect = useCallback((item) => {
    const addr = item.address || {};
    const street = [addr.house_number, addr.road || addr.street || addr.pedestrian]
      .filter(Boolean).join(' ') || item.display_name?.split(',')[0] || '';
    const city = addr.city || addr.town || addr.village || addr.suburb || '';
    const state = addr.state || '';
    const zipCode = addr.postcode || '';
    const lat = item.lat ? parseFloat(item.lat) : null;
    const lng = item.lon ? parseFloat(item.lon) : null;
    onChange({ street, city, state, zipCode, lat, lng });
    setSuggestions([]);
    setShowSuggestions(false);
  }, [onChange]);

  const hasCoords = !isDummy && value.lat && value.lng;
  const mapUrl = hasCoords
    ? `https://maps.locationiq.com/v3/staticmap?key=${LOCATIONIQ_KEY}&center=${value.lat},${value.lng}&zoom=14&size=600x200&markers=icon:small-red-cutout|${value.lat},${value.lng}`
    : null;

  const inputBase = {
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 15,
    color: C.text,
    marginBottom: 10,
  };

  const FieldLabel = ({ text }) => (
    <Text style={{ fontSize: 12, fontWeight: '500', color: C.textSecondary, marginBottom: 5 }}>{text}</Text>
  );

  const SelectorButton = ({ label, displayVal, placeholder, onPress, disabled }) => (
    <View style={{ marginBottom: 10 }}>
      <FieldLabel text={label} />
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        activeOpacity={disabled ? 1 : 0.7}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: C.inputBg, borderWidth: 1.5,
          borderColor: C.inputBorder, borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === 'ios' ? 13 : 10,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: 15, color: displayVal ? C.text : C.placeholder, flex: 1 }}>
          {displayVal || placeholder}
        </Text>
        {disabled && !displayVal
          ? <ActivityIndicator size="small" color={C.textTertiary} />
          : <Ionicons name="chevron-down" size={16} color={C.textTertiary} />}
      </TouchableOpacity>
    </View>
  );

  return (
    <View>
      {/* Dummy toggle */}
      <TouchableOpacity
        onPress={() => onDummyChange?.(!isDummy)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}
        activeOpacity={0.7}
      >
        <View style={{
          width: 36, height: 20, borderRadius: 10,
          backgroundColor: isDummy ? '#F59E0B' : C.inputBorder,
          justifyContent: 'center', paddingHorizontal: 2,
        }}>
          <View style={{
            width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFF',
            alignSelf: isDummy ? 'flex-end' : 'flex-start',
            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
          }} />
        </View>
        <Text style={{ fontSize: 13, color: C.textSecondary }}>
          {isDummy ? 'Address unknown — using dummy' : "I don't know the address"}
        </Text>
      </TouchableOpacity>

      {isDummy ? (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: isDark ? '#451A03' : '#FEF3C7',
          borderRadius: 12, padding: 12,
          borderWidth: 1, borderColor: '#FCD34D', borderStyle: 'dashed',
        }}>
          <Ionicons name="location-outline" size={18} color="#D97706" />
          <Text style={{ fontSize: 13, color: isDark ? '#FDE68A' : '#92400E', flex: 1 }}>
            No address — a placeholder will be used
          </Text>
        </View>
      ) : (
        <>
          {/* Street with autocomplete */}
          <FieldLabel text="Street / Flat / Area" />
          <View style={{ position: 'relative', zIndex: 10 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: C.inputBg, borderWidth: 1.5,
              borderColor: showSuggestions ? C.primary : C.inputBorder,
              borderRadius: showSuggestions ? 12 : 12,
              borderBottomLeftRadius: showSuggestions && suggestions.length > 0 ? 0 : 12,
              borderBottomRightRadius: showSuggestions && suggestions.length > 0 ? 0 : 12,
              paddingHorizontal: 14, marginBottom: 0,
            }}>
              <TextInput
                style={{ flex: 1, fontSize: 15, color: C.text, paddingVertical: Platform.OS === 'ios' ? 13 : 10, padding: 0 }}
                placeholder="Search address (e.g. MG Road, Kolkata)"
                placeholderTextColor={C.placeholder}
                value={value.street || ''}
                onChangeText={(v) => {
                  onChange({ ...value, street: v });
                  fetchSuggestions(v);
                }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                returnKeyType="search"
              />
              {loadingSuggestions
                ? <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: 8 }} />
                : value.street
                  ? <TouchableOpacity onPress={() => { onChange({ ...value, street: '' }); setSuggestions([]); setShowSuggestions(false); }}>
                      <Ionicons name="close-circle" size={18} color={C.textTertiary} />
                    </TouchableOpacity>
                  : <Ionicons name="search-outline" size={16} color={C.textTertiary} />
              }
            </View>
            {showSuggestions && suggestions.length > 0 && (
              <View style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                backgroundColor: C.card,
                borderWidth: 1.5, borderTopWidth: 0, borderColor: C.primary,
                borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
                overflow: 'hidden', zIndex: 100,
                shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
              }}>
                {suggestions.map((item, idx) => {
                  const label = item.display_name || '';
                  const parts = label.split(',');
                  const mainText = parts.slice(0, 2).join(',').trim();
                  const subText = parts.slice(2).join(',').trim();
                  return (
                    <TouchableOpacity
                      key={item.place_id || idx}
                      onPress={() => handleSuggestionSelect(item)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        paddingHorizontal: 14, paddingVertical: 11,
                        borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: C.border,
                      }}
                    >
                      <Ionicons name="location-outline" size={15} color={C.primary} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, color: C.text, fontWeight: '500' }} numberOfLines={1}>{mainText}</Text>
                        {subText ? <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }} numberOfLines={1}>{subText}</Text> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          <View style={{ marginBottom: 10 }} />

          {/* State selector */}
          <SelectorButton
            label="State"
            displayVal={value.state}
            placeholder={loadingStates ? 'Loading states…' : 'Select state…'}
            onPress={() => !loadingStates && setStateModal(true)}
            disabled={loadingStates}
          />

          {/* City selector */}
          <SelectorButton
            label="City"
            displayVal={value.city}
            placeholder={!value.state ? 'Select state first' : loadingCities ? 'Loading cities…' : 'Select city…'}
            onPress={() => value.state && !loadingCities && setCityModal(true)}
            disabled={!value.state || loadingCities}
          />

          {/* ZIP */}
          <FieldLabel text="PIN / ZIP Code" />
          <TextInput
            style={inputBase}
            placeholder="e.g. 400001"
            placeholderTextColor={C.placeholder}
            value={value.zipCode || ''}
            onChangeText={(v) => onChange({ ...value, zipCode: v.replace(/\D/g, '').slice(0, 6) })}
            keyboardType="number-pad"
            maxLength={6}
          />

          {/* Static map */}
          {hasCoords && (
            <Image
              source={{ uri: mapUrl }}
              style={{ width: '100%', height: 160, borderRadius: 12, marginTop: 4 }}
              resizeMode="cover"
            />
          )}
        </>
      )}

      {/* State modal */}
      <PickerModal
        visible={stateModal}
        title="Select State"
        items={states}
        selected={value.state || ''}
        onSelect={(s) => onChange({ ...value, state: s, city: '' })}
        onClose={() => setStateModal(false)}
        loading={loadingStates}
        C={C}
      />

      {/* City modal */}
      <PickerModal
        visible={cityModal}
        title="Select City"
        items={cities}
        selected={value.city || ''}
        onSelect={(c) => onChange({ ...value, city: c })}
        onClose={() => setCityModal(false)}
        loading={loadingCities}
        C={C}
      />
    </View>
  );
}
