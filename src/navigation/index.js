import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { getColors } from '../utils/colors';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import SetupOrgScreen from '../screens/auth/SetupOrgScreen';

// Main screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProductOwnerDashboardScreen from '../screens/dashboard/ProductOwnerDashboardScreen';
import TasksScreen from '../screens/tasks/TasksScreen';
import TaskDetailScreen from '../screens/tasks/TaskDetailScreen';
import CreateTaskScreen from '../screens/tasks/CreateTaskScreen';
import ProjectsScreen from '../screens/projects/ProjectsScreen';
import ProjectDetailScreen from '../screens/projects/ProjectDetailScreen';
import CreateProjectScreen from '../screens/projects/CreateProjectScreen';
import ClientsScreen from '../screens/clients/ClientsScreen';
import ClientDetailScreen from '../screens/clients/ClientDetailScreen';
import CreateClientScreen from '../screens/clients/CreateClientScreen';
import MeetingsScreen from '../screens/meetings/MeetingsScreen';
import MeetingDetailScreen from '../screens/meetings/MeetingDetailScreen';
import CreateMeetingScreen from '../screens/meetings/CreateMeetingScreen';
import InvoicesScreen from '../screens/invoices/InvoicesScreen';
import InvoiceDetailScreen from '../screens/invoices/InvoiceDetailScreen';
import CreateInvoiceScreen from '../screens/invoices/CreateInvoiceScreen';
import ConversationsScreen from '../screens/conversations/ConversationsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import OrganizationsScreen from '../screens/organizations/OrganizationsScreen';
import OrganizationDetailScreen from '../screens/organizations/OrganizationDetailScreen';
import CreateOrganizationScreen from '../screens/organizations/CreateOrganizationScreen';
import UsersScreen from '../screens/users/UsersScreen';
import EnquiriesScreen from '../screens/enquiries/EnquiriesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Tasks: { active: 'checkbox', inactive: 'checkbox-outline' },
  Clients: { active: 'people', inactive: 'people-outline' },
  Invoices: { active: 'receipt', inactive: 'receipt-outline' },
  More: { active: 'grid', inactive: 'grid-outline' },
};

function MoreScreen({ navigation }) {
  return null; // placeholder - handled by more tab stack
}

// Stack navigators for each tab so nested navigation works
const TaskStack = createNativeStackNavigator();
function TasksTab() {
  return (
    <TaskStack.Navigator screenOptions={{ headerShown: false }}>
      <TaskStack.Screen name="TasksList" component={TasksScreen} />
      <TaskStack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <TaskStack.Screen name="CreateTask" component={CreateTaskScreen} />
    </TaskStack.Navigator>
  );
}

const ClientStack = createNativeStackNavigator();
function ClientsTab() {
  return (
    <ClientStack.Navigator screenOptions={{ headerShown: false }}>
      <ClientStack.Screen name="ClientsList" component={ClientsScreen} />
      <ClientStack.Screen name="ClientDetail" component={ClientDetailScreen} />
      <ClientStack.Screen name="CreateClient" component={CreateClientScreen} />
    </ClientStack.Navigator>
  );
}

const InvoiceStack = createNativeStackNavigator();
function InvoicesTab() {
  return (
    <InvoiceStack.Navigator screenOptions={{ headerShown: false }}>
      <InvoiceStack.Screen name="InvoicesList" component={InvoicesScreen} />
      <InvoiceStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
      <InvoiceStack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
    </InvoiceStack.Navigator>
  );
}

