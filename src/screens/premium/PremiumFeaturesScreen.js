import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { enquiryAPI } from '../../services/api';

const PREMIUM_FEATURES = [
  {
    id: 'whatsapp_invoice',
    icon: 'receipt-outline',
    title: 'Invoice via WhatsApp',
    description: 'Send PDF invoices directly to your client\'s WhatsApp in one tap. Instant delivery.',
    bullets: ['Auto-send on invoice creation', 'PDF delivered to client', 'Delivery tracking'],
  },
  {
    id: 'whatsapp_task_reminder',
    icon: 'notifications-outline',
    title: 'Task Reminders via WhatsApp',
    description: 'Automated WhatsApp reminders to assignees when tasks are due or overdue.',
    bullets: ['Due-date reminders', 'Overdue escalation alerts', 'Custom reminder timing'],
  },
  {
    id: 'whatsapp_meeting_invite',
    icon: 'calendar-outline',
    title: 'Meeting Invites via WhatsApp',
    description: 'Share meeting agenda and join links to all attendees via WhatsApp instantly.',
    bullets: ['Instant invites to attendees', 'Agenda in message', 'Join link included'],
  },
];

export default function PremiumFeaturesScreen() {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', description: '' });

  const openModal = (feature) => {
    setSelectedFeature(feature);
    setSubmitted(false);
    setForm({
      fullName: user?.name || '',
      email: user?.email || '',
      phone: '',
      description: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.fullName || !form.email || !form.phone || !form.description) {
      Alert.alert('Missing Fields', 'Please fill in all fields before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await enquiryAPI.submitPremium({
        ...form,
        featureInterest: selectedFeature ? [selectedFeature.id] : [],
        orgName: '',
      });
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 4 }}>
          Premium Features
        </Text>
        <Text style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>
          WhatsApp automation add-ons for your workspace
        </Text>

        {/* Banner */}
        <View style={{
          borderRadius: 20,
          padding: 20,
          marginBottom: 24,
          backgroundColor: C.primary,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="flash" size={16} color="rgba(255,255,255,0.9)" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 1, textTransform: 'uppercase' }}>
              Paid Add-on
            </Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 6 }}>
            WhatsApp Business Automation
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20 }}>
            These features require an additional subscription. Express interest and our team will reach out with pricing.
          </Text>
        </View>

        {/* Feature cards */}
        {PREMIUM_FEATURES.map((feature) => (
          <View key={feature.id} style={{
            backgroundColor: C.card,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: C.border,
          }}>
            {/* Lock badge */}
            <View style={{
              position: 'absolute',
              top: 16,
              right: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              backgroundColor: C.primaryLight,
              borderWidth: 1,
              borderColor: C.primary + '40',
            }}>
              <Ionicons name="lock-closed" size={11} color={C.primary} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>Add-on</Text>
            </View>

            {/* Icon + title */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14, paddingRight: 80 }}>
              <View style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                backgroundColor: C.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name={feature.icon} size={22} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 }}>
                  {feature.title}
                </Text>
                <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 19 }}>
                  {feature.description}
                </Text>
              </View>
            </View>

            {/* Bullets */}
            {feature.bullets.map((b) => (
              <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Ionicons name="checkmark-circle" size={16} color={C.primary} />
                <Text style={{ fontSize: 13, color: C.textSecondary }}>{b}</Text>
              </View>
            ))}

            {/* Unlock CTA */}
            <TouchableOpacity
              onPress={() => openModal(feature)}
              style={{
                marginTop: 16,
                borderRadius: 14,
                paddingVertical: 13,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: C.primary,
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={18} color="#FFF" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Unlock This Feature</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Enquiry Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>
              {submitted ? 'Request Sent!' : 'Unlock Feature'}
            </Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Ionicons name="close" size={24} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {submitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <View style={{
                  width: 72,
                  height: 72,
                  borderRadius: 24,
                  backgroundColor: C.successLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <Ionicons name="checkmark-circle" size={40} color={C.success} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'center' }}>
                  We've received your request!
                </Text>
                <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22 }}>
                  Our team will reach out to{'\n'}
                  <Text style={{ fontWeight: '600', color: C.text }}>{form.email}</Text>
                  {'\n'}within 24–48 hours.
                </Text>
                <TouchableOpacity
                  onPress={() => setModalOpen(false)}
                  style={{ marginTop: 28, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {selectedFeature && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: C.primaryLight,
                    borderWidth: 1,
                    borderColor: C.primary + '40',
                    marginBottom: 4,
                  }}>
                    <Ionicons name={selectedFeature.icon} size={22} color={C.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, flex: 1 }}>
                      {selectedFeature.title}
                    </Text>
                  </View>
                )}

                <Text style={{ fontSize: 13, color: C.textSecondary }}>
                  Fill in your details and we'll get back to you with pricing and next steps.
                </Text>

                {[
                  { key: 'fullName', label: 'Full Name', placeholder: 'Your name' },
                  { key: 'email', label: 'Email', placeholder: 'you@company.com', keyboardType: 'email-address' },
                  { key: 'phone', label: 'Phone / WhatsApp', placeholder: '+91 98765 43210', keyboardType: 'phone-pad' },
                ].map(({ key, label, placeholder, keyboardType }) => (
                  <View key={key}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 }}>{label}</Text>
                    <TextInput
                      value={form[key]}
                      onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                      placeholder={placeholder}
                      placeholderTextColor={C.placeholder}
                      keyboardType={keyboardType}
                      autoCapitalize="none"
                      style={{
                        borderWidth: 1,
                        borderColor: C.border,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        fontSize: 15,
                        color: C.text,
                        backgroundColor: C.card,
                      }}
                    />
                  </View>
                ))}

                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 }}>
                    Tell us about your use case
                  </Text>
                  <TextInput
                    value={form.description}
                    onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                    placeholder="How many clients? Team size? Current workflow?"
                    placeholderTextColor={C.placeholder}
                    multiline
                    numberOfLines={4}
                    style={{
                      borderWidth: 1,
                      borderColor: C.border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 15,
                      color: C.text,
                      backgroundColor: C.card,
                      minHeight: 100,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={{
                    backgroundColor: C.primary,
                    borderRadius: 14,
                    paddingVertical: 15,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: submitting ? 0.7 : 1,
                    marginTop: 4,
                  }}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#FFF" />
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Send Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
