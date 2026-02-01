import { MD3LightTheme, MD3DarkTheme, type MD3Theme } from "react-native-paper";

export const lightTheme: MD3Theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: "#6200ee",
        secondary: "#03dac6",
        background: "#fafafa",
        surface: "#ffffff",
        error: "#b00020",
    },
    roundness: 8,
};

export const darkTheme: MD3Theme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        primary: "#bb86fc",
        secondary: "#03dac6",
        background: "#121212",
        surface: "#1e1e1e",
        error: "#cf6679",
        onBackground: "#e0e0e0",
        onSurface: "#e0e0e0",
    },
    roundness: 8,
};