const MoreStack = createNativeStackNavigator();
function MoreTab() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <MoreStack.Screen name="Projects" component={ProjectsScreen} />
      <MoreStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <MoreStack.Screen name="CreateProject" component={CreateProjectScreen} />
      <MoreStack.Screen name="Meetings" component={MeetingsScreen} />
      <MoreStack.Screen name="MeetingDetail" component={MeetingDetailScreen} />
      <MoreStack.Screen name="CreateMeeting" component={CreateMeetingScreen} />
      <MoreStack.Screen name="Conversations" component={ConversationsScreen} />
      <MoreStack.Screen name="Organizations" component={OrganizationsScreen} />
      <MoreStack.Screen name="OrganizationDetail" component={OrganizationDetailScreen} />
      <MoreStack.Screen name="CreateOrganization" component={CreateOrganizationScreen} />
      <MoreStack.Screen name="Users" component={UsersScreen} />
      <MoreStack.Screen name="Enquiries" component={EnquiriesScreen} />
      <MoreStack.Screen name="PremiumFeatures" component={PremiumFeaturesScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
      <MoreStack.Screen name="MyPlan" component={MyPlanScreen} />
    </MoreStack.Navigator>
  );
}

import MoreMenuScreen from '../screens/MoreMenuScreen';
import PremiumFeaturesScreen from '../screens/premium/PremiumFeaturesScreen';
import MyPlanScreen from '../screens/settings/MyPlanScreen';

function MainTabs({ isDark, role }) {
  const C = getColors(isDark);
  const isProductOwner = role === 'product_owner';

  const tabBarScreenOptions = ({ route }) => ({
    headerShown: false,
    tabBarIcon: ({ focused, color, size }) => {
      const icons = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
      return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
    },
    tabBarActiveTintColor: C.primary,
    tabBarInactiveTintColor: C.textTertiary,
    tabBarStyle: {
      backgroundColor: C.card,
      borderTopColor: C.border,
      borderTopWidth: 1,
      height: 60,
      paddingBottom: 8,
      paddingTop: 4,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
  });

  if (isProductOwner) {
    return (
      <Tab.Navigator screenOptions={tabBarScreenOptions}>
        <Tab.Screen name="Dashboard" component={ProductOwnerDashboardScreen} />
        <Tab.Screen
          name="More"
          component={MoreTab}
          listeners={({ navigation }) => ({
            tabPress: () => navigation.navigate('More', { screen: 'MoreMenu' }),
          })}
        />
      </Tab.Navigator>
    );
  }

  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen
        name="Tasks"
        component={TasksTab}
        listeners={({ navigation }) => ({
          tabPress: () => navigation.navigate('Tasks', { screen: 'TasksList' }),
        })}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsTab}
        listeners={({ navigation }) => ({
          tabPress: () => navigation.navigate('Clients', { screen: 'ClientsList' }),
        })}
      />
      <Tab.Screen
        name="Invoices"
        component={InvoicesTab}
        listeners={({ navigation }) => ({
          tabPress: () => navigation.navigate('Invoices', { screen: 'InvoicesList' }),
        })}
      />
      <Tab.Screen
        name="More"
        component={MoreTab}
        listeners={({ navigation }) => ({
          tabPress: () => navigation.navigate('More', { screen: 'MoreMenu' }),
        })}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, user, isInitialized, initialize } = useAuthStore();
  const { isDark, initialize: initTheme } = useThemeStore();

  useEffect(() => {
    initialize();
    initTheme();
  }, []);

  if (!isInitialized) {
    const C = getColors(isDark);
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 72,
          height: 72,
          borderRadius: 22,
          backgroundColor: '#2563EB',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Ionicons name="flash" size={36} color="#FFF" />
        </View>
      </View>
    );
  }

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: '#030712', card: '#111827', border: '#1F2937' } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#F9FAFB', card: '#FFFFFF', border: '#E5E7EB' } };

  const needsOrgSetup = token && user && user.role === 'superadmin' && !user.organizationId;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token && !needsOrgSetup ? (
          <Stack.Screen name="Main">
            {() => <MainTabs isDark={isDark} role={user?.role} />}
          </Stack.Screen>
        ) : token && needsOrgSetup ? (
          <Stack.Screen name="SetupOrg" component={SetupOrgScreen} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="SetupOrg" component={SetupOrgScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
