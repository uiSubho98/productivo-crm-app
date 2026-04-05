import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { clientAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors, PipelineColors } from '../../utils/colors';
import { Card, Badge, Spinner, Avatar, ScreenHeader, Button, AppModal, Input } from '../../components/ui';
import { formatDate } from '../../utils/format';

const LIQ_KEY = 'pk.d834e6dedfba17aa6c9e976b6843fee8';

function AddressCard({ client, isDark, C }) {
  const { address, addressLat, addressLng } = client;
  const [coords, setCoords] = React.useState(
    addressLat && addressLng ? { lat: addressLat, lng: addressLng } : null
  );
  const [geocoding, setGeocoding] = React.useState(false);

  React.useEffect(() => {
    if (coords) return;
    const q = [address?.street, address?.city, address?.state, address?.zipCode, 'India']
      .filter(Boolean).join(', ');
    if (!q) return;
    setGeocoding(true);
    fetch(`https://api.locationiq.com/v1/search?key=${LIQ_KEY}&q=${encodeURIComponent(q)}&format=json&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data[0]) {
          setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        }
      })
      .catch(() => {})
      .finally(() => setGeocoding(false));
  }, []);

  const mapStyle = isDark ? 'alidade_smooth_dark' : 'alidade_smooth';
  const mapUri = coords
    ? `https://maps.locationiq.com/v3/staticmap?key=${LIQ_KEY}&center=${coords.lat},${coords.lng}&zoom=15&size=600x300&style=${mapStyle}&format=png&markers=icon:large-red-cutout|${coords.lat},${coords.lng}`
    : null;

  const rows = [
    { label: 'Street', value: address?.street },
    { label: 'City',   value: address?.city },
    { label: 'State',  value: address?.state },
    { label: 'PIN',    value: address?.zipCode },
    { label: 'Country', value: address?.country },
  ].filter((r) => r.value);

  return (
    <Card isDark={isDark} style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Ionicons name="location-outline" size={16} color={C.primary} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Address</Text>
      </View>
      <View style={{ gap: 8, marginBottom: 12 }}>
        {rows.map(({ label, value }) => (
          <View key={label} style={{ flexDirection: 'row', gap: 10 }}>
            <Text style={{ fontSize: 11, color: C.textTertiary, fontWeight: '500', width: 60, paddingTop: 1 }}>{label}</Text>
            <Text style={{ fontSize: 14, color: C.text, flex: 1 }}>{value}</Text>
          </View>
        ))}
      </View>
      {geocoding && (
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={{ fontSize: 12, color: C.textTertiary, marginTop: 4 }}>Loading map…</Text>
        </View>
      )}
      {mapUri && (
        <>
          <Image
            source={{ uri: mapUri }}
            style={{ width: '100%', height: 180, borderRadius: 14, marginBottom: 10 }}
            resizeMode="cover"
            onError={() => {}}
          />
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingVertical: 10, borderRadius: 12,
              borderWidth: 1, borderColor: C.border,
              backgroundColor: C.surface,
            }}
          >
            <Ionicons name="map-outline" size={16} color={C.primary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>Open in Google Maps</Text>
          </TouchableOpacity>
        </>
      )}
    </Card>
  );
}

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'quotation_sent', label: 'Quotation Sent' },
  { key: 'quotation_revised', label: 'Quotation Revised' },
  { key: 'mvp_shared', label: 'MVP Shared' },
  { key: 'converted', label: 'Converted' },
  { key: 'lost', label: 'Lost' },
  { key: 'inactive', label: 'Inactive' },
];

