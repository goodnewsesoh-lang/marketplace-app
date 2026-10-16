import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { AddScreen } from '../screens/AddScreen'
import { BecomeSellerScreen } from '../screens/BecomeSellerScreen'
import { EditProfileScreen } from '../screens/EditProfileScreen'
import { ExploreScreen } from '../screens/ExploreScreen'
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { LoginScreen } from '../screens/auth/LoginScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { SavedScreen } from '../screens/SavedScreen'
import { SignUpScreen } from '../screens/auth/SignUpScreen'
import { colors } from '../theme'
import type { RootStackParamList, TabParamList } from './types'

type IconName = ComponentProps<typeof Ionicons>['name']

const Tab = createBottomTabNavigator<TabParamList>()
const Stack = createNativeStackNavigator<RootStackParamList>()

const TAB_ICONS: Record<Exclude<keyof TabParamList, 'Add'>, [IconName, IconName]> = {
  Home: ['home', 'home-outline'],
  Explore: ['compass', 'compass-outline'],
  Saved: ['heart', 'heart-outline'],
  Profile: ['person', 'person-outline'],
}

function PlusButton({ onPress }: BottomTabBarButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Sell"
      style={styles.plusWrap}
    >
      <View style={styles.plus}>
        <Ionicons name="add" size={30} color="#fff" />
      </View>
    </Pressable>
  )
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Add') return null
          const [active, inactive] = TAB_ICONS[route.name]
          return <Ionicons name={focused ? active : inactive} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen
        name="Add"
        component={AddScreen}
        options={{ tabBarLabel: '', tabBarButton: (props) => <PlusButton {...props} /> }}
      />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ presentation: 'modal', title: 'Log in' }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ presentation: 'modal', title: 'Sign up' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ presentation: 'modal', title: 'Reset password' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit profile' }}
      />
      <Stack.Screen
        name="BecomeSeller"
        component={BecomeSellerScreen}
        options={{ title: 'Your store' }}
      />
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  plusWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plus: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
})
