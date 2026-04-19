import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import useWhatsappAddonStore from '../store/whatsappAddonStore';
import { getColors } from '../utils/colors';
import { Avatar } from '../components/ui';

const MENU_ITEMS = [
  { section: 'Workspace', items: [
    { label: 'Projects',    icon: 'folder-outline',   screen: 'Projects',     color: '#7C3AED' },
    { label: 'Meetings',    icon: 'calendar-outline', screen: 'Meetings',     color: '#059669' },
    { label: 'WhatsApp',    icon: 'logo-whatsapp',    screen: 'Conversations', color: '#25D366' },
    { label: 'Attendance',  icon: 'time-outline',     screen: 'Attendance',   color: '#0EA5E9' },
  ]},
  { section: 'Admin', items: [
    { label: 'Organizations', icon: 'business-outline', screen: 'Organizations', color: '#2563EB' },
    { label: 'Users',         icon: 'people-outline',   screen: 'Users',         color: '#D97706' },
    { label: 'Timesheet',     icon: 'clipboard-outline', screen: 'Timesheet',    color: '#0369A1', adminOnly: true },
    { label: 'Phone Requests', icon: 'call-outline',     screen: 'PhoneRequests', color: '#B45309', superadminOnly: true },
    { label: 'Data & Activity', icon: 'pulse-outline',  screen: 'DataUsage',     color: '#0891B2', superadminOrOwner: true },
    { label: 'My Plan',       icon: 'ribbon-outline',   screen: 'MyPlan',        color: '#7C3AED', superadminOnly: true },
    { label: 'Add-ons',       icon: 'flash-outline',    screen: 'PremiumFeatures', color: '#F59E0B', addonsItem: true },
  ]},
  { section: 'Platform', items: [
    { label: 'Leads',     icon: 'mail-outline',        screen: 'Enquiries',            color: '#6366F1', ownerOnly: true },
    { label: 'Payments',  icon: 'card-outline',        screen: 'SuperAdminPayments',   color: '#059669', ownerOnly: true },
  ]},
  { section: 'Account', items: [
    { label: 'Settings', icon: 'settings-outline', screen: 'Settings', color: '#6B7280' },
  ]},
];

export default function MoreMenuScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const { isActive: waActive, isFetched: waFetched, fetch: fetchWaAddon } = useWhatsappAddonStore();
  const C = getColors(isDark);
  const userRole = user?.role || 'employee';

  useEffect(() => {
    if (user && userRole !== 'product_owner' && !waFetched) {
      fetchWaAddon();
    }
  }, [user, userRole, waFetched]);

  const handleLogout = async () => {
    await logout();
  };

  const isVisible = (item) => {
    if (item.ownerOnly) return userRole === 'product_owner';
    if (item.superadminOnly) return userRole === 'superadmin';
    if (item.superadminOrOwner) return userRole === 'superadmin' || userRole === 'product_owner';
    if (item.adminOnly) return ['superadmin', 'org_admin', 'product_owner'].includes(userRole);
    if (item.addonsItem) {
      if (waActive) return false; // hide once any WhatsApp add-on is purchased
      return ['superadmin', 'org_admin'].includes(userRole);
    }
    if (['Organizations', 'Users'].includes(item.label)) {
      return ['product_owner', 'superadmin', 'org_admin'].includes(userRole);
    }
    return true;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 20 }}>More</Text>

        {/* Profile Card */}
        <View style={{
          backgroundColor: C.card,
          borderRadius: 20,
          padding: 18,
          borderWidth: 1,
          borderColor: C.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          marginBottom: 24,
        }}>
          <Avatar name={user?.name} size="lg" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>{user?.name || 'User'}</Text>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{user?.email}</Text>
            <View style={{
              alignSelf: 'flex-start',
              marginTop: 6,
              backgroundColor: C.primaryLight,
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 6,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary, textTransform: 'capitalize' }}>
                {userRole.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        {MENU_ITEMS.map((section) => {
          const visibleItems = section.items.filter(isVisible);
          if (visibleItems.length === 0) return null;
          return (
            <View key={section.section} style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: C.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 8,
                paddingHorizontal: 4,
              }}>
                {section.section}
              </Text>
              <View style={{
                backgroundColor: C.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
                overflow: 'hidden',
              }}>
                {visibleItems.map((item, idx) => {
                  const isWa = item.screen === 'Conversations';
                  const isWaLocked = isWa && userRole !== 'product_owner' && !waActive;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => {
                        if (isWaLocked) {
                          navigation.navigate('PremiumFeatures');
                          return;
                        }
                        navigation.navigate(item.screen);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 14,
                        padding: 16,
                        borderBottomWidth: idx < visibleItems.length - 1 ? 1 : 0,
                        borderBottomColor: C.borderLight,
                        opacity: isWaLocked ? 0.6 : 1,
                      }}
                      activeOpacity={isWaLocked ? 1 : 0.7}
                    >
                      <View style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: isWaLocked ? C.surface : item.color + '18',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={isWaLocked ? C.textTertiary : item.color}
                        />
                      </View>
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: isWaLocked ? C.textSecondary : C.text }}>
                        {item.label}
                      </Text>
                      {isWaLocked ? (
                        <View style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                          backgroundColor: C.primaryLight,
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>Locked</Text>
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Theme Toggle */}
        <View style={{
          backgroundColor: C.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.border,
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          <TouchableOpacity
            onPress={toggle}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}
            activeOpacity={0.7}
          >
            <View style={{
              width: 38, height: 38, borderRadius: 10,
              backgroundColor: '#6B7280' + '18',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color="#6B7280" />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: C.text }}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </Text>
            <View style={{
              width: 46,
              height: 26,
              borderRadius: 13,
              backgroundColor: isDark ? C.primary : C.border,
              justifyContent: 'center',
              paddingHorizontal: 3,
            }}>
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#FFF',
                alignSelf: isDark ? 'flex-end' : 'flex-start',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
                elevation: 2,
              }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 16,
            borderRadius: 16,
            backgroundColor: '#FEF2F2',
            borderWidth: 1,
            borderColor: '#FECACA',
            marginBottom: 20,
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#DC2626' }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