export default function ClientDetailScreen({ route, navigation }) {
  const { clientId } = route.params || {};
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  const fetchClient = async () => {
    try {
      const res = await clientAPI.getById(clientId);
      setClient(res.data?.data || res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchClient(); }, [clientId]);

  const handleStageChange = async (newStage) => {
    try {
      await clientAPI.updatePipeline(clientId, { pipelineStage: newStage });
      setClient((prev) => ({ ...prev, pipelineStage: newStage }));
    } catch {
      Alert.alert('Error', 'Failed to update pipeline stage');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Client', 'Delete this client? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await clientAPI.delete(clientId);
          navigation.goBack();
        } catch { Alert.alert('Error', 'Failed to delete client'); }
      }},
    ]);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setNoteLoading(true);
    try {
      await clientAPI.addNote(clientId, { text: noteText.trim() });
      setNoteText('');
      setShowNoteModal(false);
      fetchClient();
    } catch { Alert.alert('Error', 'Failed to add note'); }
    setNoteLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner color={C.primary} />
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
        <View style={{ padding: 20 }}>
          <ScreenHeader title="Client" backButton onBack={() => navigation.goBack()} isDark={isDark} />
          <Text style={{ color: C.textSecondary, textAlign: 'center', marginTop: 40 }}>Client not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stageColor = PipelineColors[client.pipelineStage || 'lead'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchClient(); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Client"
          backButton
          onBack={() => navigation.goBack()}
          actionIcon="create-outline"
          onAction={() => navigation.navigate('CreateClient', { client })}
          isDark={isDark}
        />

        {/* Header Card */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <Avatar name={client.name} size="lg" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: C.text }}>{client.name}</Text>
              {client.companyName && (
                <Text style={{ fontSize: 14, color: C.textSecondary, marginTop: 2 }}>{client.companyName}</Text>
              )}
              <View style={{ marginTop: 8 }}>
                <Badge status={client.pipelineStage || 'lead'} />
              </View>
            </View>
          </View>

          {/* Contact Actions */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {client.phoneNumber && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${client.phoneNumber}`)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',
                }}
              >
                <Ionicons name="call-outline" size={16} color="#059669" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669' }}>Call</Text>
              </TouchableOpacity>
            )}
            {client.whatsappNumber && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://wa.me/${client.whatsappNumber}`)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC',
                }}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#16A34A' }}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {client.email && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`mailto:${client.email}`)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.primaryBg,
                }}
              >
                <Ionicons name="mail-outline" size={16} color={C.primary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Pipeline Stage */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>Pipeline Stage</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PIPELINE_STAGES.map((s) => {
                const active = (client.pipelineStage || 'lead') === s.key;
                const stageClr = PipelineColors[s.key];
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => handleStageChange(s.key)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: active ? stageClr : C.surface,
                      borderWidth: 1,
                      borderColor: active ? stageClr : C.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFF' : C.text }}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </Card>

        {/* Details */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 }}>Contact Information</Text>
          <View style={{ gap: 12 }}>
            {[
              { label: 'Email', value: client.email, icon: 'mail-outline' },
              { label: 'Phone', value: client.phoneNumber, icon: 'call-outline' },
              { label: 'WhatsApp', value: client.whatsappNumber, icon: 'logo-whatsapp' },
              { label: 'Website', value: client.website, icon: 'globe-outline' },
              { label: 'Source', value: client.source, icon: 'link-outline' },
              { label: 'GST Number', value: client.gstNumber, icon: 'document-text-outline' },
              { label: 'CIN', value: client.cinNumber, icon: 'document-outline' },
            ].filter(item => item.value).map(({ label, value, icon }) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 9,
                  backgroundColor: C.surface,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name={icon} size={16} color={C.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: C.textTertiary, fontWeight: '500' }}>{label}</Text>
                  <Text style={{ fontSize: 14, color: C.text, fontWeight: '500' }}>{value}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Address */}
        {(client.address?.street || client.address?.city || client.address?.state) && (
          <AddressCard client={client} isDark={isDark} C={C} />
        )}

        {/* Notes */}
        {client.notes?.length > 0 && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>Notes ({client.notes.length})</Text>
            <View style={{ gap: 10 }}>
              {client.notes.slice(0, 5).map((note, idx) => (
                <View key={idx} style={{
                  backgroundColor: C.surface,
                  borderRadius: 10,
                  padding: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: C.primary,
                }}>
                  <Text style={{ fontSize: 13, color: C.text, lineHeight: 20 }}>{note.text || note.content}</Text>
                  <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 4 }}>
                    {note.createdAt ? formatDate(note.createdAt) : ''}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Add Note + Delete */}
        <View style={{ gap: 10, marginTop: 8 }}>
          <Button
            onPress={() => setShowNoteModal(true)}
            variant="outline"
            isDark={isDark}
            icon="chatbubble-outline"
          >
            Add Note
          </Button>
          <Button onPress={handleDelete} variant="danger" isDark={isDark} icon="trash-outline">
            Delete Client
          </Button>
        </View>
      </ScrollView>

      <AppModal isOpen={showNoteModal} onClose={() => { setShowNoteModal(false); setNoteText(''); }} title="Add Note" isDark={isDark} size="sm">
        <Input
          label="Note"
          placeholder="Enter note..."
          value={noteText}
          onChangeText={setNoteText}
          multiline
          numberOfLines={4}
          isDark={isDark}
          style={{ marginBottom: 16 }}
          inputStyle={{ height: 90, textAlignVertical: 'top' }}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button variant="outline" onPress={() => { setShowNoteModal(false); setNoteText(''); }} isDark={isDark} style={{ flex: 1 }}>Cancel</Button>
          <Button onPress={handleAddNote} loading={noteLoading} isDark={isDark} style={{ flex: 1 }}>Save</Button>
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
