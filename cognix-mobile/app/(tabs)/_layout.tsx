import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const ACTIVE_COLOR = "#6366F1";
const INACTIVE_COLOR = "#94A3B8";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F1F5F9",
          height: Platform.OS === "ios" ? 90 : 70,
          paddingBottom: Platform.OS === "ios" ? 30 : 12,
          paddingTop: 10,
          elevation: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="document-scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "scan" : "scan-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="simple-test"
        options={{
          title: "Test",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.centerTab, focused && styles.centerTabActive]}>
              <MaterialCommunityIcons
                name="brain"
                size={24}
                color={focused ? "#fff" : ACTIVE_COLOR}
              />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="quick-test" options={{ href: null }} />
      <Tabs.Screen name="clinical-test" options={{ href: null }} />
      <Tabs.Screen name="cognitive-test" options={{ href: null }} />
      <Tabs.Screen name="speech-test" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerTab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -15,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  centerTabActive: {
    backgroundColor: "#6366F1",
  },
});
